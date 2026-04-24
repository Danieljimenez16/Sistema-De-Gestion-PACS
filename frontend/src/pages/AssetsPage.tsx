import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter, Download, RefreshCw, Trash2 } from 'lucide-react';
import {
  PageHeader, Button, SearchBar, Table, Pagination,
  StatusBadge, Modal, Alert, Select, ConfirmDialog,
} from '../components/ui';
import { AssetForm } from '../components/assets/AssetForm';
import { assetService, catalogService, reportService } from '../services';
import type { Asset, AssetFilters, AssetType, AssetStatus, Area } from '../types';
import { fmt, truncate, downloadCSV } from '../utils/helpers';

const LIMIT = 20;

export const AssetsPage: React.FC = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AssetFilters>({ page: 1, limit: LIMIT });
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Catalog state for filter dropdowns
  const [types, setTypes] = useState<AssetType[]>([]);
  const [statuses, setStatuses] = useState<AssetStatus[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await assetService.list({ ...filters, search: search || undefined });
      setAssets(res.data);
      setMeta({
        total: res.meta.total,
        page: res.meta.page,
        totalPages: res.meta.total_pages,
      });
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([
      catalogService.assetTypes(),
      catalogService.assetStatuses(),
      catalogService.areas(),
    ]).then(([t, s, a]) => {
      setTypes(t.data ?? []);
      setStatuses(s.data ?? []);
      setAreas(a.data ?? []);
    }).catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setFilters(f => ({ ...f, page: 1 })), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleCreate = async (data: Partial<Asset>) => {
    setSaving(true);
    setCreateError('');
    try {
      await assetService.create(data);
      setShowCreate(false);
      load();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setCreateError(e?.message ?? 'Error al crear activo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await assetService.remove(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch { /* ignore */ } finally { setDeleting(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await reportService.assetsExport(filters);
      const data = Array.isArray(res.data) ? res.data : [];
      if (!data.length) { alert('No hay datos para exportar con los filtros aplicados.'); return; }
      const flat = data.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          Código: r.code,
          Serial: r.serial,
          Nombre: r.name,
          Tipo: (r.asset_types as Record<string, unknown>)?.name ?? '',
          Marca: (r.brands as Record<string, unknown>)?.name ?? '',
          Modelo: r.model,
          Estado: (r.asset_statuses as Record<string, unknown>)?.name ?? '',
          Área: (r.areas as Record<string, unknown>)?.name ?? '',
          Ubicación: (r.locations as Record<string, unknown>)?.name ?? '',
          Responsable: (r.responsible as Record<string, unknown>)?.full_name ?? '',
          'Correo Responsable': (r.responsible as Record<string, unknown>)?.email ?? '',
          'Fecha Compra': r.purchase_date,
          'Garantía hasta': r.warranty_expiry,
          Notas: r.notes,
        };
      });
      downloadCSV(flat, `inventario_activos_${new Date().toISOString().slice(0, 10)}.csv`);
    } catch {
      alert('No se pudo exportar. Verifica la conexión con el servidor.');
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      key: 'code',
      header: 'Código',
      width: '110px',
      render: (row: Asset) => (
        <span className="font-mono text-blue-400 text-xs font-semibold">{row.code}</span>
      ),
    },
    {
      key: 'name',
      header: 'Activo',
      render: (row: Asset) => (
        <div>
          <p className="font-medium text-slate-200">{truncate(row.name, 35)}</p>
          {row.model && <p className="text-xs text-slate-500">{row.brand?.name} · {row.model}</p>}
        </div>
      ),
    },
    {
      key: 'asset_type',
      header: 'Tipo',
      render: (row: Asset) => (
        <span className="text-slate-300 text-sm">{row.asset_type?.name ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row: Asset) => <StatusBadge status={row.status?.name} />,
    },
    {
      key: 'area',
      header: 'Área',
      render: (row: Asset) => (
        <div>
          <p className="text-slate-300 text-sm">{row.area?.name ?? '—'}</p>
          {row.location && <p className="text-xs text-slate-500">{row.location.name}</p>}
        </div>
      ),
    },
    {
      key: 'responsible_user',
      header: 'Responsable',
      render: (row: Asset) => (
        <span className="text-slate-400 text-sm">{row.responsible_user?.full_name ?? '—'}</span>
      ),
    },
    {
      key: 'updated_at',
      header: 'Actualizado',
      render: (row: Asset) => (
        <span className="text-slate-500 text-xs">{fmt.date(row.updated_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '50px',
      render: (row: Asset) => (
        <button
          onClick={e => { e.stopPropagation(); setDeleteTarget(row); }}
          className="p-1.5 rounded hover:bg-red-950/50 text-slate-500 hover:text-red-400 transition-colors"
          title="Eliminar activo"
        >
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  const toOpts = (arr: { id: string; name: string }[]) =>
    arr.map(i => ({ value: i.id, label: i.name }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventario de Activos"
        subtitle={`${meta.total} activos registrados`}
        actions={
          <>
            <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={load}>
              Actualizar
            </Button>
            <Button variant="outline" size="sm" icon={<Download size={14} />} loading={exporting} onClick={handleExport}>
              Exportar
            </Button>
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>
              Nuevo Activo
            </Button>
          </>
        }
      />

      {/* Filters bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por código, nombre, serial…"
        />
        <Button
          variant={showFilters ? 'secondary' : 'outline'}
          size="sm"
          icon={<Filter size={14} />}
          onClick={() => setShowFilters(f => !f)}
        >
          Filtros
        </Button>
        {(filters.status_id || filters.asset_type_id || filters.area_id) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ page: 1, limit: LIMIT })}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
          <Select
            label="Estado"
            value={filters.status_id ?? ''}
            onChange={e => setFilters(f => ({ ...f, status_id: e.target.value || undefined, page: 1 }))}
            options={toOpts(statuses)}
            placeholder="Todos los estados"
          />
          <Select
            label="Tipo de Activo"
            value={filters.asset_type_id ?? ''}
            onChange={e => setFilters(f => ({ ...f, asset_type_id: e.target.value || undefined, page: 1 }))}
            options={toOpts(types)}
            placeholder="Todos los tipos"
          />
          <Select
            label="Área"
            value={filters.area_id ?? ''}
            onChange={e => setFilters(f => ({ ...f, area_id: e.target.value || undefined, page: 1 }))}
            options={toOpts(areas)}
            placeholder="Todas las áreas"
          />
        </div>
      )}

      {/* Table */}
      <Table
        columns={columns}
        data={assets}
        loading={loading}
        onRowClick={(row) => navigate(`/assets/${row.id}`)}
        emptyMessage="No se encontraron activos con los filtros aplicados"
      />

      <Pagination
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        limit={LIMIT}
        onPageChange={p => setFilters(f => ({ ...f, page: p }))}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar activo"
        message={`¿Eliminar "${deleteTarget?.name}" (${deleteTarget?.code})? Se marcará como dado de baja y no aparecerá en el inventario.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        danger
      />

      {/* Create modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setCreateError(''); }}
        title="Registrar Nuevo Activo"
        size="lg"
      >
        {createError && <Alert type="error" message={createError} />}
        <AssetForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          loading={saving}
          error={createError}
        />
      </Modal>
    </div>
  );
};
