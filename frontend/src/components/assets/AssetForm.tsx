import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Input, Select, Textarea, Button, Alert } from '../ui';
import { FadeIn } from '../animations';
import { catalogService, assetService } from '../../services';
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
  const isCreate = !initial.id;

  const [form, setForm] = useState<Partial<Asset>>({
    code: '', name: '', serial: '', model: '',
    description: '', notes: '', purchase_date: '', warranty_expiry: '',
    asset_type_id: '', brand_id: '', status_id: '',
    location_id: '', area_id: '', responsible_user_id: '',
    ...initial,
  });

  const [catalogs, setCatalogs] = useState<{
    types: AssetType[]; statuses: AssetStatus[]; brands: Brand[];
    areas: Area[]; locations: Location[]; users: User[];
  }>({ types: [], statuses: [], brands: [], areas: [], locations: [], users: [] });

  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [loadingCode, setLoadingCode]         = useState(false);
  const [autoCode, setAutoCode]               = useState('');

  // Load catalogs + (on create) auto-generate code
  useEffect(() => {
    const catalogsP = Promise.all([
      catalogService.assetTypes(),
      catalogService.assetStatuses(),
      catalogService.brands(),
      catalogService.areas(),
      catalogService.locations(),
      userService.list({ limit: 200 }),
    ]).then(([types, statuses, brands, areas, locations, users]) => {
      setCatalogs({
        types:     types.data     ?? [],
        statuses:  statuses.data  ?? [],
        brands:    brands.data    ?? [],
        areas:     areas.data     ?? [],
        locations: locations.data ?? [],
        users:     users.data     ?? [],
      });
    });

    const codeP = isCreate
      ? (setLoadingCode(true),
         assetService.nextCode()
           .then(r => { setAutoCode(r.data.next_code); setForm(f => ({ ...f, code: r.data.next_code })); })
           .catch(() => { setAutoCode('ELEM-001'); setForm(f => ({ ...f, code: 'ELEM-001' })); })
           .finally(() => setLoadingCode(false)))
      : Promise.resolve();

    Promise.all([catalogsP, codeP]).finally(() => setLoadingCatalogs(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (field: keyof Asset) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean: Partial<Asset> = {};
    (Object.entries(form) as [keyof Asset, unknown][]).forEach(([k, v]) => {
      if (v !== '') (clean as Record<string, unknown>)[k] = v;
    });
    onSubmit(clean);
  };

  if (loadingCatalogs) {
    return (
      <div className="py-12 flex flex-col items-center gap-3 text-slate-400 text-sm">
        <Loader2 size={24} className="animate-spin text-blue-500" />
        Cargando catálogos…
      </div>
    );
  }

  const toOpts = (arr: { id: string; name: string }[]) =>
    arr.map(i => ({ value: i.id, label: i.name }));

  const filteredLocations = form.area_id
    ? catalogs.locations.filter(l => l.area_id === form.area_id)
    : catalogs.locations;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <FadeIn delay={0} direction="none">
          <Alert type="error" message={error} />
        </FadeIn>
      )}

      {/* ── Auto-generated code badge (create) / editable code (edit) ── */}
      <FadeIn delay={60} direction="up">
        {isCreate ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">
              Código de Activo
            </label>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/80 border border-blue-700/50">
              {loadingCode ? (
                <Loader2 size={14} className="animate-spin text-blue-400" />
              ) : (
                <Sparkles size={14} className="text-blue-400 shrink-0" />
              )}
              <span className="font-mono text-sm font-semibold text-blue-300 tracking-wider">
                {loadingCode ? 'Generando…' : autoCode}
              </span>
              <span className="ml-auto text-xs text-slate-500">Auto-generado</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Código de Activo"
              value={form.code ?? ''}
              onChange={set('code')}
              required
              placeholder="ELEM-001"
            />
            <Input
              label="Número de Serie"
              value={form.serial ?? ''}
              onChange={set('serial')}
              placeholder="SN123456"
            />
          </div>
        )}
      </FadeIn>

      {/* Serial (only shown separately in create mode) */}
      {isCreate && (
        <FadeIn delay={120} direction="up">
          <Input
            label="Número de Serie"
            value={form.serial ?? ''}
            onChange={set('serial')}
            placeholder="SN123456"
          />
        </FadeIn>
      )}

      <FadeIn delay={isCreate ? 180 : 120} direction="up">
        <Input
          label="Nombre del Activo"
          value={form.name ?? ''}
          onChange={set('name')}
          required
          placeholder="Laptop HP ProBook"
        />
      </FadeIn>

      <FadeIn delay={isCreate ? 240 : 180} direction="up">
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
      </FadeIn>

      <FadeIn delay={isCreate ? 300 : 240} direction="up">
        <Input
          label="Modelo"
          value={form.model ?? ''}
          onChange={set('model')}
          placeholder="ProBook 440 G9"
        />
      </FadeIn>

      <FadeIn delay={isCreate ? 360 : 300} direction="up">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Fecha de Compra"
            type="date"
            value={form.purchase_date ?? ''}
            onChange={set('purchase_date')}
          />
          <Input
            label="Vencimiento de Garantía"
            type="date"
            value={form.warranty_expiry ?? ''}
            onChange={set('warranty_expiry')}
          />
        </div>
      </FadeIn>

      <FadeIn delay={isCreate ? 420 : 360} direction="up">
        <Select
          label="Estado"
          value={form.status_id ?? ''}
          onChange={set('status_id')}
          options={toOpts(catalogs.statuses)}
          placeholder="Seleccionar estado…"
        />
      </FadeIn>

      <FadeIn delay={isCreate ? 480 : 420} direction="up">
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
      </FadeIn>

      <FadeIn delay={isCreate ? 540 : 480} direction="up">
        <Select
          label="Responsable"
          value={form.responsible_user_id ?? ''}
          onChange={set('responsible_user_id')}
          options={catalogs.users.map(u => ({ value: u.id, label: u.full_name }))}
          placeholder="Sin responsable asignado"
        />
      </FadeIn>

      <FadeIn delay={isCreate ? 600 : 540} direction="up">
        <Textarea
          label="Descripción"
          value={form.description ?? ''}
          onChange={set('description')}
          placeholder="Descripción del activo…"
        />
      </FadeIn>

      <FadeIn delay={isCreate ? 660 : 600} direction="up">
        <Textarea
          label="Notas"
          value={form.notes ?? ''}
          onChange={set('notes')}
          placeholder="Observaciones adicionales…"
        />
      </FadeIn>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary" loading={loading}>
          {initial.id ? 'Guardar cambios' : 'Crear activo'}
        </Button>
      </div>
    </form>
  );
};
