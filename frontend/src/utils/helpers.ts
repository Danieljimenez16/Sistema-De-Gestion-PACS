import { format, parseISO, isAfter, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

export const fmt = {
  date: (d?: string | null) =>
    d ? format(parseISO(d), 'dd MMM yyyy', { locale: es }) : '—',
  datetime: (d?: string | null) =>
    d ? format(parseISO(d), 'dd MMM yyyy HH:mm', { locale: es }) : '—',
  currency: (n?: number | null) =>
    n != null ? `$${n.toLocaleString('es-CR', { minimumFractionDigits: 2 })}` : '—',
};

export const isExpiringSoon = (expiryDate?: string | null, days = 30): boolean => {
  if (!expiryDate) return false;
  const expiry = parseISO(expiryDate);
  const threshold = addDays(new Date(), days);
  return !isAfter(expiry, threshold) && isAfter(expiry, new Date());
};

export const isExpired = (expiryDate?: string | null): boolean => {
  if (!expiryDate) return false;
  return !isAfter(parseISO(expiryDate), new Date());
};

export const truncate = (str: string, len = 40): string =>
  str.length > len ? str.slice(0, len) + '…' : str;

export const cls = (...classes: (string | undefined | null | false)[]): string =>
  classes.filter(Boolean).join(' ');

export const statusColor = (name: string): string => {
  const map: Record<string, string> = {
    'Activo': 'status-active',
    'En Mantenimiento': 'status-maintenance',
    'Dado de Baja': 'status-retired',
    'En Bodega': 'status-stored',
    'Dañado': 'status-damaged',
  };
  return map[name] ?? 'status-stored';
};

export const buildQueryString = (params: object): string => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  return q.toString() ? `?${q.toString()}` : '';
};

export const downloadCSV = (data: Record<string, unknown>[], filename: string) => {
  if (!data.length) return;
  const flattenValue = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v).replace(/"/g, '""');
    return String(v);
  };
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => `"${flattenValue(row[h])}"`).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const ENTITY_LABELS: Record<string, string> = {
  asset: 'Activo',
  user: 'Usuario',
  license: 'Licencia',
  assignment: 'Asignación',
  license_assignment: 'Asignación de Licencia',
};

export const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Creación',
  create: 'Creación',
  UPDATE: 'Actualización',
  update: 'Actualización',
  DELETE: 'Eliminación',
  delete: 'Eliminación',
  STATUS_CHANGE: 'Cambio de Estado',
  status_change: 'Cambio de Estado',
  ASSIGN: 'Asignación',
  assign: 'Asignación',
  assignment: 'Asignación',
  RELEASE: 'Liberación',
  release: 'Liberación',
  LOGIN: 'Inicio de Sesión',
  login: 'Inicio de Sesión',
  LOGOUT: 'Cierre de Sesión',
  logout: 'Cierre de Sesión',
  import: 'Importación',
  IMPORT: 'Importación',
  export: 'Exportación',
  EXPORT: 'Exportación',
};
