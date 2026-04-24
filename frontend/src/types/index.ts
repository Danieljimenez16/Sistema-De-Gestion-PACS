// ─── Core entities ───────────────────────────────────────────────────────────

export interface Role {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role_id?: string;
  role?: Role;
  is_active: boolean;
  must_change_password?: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPasswordResponse extends User {
  temp_password?: string;
}

export interface ResetPasswordResponse {
  message: string;
  temp_password?: string;
}

export interface PasswordChangeRequest {
  id: string;
  user_id: string;
  user?: Pick<User, 'id' | 'full_name' | 'email'>;
  status: 'pending' | 'resolved';
  requested_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

export interface Area {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  area_id?: string;
  area?: Area;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface AssetType {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface AssetStatus {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export type AssetStatusName = 'Activo' | 'En Mantenimiento' | 'Dado de Baja' | 'En Bodega' | 'Dañado';

export interface Brand {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Asset {
  id: string;
  code: string;
  serial?: string;
  name: string;
  description?: string;
  asset_type_id?: string;
  asset_type?: AssetType;
  brand_id?: string;
  brand?: Brand;
  model?: string;
  purchase_date?: string;
  warranty_expiry?: string;
  status_id?: string;
  status?: AssetStatus;
  location_id?: string;
  location?: Location;
  area_id?: string;
  area?: Area;
  responsible_user_id?: string;
  responsible_user?: User;
  notes?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  asset_id: string;
  asset?: Asset;
  user_id?: string;
  user?: User;
  area_id?: string;
  area?: Area;
  location_id?: string;
  location?: Location;
  assigned_at: string;
  released_at?: string;
  is_active: boolean;
  notes?: string;
  created_by?: string;
  created_by_user?: User;
  created_at: string;
}

export interface StatusHistory {
  id: string;
  asset_id: string;
  asset?: Asset;
  previous_status_id?: string;
  previous_status?: AssetStatus;
  new_status_id: string;
  new_status?: AssetStatus;
  changed_by?: string;
  changed_by_user?: User;
  reason?: string;
  changed_at: string;
}

export interface License {
  id: string;
  name: string;
  vendor?: string;
  license_key?: string;
  license_type?: string;
  max_seats?: number;
  purchase_date?: string;
  expiry_date?: string;
  cost?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_user_id?: string;
  created_by_user?: Pick<User, 'id' | 'full_name' | 'email'>;
  // computed
  used_seats?: number;
}

export interface LicenseAssignment {
  id: string;
  license_id: string;
  license?: License;
  asset_id?: string;
  asset?: Asset;
  user_id?: string;
  user?: User;
  assigned_at: string;
  released_at?: string;
  is_active: boolean;
  notes?: string;
  created_by?: string;
}

export interface AuditEvent {
  id: string;
  entity_type: string;
  entity_id?: string;
  action: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  performed_by?: string;
  performed_by_user?: User;
  performed_at: string;
  ip_address?: string;
  notes?: string;
}

export interface ImportPreviewRow {
  [key: string]: unknown;
  _error?: string;
  _row?: number;
  _payload?: Record<string, unknown>;
}

export interface ImportPreview {
  import_id?: string;
  rows: ImportPreviewRow[];
  errors: ImportPreviewRow[];
  total: number;
  valid: number;
  invalid: number;
}

export interface ImportCommitResult {
  import_id: string;
  processed_rows: number;
  error_rows: number;
  skipped: number;
  errors: ImportPreviewRow[];
}

export interface ImportRecord {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  total_rows?: number;
  processed_rows: number;
  error_rows: number;
  file_name?: string;
  imported_by?: string;
  started_at: string;
  finished_at?: string;
}

// ─── API contracts ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser extends User {
  token: string;
  mustChangePassword?: boolean;
}

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface AssetFilters {
  search?: string;
  status_id?: string;
  asset_type_id?: string;
  brand_id?: string;
  area_id?: string;
  location_id?: string;
  responsible_user_id?: string;
  page?: number;
  limit?: number;
}

export interface AuditFilters {
  entity_type?: string;
  action?: string;
  performed_by?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export interface DashboardSeriesPoint {
  name: string;
  value: number;
  color?: string;
}

export interface LicenseUsagePoint {
  name: string;
  used: number;
  available: number;
  overused: number;
  max: number;
  utilization_pct: number;
  color?: string;
}

export interface DashboardStats {
  total_assets: number;
  active_assets: number;
  assigned_assets: number;
  unassigned_assets: number;
  in_maintenance: number;
  retired: number;
  stored_assets: number;
  damaged_assets: number;
  total_licenses: number;
  expiring_soon: number;
  expired_licenses: number;
  license_capacity: number;
  license_used_seats: number;
  license_utilization_pct: number;
  overused_licenses: number;
  warranty_expiring_soon: number;
  expired_warranties: number;
  assets_by_status: DashboardSeriesPoint[];
  assets_by_type: DashboardSeriesPoint[];
  assets_by_area: DashboardSeriesPoint[];
  assets_by_location: DashboardSeriesPoint[];
  license_usage: LicenseUsagePoint[];
  operational_summary: DashboardSeriesPoint[];
  risk_summary: DashboardSeriesPoint[];
  recent_activity: AuditEvent[];
}
