import React from 'react';
import { cls } from '../../utils/helpers';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props
}) => {
  const base = 'inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900';
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-500',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-100 focus:ring-slate-500',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 hover:text-slate-100 focus:ring-slate-500',
    danger: 'bg-red-700 hover:bg-red-600 text-white focus:ring-red-500',
    outline: 'border border-slate-600 bg-transparent hover:bg-slate-800 text-slate-200 focus:ring-slate-500',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };
  return (
    <button
      className={cls(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
    </button>
  );
};

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  label: string;
  variant?: 'active' | 'maintenance' | 'retired' | 'stored' | 'damaged' | 'info' | 'warning' | 'default';
  dot?: boolean;
  size?: 'sm' | 'md';
}

const BADGE_VARIANTS = {
  active:      'bg-green-950 text-green-400 border border-green-800',
  maintenance: 'bg-amber-950 text-amber-400 border border-amber-800',
  retired:     'bg-red-950 text-red-400 border border-red-800',
  stored:      'bg-slate-800 text-slate-400 border border-slate-700',
  damaged:     'bg-purple-950 text-purple-400 border border-purple-800',
  info:        'bg-blue-950 text-blue-400 border border-blue-800',
  warning:     'bg-yellow-950 text-yellow-400 border border-yellow-800',
  default:     'bg-slate-800 text-slate-300 border border-slate-700',
};

const DOT_COLORS = {
  active: 'bg-green-400',
  maintenance: 'bg-amber-400',
  retired: 'bg-red-400',
  stored: 'bg-slate-400',
  damaged: 'bg-purple-400',
  info: 'bg-blue-400',
  warning: 'bg-yellow-400',
  default: 'bg-slate-400',
};

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', dot = false, size = 'sm' }) => (
  <span className={cls(
    'inline-flex items-center gap-1.5 rounded-full font-medium',
    size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
    BADGE_VARIANTS[variant]
  )}>
    {dot && <span className={cls('w-1.5 h-1.5 rounded-full', DOT_COLORS[variant])} />}
    {label}
  </span>
);

// ─── StatusBadge for assets ────────────────────────────────────────────────────

const STATUS_VARIANT_MAP: Record<string, BadgeProps['variant']> = {
  'Activo': 'active',
  'En Mantenimiento': 'maintenance',
  'Dado de Baja': 'retired',
  'En Bodega': 'stored',
  'Dañado': 'damaged',
};

export const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return <Badge label="—" />;
  return <Badge label={status} variant={STATUS_VARIANT_MAP[status] ?? 'default'} dot />;
};

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, hint, icon, className, id, ...props }) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-300">
          {label}
          {props.required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        )}
        <input
          id={inputId}
          className={cls(
            'w-full bg-slate-800 border rounded-lg text-slate-100 placeholder-slate-500 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'transition-all duration-150',
            icon ? 'pl-10 pr-3 py-2' : 'px-3 py-2',
            error ? 'border-red-500' : 'border-slate-600',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
};

// ─── Textarea ─────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className, id, ...props }) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-300">
          {label}
          {props.required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        rows={3}
        className={cls(
          'w-full bg-slate-800 border rounded-lg text-slate-100 placeholder-slate-500 text-sm px-3 py-2',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'resize-none transition-all duration-150',
          error ? 'border-red-500' : 'border-slate-600',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}
    </div>
  );
};

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, error, placeholder, options, className, id, ...props }) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-300">
          {label}
          {props.required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <select
        id={inputId}
        className={cls(
          'w-full bg-slate-800 border rounded-lg text-slate-100 text-sm px-3 py-2',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'transition-all duration-150 cursor-pointer',
          error ? 'border-red-500' : 'border-slate-600',
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-slate-800">{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}
    </div>
  );
};

// ─── Spinner ──────────────────────────────────────────────────────────────────

export const Spinner: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <Loader2 size={size} className={cls('animate-spin text-blue-500', className)} />
);

export const FullPageSpinner: React.FC = () => (
  <div className="flex items-center justify-center w-full h-64">
    <Spinner size={32} />
  </div>
);

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, padding = true, ...props }) => (
  <div
    className={cls(
      'bg-slate-800 border border-slate-700 rounded-xl',
      padding && 'p-5',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

const MODAL_SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, size = 'md', footer }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal aria-labelledby="modal-title">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cls('relative w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]', MODAL_SIZES[size])}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 id="modal-title" className="text-lg font-semibold text-slate-100">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto px-6 py-4 flex-1">{children}</div>
        {/* Footer */}
        {footer && <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
};

// ─── Table ────────────────────────────────────────────────────────────────────

interface Column<T extends object> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface TableProps<T extends object> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  keyField?: keyof T;
}

export function Table<T extends object>({
  columns, data, onRowClick, loading, emptyMessage = 'Sin resultados', keyField = 'id' as keyof T,
}: TableProps<T>) {
  if (loading) return <FullPageSpinner />;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-900 border-b border-slate-700">
            {columns.map(col => (
              <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider" style={col.width ? { width: col.width } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-slate-500">{emptyMessage}</td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={String(row[keyField] ?? i)}
                className={cls('bg-slate-800 hover:bg-slate-750 transition-colors', onRowClick && 'cursor-pointer hover:bg-slate-700/60')}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-slate-200">
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, total, limit, onPageChange }) => {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-slate-400">
        {total === 0 ? 'Sin resultados' : `${start}–${end} de ${total}`}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" icon={<ChevronLeft size={14} />} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </Button>
        <span className="text-sm text-slate-300 px-2">{page} / {totalPages}</span>
        <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Siguiente <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
};

// ─── Alert ────────────────────────────────────────────────────────────────────

interface AlertProps {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
}

const ALERT_STYLES = {
  error: 'bg-red-950 border-red-800 text-red-300',
  warning: 'bg-amber-950 border-amber-800 text-amber-300',
  info: 'bg-blue-950 border-blue-800 text-blue-300',
  success: 'bg-green-950 border-green-800 text-green-300',
};

export const Alert: React.FC<AlertProps> = ({ type, message }) => (
  <div className={cls('flex items-center gap-2 px-4 py-3 rounded-lg border text-sm', ALERT_STYLES[type])}>
    <AlertCircle size={16} />
    {message}
  </div>
);

// ─── SearchBar ────────────────────────────────────────────────────────────────

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder = 'Buscar…' }) => (
  <div className="relative">
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
    </svg>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
    />
  </div>
);

// ─── PageHeader ───────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-100">{title}</h1>
      {subtitle && <p className="text-slate-400 mt-1 text-sm">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-3">{actions}</div>}
  </div>
);

// ─── Confirm Dialog ────────────────────────────────────────────────────────────

interface ConfirmProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmProps> = ({
  open, title, message, onConfirm, onCancel, loading, danger
}) => (
  <Modal open={open} onClose={onCancel} title={title} size="sm"
    footer={
      <>
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
          Confirmar
        </Button>
      </>
    }
  >
    <p className="text-slate-300 text-sm">{message}</p>
  </Modal>
);
