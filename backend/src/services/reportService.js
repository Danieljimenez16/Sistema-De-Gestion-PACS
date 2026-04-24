const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');

const PAGE_SIZE = 1000;
const BLUE_PALETTE = ['#3b82f6', '#2563eb', '#0ea5e9', '#0284c7', '#38bdf8', '#93c5fd'];
const RISK_COLORS = {
  warning: '#f59e0b',
  danger: '#ef4444',
  neutral: '#64748b',
};

const fetchAll = async (buildQuery, errorMessage) => {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw new AppError(errorMessage, 500);

    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
};

const normalize = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const dateKey = (value) => (value ? String(value).slice(0, 10) : null);

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const toISODate = (date) => date.toISOString().slice(0, 10);

const isBeforeDate = (value, before) => {
  const key = dateKey(value);
  return Boolean(key && key < before);
};

const isWithinDates = (value, from, to) => {
  const key = dateKey(value);
  return Boolean(key && key >= from && key <= to);
};

const increment = (map, name) => {
  const key = name || 'Sin dato';
  map.set(key, (map.get(key) ?? 0) + 1);
};

const toSeries = (map, limit) => {
  let entries = Array.from(map.entries())
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);

  if (limit && entries.length > limit) {
    const visible = entries.slice(0, limit - 1);
    const otherTotal = entries.slice(limit - 1).reduce((sum, [, value]) => sum + value, 0);
    entries = [...visible, ['Otros', otherTotal]];
  }

  return entries.map(([name, value], index) => ({
    name,
    value,
    color: BLUE_PALETTE[index % BLUE_PALETTE.length],
  }));
};

const statusTotal = (assets, predicate) =>
  assets.reduce((total, asset) => {
    const status = normalize(asset.asset_statuses?.name);
    return predicate(status) ? total + 1 : total;
  }, 0);

const dashboard = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toISODate(today);
  const thirtyDaysKey = toISODate(addDays(today, 30));

  const [
    assets,
    licenses,
    licenseAssignments,
    recentActivityRes,
  ] = await Promise.all([
    fetchAll(
      () => supabase
        .from('assets')
        .select(`
          id, responsible_user_id, warranty_expiry,
          asset_statuses(name), asset_types(name), areas(name), locations(name)
        `)
        .eq('is_deleted', false),
      'Error al cargar activos'
    ),
    fetchAll(
      () => supabase
        .from('licenses')
        .select('id, name, vendor, expiry_date, max_seats')
        .eq('is_active', true),
      'Error al cargar licencias'
    ),
    fetchAll(
      () => supabase
        .from('license_assignments')
        .select('id, license_id')
        .eq('is_active', true),
      'Error al cargar asignaciones de licencias'
    ),
    supabase
      .from('audit_events')
      .select('id, entity_type, action, performed_at, performed_by, performer:users!audit_events_performed_by_fkey(id,full_name)')
      .order('performed_at', { ascending: false })
      .limit(10),
  ]);

  if (recentActivityRes.error) throw new AppError('Error al cargar actividad', 500);

  const totalAssets = assets.length;
  const totalLicenses = licenses.length;
  const assignedAssets = assets.filter(asset => Boolean(asset.responsible_user_id)).length;
  const unassignedAssets = totalAssets - assignedAssets;

  const statusMap = new Map();
  const typeMap = new Map();
  const areaMap = new Map();
  const locationMap = new Map();

  assets.forEach(({ asset_statuses, asset_types }) => {
    const statusName = asset_statuses?.name ?? 'Sin estado';
    const typeName = asset_types?.name ?? 'Sin tipo';
    increment(statusMap, statusName);
    increment(typeMap, typeName);
  });

  assets.forEach(({ areas, locations }) => {
    increment(areaMap, areas?.name ?? 'Sin área');
    increment(locationMap, locations?.name ?? 'Sin ubicación');
  });

  const activeAssets = statusTotal(assets, status => status === 'activo' || status === 'en uso');
  const maintenanceAssets = statusTotal(assets, status => status.includes('mantenimiento'));
  const retiredAssets = statusTotal(assets, status => status.includes('baja') || status.includes('retir'));
  const storedAssets = statusTotal(assets, status =>
    status.includes('bodega') || status.includes('almacen') || status.includes('stock')
  );
  const damagedAssets = statusTotal(assets, status => status.includes('danad') || status.includes('damage'));

  const warrantyExpiringSoon = assets.filter(asset =>
    isWithinDates(asset.warranty_expiry, todayKey, thirtyDaysKey)
  ).length;
  const expiredWarranties = assets.filter(asset => isBeforeDate(asset.warranty_expiry, todayKey)).length;

  const expiringSoon = licenses.filter(license =>
    isWithinDates(license.expiry_date, todayKey, thirtyDaysKey)
  ).length;
  const expiredLicenses = licenses.filter(license => isBeforeDate(license.expiry_date, todayKey)).length;

  const licenseIds = new Set(licenses.map(license => license.id));
  const assignmentsByLicense = new Map();
  licenseAssignments.forEach(({ license_id }) => {
    if (licenseIds.has(license_id)) increment(assignmentsByLicense, license_id);
  });

  const licenseCapacity = licenses.reduce((sum, license) => sum + Number(license.max_seats || 0), 0);
  const licenseUsedSeats = Array.from(assignmentsByLicense.values()).reduce((sum, value) => sum + value, 0);
  const allLicenseUsage = licenses
    .filter(license => Number(license.max_seats || 0) > 0)
    .map(license => {
      const max = Number(license.max_seats || 0);
      const used = assignmentsByLicense.get(license.id) ?? 0;
      return {
        name: license.name,
        used,
        available: Math.max(max - used, 0),
        overused: Math.max(used - max, 0),
        max,
        utilization_pct: Math.round((used / max) * 100),
      };
    })
    .sort((a, b) => b.utilization_pct - a.utilization_pct || b.used - a.used);

  const licenseUsage = allLicenseUsage
    .slice(0, 8)
    .map((item, index) => ({ ...item, color: BLUE_PALETTE[index % BLUE_PALETTE.length] }));

  const overusedLicenses = allLicenseUsage.filter(license => license.overused > 0).length;

  const operationalSummary = [
    { name: 'Asignados', value: assignedAssets, color: BLUE_PALETTE[0] },
    { name: 'Sin responsable', value: unassignedAssets, color: BLUE_PALETTE[1] },
    { name: 'En bodega', value: storedAssets, color: BLUE_PALETTE[2] },
    { name: 'En mantenimiento', value: maintenanceAssets, color: RISK_COLORS.warning },
    { name: 'Dados de baja', value: retiredAssets, color: RISK_COLORS.neutral },
  ].filter(item => item.value > 0);

  const riskSummary = [
    { name: 'Licencias vencidas', value: expiredLicenses, color: RISK_COLORS.danger },
    { name: 'Licencias por vencer', value: expiringSoon, color: RISK_COLORS.warning },
    { name: 'Garantías vencidas', value: expiredWarranties, color: RISK_COLORS.danger },
    { name: 'Garantías por vencer', value: warrantyExpiringSoon, color: RISK_COLORS.warning },
    { name: 'Activos dañados', value: damagedAssets, color: RISK_COLORS.danger },
  ].filter(item => item.value > 0);

  return {
    total_assets: totalAssets,
    active_assets: activeAssets,
    assigned_assets: assignedAssets,
    unassigned_assets: unassignedAssets,
    in_maintenance: maintenanceAssets,
    retired: retiredAssets,
    stored_assets: storedAssets,
    damaged_assets: damagedAssets,
    total_licenses: totalLicenses,
    expiring_soon: expiringSoon,
    expired_licenses: expiredLicenses,
    license_capacity: licenseCapacity,
    license_used_seats: licenseUsedSeats,
    license_utilization_pct: licenseCapacity > 0 ? Math.round((licenseUsedSeats / licenseCapacity) * 100) : 0,
    overused_licenses: overusedLicenses,
    warranty_expiring_soon: warrantyExpiringSoon,
    expired_warranties: expiredWarranties,
    assets_by_status: toSeries(statusMap),
    assets_by_type: toSeries(typeMap, 8),
    assets_by_area: toSeries(areaMap, 8),
    assets_by_location: toSeries(locationMap, 8),
    license_usage: licenseUsage,
    operational_summary: operationalSummary,
    risk_summary: riskSummary,
    recent_activity: recentActivityRes.data ?? [],
  };
};

const assetsSummary = async () => {
  const { data, error } = await supabase
    .from('assets')
    .select('asset_statuses(name)', { count: 'exact' })
    .eq('is_deleted', false);

  if (error) throw new AppError('Error al generar reporte', 500);

  const byStatus = {};
  data.forEach(({ asset_statuses }) => {
    const name = asset_statuses?.name || 'sin_estado';
    byStatus[name] = (byStatus[name] || 0) + 1;
  });

  return { total: data.length, byStatus };
};

const assetsByArea = async () => {
  const { data, error } = await supabase
    .from('assets')
    .select('areas(name)')
    .eq('is_deleted', false);

  if (error) throw new AppError('Error al generar reporte', 500);

  const byArea = {};
  data.forEach(({ areas }) => {
    const name = areas?.name || 'sin_área';
    byArea[name] = (byArea[name] || 0) + 1;
  });

  return { byArea };
};

const licensesExpiringSoon = async (days = 30) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  const { data, error } = await supabase
    .from('licenses')
    .select('id, name, vendor, expiry_date, max_seats')
    .eq('is_active', true)
    .lte('expiry_date', cutoff.toISOString().split('T')[0])
    .order('expiry_date');

  if (error) throw new AppError('Error al generar reporte', 500);
  return data;
};

const inventoryExport = async () => {
  const { data, error } = await supabase
    .from('assets')
    .select(`
      code, serial, name, model, purchase_date, warranty_expiry, notes,
      asset_types(name), brands(name), asset_statuses(name),
      areas(name), locations(name),
      responsible:users!assets_responsible_user_id_fkey(full_name, email)
    `)
    .eq('is_deleted', false)
    .order('code');

  if (error) throw new AppError('Error al exportar inventario', 500);
  return data;
};

const licensesExport = async () => {
  const { data, error } = await supabase
    .from('licenses')
    .select(`
      id, name, vendor, license_type, max_seats,
      purchase_date, expiry_date, cost, notes, is_active, created_at
    `)
    .order('name');

  if (error) throw new AppError('Error al exportar licencias', 500);
  return data;
};

const byType = async () => {
  const { data, error } = await supabase
    .from('assets')
    .select('asset_types(name)')
    .eq('is_deleted', false);

  if (error) throw new AppError('Error al generar reporte por tipo', 500);

  const map = new Map();
  data.forEach(({ asset_types }) => increment(map, asset_types?.name ?? 'Sin tipo'));
  return { items: toSeries(map) };
};

const byStatus = async () => {
  const { data, error } = await supabase
    .from('assets')
    .select('asset_statuses(name)')
    .eq('is_deleted', false);

  if (error) throw new AppError('Error al generar reporte por estado', 500);

  const map = new Map();
  data.forEach(({ asset_statuses }) => increment(map, asset_statuses?.name ?? 'Sin estado'));
  return { items: toSeries(map) };
};

const unassigned = async () => {
  const { data, error } = await supabase
    .from('assets')
    .select('id, code, name, model, asset_types(name), asset_statuses(name), areas(name)')
    .eq('is_deleted', false)
    .is('responsible_user_id', null)
    .order('code');

  if (error) throw new AppError('Error al obtener activos sin asignar', 500);
  return data ?? [];
};

const licensesAssigned = async () => {
  const { data, error } = await supabase
    .from('license_assignments')
    .select(`
      id, assigned_at, notes,
      license:licenses(id, name, vendor, expiry_date),
      asset:assets!license_assignments_asset_id_fkey(id, code, name),
      user:users!license_assignments_user_id_fkey(id, full_name, email)
    `)
    .eq('is_active', true)
    .order('assigned_at', { ascending: false });

  if (error) throw new AppError('Error al obtener asignaciones de licencias', 500);
  return data ?? [];
};

module.exports = { dashboard, assetsSummary, assetsByArea, byType, byStatus, unassigned, licensesExpiringSoon, inventoryExport, licensesExport, licensesAssigned };
