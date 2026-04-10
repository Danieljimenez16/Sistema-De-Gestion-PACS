import React, { useEffect, useState, useCallback } from 'react';
import { Plus, UserCheck, UserX } from 'lucide-react';
import {
  PageHeader, Button, SearchBar, Table, Pagination,
  Badge, Modal, Input, Select, Alert, ConfirmDialog,
} from '../components/ui';
import { userService, catalogService } from '../services';
import type { User } from '../types';
import { fmt } from '../utils/helpers';

const LIMIT = 20;

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<User | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<User | null>(null);
  const [toggling, setToggling] = useState(false);

  const [form, setForm] = useState({
    full_name: '', email: '', password: '', role_id: '',
  });

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

  useEffect(() => {
    const t = setTimeout(() => setPage(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    catalogService.roles().then(r => setRoles(r.data ?? [])).catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await userService.create(form as User & { password: string });
      setShowCreate(false);
      setForm({ full_name: '', email: '', password: '', role_id: '' });
      load();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setFormError(e?.message ?? 'Error al crear usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEdit) return;
    setSaving(true);
    setFormError('');
    try {
      await userService.update(showEdit.id, {
        full_name: form.full_name,
        role_id: form.role_id || undefined,
      });
      setShowEdit(null);
      load();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setFormError(e?.message ?? 'Error al actualizar usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!confirmToggle) return;
    setToggling(true);
    try {
      await userService.toggleStatus(confirmToggle.id, !confirmToggle.is_active);
      setConfirmToggle(null);
      load();
    } catch { /* ignore */ } finally {
      setToggling(false);
    }
  };

  const openEdit = (user: User) => {
    setForm({ full_name: user.full_name, email: user.email, password: '', role_id: user.role_id ?? '' });
    setShowEdit(user);
    setFormError('');
  };

  const columns = [
    {
      key: 'full_name',
      header: 'Nombre',
      render: (row: User) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">
              {row.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </span>
          </div>
          <div>
            <p className="font-medium text-slate-200 text-sm">{row.full_name}</p>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rol',
      render: (row: User) => (
        <Badge label={row.role?.name ?? 'Sin rol'} variant="info" />
      ),
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
      width: '120px',
      render: (row: User) => (
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Editar</Button>
          <Button
            variant="ghost"
            size="sm"
            icon={row.is_active ? <UserX size={12} /> : <UserCheck size={12} />}
            onClick={() => setConfirmToggle(row)}
          />
        </div>
      ),
    },
  ];

  const roleOpts = roles.map(r => ({ value: r.id, label: r.name }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gestión de Usuarios"
        subtitle={`${meta.total} usuarios registrados`}
        actions={
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => { setShowCreate(true); setFormError(''); setForm({ full_name: '', email: '', password: '', role_id: '' }); }}>
            Nuevo Usuario
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre o correo…" />
      </div>

      <Table
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="No se encontraron usuarios"
      />

      <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={LIMIT} onPageChange={setPage} />

      {/* Create */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo Usuario" size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={handleCreate as unknown as () => void}>Crear</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}
          <Input label="Nombre completo" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
          <Input label="Correo electrónico" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          <Input label="Contraseña temporal" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          <Select label="Rol" value={form.role_id} onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))} options={roleOpts} placeholder="Seleccionar rol…" required />
        </form>
      </Modal>

      {/* Edit */}
      <Modal open={!!showEdit} onClose={() => setShowEdit(null)} title="Editar Usuario" size="sm"
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
          <Select label="Rol" value={form.role_id} onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))} options={roleOpts} placeholder="Sin rol asignado" />
        </form>
      </Modal>

      {/* Confirm toggle */}
      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.is_active ? 'Desactivar usuario' : 'Activar usuario'}
        message={`¿Estás seguro de ${confirmToggle?.is_active ? 'desactivar' : 'activar'} a ${confirmToggle?.full_name}?`}
        onConfirm={handleToggle}
        onCancel={() => setConfirmToggle(null)}
        loading={toggling}
        danger={confirmToggle?.is_active}
      />
    </div>
  );
};
