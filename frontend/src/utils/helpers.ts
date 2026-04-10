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

export const ENTITY_LABELS: Record<string, string> = {
  asset: 'Activo',
  user: 'Usuario',
  license: 'Licencia',
  assignment: 'Asignación',
  license_assignment: 'Asignación de Licencia',
};

export const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Creación',
  UPDATE: 'Actualización',
  DELETE: 'Eliminación',
  STATUS_CHANGE: 'Cambio de Estado',
  ASSIGN: 'Asignación',
  RELEASE: 'Liberación',
  LOGIN: 'Inicio de Sesión',
  LOGOUT: 'Cierre de Sesión',
};
