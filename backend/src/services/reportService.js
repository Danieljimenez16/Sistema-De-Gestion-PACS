const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');

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

module.exports = { assetsSummary, assetsByArea, licensesExpiringSoon, inventoryExport };
