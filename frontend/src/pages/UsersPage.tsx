import React, { useEffect, useState, useCallback } from 'react';
import { Plus, UserCheck, UserX, Shield, Edit2, Eye, LayoutGrid, List, KeyRound, Bell, Copy } from 'lucide-react';
import {
  PageHeader, Button, SearchBar, Table, Pagination,
  Badge, Modal, Input, Select, Alert, ConfirmDialog,
} from '../components/ui';
import { RoleBadge, FadeIn } from '../components/animations';
import { ChromaGrid } from '../components/ChromaGrid';
import type { ChromaItem } from '../components/ChromaGrid';
import { userService, catalogService } from '../services';
import type { User, PasswordChangeRequest } from '../types';
import { fmt } from '../utils/helpers';

const LIMIT = 20;
const emptyForm = {
  full_name: '',
  email: '',
  role_id: '',
};

// Role icon map
const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin:  <Shield size={12} className="text-red-400" />,
  editor: <Edit2  size={12} className="text-amber-400" />,
  reader: <Eye    size={12} className="text-teal-400" />,
};

export const UsersPage: React.FC = () => {
  const [users, setUsers]   = useState<User[]>([]);
  const [meta, setMeta]     = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [roles, setRoles]   = useState<{ id: string; name: string }[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit]     = useState<User | null>(null);
  const [formError, setFormError]   = useState('');
  const [saving, setSaving]         = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<User | null>(null);
  const [toggling, setToggling]     = useState(false);
  const [viewMode, setViewMode]     = useState<'table' | 'grid'>('table');
  const [passwordRequests, setPasswordRequests] = useState<PasswordChangeRequest[]>([]);
  const [confirmReset, setConfirmReset] = useState<User | null>(null);
  const [resetting, setResetting]       = useState(false);
  const [passwordResult, setPasswordResult] = useState<{ title: string; name: string; email?: string; password: string } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.list({ search: search || undefined, page, limit: LIMIT });
      setUsers(res.data);
      setMeta({ total: res.meta.total, page: res.meta.page, totalPages: res.meta.total_pages });
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setTimeout(() => setPage(1), 400); return () => clearTimeout(t); }, [search]);
  useEffect(() => {
    catalogService.roles().then(r => setRoles(r.data ?? [])).catch(() => {});
    userService.getPendingPasswordRequests()
      .then(r => setPasswordRequests(r.data ?? []))
      .catch(() => {});
  }, []);

  const handleResetPassword = async () => {
    if (!confirmReset) return;
    setResetting(true);
    try {
      const res = await userService.resetPassword(confirmReset.id);
      setPasswordRequests(prev => prev.filter(r => r.user_id !== confirmReset.id));
      if (res.data?.temp_password) {
        setPasswordResult({
          title: 'Contraseña restablecida',
          name: confirmReset.full_name,
          email: confirmReset.email,
          password: res.data.temp_password,
        });
        setCopiedPassword(false);
      }
      setConfirmReset(null);
    } catch { /* ignore */ } finally { setResetting(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setFormError('');
    try {
      const res = await userService.create({
        full_name: form.full_name,
        email: form.email,
        role_id: form.role_id,
      });
      setShowCreate(false);
      if (res.data?.temp_password) {
        setPasswordResult({
          title: 'Usuario creado',
          name: res.data.full_name,
          email: res.data.email,
          password: res.data.temp_password,
        });
        setCopiedPassword(false);
      }
      setForm(emptyForm);
      load();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setFormError(e?.message ?? 'Error al crear usuario');
    } finally { setSaving(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEdit) return;
    setSaving(true); setFormError('');
    try {
      await userService.update(showEdit.id, {
        full_name: form.full_name,
        role_id: form.role_id || undefined,
      });
      setShowEdit(null); load();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setFormError(e?.message ?? 'Error al actualizar usuario');
    } finally { setSaving(false); }
  };

  const handleToggle = async () => {
    if (!confirmToggle) return;
    setToggling(true);
    try {
      await userService.toggleStatus(confirmToggle.id, !confirmToggle.is_active);
      setConfirmToggle(null); load();
    } catch { /* ignore */ } finally { setToggling(false); }
  };

  const openEdit = (user: User) => {
    setForm({ ...emptyForm, full_name: user.full_name, email: user.email ?? '', role_id: user.role_id ?? '' });
    setShowEdit(user); setFormError('');
  };

  const copyPassword = async () => {
    if (!passwordResult?.password) return;
    await navigator.clipboard.writeText(passwordResult.password);
    setCopiedPassword(true);
  };

  // Client-side role filter
  const filteredUsers = roleFilter
    ? users.filter(u => (u.role?.name ?? '').toLowerCase() === roleFilter)
    : users;

  // Role → ChromaGrid gradient/border
  const roleGradient = (roleName?: string): { gradient: string; borderColor: string } => {
    const r = (roleName ?? '').toLowerCase();
    if (r === 'admin')  return { gradient: 'linear-gradient(135deg,#7f1d1d 0%,#450a0a 100%)',  borderColor: 'rgba(220,38,38,0.6)'  };
    if (r === 'editor') return { gradient: 'linear-gradient(135deg,#78350f 0%,#3c1a00 100%)',  borderColor: 'rgba(217,119,6,0.6)'  };
    if (r === 'reader') return { gradient: 'linear-gradient(135deg,#134e4a 0%,#042f2e 100%)',  borderColor: 'rgba(13,148,136,0.6)' };
    return { gradient: 'linear-gradient(135deg,#1e293b 0%,#0f172a 100%)', borderColor: 'rgba(71,85,105,0.5)' };
  };

  const chromaItems: ChromaItem[] = filteredUsers.map(u => {
    const { gradient, borderColor } = roleGradient(u.role?.name);
    const roleKey = (u.role?.name ?? '').toLowerCase();
    return {
      id: u.id,
      title: u.full_name,
      subtitle: u.email,
      handle: u.is_active ? 'Activo' : 'Inactivo',
      badge: u.role?.name ?? 'Sin rol',
      gradient, borderColor,
      icon: (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {roleKey === 'admin'  ? <Shield size={42} color="#fca5a5" /> :
           roleKey === 'editor' ? <Edit2  size={42} color="#fcd34d" /> :
                                  <Eye    size={42} color="#5eead4" />}
        </span>
      ),
      onClick: () => openEdit(u),
    };
  });

  const roleOpts = roles.map(r => ({ value: r.id, label: r.name }));

  // Role stat counts
  const roleCounts = roles.reduce<Record<string, number>>((acc, r) => {
    acc[r.name.toLowerCase()] = users.filter(u => (u.role?.name ?? '').toLowerCase() === r.name.toLowerCase()).length;
    return acc;
  }, {});

  const columns = [
    {
      key: 'full_name',
      header: 'Usuario',
      render: (row: User) => {
        const roleKey = (row.role?.name ?? '').toLowerCase();
        const avatarColor = roleKey === 'admin'
          ? 'from-red-600 to-red-800'
          : roleKey === 'editor'
            ? 'from-amber-600 to-amber-800'
            : 'from-teal-600 to-teal-800';
        return (
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center flex-shrink-0`}>
              {ROLE_ICONS[roleKey] ?? (
                <span className="text-xs font-bold text-white">
                  {row.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </span>
              )}
            </div>
            <div>
              <p className="font-medium text-slate-200 text-sm">{row.full_name}</p>
              <p className="text-xs text-slate-500">{row.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Rol',
      render: (row: User) => <RoleBadge role={row.role?.name} />,
    },
    {
      key: 'is_active',
      header: 'Estado',
      render: (row: User) => (
        <Badge label={row.is_active ? 'Activo' : 'Inactivo'} variant={row.is_active ? 'active' : 'stored'} dot />
      ),
    },
    {
      key: 'created_at',
      header: 'Registrado',
      render: (row: User) => (
        <span className="text-slate-500 text-xs">{fmt.date(row.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '160px',
      render: (row: User) => {
        const hasPendingRequest = passwordRequests.some(r => r.user_id === row.id);
        return (
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Editar</Button>
            {hasPendingRequest && (
              <Button
                variant="ghost"
                size="sm"
                icon={<KeyRound size={12} className="text-amber-400" />}
                onClick={() => setConfirmReset(row)}
                title="Solicitud de cambio de contraseña pendiente"
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              icon={row.is_active ? <UserX size={12} /> : <UserCheck size={12} />}
              onClick={() => setConfirmToggle(row)}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <FadeIn delay={0} direction="up">
        <PageHeader
          title="Gestión de Usuarios"
          subtitle={`${meta.total} usuarios registrados`}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(v => v === 'table' ? 'grid' : 'table')}
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
                title={viewMode === 'table' ? 'Vista cuadrícula' : 'Vista tabla'}
              >
                {viewMode === 'table' ? <LayoutGrid size={16} /> : <List size={16} />}
              </button>
              <Button
                variant="primary" size="sm" icon={<Plus size={14} />}
                onClick={() => { setShowCreate(true); setFormError(''); setForm(emptyForm); }}
              >
                Nuevo Usuario
              </Button>
            </div>
          }
        />
      </FadeIn>

      {/* Password change request notifications */}
      {passwordRequests.length > 0 && (
        <FadeIn delay={40} direction="up">
          <div className="flex items-start gap-3 px-4 py-3 bg-amber-950 border border-amber-800 rounded-xl text-amber-300 text-sm">
            <Bell size={16} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">{passwordRequests.length} solicitud{passwordRequests.length > 1 ? 'es' : ''} de cambio de contraseña</span>
              <span className="text-amber-400 text-xs block mt-0.5">
                {passwordRequests.map(r => r.user?.full_name ?? r.user_id).join(', ')}
              </span>
            </div>
          </div>
        </FadeIn>
      )}

      {/* Role stats */}
      {roles.length > 0 && (
        <FadeIn delay={80} direction="up">
          <div className="flex flex-wrap gap-3">
            {roles.map((r, i) => (
              <FadeIn key={r.id} delay={120 + i * 60} direction="up">
                <button
                  onClick={() => setRoleFilter(f => f === r.name.toLowerCase() ? '' : r.name.toLowerCase())}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                    roleFilter === r.name.toLowerCase()
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {ROLE_ICONS[r.name.toLowerCase()]}
                  {r.name}
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400 text-xs">
                    {roleCounts[r.name.toLowerCase()] ?? 0}
                  </span>
                </button>
              </FadeIn>
            ))}
          </div>
        </FadeIn>
      )}

      <FadeIn delay={160} direction="up">
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre o correo…" />
        </div>
      </FadeIn>

      <FadeIn delay={200} direction="up">
        {viewMode === 'table' ? (
          <Table
            columns={columns}
            data={filteredUsers}
            loading={loading}
            emptyMessage="No se encontraron usuarios"
          />
        ) : (
          <ChromaGrid
            items={chromaItems}
            columns={3}
            radius={280}
          />
        )}
      </FadeIn>

      <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={LIMIT} onPageChange={setPage} />

      {/* ── Create modal ─────────────────────────────────────────── */}
      <Modal
        open={showCreate} onClose={() => setShowCreate(false)}
        title="Nuevo Usuario" size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={handleCreate as unknown as () => void}>Crear</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}
          <p className="text-xs text-slate-500">Se generará una contraseña temporal automáticamente. El usuario deberá cambiarla al iniciar sesión.</p>
          <Input label="Nombre completo" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
          <Input label="Correo electrónico" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          <div className="flex flex-col gap-1.5">
            <Select
              label="Rol"
              value={form.role_id}
              onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}
              options={roleOpts}
              placeholder="Seleccionar rol…"
              required
            />
            {form.role_id && (
              <div className="flex items-center gap-2 mt-1 px-2">
                <RoleBadge role={roles.find(r => r.id === form.role_id)?.name} />
                <span className="text-xs text-slate-500">
                  {(roles.find(r => r.id === form.role_id)?.name ?? '').toLowerCase() === 'admin'
                    ? 'Acceso total al sistema'
                    : (roles.find(r => r.id === form.role_id)?.name ?? '').toLowerCase() === 'editor'
                      ? 'Puede crear y editar activos'
                      : 'Solo lectura'}
                </span>
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* ── Edit modal ───────────────────────────────────────────── */}
      <Modal
        open={!!showEdit} onClose={() => setShowEdit(null)}
        title="Editar Usuario" size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowEdit(null)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={handleEdit as unknown as () => void}>Guardar</Button>
          </>
        }
      >
        <form onSubmit={handleEdit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}
          <Input label="Nombre completo" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
          <Input label="Correo electrónico" type="email" value={form.email} disabled className="opacity-50" />
          <div className="flex flex-col gap-1.5">
            <Select
              label="Rol"
              value={form.role_id}
              onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}
              options={roleOpts}
              placeholder="Sin rol asignado"
            />
            {form.role_id && (
              <div className="flex items-center gap-2 mt-1 px-2">
                <RoleBadge role={roles.find(r => r.id === form.role_id)?.name} />
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* ── Confirm toggle ───────────────────────────────────────── */}
      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.is_active ? 'Desactivar usuario' : 'Activar usuario'}
        message={`¿Estás seguro de ${confirmToggle?.is_active ? 'desactivar' : 'activar'} a ${confirmToggle?.full_name}?`}
        onConfirm={handleToggle}
        onCancel={() => setConfirmToggle(null)}
        loading={toggling}
        danger={confirmToggle?.is_active}
      />

      {/* ── Confirm reset password ────────────────────────────────── */}
      <ConfirmDialog
        open={!!confirmReset}
        title="Restablecer contraseña"
        message={`Se generará una contraseña temporal para ${confirmReset?.full_name} y se mostrará en pantalla para que puedas compartirla.`}
        onConfirm={handleResetPassword}
        onCancel={() => setConfirmReset(null)}
        loading={resetting}
        danger={false}
      />

      <Modal
        open={!!passwordResult}
        onClose={() => setPasswordResult(null)}
        title={passwordResult?.title ?? 'Contraseña temporal'}
        size="sm"
        footer={<Button variant="primary" onClick={() => setPasswordResult(null)}>Cerrar</Button>}
      >
        {passwordResult && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-200">{passwordResult.name}</p>
              {passwordResult.email && <p className="text-xs text-slate-500">{passwordResult.email}</p>}
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Contraseña temporal</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm break-all">
                  {passwordResult.password}
                </code>
                <Button variant="outline" size="sm" icon={<Copy size={14} />} onClick={copyPassword}>
                  {copiedPassword ? 'Copiada' : 'Copiar'}
                </Button>
              </div>
            </div>
            <Alert type="info" message="Guárdala antes de cerrar esta ventana. No se enviará por correo." />
          </div>
        )}
      </Modal>
    </div>
  );
};
