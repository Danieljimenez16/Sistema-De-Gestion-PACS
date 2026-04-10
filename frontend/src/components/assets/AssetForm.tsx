import React, { useEffect, useState } from 'react';
import { Input, Select, Textarea, Button, Alert } from '../ui';
import { catalogService } from '../../services';
import type { Asset, AssetType, AssetStatus, Brand, Area, Location, User } from '../../types';
import { userService } from '../../services';

interface AssetFormProps {
  initial?: Partial<Asset>;
  onSubmit: (data: Partial<Asset>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string;
}

export const AssetForm: React.FC<AssetFormProps> = ({
  initial = {}, onSubmit, onCancel, loading, error,
}) => {
  const [form, setForm] = useState<Partial<Asset>>({
    code: '', name: '', serial: '', model: '',
    description: '', notes: '', purchase_date: '', warranty_expiry: '',
    asset_type_id: '', brand_id: '', status_id: '',
    location_id: '', area_id: '', responsible_user_id: '',
    ...initial,
  });

  const [catalogs, setCatalogs] = useState<{
    types: AssetType[];
    statuses: AssetStatus[];
    brands: Brand[];
    areas: Area[];
    locations: Location[];
    users: User[];
  }>({ types: [], statuses: [], brands: [], areas: [], locations: [], users: [] });

  const [loadingCatalogs, setLoadingCatalogs] = useState(true);

  useEffect(() => {
    Promise.all([
      catalogService.assetTypes(),
      catalogService.assetStatuses(),
      catalogService.brands(),
      catalogService.areas(),
      catalogService.locations(),
      userService.list({ limit: 200 }),
    ]).then(([types, statuses, brands, areas, locations, users]) => {
      setCatalogs({
        types: types.data ?? [],
        statuses: statuses.data ?? [],
        brands: brands.data ?? [],
        areas: areas.data ?? [],
        locations: locations.data ?? [],
        users: users.data ?? [],
      });
    }).catch(() => {}).finally(() => setLoadingCatalogs(false));
  }, []);

  const set = (field: keyof Asset) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Clean empty strings
    const clean: Partial<Asset> = {};
    (Object.entries(form) as [keyof Asset, unknown][]).forEach(([k, v]) => {
      if (v !== '') (clean as Record<string, unknown>)[k] = v;
    });
    onSubmit(clean);
  };

  if (loadingCatalogs) return <div className="py-8 text-center text-slate-400 text-sm">Cargando catálogos…</div>;

  const toOpts = (arr: { id: string; name: string }[]) =>
    arr.map(i => ({ value: i.id, label: i.name }));

  const filteredLocations = form.area_id
    ? catalogs.locations.filter(l => l.area_id === form.area_id)
    : catalogs.locations;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <Alert type="error" message={error} />}

      <div className="grid grid-cols-2 gap-4">
        <Input label="Código de Activo" value={form.code ?? ''} onChange={set('code')} required placeholder="ELEM-001" />
        <Input label="Número de Serie" value={form.serial ?? ''} onChange={set('serial')} placeholder="SN123456" />
      </div>

      <Input label="Nombre del Activo" value={form.name ?? ''} onChange={set('name')} required placeholder="Laptop HP ProBook" />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Tipo de Activo"
          value={form.asset_type_id ?? ''}
          onChange={set('asset_type_id')}
          options={toOpts(catalogs.types)}
          placeholder="Seleccionar tipo…"
        />
        <Select
          label="Marca"
          value={form.brand_id ?? ''}
          onChange={set('brand_id')}
          options={toOpts(catalogs.brands)}
          placeholder="Seleccionar marca…"
        />
      </div>

      <Input label="Modelo" value={form.model ?? ''} onChange={set('model')} placeholder="ProBook 440 G9" />

      <div className="grid grid-cols-2 gap-4">
        <Input label="Fecha de Compra" type="date" value={form.purchase_date ?? ''} onChange={set('purchase_date')} />
        <Input label="Vencimiento de Garantía" type="date" value={form.warranty_expiry ?? ''} onChange={set('warranty_expiry')} />
      </div>

      <Select
        label="Estado"
        value={form.status_id ?? ''}
        onChange={set('status_id')}
        options={toOpts(catalogs.statuses)}
        placeholder="Seleccionar estado…"
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Área"
          value={form.area_id ?? ''}
          onChange={e => setForm(prev => ({ ...prev, area_id: e.target.value, location_id: '' }))}
          options={toOpts(catalogs.areas)}
          placeholder="Seleccionar área…"
        />
        <Select
          label="Ubicación"
          value={form.location_id ?? ''}
          onChange={set('location_id')}
          options={toOpts(filteredLocations)}
          placeholder="Seleccionar ubicación…"
        />
      </div>

      <Select
        label="Responsable"
        value={form.responsible_user_id ?? ''}
        onChange={set('responsible_user_id')}
        options={catalogs.users.map(u => ({ value: u.id, label: u.full_name }))}
        placeholder="Sin responsable asignado"
      />

      <Textarea label="Descripción" value={form.description ?? ''} onChange={set('description')} placeholder="Descripción del activo…" />
      <Textarea label="Notas" value={form.notes ?? ''} onChange={set('notes')} placeholder="Observaciones adicionales…" />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary" loading={loading}>
          {initial.id ? 'Guardar cambios' : 'Crear activo'}
        </Button>
      </div>
    </form>
  );
};
