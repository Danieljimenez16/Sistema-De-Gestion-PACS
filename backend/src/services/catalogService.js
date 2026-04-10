const catalogRepo = require('../repositories/catalogRepository');
const AppError = require('../utils/AppError');

const wrap = async (promise, notFoundMsg) => {
  const { data, error } = await promise;
  if (error) throw new AppError(error.message, 500);
  if (!data) throw new AppError(notFoundMsg || 'No encontrado', 404);
  return data;
};

// Areas
const getAreas = () => wrap(catalogRepo.getAreas());
const getAreaById = (id) => wrap(catalogRepo.getAreaById(id), 'Área no encontrada');
const createArea = (body) => wrap(catalogRepo.createArea(body));
const updateArea = (id, body) => wrap(catalogRepo.updateArea(id, body), 'Área no encontrada');

// Locations
const getLocations = (areaId) => wrap(catalogRepo.getLocations(areaId));
const getLocationById = (id) => wrap(catalogRepo.getLocationById(id), 'Ubicación no encontrada');
const createLocation = (body) => wrap(catalogRepo.createLocation(body));
const updateLocation = (id, body) => wrap(catalogRepo.updateLocation(id, body), 'Ubicación no encontrada');

// Asset Types
const getAssetTypes = () => wrap(catalogRepo.getAssetTypes());
const getAssetTypeById = (id) => wrap(catalogRepo.getAssetTypeById(id), 'Tipo no encontrado');
const createAssetType = (body) => wrap(catalogRepo.createAssetType(body));
const updateAssetType = (id, body) => wrap(catalogRepo.updateAssetType(id, body), 'Tipo no encontrado');

// Asset Statuses
const getAssetStatuses = () => wrap(catalogRepo.getAssetStatuses());

// Brands
const getBrands = () => wrap(catalogRepo.getBrands());
const getBrandById = (id) => wrap(catalogRepo.getBrandById(id), 'Marca no encontrada');
const createBrand = (body) => wrap(catalogRepo.createBrand(body));
const updateBrand = (id, body) => wrap(catalogRepo.updateBrand(id, body), 'Marca no encontrada');

// Roles
const getRoles = () => wrap(catalogRepo.getRoles());

module.exports = {
  getAreas, getAreaById, createArea, updateArea,
  getLocations, getLocationById, createLocation, updateLocation,
  getAssetTypes, getAssetTypeById, createAssetType, updateAssetType,
  getAssetStatuses,
  getBrands, getBrandById, createBrand, updateBrand,
  getRoles,
};
