const { Router } = require('express');
const ctrl = require('../controllers/assetController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');
const { createRules, updateRules, statusRules, assignmentRules } = require('../validators/assetValidator');

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.get('/:id/status-history', ctrl.getStatusHistory);
router.post('/', authorize('admin', 'manager'), createRules, ctrl.create);
router.put('/:id', authorize('admin', 'manager'), updateRules, ctrl.update);
router.patch('/:id/status', authorize('admin', 'manager'), statusRules, ctrl.changeStatus);
router.patch('/:id/assignment', authorize('admin', 'manager'), assignmentRules, ctrl.assign);

module.exports = router;
