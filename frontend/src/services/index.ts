import { api } from './api';
import type {
  AuthUser, LoginCredentials, Asset, AssetFilters,
  License, LicenseAssignment, AuditEvent, AuditFilters,
  User, Area, Location, AssetType, AssetStatus, Brand,
  Assignment, DashboardStats, Import, ImportPreview, PaginatedResponse, ApiResponse,
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
  create: (body: Partial<User> & { password: string }) =>
    api.post<ApiResponse<User>>('/users', body),
  update: (id: string, body: Partial<User>) =>
    api.put<ApiResponse<User>>(`/users/${id}`, body),
  toggleStatus: (id: string, is_active: boolean) =>
    api.patch<ApiResponse<User>>(`/users/${id}/status`, { is_active }),
};

// ─── Reports ─────────────────────────────────────────────────────────────────
export const reportService = {
  dashboard: () =>
    api.get<ApiResponse<DashboardStats>>('/reports/dashboard'),
  assetsExport: (filters?: AssetFilters) =>
    api.get<ApiResponse<{ url: string }>>(`/reports/assets/export${buildQueryString(filters ?? {})}`),
  licensesExport: () =>
    api.get<ApiResponse<{ url: string }>>('/reports/licenses/export'),
};

// ─── Imports ─────────────────────────────────────────────────────────────────
export const importService = {
  preview: (formData: FormData) =>
    api.postFormData<ApiResponse<ImportPreview>>('/imports/assets/preview', formData),
  commit: (importId: string) =>
    api.post<ApiResponse<Import>>('/imports/assets/commit', { import_id: importId }),
  list: () =>
    api.get<ApiResponse<Import[]>>('/imports'),
};
