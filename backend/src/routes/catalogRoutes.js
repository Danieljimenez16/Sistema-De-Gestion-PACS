const { Router } = require('express');
const ctrl = require('../controllers/catalogController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');

const router = Router();

router.use(authenticate);

// Roles (read-only)
router.get('/roles', ctrl.getRoles);

// Areas
router.get('/areas', ctrl.getAreas);
router.get('/areas/:id', ctrl.getAreaById);
router.post('/areas', authorize('admin', 'manager'), ctrl.createArea);
router.put('/areas/:id', authorize('admin', 'manager'), ctrl.updateArea);

// Locations
router.get('/locations', ctrl.getLocations);
router.get('/locations/:id', ctrl.getLocationById);
router.post('/locations', authorize('admin', 'manager'), ctrl.createLocation);
router.put('/locations/:id', authorize('admin', 'manager'), ctrl.updateLocation);

// Asset Types
router.get('/asset-types', ctrl.getAssetTypes);
router.get('/asset-types/:id', ctrl.getAssetTypeById);
router.post('/asset-types', authorize('admin'), ctrl.createAssetType);
router.put('/asset-types/:id', authorize('admin'), ctrl.updateAssetType);

// Asset Statuses
router.get('/asset-statuses', ctrl.getAssetStatuses);

// Brands
router.get('/brands', ctrl.getBrands);
router.get('/brands/:id', ctrl.getBrandById);
router.post('/brands', authorize('admin', 'manager'), ctrl.createBrand);
router.put('/brands/:id', authorize('admin', 'manager'), ctrl.updateBrand);

module.exports = router;
