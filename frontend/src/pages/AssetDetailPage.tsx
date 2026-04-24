import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit, RefreshCw, History, UserCheck,
  Info, AlertTriangle, UserPlus,
} from 'lucide-react';
import {
  Button, StatusBadge, Badge, Modal, Select, Textarea,
  Card, PageHeader, FullPageSpinner, Alert,
} from '../components/ui';
import { AssetForm } from '../components/assets/AssetForm';
import { assetService, catalogService, userService } from '../services';
import type { Asset, AssetStatus, Assignment, StatusHistory, Area, Location, User } from '../types';
import { fmt, isExpiringSoon, getErrorMessage } from '../utils/helpers';
import { useToast } from '../components/Toast';

type Tab = 'info' | 'history' | 'assignments';

export const AssetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('info');
  const [history, setHistory] = useState<{ assignments: Assignment[]; status_history: StatusHistory[] } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Modals
  const [showEdit, setShowEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  const [showStatusChange, setShowStatusChange] = useState(false);
  const [statuses, setStatuses] = useState<AssetStatus[]>([]);
  const [newStatusId, setNewStatusId] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Assignment modal state
  const [showAssign, setShowAssign] = useState(false);
  const [assignUsers, setAssignUsers] = useState<User[]>([]);
  const [assignAreas, setAssignAreas] = useState<Area[]>([]);
  const [assignLocations, setAssignLocations] = useState<Location[]>([]);
  const [assignForm, setAssignForm] = useState({ user_id: '', area_id: '', location_id: '', notes: '' });
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');

  const loadAsset = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await assetService.get(id);
      setAsset(res.data);
    } catch {
      navigate('/assets');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const loadHistory = useCallback(async () => {
    if (!id) return;
    setHistoryLoading(true);
    try {
      const res = await assetService.history(id);
      setHistory(res.data);
    } catch { /* ignore */ } finally {
      setHistoryLoading(false);
    }
  }, [id]);

  useEffect(() => { loadAsset(); }, [loadAsset]);

  useEffect(() => {
    if (tab === 'history' || tab === 'assignments') loadHistory();
  }, [tab, loadHistory]);

  useEffect(() => {
    catalogService.assetStatuses().then(r => setStatuses(r.data ?? [])).catch(() => {});
    Promise.all([
      userService.list({ limit: 200 }),
      catalogService.areas(),
      catalogService.locations(),
    ]).then(([u, a, l]) => {
      setAssignUsers(u.data ?? []);
      setAssignAreas(a.data ?? []);
      setAssignLocations(l.data ?? []);
    }).catch(() => {});
  }, []);

  const handleEdit = async (data: Partial<Asset>) => {
    if (!id) return;
    setSaving(true);
    setEditError('');
    try {
      await assetService.update(id, data);
      await loadAsset();
      setShowEdit(false);
      addToast('success', 'Activo actualizado correctamente.');
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Error al actualizar');
      setEditError(message);
      addToast('error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async () => {
    if (!id) return;
    if (!newStatusId) {
      addToast('error', 'Debes seleccionar un nuevo estado.');
      return;
    }
    setStatusSaving(true);
    setStatusError('');
    try {
      await assetService.changeStatus(id, { status_id: newStatusId, reason: statusReason });
      await loadAsset();
      setShowStatusChange(false);
      setNewStatusId('');
      setStatusReason('');
      addToast('success', 'Estado actualizado correctamente.');
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Error al cambiar estado');
      setStatusError(message);
      addToast('error', message);
    } finally {
      setStatusSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!id) return;
    setAssignSaving(true);
    setAssignError('');
    try {
      await assetService.changeAssignment(id, {
        user_id: assignForm.user_id || undefined,
        area_id: assignForm.area_id || undefined,
        location_id: assignForm.location_id || undefined,
        notes: assignForm.notes || undefined,
      });
      await Promise.all([loadAsset(), loadHistory()]);
      setShowAssign(false);
      setAssignForm({ user_id: '', area_id: '', location_id: '', notes: '' });
      addToast('success', 'Asignación actualizada correctamente.');
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Error al asignar activo');
      setAssignError(message);
      addToast('error', message);
    } finally {
      setAssignSaving(false);
    }
  };

  if (loading) return <FullPageSpinner />;
  if (!asset) return null;

  const warrantyExpiring = isExpiringSoon(asset.warranty_expiry);
  const warrantyExpired = asset.warranty_expiry && new Date(asset.warranty_expiry) < new Date();

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'info', label: 'Información', icon: <Info size={14} /> },
    { key: 'history', label: 'Historial', icon: <History size={14} /> },
    { key: 'assignments', label: 'Asignaciones', icon: <UserCheck size={14} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={asset.name}
        subtitle={`Código: ${asset.code}${asset.serial ? ` · Serial: ${asset.serial}` : ''}`}
        actions={
          <>
            <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={() => navigate('/assets')}>
              Volver
            </Button>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={loadAsset}>
              Actualizar
            </Button>
            <Button variant="secondary" size="sm" icon={<UserPlus size={14} />} onClick={() => { setAssignForm({ user_id: asset.responsible_user_id ?? '', area_id: asset.area_id ?? '', location_id: asset.location_id ?? '', notes: '' }); setShowAssign(true); }}>
              Reasignar
            </Button>
            <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => setShowStatusChange(true)}>
              Cambiar Estado
            </Button>
            <Button variant="primary" size="sm" icon={<Edit size={14} />} onClick={() => setShowEdit(true)}>
              Editar
            </Button>
          </>
        }
      />

      {/* Status + quick info strip */}
      <div className="flex items-center gap-4 flex-wrap">
        <StatusBadge status={asset.status?.name} />
        {asset.brand && <Badge label={asset.brand.name} variant="info" />}
        {asset.asset_type && <Badge label={asset.asset_type.name} variant="default" />}
        {warrantyExpired && (
          <Badge label="Garantía vencida" variant="retired" dot />
        )}
        {warrantyExpiring && !warrantyExpired && (
          <Badge label="Garantía por vencer" variant="warning" dot />
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-700">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
              tab === t.key
                ? 'text-blue-400 border-blue-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* General info */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Información General</h3>
            <dl className="space-y-3">
              {[
                { label: 'Nombre', value: asset.name },
                { label: 'Código', value: <span className="font-mono text-blue-400">{asset.code}</span> },
                { label: 'Serial', value: asset.serial ?? '—' },
                { label: 'Tipo', value: asset.asset_type?.name ?? '—' },
                { label: 'Marca', value: asset.brand?.name ?? '—' },
                { label: 'Modelo', value: asset.model ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-3">
                  <dt className="w-32 text-xs text-slate-500 shrink-0 pt-0.5">{label}</dt>
                  <dd className="text-sm text-slate-200 flex-1">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Location & assignment */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Ubicación y Asignación</h3>
            <dl className="space-y-3">
              {[
                { label: 'Área', value: asset.area?.name ?? '—' },
                { label: 'Ubicación', value: asset.location?.name ?? '—' },
                { label: 'Responsable', value: asset.responsible_user?.full_name ?? '—' },
                { label: 'Correo', value: asset.responsible_user?.email ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-3">
                  <dt className="w-32 text-xs text-slate-500 shrink-0 pt-0.5">{label}</dt>
                  <dd className="text-sm text-slate-200 flex-1">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Dates */}
          <Card>
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Fechas</h3>
            <dl className="space-y-3">
              {[
                { label: 'Compra', value: fmt.date(asset.purchase_date) },
                { label: 'Garantía hasta', value: asset.warranty_expiry ? (
                  <span className={warrantyExpired ? 'text-red-400' : warrantyExpiring ? 'text-amber-400' : ''}>
                    {fmt.date(asset.warranty_expiry)}
                    {warrantyExpired && <AlertTriangle size={12} className="inline ml-1" />}
                  </span>
                ) : '—' },
                { label: 'Registrado', value: fmt.datetime(asset.created_at) },
                { label: 'Actualizado', value: fmt.datetime(asset.updated_at) },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-3">
                  <dt className="w-32 text-xs text-slate-500 shrink-0 pt-0.5">{label}</dt>
                  <dd className="text-sm text-slate-200 flex-1">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Notes */}
          {(asset.description || asset.notes) && (
            <Card>
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Notas</h3>
              {asset.description && (
                <div className="mb-3">
                  <p className="text-xs text-slate-500 mb-1">Descripción</p>
                  <p className="text-sm text-slate-300">{asset.description}</p>
                </div>
              )}
              {asset.notes && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Observaciones</p>
                  <p className="text-sm text-slate-300">{asset.notes}</p>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {historyLoading ? <FullPageSpinner /> : (
            !history || history.status_history.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">Sin historial de estados</div>
            ) : (
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-700" />
                <div className="space-y-4">
                  {history.status_history.map((h) => (
                    <div key={h.id} className="relative flex items-start gap-4 pl-12">
                      <div className="absolute left-3.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-slate-900 mt-1" />
                      <Card className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {h.previous_status && (
                              <>
                                <StatusBadge status={h.previous_status.name} />
                                <span className="text-slate-600">→</span>
                              </>
                            )}
                            <StatusBadge status={h.new_status?.name} />
                          </div>
                          <span className="text-xs text-slate-500">{fmt.datetime(h.changed_at)}</span>
                        </div>
                        {h.changed_by_user && (
                          <p className="text-xs text-slate-500">Por: {h.changed_by_user.full_name}</p>
                        )}
                        {h.reason && (
                          <p className="text-sm text-slate-400 mt-1 italic">"{h.reason}"</p>
                        )}
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {tab === 'assignments' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              icon={<UserPlus size={14} />}
              onClick={() => { setAssignForm({ user_id: asset.responsible_user_id ?? '', area_id: asset.area_id ?? '', location_id: asset.location_id ?? '', notes: '' }); setShowAssign(true); }}
            >
              Reasignar activo
            </Button>
          </div>
          {historyLoading ? <FullPageSpinner /> : (
            !history || history.assignments.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">Sin historial de asignaciones</div>
            ) : (
              history.assignments.map(a => (
                <Card key={a.id}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {a.is_active ? (
                          <Badge label="Activa" variant="active" dot />
                        ) : (
                          <Badge label="Liberada" variant="stored" />
                        )}
                        <span className="text-sm font-medium text-slate-200">
                          {a.user?.full_name ?? a.area?.name ?? '—'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {a.location?.name && `Ubicación: ${a.location.name} · `}
                        {a.area?.name && `Área: ${a.area.name}`}
                      </p>
                      {a.notes && <p className="text-sm text-slate-400 italic">"{a.notes}"</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">{fmt.datetime(a.assigned_at)}</p>
                      {a.released_at && (
                        <p className="text-xs text-slate-600 mt-0.5">Liberado: {fmt.date(a.released_at)}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )
          )}
        </div>
      )}

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => { setShowEdit(false); setEditError(''); }} title="Editar Activo" size="lg">
        <AssetForm
          initial={asset}
          onSubmit={handleEdit}
          onCancel={() => setShowEdit(false)}
          loading={saving}
          error={editError}
        />
      </Modal>

      {/* Status change modal */}
      <Modal
        open={showStatusChange}
        onClose={() => setShowStatusChange(false)}
        title="Cambiar Estado del Activo"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowStatusChange(false)}>Cancelar</Button>
            <Button variant="primary" loading={statusSaving} onClick={handleStatusChange} disabled={!newStatusId}>
              Confirmar cambio
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {statusError && <Alert type="error" message={statusError} />}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-slate-400">Estado actual:</span>
            <StatusBadge status={asset.status?.name} />
          </div>
          <Select
            label="Nuevo Estado"
            value={newStatusId}
            onChange={e => setNewStatusId(e.target.value)}
            options={statuses.filter(s => s.id !== asset.status_id).map(s => ({ value: s.id, label: s.name }))}
            placeholder="Seleccionar nuevo estado…"
            required
          />
          <Textarea
            label="Razón del cambio"
            value={statusReason}
            onChange={e => setStatusReason(e.target.value)}
            placeholder="Motivo del cambio de estado…"
          />
        </div>
      </Modal>

      {/* Assignment modal */}
      <Modal
        open={showAssign}
        onClose={() => { setShowAssign(false); setAssignError(''); }}
        title="Reasignar Activo"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowAssign(false); setAssignError(''); }}>Cancelar</Button>
            <Button variant="primary" loading={assignSaving} onClick={handleAssign}>
              Confirmar asignación
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {assignError && <Alert type="error" message={assignError} />}
          <p className="text-xs text-slate-500">
            Asignar este activo a un responsable, área y/o ubicación. La asignación anterior quedará registrada en el historial.
          </p>
          <Select
            label="Responsable"
            value={assignForm.user_id}
            onChange={e => setAssignForm(f => ({ ...f, user_id: e.target.value }))}
            options={assignUsers.filter(u => u.is_active).map(u => ({ value: u.id, label: u.full_name }))}
            placeholder="Sin responsable (desvincular)"
          />
          <Select
            label="Área"
            value={assignForm.area_id}
            onChange={e => setAssignForm(f => ({ ...f, area_id: e.target.value, location_id: '' }))}
            options={assignAreas.filter(a => a.is_active).map(a => ({ value: a.id, label: a.name }))}
            placeholder="Sin área"
          />
          <Select
            label="Ubicación"
            value={assignForm.location_id}
            onChange={e => setAssignForm(f => ({ ...f, location_id: e.target.value }))}
            options={assignLocations
              .filter(l => l.is_active && (!assignForm.area_id || l.area_id === assignForm.area_id))
              .map(l => ({ value: l.id, label: l.name }))}
            placeholder="Sin ubicación"
          />
          <Textarea
            label="Motivo / Notas"
            value={assignForm.notes}
            onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Motivo del cambio de asignación…"
          />
        </div>
      </Modal>
    </div>
  );
};
