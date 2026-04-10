const catalogService = require('../services/catalogService');
const { ok } = require('../utils/response');

const make = (fn) => async (req, res, next) => {
  try {
    const data = await fn(req, res);
    return res.status(200).json(ok(data));
  } catch (err) { return next(err); }
};

const makeCreate = (fn) => async (req, res, next) => {
  try {
    const data = await fn(req, res);
    return res.status(201).json(ok(data));
  } catch (err) { return next(err); }
};

module.exports = {
  getRoles:        make((req) => catalogService.getRoles()),
  getAreas:        make((req) => catalogService.getAreas()),
  getAreaById:     make((req) => catalogService.getAreaById(req.params.id)),
  createArea:      makeCreate((req) => catalogService.createArea(req.body)),
  updateArea:      make((req) => catalogService.updateArea(req.params.id, req.body)),
  getLocations:    make((req) => catalogService.getLocations(req.query.area_id)),
  getLocationById: make((req) => catalogService.getLocationById(req.params.id)),
  createLocation:  makeCreate((req) => catalogService.createLocation(req.body)),
  updateLocation:  make((req) => catalogService.updateLocation(req.params.id, req.body)),
  getAssetTypes:   make(() => catalogService.getAssetTypes()),
  getAssetTypeById:make((req) => catalogService.getAssetTypeById(req.params.id)),
  createAssetType: makeCreate((req) => catalogService.createAssetType(req.body)),
  updateAssetType: make((req) => catalogService.updateAssetType(req.params.id, req.body)),
  getAssetStatuses:make(() => catalogService.getAssetStatuses()),
  getBrands:       make(() => catalogService.getBrands()),
  getBrandById:    make((req) => catalogService.getBrandById(req.params.id)),
  createBrand:     makeCreate((req) => catalogService.createBrand(req.body)),
  updateBrand:     make((req) => catalogService.updateBrand(req.params.id, req.body)),
};
