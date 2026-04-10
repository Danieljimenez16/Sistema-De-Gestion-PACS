import React, { useEffect, useState, useCallback } from 'react';
import { Eye } from 'lucide-react';
import {
  PageHeader, Table, Pagination, Badge, Modal,
  Select, Input, Button, Card,
} from '../components/ui';
import { auditService } from '../services';
import type { AuditEvent, AuditFilters } from '../types';
import { fmt, ACTION_LABELS, ENTITY_LABELS } from '../utils/helpers';

const LIMIT = 30;

const ACTION_VARIANT: Record<string, 'active' | 'info' | 'warning' | 'retired' | 'stored' | 'default'> = {
  CREATE: 'active',
  UPDATE: 'info',
  DELETE: 'retired',
  STATUS_CHANGE: 'warning',
  ASSIGN: 'info',
  RELEASE: 'stored',
  LOGIN: 'default',
  LOGOUT: 'default',
};

export const AuditPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AuditFilters>({ page: 1, limit: LIMIT });
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditService.list(filters);
      setEvents(res.data);
      setMeta({ total: res.meta.total, page: res.meta.page, totalPages: res.meta.total_pages });
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const setF = <K extends keyof AuditFilters>(k: K, v: AuditFilters[K]) =>
    setFilters(f => ({ ...f, [k]: v || undefined, page: 1 }));

  const columns = [
    {
      key: 'performed_at',
      header: 'Fecha y Hora',
      width: '160px',
      render: (row: AuditEvent) => (
        <span className="text-slate-400 text-xs font-mono">{fmt.datetime(row.performed_at)}</span>
      ),
    },
    {
      key: 'entity_type',
      header: 'Entidad',
      width: '110px',
      render: (row: AuditEvent) => (
        <Badge label={ENTITY_LABELS[row.entity_type] ?? row.entity_type} variant="default" />
      ),
    },
    {
      key: 'action',
      header: 'Acción',
      width: '130px',
      render: (row: AuditEvent) => (
        <Badge
          label={ACTION_LABELS[row.action] ?? row.action}
          variant={ACTION_VARIANT[row.action] ?? 'default'}
        />
      ),
    },
    {
      key: 'performed_by',
      header: 'Realizado por',
      render: (row: AuditEvent) => (
        <span className="text-slate-300 text-sm">
          {row.performed_by_user?.full_name ?? row.performed_by ?? '—'}
        </span>
      ),
    },
    {
      key: 'ip_address',
      header: 'IP',
      width: '120px',
      render: (row: AuditEvent) => (
        <span className="text-slate-500 text-xs font-mono">{row.ip_address ?? '—'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '40px',
      render: (row: AuditEvent) => (
        <button
          onClick={e => { e.stopPropagation(); setSelected(row); }}
          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <Eye size={14} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Registro de Auditoría"
        subtitle={`${meta.total} eventos registrados`}
      />

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
        <Select
          label="Entidad"
          value={filters.entity_type ?? ''}
          onChange={e => setF('entity_type', e.target.value)}
          options={Object.entries(ENTITY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          placeholder="Todas las entidades"
        />
        <Select
          label="Acción"
          value={filters.action ?? ''}
          onChange={e => setF('action', e.target.value)}
          options={Object.entries(ACTION_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          placeholder="Todas las acciones"
        />
        <Input
          label="Desde"
          type="datetime-local"
          value={filters.from ?? ''}
          onChange={e => setF('from', e.target.value)}
        />
        <Input
          label="Hasta"
          type="datetime-local"
          value={filters.to ?? ''}
          onChange={e => setF('to', e.target.value)}
        />
      </div>

      {filters.entity_type || filters.action || filters.from || filters.to ? (
        <Button variant="ghost" size="sm" onClick={() => setFilters({ page: 1, limit: LIMIT })}>
          Limpiar filtros
        </Button>
      ) : null}

      <Table
        columns={columns}
        data={events}
        loading={loading}
        onRowClick={(row) => setSelected(row)}
        emptyMessage="No hay eventos de auditoría con los filtros aplicados"
      />

      <Pagination
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        limit={LIMIT}
        onPageChange={p => setFilters(f => ({ ...f, page: p }))}
      />

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detalle del Evento" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Fecha', value: fmt.datetime(selected.performed_at) },
                { label: 'Entidad', value: ENTITY_LABELS[selected.entity_type] ?? selected.entity_type },
                { label: 'ID Entidad', value: <span className="font-mono text-xs text-blue-400">{selected.entity_id ?? '—'}</span> },
                { label: 'Acción', value: ACTION_LABELS[selected.action] ?? selected.action },
                { label: 'Realizado por', value: selected.performed_by_user?.full_name ?? selected.performed_by ?? '—' },
                { label: 'IP', value: <span className="font-mono text-xs">{selected.ip_address ?? '—'}</span> },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-slate-200">{value}</span>
                </div>
              ))}
            </div>

            {selected.notes && (
              <Card>
                <p className="text-xs text-slate-500 mb-1">Notas</p>
                <p className="text-sm text-slate-300">{selected.notes}</p>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-4">
              {selected.old_values && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Valores anteriores</p>
                  <pre className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-red-300 overflow-auto max-h-48">
                    {JSON.stringify(selected.old_values, null, 2)}
                  </pre>
                </div>
              )}
              {selected.new_values && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Valores nuevos</p>
                  <pre className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-green-300 overflow-auto max-h-48">
                    {JSON.stringify(selected.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
