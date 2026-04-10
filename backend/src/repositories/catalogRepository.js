const supabase = require('../config/supabase');

const activeList = (table, extraSelect = '*') =>
  supabase.from(table).select(extraSelect).eq('is_active', true).order('name');

const getById = (table, id) =>
  supabase.from(table).select('*').eq('id', id).single();

const insert = (table, data) =>
  supabase.from(table).insert(data).select().single();

const patch = (table, id, data) =>
  supabase.from(table).update(data).eq('id', id).select().single();

module.exports = {
  getRoles: () => supabase.from('roles').select('*').order('name'),
  getAreas: () => activeList('areas'),
  getAreaById: (id) => getById('areas', id),
  createArea: (data) => insert('areas', data),
  updateArea: (id, data) => patch('areas', id, data),
  getLocations: (areaId) => {
    let q = activeList('locations', '*, areas(id, name)');
    if (areaId) q = q.eq('area_id', areaId);
    return q;
  },
  getLocationById: (id) => getById('locations', id),
  createLocation: (data) => insert('locations', data),
  updateLocation: (id, data) => patch('locations', id, data),
  getAssetTypes: () => activeList('asset_types'),
  getAssetTypeById: (id) => getById('asset_types', id),
  createAssetType: (data) => insert('asset_types', data),
  updateAssetType: (id, data) => patch('asset_types', id, data),
  getAssetStatuses: () => activeList('asset_statuses'),
  getBrands: () => activeList('brands'),
  getBrandById: (id) => getById('brands', id),
  createBrand: (data) => insert('brands', data),
  updateBrand: (id, data) => patch('brands', id, data),
};
