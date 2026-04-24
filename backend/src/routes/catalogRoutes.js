const { Router } = require('express');
const ctrl = require('../controllers/catalogController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');
const { createRules, updateRules } = require('../validators/catalogValidator');

const router = Router();

router.use(authenticate);

// Roles (read-only)
router.get('/roles', ctrl.getRoles);

// Areas
router.get('/areas', ctrl.getAreas);
router.get('/areas/:id', ctrl.getAreaById);
router.post('/areas', authorize('admin', 'manager'), createRules, ctrl.createArea);
router.put('/areas/:id', authorize('admin', 'manager'), updateRules, ctrl.updateArea);

// Locations
router.get('/locations', ctrl.getLocations);
router.get('/locations/:id', ctrl.getLocationById);
router.post('/locations', authorize('admin', 'manager'), createRules, ctrl.createLocation);
router.put('/locations/:id', authorize('admin', 'manager'), updateRules, ctrl.updateLocation);

// Asset Types
router.get('/asset-types', ctrl.getAssetTypes);
router.get('/asset-types/:id', ctrl.getAssetTypeById);
router.post('/asset-types', authorize('admin'), createRules, ctrl.createAssetType);
router.put('/asset-types/:id', authorize('admin'), updateRules, ctrl.updateAssetType);

// Asset Statuses
router.get('/asset-statuses', ctrl.getAssetStatuses);

// Brands
router.get('/brands', ctrl.getBrands);
router.get('/brands/:id', ctrl.getBrandById);
router.post('/brands', authorize('admin', 'manager'), createRules, ctrl.createBrand);
router.put('/brands/:id', authorize('admin', 'manager'), updateRules, ctrl.updateBrand);

module.exports = router;
