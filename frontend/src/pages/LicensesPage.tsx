import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Key, AlertTriangle, Users } from 'lucide-react';
import {
  PageHeader, Button, SearchBar, Card, Badge, Modal,
  Input, Textarea, Alert, Pagination, FullPageSpinner,
} from '../components/ui';
import { licenseService } from '../services';
import type { License, LicenseAssignment } from '../types';
import { fmt, isExpiringSoon, isExpired } from '../utils/helpers';
import { cls } from '../utils/helpers';

const LIMIT = 20;

const LicenseCard: React.FC<{
  license: License;
  onSelect: (l: License) => void;
}> = ({ license, onSelect }) => {
  const expiring = isExpiringSoon(license.expiry_date);
  const expired = isExpired(license.expiry_date);
  const usedPct = license.max_seats && license.used_seats != null
    ? Math.round((license.used_seats / license.max_seats) * 100)
    : null;

  return (
    <Card
      className="cursor-pointer hover:border-blue-600/40 hover:bg-slate-750 transition-all"
      onClick={() => onSelect(license)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600/20 rounded-lg flex items-center justify-center">
            <Key size={16} className="text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-100 text-sm">{license.name}</p>
            <p className="text-xs text-slate-500">{license.vendor ?? 'Sin proveedor'}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {expired ? (
            <Badge label="Vencida" variant="retired" dot />
          ) : expiring ? (
            <Badge label="Por vencer" variant="warning" dot />
          ) : (
            <Badge label={license.is_active ? 'Activa' : 'Inactiva'} variant={license.is_active ? 'active' : 'stored'} dot />
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs text-slate-400 mb-3">
        <div>
          <p className="text-slate-500 mb-0.5">Tipo</p>
          <p className="text-slate-300">{license.license_type ?? '—'}</p>
        </div>
        <div>
          <p className="text-slate-500 mb-0.5">Vencimiento</p>
          <p className={cls(expired ? 'text-red-400' : expiring ? 'text-amber-400' : 'text-slate-300')}>
            {fmt.date(license.expiry_date)}
            {(expired || expiring) && <AlertTriangle size={10} className="inline ml-1" />}
          </p>
        </div>
        <div>
          <p className="text-slate-500 mb-0.5">Costo</p>
          <p className="text-slate-300">{fmt.currency(license.cost)}</p>
        </div>
      </div>

      {license.max_seats && (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500 flex items-center gap-1">
              <Users size={10} /> Asientos usados
            </span>
            <span className="text-slate-300">{license.used_seats ?? 0} / {license.max_seats}</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cls(
                'h-full rounded-full transition-all',
                (usedPct ?? 0) >= 90 ? 'bg-red-500' : (usedPct ?? 0) >= 70 ? 'bg-amber-500' : 'bg-blue-500'
              )}
              style={{ width: `${Math.min(usedPct ?? 0, 100)}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
};

export const LicensesPage: React.FC = () => {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<License | null>(null);
  const [assignments, setAssignments] = useState<LicenseAssignment[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [form, setForm] = useState<Partial<License>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [assignForm, setAssignForm] = useState<{ asset_id?: string; user_id?: string; notes?: string }>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await licenseService.list({ search: search || undefined, page, limit: LIMIT });
      setLicenses(res.data);
      setMeta({ total: res.meta.total, page: res.meta.page, totalPages: res.meta.total_pages });
    } catch {
      setLicenses([]);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => setPage(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadAssignments = async (license: License) => {
    setSelected(license);
    setAssignLoading(true);
    try {
      const res = await licenseService.assignments(license.id);
      setAssignments(res.data ?? []);
    } catch {
      setAssignments([]);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await licenseService.create(form);
      setShowCreate(false);
      setForm({});
      load();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setFormError(e?.message ?? 'Error al crear licencia');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setFormError('');
    try {
      await licenseService.assign(selected.id, assignForm);
      setShowAssign(false);
      setAssignForm({});
      loadAssignments(selected);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setFormError(e?.message ?? 'Error al asignar licencia');
    } finally {
      setSaving(false);
    }
  };

  const setF = (k: keyof License) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gestión de Licencias"
        subtitle={`${meta.total} licencias registradas`}
        actions={
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>
            Nueva Licencia
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre, proveedor…" />
      </div>

      {loading ? <FullPageSpinner /> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {licenses.length === 0 ? (
              <div className="col-span-full text-center py-16 text-slate-500 text-sm">
                No se encontraron licencias
              </div>
            ) : (
              licenses.map(l => (
                <LicenseCard key={l.id} license={l} onSelect={loadAssignments} />
              ))
            )}
          </div>
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={LIMIT} onPageChange={setPage} />
        </>
      )}

      {/* License detail panel */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected.name} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                { label: 'Proveedor', value: selected.vendor },
                { label: 'Tipo', value: selected.license_type },
                { label: 'Compra', value: fmt.date(selected.purchase_date) },
                { label: 'Vencimiento', value: fmt.date(selected.expiry_date) },
                { label: 'Costo', value: fmt.currency(selected.cost) },
                { label: 'Asientos máx.', value: selected.max_seats },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-3">
                  <dt className="w-28 text-slate-500 text-xs pt-0.5">{label}</dt>
                  <dd className="text-slate-200">{value ?? '—'}</dd>
                </div>
              ))}
            </div>

            {selected.license_key && (
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Key size={10} /> Clave de licencia</p>
                <p className="font-mono text-sm text-blue-400 break-all">{selected.license_key}</p>
              </div>
            )}

            <div className="border-t border-slate-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Users size={14} /> Asignaciones activas ({assignments.filter(a => a.is_active).length})
                </h4>
                <Button variant="outline" size="sm" icon={<Plus size={12} />} onClick={() => setShowAssign(true)}>
                  Asignar
                </Button>
              </div>
              {assignLoading ? <FullPageSpinner /> : (
                assignments.filter(a => a.is_active).length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">Sin asignaciones activas</p>
                ) : (
                  <div className="space-y-2">
                    {assignments.filter(a => a.is_active).map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700">
                        <div>
                          <p className="text-sm text-slate-200">{a.asset?.name ?? a.user?.full_name ?? '—'}</p>
                          <p className="text-xs text-slate-500">{fmt.date(a.assigned_at)}</p>
                        </div>
                        <Badge label="Activa" variant="active" dot />
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Create license modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setFormError(''); }} title="Nueva Licencia" size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={handleCreate as unknown as () => void}>Crear</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}
          <Input label="Nombre" value={form.name ?? ''} onChange={setF('name')} required placeholder="Microsoft 365 Business" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Proveedor" value={form.vendor ?? ''} onChange={setF('vendor')} placeholder="Microsoft" />
            <Input label="Tipo" value={form.license_type ?? ''} onChange={setF('license_type')} placeholder="SaaS, OEM, Perpetual…" />
          </div>
          <Input label="Clave de Licencia" value={form.license_key ?? ''} onChange={setF('license_key')} placeholder="XXXX-XXXX-XXXX" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha de Compra" type="date" value={form.purchase_date ?? ''} onChange={setF('purchase_date')} />
            <Input label="Fecha de Vencimiento" type="date" value={form.expiry_date ?? ''} onChange={setF('expiry_date')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Asientos máximos" type="number" value={String(form.max_seats ?? '')} onChange={setF('max_seats')} placeholder="25" />
            <Input label="Costo" type="number" value={String(form.cost ?? '')} onChange={setF('cost')} placeholder="0.00" />
          </div>
          <Textarea label="Notas" value={form.notes ?? ''} onChange={setF('notes')} placeholder="Observaciones…" />
        </form>
      </Modal>

      {/* Assign modal */}
      <Modal open={showAssign} onClose={() => { setShowAssign(false); setFormError(''); }} title="Asignar Licencia" size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAssign(false)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={handleAssign as unknown as () => void}>Asignar</Button>
          </>
        }
      >
        <form onSubmit={handleAssign} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}
          <Input label="ID del Activo (opcional)" value={assignForm.asset_id ?? ''} onChange={e => setAssignForm(p => ({ ...p, asset_id: e.target.value }))} placeholder="UUID del activo" />
          <Input label="ID del Usuario (opcional)" value={assignForm.user_id ?? ''} onChange={e => setAssignForm(p => ({ ...p, user_id: e.target.value }))} placeholder="UUID del usuario" />
          <Textarea label="Notas" value={assignForm.notes ?? ''} onChange={e => setAssignForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observaciones…" />
        </form>
      </Modal>
    </div>
  );
};
