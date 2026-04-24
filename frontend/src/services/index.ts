import { api } from './api';
import type {
  AuthUser, LoginCredentials, Asset, AssetFilters,
  License, LicenseAssignment, AuditEvent, AuditFilters,
  User, Area, Location, AssetType, AssetStatus, Brand,
  Assignment, DashboardStats, Import, ImportPreview,
  PaginatedResponse, ApiResponse, PasswordChangeRequest,
  UserPasswordResponse, ResetPasswordResponse,
} from '../types';
import { buildQueryString } from '../utils/helpers';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authService = {
  login: (creds: LoginCredentials) =>
    api.post<ApiResponse<AuthUser>>('/auth/login', creds),
  me: () =>
    api.get<ApiResponse<AuthUser>>('/auth/me'),
  logout: () =>
    api.post<ApiResponse<null>>('/auth/logout'),
  changePassword: (body: { current_password?: string; new_password: string; skip_current_check?: boolean }) =>
    api.post<ApiResponse<{ message: string }>>('/auth/change-password', body),
  forgotPassword: (email: string) =>
    api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email }),
};

// ─── Catalogs ────────────────────────────────────────────────────────────────
export const catalogService = {
  areas: () => api.get<ApiResponse<Area[]>>('/catalogs/areas'),
  locations: () => api.get<ApiResponse<Location[]>>('/catalogs/locations'),
  assetTypes: () => api.get<ApiResponse<AssetType[]>>('/catalogs/asset-types'),
  assetStatuses: () => api.get<ApiResponse<AssetStatus[]>>('/catalogs/asset-statuses'),
  brands: () => api.get<ApiResponse<Brand[]>>('/catalogs/brands'),
  roles: () => api.get<ApiResponse<{ id: string; name: string }[]>>('/catalogs/roles'),

  // CRUD for catalog items
  createArea: (body: Partial<Area>) => api.post<ApiResponse<Area>>('/catalogs/areas', body),
  updateArea: (id: string, body: Partial<Area>) => api.put<ApiResponse<Area>>(`/catalogs/areas/${id}`, body),
  createLocation: (body: Partial<Location>) => api.post<ApiResponse<Location>>('/catalogs/locations', body),
  updateLocation: (id: string, body: Partial<Location>) => api.put<ApiResponse<Location>>(`/catalogs/locations/${id}`, body),
  createAssetType: (body: Partial<AssetType>) => api.post<ApiResponse<AssetType>>('/catalogs/asset-types', body),
  updateAssetType: (id: string, body: Partial<AssetType>) => api.put<ApiResponse<AssetType>>(`/catalogs/asset-types/${id}`, body),
  createBrand: (body: Partial<Brand>) => api.post<ApiResponse<Brand>>('/catalogs/brands', body),
  updateBrand: (id: string, body: Partial<Brand>) => api.put<ApiResponse<Brand>>(`/catalogs/brands/${id}`, body),
};

// ─── Assets ──────────────────────────────────────────────────────────────────
export const assetService = {
  nextCode: () =>
    api.get<ApiResponse<{ next_code: string }>>('/assets/next-code'),
  list: (filters?: AssetFilters) =>
    api.get<PaginatedResponse<Asset>>(`/assets${buildQueryString(filters ?? {})}`),
  get: (id: string) =>
    api.get<ApiResponse<Asset>>(`/assets/${id}`),
  create: (body: Partial<Asset>) =>
    api.post<ApiResponse<Asset>>('/assets', body),
  update: (id: string, body: Partial<Asset>) =>
    api.put<ApiResponse<Asset>>(`/assets/${id}`, body),
  changeStatus: (id: string, body: { status_id: string; reason?: string }) =>
    api.patch<ApiResponse<Asset>>(`/assets/${id}/status`, body),
  changeAssignment: (id: string, body: { user_id?: string; area_id?: string; location_id?: string; notes?: string }) =>
    api.patch<ApiResponse<Asset>>(`/assets/${id}/assignment`, body),
  history: (id: string) =>
    api.get<ApiResponse<{ assignments: Assignment[]; status_history: import('../types').StatusHistory[] }>>(`/assets/${id}/history`),
  remove: (id: string) =>
    api.delete<ApiResponse<null>>(`/assets/${id}`),
};

// ─── Licenses ────────────────────────────────────────────────────────────────
export const licenseService = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<License>>(`/licenses${buildQueryString(params ?? {})}`),
  get: (id: string) =>
    api.get<ApiResponse<License>>(`/licenses/${id}`),
  create: (body: Partial<License>) =>
    api.post<ApiResponse<License>>('/licenses', body),
  update: (id: string, body: Partial<License>) =>
    api.put<ApiResponse<License>>(`/licenses/${id}`, body),
  remove: (id: string) =>
    api.delete<ApiResponse<null>>(`/licenses/${id}`),
  assign: (id: string, body: Partial<LicenseAssignment>) =>
    api.post<ApiResponse<LicenseAssignment>>(`/licenses/${id}/assignments`, body),
  assignments: (id: string) =>
    api.get<ApiResponse<LicenseAssignment[]>>(`/licenses/${id}/assignments`),
};

// ─── Audit ────────────────────────────────────────────────────────────────────
export const auditService = {
  list: (filters?: AuditFilters) =>
    api.get<PaginatedResponse<AuditEvent>>(`/audit${buildQueryString(filters ?? {})}`),
  get: (id: string) =>
    api.get<ApiResponse<AuditEvent>>(`/audit/${id}`),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const userService = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<User>>(`/users${buildQueryString(params ?? {})}`),
  get: (id: string) =>
    api.get<ApiResponse<User>>(`/users/${id}`),
  create: (body: Partial<User>) =>
    api.post<ApiResponse<UserPasswordResponse>>('/users', body),
  update: (id: string, body: Partial<User>) =>
    api.put<ApiResponse<User>>(`/users/${id}`, body),
  toggleStatus: (id: string, is_active: boolean) =>
    api.patch<ApiResponse<User>>(`/users/${id}/status`, { is_active }),
  resetPassword: (id: string) =>
    api.post<ApiResponse<ResetPasswordResponse>>(`/users/${id}/reset-password`, {}),
  getPendingPasswordRequests: () =>
    api.get<ApiResponse<PasswordChangeRequest[]>>('/users/password-requests'),
};

// ─── Reports ─────────────────────────────────────────────────────────────────
export const reportService = {
  dashboard: () =>
    api.get<ApiResponse<DashboardStats>>('/reports/dashboard'),
  /**
   * Returns the raw asset inventory array.
   * Use the `downloadCSV` util to trigger a browser download.
   */
  assetsExport: (filters?: AssetFilters) =>
    api.get<ApiResponse<Record<string, unknown>[]>>(`/reports/assets/export${buildQueryString(filters ?? {})}`),
  /**
   * Returns the raw license list array.
   * Use the `downloadCSV` util to trigger a browser download.
   */
  licensesExport: () =>
    api.get<ApiResponse<Record<string, unknown>[]>>('/reports/licenses/export'),
};

// ─── Imports ─────────────────────────────────────────────────────────────────
export const importService = {
  /**
   * Send parsed CSV rows (as JSON) for server-side validation.
   * Returns import_id + valid rows + error rows.
   */
  preview: (rows: Record<string, unknown>[]) =>
    api.post<ApiResponse<ImportPreview>>('/imports/assets/preview', { rows }),
  /**
   * Commit the valid rows obtained from preview.
   * import_id ties this to the pending import record created by preview.
   */
  commit: (importId: string, rows: Record<string, unknown>[]) =>
    api.post<ApiResponse<Import>>('/imports/assets/commit', { import_id: importId, rows }),
  list: () =>
    api.get<ApiResponse<Import[]>>('/imports'),
};
