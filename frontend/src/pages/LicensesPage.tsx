import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Key, AlertTriangle, Users, Edit2, Trash2,
  FileDown, CheckSquare, Square, X,
} from 'lucide-react';
import {
  PageHeader, Button, SearchBar, Card, Badge, Modal,
  Input, Textarea, Alert, Pagination, FullPageSpinner, ConfirmDialog,
} from '../components/ui';
import { licenseService } from '../services';
import type { License, LicenseAssignment } from '../types';
import { fmt, isExpiringSoon, isExpired } from '../utils/helpers';
import { cls } from '../utils/helpers';

// PDF imports (jspdf v4 + jspdf-autotable v5)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import jsPDF from 'jspdf';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import autoTable from 'jspdf-autotable';

const LIMIT = 20;

// ─── PDF generation ───────────────────────────────────────────────────────────

const BLUE_R = 37, BLUE_G = 99, BLUE_B = 235; // blue-600

const generateLicensePDF = (licenses: License[]) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297;
  const BAND = 18;

  licenses.forEach((lic, idx) => {
    if (idx > 0) doc.addPage();

    // ── Top blue band ────────────────────────────────────────
    doc.setFillColor(BLUE_R, BLUE_G, BLUE_B);
    doc.rect(0, 0, W, BAND, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SIGAT-ES  ·  Reporte de Licencias', 10, 12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${fmt.datetime(new Date().toISOString())}`, W - 10, 12, { align: 'right' });

    // ── License name ─────────────────────────────────────────
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text(lic.name ?? '—', 12, 36);

    // ── Type / category ──────────────────────────────────────
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(lic.license_type ?? 'Sin categoría', 12, 46);

    // ── Dates ────────────────────────────────────────────────
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const purchaseStr = lic.purchase_date ? fmt.date(lic.purchase_date) : '—';
    const expiryStr   = lic.expiry_date   ? fmt.date(lic.expiry_date)   : '—';
    doc.text(`Compra: ${purchaseStr}  —  Vencimiento: ${expiryStr}`, 12, 56);

    // ── Created by ───────────────────────────────────────────
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const creator = lic.created_by_user?.full_name ?? '—';
    doc.text(`Registrado por: ${creator}`, 12, 64);

    // ── Separator ────────────────────────────────────────────
    doc.setDrawColor(203, 213, 225);
    doc.line(12, 69, W - 12, 69);

    // ── Details table ────────────────────────────────────────
    const rows: [string, string][] = [
      ['Proveedor',        lic.vendor          ?? '—'],
      ['Clave de licencia', lic.license_key    ?? '—'],
      ['Costo',            lic.cost != null ? fmt.currency(lic.cost) : '—'],
      ['Asientos máx.',    lic.max_seats != null ? String(lic.max_seats) : '—'],
      ['Asientos usados',  lic.used_seats != null ? String(lic.used_seats) : '—'],
      ['Estado',           lic.is_active ? 'Activa' : 'Inactiva'],
      ['Fecha de registro', fmt.date(lic.created_at)],
    ];

    if (lic.notes) rows.push(['Notas', lic.notes]);

    autoTable(doc, {
      startY: 73,
      head: [['Campo', 'Valor']],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: [BLUE_R, BLUE_G, BLUE_B],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55, fillColor: [248, 250, 252] },
        1: { cellWidth: 'auto' },
      },
      margin: { left: 12, right: 12 },
    });

    // ── Bottom blue band ─────────────────────────────────────
    doc.setFillColor(BLUE_R, BLUE_G, BLUE_B);
    doc.rect(0, H - BAND, W, BAND, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('SIGAT-ES  ·  Sistema de Gestión de Activos Tecnológicos  ·  Element System', W / 2, H - 7, { align: 'center' });
  });

  const filename = licenses.length === 1
    ? `licencia_${licenses[0].name.replace(/\s+/g, '_')}.pdf`
    : `licencias_${new Date().toISOString().slice(0, 10)}.pdf`;

  doc.save(filename);
};

// ─── LicenseCard ─────────────────────────────────────────────────────────────

const LicenseCard: React.FC<{
  license: License;
  checked: boolean;
  onToggleCheck: (id: string) => void;
  onSelect: (l: License) => void;
  onEdit: (l: License) => void;
  onDelete: (l: License) => void;
}> = ({ license, checked, onToggleCheck, onSelect, onEdit, onDelete }) => {
  const expiring = isExpiringSoon(license.expiry_date);
  const expired  = isExpired(license.expiry_date);
  const usedPct  = license.max_seats && license.used_seats != null
    ? Math.round((license.used_seats / license.max_seats) * 100)
    : null;

  return (
    <Card className={cls(
      'relative cursor-pointer hover:border-blue-600/40 hover:bg-slate-750 transition-all',
      checked && 'border-blue-500 bg-blue-950/20',
    )}>
      {/* Checkbox — top-right */}
      <button
        onClick={e => { e.stopPropagation(); onToggleCheck(license.id); }}
        className="absolute top-3 right-3 z-10 text-slate-400 hover:text-blue-400 transition-colors"
        title={checked ? 'Deseleccionar' : 'Seleccionar'}
      >
        {checked
          ? <CheckSquare size={16} className="text-blue-500" />
          : <Square size={16} />}
      </button>

      <div onClick={() => onSelect(license)} className="pr-8">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Key size={16} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-100 text-sm truncate">{license.name}</p>
            <p className="text-xs text-slate-500">{license.vendor ?? 'Sin proveedor'}</p>
          </div>
          <div>
            {expired ? (
              <Badge label="Vencida" variant="retired" dot />
            ) : expiring ? (
              <Badge label="Por vencer" variant="warning" dot />
            ) : (
              <Badge label={license.is_active ? 'Activa' : 'Inactiva'} variant={license.is_active ? 'active' : 'stored'} dot />
            )}
          </div>
        </div>

        {/* Info grid */}
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

        {/* Seats bar */}
        {license.max_seats && (
          <div className="mb-3">
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
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 pt-2 border-t border-slate-700/50 mt-1">
        <button
          onClick={e => { e.stopPropagation(); onEdit(license); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-1 rounded text-xs text-slate-400 hover:text-blue-400 hover:bg-blue-950/40 transition-colors"
        >
          <Edit2 size={11} /> Editar
        </button>
        <div className="w-px h-4 bg-slate-700" />
        <button
          onClick={e => { e.stopPropagation(); onDelete(license); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-1 rounded text-xs text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
        >
          <Trash2 size={11} /> Eliminar
        </button>
      </div>
    </Card>
  );
};

// ─── LicensesPage ─────────────────────────────────────────────────────────────

export const LicensesPage: React.FC = () => {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [meta, setMeta]         = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);

  // selection
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // detail
  const [selected, setSelected]       = useState<License | null>(null);
  const [assignments, setAssignments] = useState<LicenseAssignment[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // create / edit
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<License | null>(null);
  const [form, setForm]             = useState<Partial<License>>({});
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');

  // delete
  const [deleteTarget, setDeleteTarget]   = useState<License | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const [deleteSelected, setDeleteSelected] = useState(false);

  // assign
  const [showAssign, setShowAssign]   = useState(false);
  const [assignForm, setAssignForm]   = useState<{ asset_id?: string; user_id?: string; notes?: string }>({});

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

  // ── CRUD handlers ──────────────────────────────────────────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setFormError('');
    try {
      await licenseService.create(form);
      setShowCreate(false); setForm({}); load();
    } catch (err: unknown) {
      setFormError((err as { message?: string })?.message ?? 'Error al crear');
    } finally { setSaving(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true); setFormError('');
    try {
      await licenseService.update(editTarget.id, form);
      setEditTarget(null); setForm({}); load();
    } catch (err: unknown) {
      setFormError((err as { message?: string })?.message ?? 'Error al actualizar');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await licenseService.remove(deleteTarget.id);
      setDeleteTarget(null);
      setCheckedIds(prev => { const n = new Set(prev); n.delete(deleteTarget.id); return n; });
      load();
    } catch { /* ignore */ } finally { setDeleting(false); }
  };

  const handleDeleteSelected = async () => {
    setDeleting(true);
    try {
      await Promise.all([...checkedIds].map(id => licenseService.remove(id)));
      setCheckedIds(new Set());
      setDeleteSelected(false);
      load();
    } catch { /* ignore */ } finally { setDeleting(false); }
  };

  const openEdit = (l: License) => {
    setForm({
      name: l.name, vendor: l.vendor, license_type: l.license_type,
      license_key: l.license_key, purchase_date: l.purchase_date,
      expiry_date: l.expiry_date, max_seats: l.max_seats,
      cost: l.cost, notes: l.notes,
    });
    setEditTarget(l); setFormError('');
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true); setFormError('');
    try {
      await licenseService.assign(selected.id, assignForm);
      setShowAssign(false); setAssignForm({});
      loadAssignments(selected);
    } catch (err: unknown) {
      setFormError((err as { message?: string })?.message ?? 'Error al asignar');
    } finally { setSaving(false); }
  };

  const toggleCheck = (id: string) =>
    setCheckedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleAll = () =>
    setCheckedIds(prev =>
      prev.size === licenses.length ? new Set() : new Set(licenses.map(l => l.id))
    );

  const exportSelectedPDF = () => {
    const selected = licenses.filter(l => checkedIds.has(l.id));
    if (selected.length === 0) return;
    generateLicensePDF(selected);
  };

  const setF = (k: keyof License) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const openCreateModal = () => {
    setForm({}); setFormError(''); setShowCreate(true);
  };

  const checkedCount = checkedIds.size;

  // ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gestión de Licencias"
        subtitle={`${meta.total} licencias registradas`}
        actions={
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={openCreateModal}>
            Nueva Licencia
          </Button>
        }
      />

      {/* Selection action bar */}
      {checkedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-950 border border-blue-800 rounded-xl">
          <span className="text-blue-300 text-sm font-medium">{checkedCount} seleccionada{checkedCount > 1 ? 's' : ''}</span>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" icon={<FileDown size={13} />} onClick={exportSelectedPDF}>
            Exportar PDF
          </Button>
          <Button
            variant="ghost" size="sm"
            icon={<Trash2 size={13} />}
            onClick={() => setDeleteSelected(true)}
            className="text-red-400 hover:text-red-300"
          >
            Eliminar seleccionadas
          </Button>
          <button onClick={() => setCheckedIds(new Set())} className="p-1 text-slate-400 hover:text-slate-200">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Search + select-all */}
      <div className="flex items-center gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre, proveedor…" />
        {licenses.length > 0 && (
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors whitespace-nowrap"
          >
            {checkedIds.size === licenses.length
              ? <CheckSquare size={13} className="text-blue-400" />
              : <Square size={13} />}
            {checkedIds.size === licenses.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </button>
        )}
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
                <LicenseCard
                  key={l.id}
                  license={l}
                  checked={checkedIds.has(l.id)}
                  onToggleCheck={toggleCheck}
                  onSelect={loadAssignments}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))
            )}
          </div>
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={LIMIT} onPageChange={setPage} />
        </>
      )}

      {/* ── Detail modal ────────────────────────────────────────────── */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected.name} size="lg"
          footer={
            <div className="flex items-center gap-2 w-full">
              <Button variant="ghost" size="sm" icon={<Edit2 size={13} />} onClick={() => { setSelected(null); openEdit(selected); }}>Editar</Button>
              <Button variant="ghost" size="sm" icon={<Trash2 size={13} />} onClick={() => { setSelected(null); setDeleteTarget(selected); }} className="text-red-400 hover:text-red-300">Eliminar</Button>
              <div className="flex-1" />
              <Button variant="ghost" onClick={() => setSelected(null)}>Cerrar</Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                { label: 'Proveedor',      value: selected.vendor },
                { label: 'Tipo',           value: selected.license_type },
                { label: 'Compra',         value: fmt.date(selected.purchase_date) },
                { label: 'Vencimiento',    value: fmt.date(selected.expiry_date) },
                { label: 'Costo',          value: fmt.currency(selected.cost) },
                { label: 'Asientos máx.',  value: selected.max_seats },
                { label: 'Registrado por', value: selected.created_by_user?.full_name ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-3">
                  <dt className="w-32 text-slate-500 text-xs pt-0.5">{label}</dt>
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

      {/* ── Create modal ─────────────────────────────────────────────── */}
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
            <Input label="Tipo / Categoría" value={form.license_type ?? ''} onChange={setF('license_type')} placeholder="SaaS, OEM, Perpetual…" />
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

      {/* ── Edit modal ────────────────────────────────────────────────── */}
      <Modal open={!!editTarget} onClose={() => { setEditTarget(null); setFormError(''); }} title="Editar Licencia" size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={handleEdit as unknown as () => void}>Guardar</Button>
          </>
        }
      >
        <form onSubmit={handleEdit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}
          <Input label="Nombre" value={form.name ?? ''} onChange={setF('name')} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Proveedor" value={form.vendor ?? ''} onChange={setF('vendor')} />
            <Input label="Tipo / Categoría" value={form.license_type ?? ''} onChange={setF('license_type')} />
          </div>
          <Input label="Clave de Licencia" value={form.license_key ?? ''} onChange={setF('license_key')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha de Compra" type="date" value={form.purchase_date ?? ''} onChange={setF('purchase_date')} />
            <Input label="Fecha de Vencimiento" type="date" value={form.expiry_date ?? ''} onChange={setF('expiry_date')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Asientos máximos" type="number" value={String(form.max_seats ?? '')} onChange={setF('max_seats')} />
            <Input label="Costo" type="number" value={String(form.cost ?? '')} onChange={setF('cost')} />
          </div>
          <Textarea label="Notas" value={form.notes ?? ''} onChange={setF('notes')} />
        </form>
      </Modal>

      {/* ── Assign modal ─────────────────────────────────────────────── */}
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
          <Textarea label="Notas" value={assignForm.notes ?? ''} onChange={e => setAssignForm(p => ({ ...p, notes: e.target.value }))} />
        </form>
      </Modal>

      {/* ── Delete single confirm ─────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar licencia"
        message={`¿Eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        danger
      />

      {/* ── Delete selected confirm ───────────────────────────────────── */}
      <ConfirmDialog
        open={deleteSelected}
        title="Eliminar licencias seleccionadas"
        message={`¿Eliminar ${checkedCount} licencia${checkedCount > 1 ? 's' : ''}? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteSelected}
        onCancel={() => setDeleteSelected(false)}
        loading={deleting}
        danger
      />
    </div>
  );
};
