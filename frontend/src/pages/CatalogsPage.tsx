import React, { useEffect, useState } from 'react';
import { Plus, Settings } from 'lucide-react';
import {
  PageHeader, Button, Table, Modal, Input, Textarea,
  Select, Alert, Badge, FullPageSpinner,
} from '../components/ui';
import { catalogService } from '../services';
import type { Area, Location, AssetType, Brand } from '../types';
import { fmt, getErrorMessage, sanitizeHumanName, validateHumanName, validateRequiredFields } from '../utils/helpers';
import { useToast } from '../components/Toast';

type CatalogTab = 'areas' | 'locations' | 'asset_types' | 'brands';

const TAB_LABELS: Record<CatalogTab, string> = {
  areas: 'Áreas',
  locations: 'Ubicaciones',
  asset_types: 'Tipos de Activo',
  brands: 'Marcas',
};

export const CatalogsPage: React.FC = () => {
  const { addToast } = useToast();
  const [tab, setTab] = useState<CatalogTab>('areas');
  const [loading, setLoading] = useState(true);

  const [areas, setAreas] = useState<Area[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<{ id: string; name: string; description?: string; area_id?: string } | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: '', description: '', area_id: '' });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [a, l, t, b] = await Promise.all([
        catalogService.areas(),
        catalogService.locations(),
        catalogService.assetTypes(),
        catalogService.brands(),
      ]);
      setAreas(a.data ?? []);
      setLocations(l.data ?? []);
      setAssetTypes(t.data ?? []);
      setBrands(b.data ?? []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const openCreate = () => {
    setForm({ name: '', description: '', area_id: '' });
    setFormError('');
    setShowCreate(true);
  };

  const openEdit = (item: { id: string; name: string; description?: string; area_id?: string }) => {
    setForm({ name: item.name, description: item.description ?? '', area_id: item.area_id ?? '' });
    setShowEdit(item);
    setFormError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiredError = validateRequiredFields([{ label: 'Nombre', value: form.name }]);
    const nameError = validateHumanName('Nombre', form.name);
    const validationError = requiredError ?? nameError;
    if (validationError) {
      setFormError(validationError);
      addToast('error', validationError);
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = { name: form.name, description: form.description || undefined, area_id: form.area_id || undefined };
      if (tab === 'areas') await catalogService.createArea(payload);
      else if (tab === 'locations') await catalogService.createLocation(payload);
      else if (tab === 'asset_types') await catalogService.createAssetType(payload);
      else if (tab === 'brands') await catalogService.createBrand(payload);
      setShowCreate(false);
      addToast('success', 'Catálogo creado correctamente.');
      loadAll();
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Error al crear');
      setFormError(message);
      addToast('error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEdit) return;
    const requiredError = validateRequiredFields([{ label: 'Nombre', value: form.name }]);
    const nameError = validateHumanName('Nombre', form.name);
    const validationError = requiredError ?? nameError;
    if (validationError) {
      setFormError(validationError);
      addToast('error', validationError);
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = { name: form.name, description: form.description || undefined, area_id: form.area_id || undefined };
      if (tab === 'areas') await catalogService.updateArea(showEdit.id, payload);
      else if (tab === 'locations') await catalogService.updateLocation(showEdit.id, payload);
      else if (tab === 'asset_types') await catalogService.updateAssetType(showEdit.id, payload);
      else if (tab === 'brands') await catalogService.updateBrand(showEdit.id, payload);
      setShowEdit(null);
      addToast('success', 'Catálogo actualizado correctamente.');
      loadAll();
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Error al actualizar');
      setFormError(message);
      addToast('error', message);
    } finally {
      setSaving(false);
    }
  };

  // Table configs
  const activeCol = {
    key: 'is_active',
    header: 'Estado',
    width: '90px',
    render: (row: Record<string, unknown>) => (
      <Badge label={row['is_active'] ? 'Activo' : 'Inactivo'} variant={row['is_active'] ? 'active' : 'stored'} dot />
    ),
  };

  const dateCol = {
    key: 'created_at',
    header: 'Creado',
    width: '120px',
    render: (row: Record<string, unknown>) => (
      <span className="text-slate-500 text-xs">{fmt.date(row['created_at'] as string)}</span>
    ),
  };

  const editCol = (handler: (row: Record<string, unknown>) => void) => ({
    key: 'actions',
    header: '',
    width: '80px',
    render: (row: Record<string, unknown>) => (
      <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); handler(row); }}>
        Editar
      </Button>
    ),
  });

  const areaColumns = [
    { key: 'name', header: 'Nombre', render: (r: Record<string, unknown>) => <span className="font-medium text-slate-200">{r['name'] as string}</span> },
    { key: 'description', header: 'Descripción', render: (r: Record<string, unknown>) => <span className="text-slate-400 text-sm">{(r['description'] as string) ?? '—'}</span> },
    activeCol,
    dateCol,
    editCol(r => openEdit(r as unknown as Area)),
  ];

  const locationColumns = [
    { key: 'name', header: 'Nombre', render: (r: Record<string, unknown>) => <span className="font-medium text-slate-200">{r['name'] as string}</span> },
    { key: 'area', header: 'Área', render: (r: Record<string, unknown>) => <span className="text-slate-400 text-sm">{(r['area'] as { name: string } | undefined)?.name ?? '—'}</span> },
    { key: 'description', header: 'Descripción', render: (r: Record<string, unknown>) => <span className="text-slate-400 text-sm">{(r['description'] as string) ?? '—'}</span> },
    activeCol,
    editCol(r => openEdit(r as unknown as Location)),
  ];

  const typeColumns = [
    { key: 'name', header: 'Nombre', render: (r: Record<string, unknown>) => <span className="font-medium text-slate-200">{r['name'] as string}</span> },
    { key: 'description', header: 'Descripción', render: (r: Record<string, unknown>) => <span className="text-slate-400 text-sm">{(r['description'] as string) ?? '—'}</span> },
    activeCol,
    dateCol,
    editCol(r => openEdit(r as unknown as AssetType)),
  ];

  const brandColumns = [
    { key: 'name', header: 'Nombre', render: (r: Record<string, unknown>) => <span className="font-medium text-slate-200">{r['name'] as string}</span> },
    activeCol,
    dateCol,
    editCol(r => openEdit(r as unknown as Brand)),
  ];

  const tableMap: Record<CatalogTab, { data: Record<string, unknown>[]; columns: typeof areaColumns }> = {
    areas: { data: areas as unknown as Record<string, unknown>[], columns: areaColumns },
    locations: { data: locations as unknown as Record<string, unknown>[], columns: locationColumns },
    asset_types: { data: assetTypes as unknown as Record<string, unknown>[], columns: typeColumns },
    brands: { data: brands as unknown as Record<string, unknown>[], columns: brandColumns },
  };

  const current = tableMap[tab];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Catálogos del Sistema"
        subtitle="Administración de valores de referencia"
        actions={
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={openCreate}>
            Agregar {TAB_LABELS[tab].slice(0, -1)}
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-700">
        {(Object.keys(TAB_LABELS) as CatalogTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
              tab === t ? 'text-blue-400 border-blue-500' : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Settings size={13} /> {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {loading ? <FullPageSpinner /> : (
        <Table
          columns={current.columns}
          data={current.data}
          emptyMessage={`No hay ${TAB_LABELS[tab].toLowerCase()} registradas`}
        />
      )}

      {/* Create modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={`Nueva ${TAB_LABELS[tab].slice(0, -1)}`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={handleCreate as unknown as () => void}>Crear</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}
          <Input label="Nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: sanitizeHumanName(e.target.value) }))} required />
          {tab !== 'brands' && (
            <Textarea label="Descripción" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          )}
          {tab === 'locations' && (
            <Select
              label="Área"
              value={form.area_id}
              onChange={e => setForm(f => ({ ...f, area_id: e.target.value }))}
              options={areas.map(a => ({ value: a.id, label: a.name }))}
              placeholder="Seleccionar área…"
            />
          )}
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!showEdit}
        onClose={() => setShowEdit(null)}
        title={`Editar ${TAB_LABELS[tab].slice(0, -1)}`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowEdit(null)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={handleEdit as unknown as () => void}>Guardar</Button>
          </>
        }
      >
        <form onSubmit={handleEdit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}
          <Input label="Nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: sanitizeHumanName(e.target.value) }))} required />
          {tab !== 'brands' && (
            <Textarea label="Descripción" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          )}
          {tab === 'locations' && (
            <Select
              label="Área"
              value={form.area_id}
              onChange={e => setForm(f => ({ ...f, area_id: e.target.value }))}
              options={areas.map(a => ({ value: a.id, label: a.name }))}
              placeholder="Sin área"
            />
          )}
        </form>
      </Modal>
    </div>
  );
};
