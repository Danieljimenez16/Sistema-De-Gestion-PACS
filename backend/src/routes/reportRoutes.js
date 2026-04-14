const { Router } = require('express');
const ctrl = require('../controllers/reportController');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.use(authenticate);

router.get('/dashboard', ctrl.dashboard);
router.get('/assets/summary', ctrl.assetsSummary);
router.get('/assets/by-area', ctrl.assetsByArea);
router.get('/licenses/expiring', ctrl.licensesExpiringSoon);
router.get('/inventory/export', ctrl.inventoryExport);

module.exports = router;
