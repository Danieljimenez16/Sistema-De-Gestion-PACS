const { Router } = require('express');
const ctrl = require('../controllers/licenseController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');
const { createRules, updateRules, assignRules } = require('../validators/licenseValidator');

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.get('/:id/assignments', ctrl.getAssignments);
router.post('/', authorize('admin', 'manager'), createRules, ctrl.create);
router.put('/:id', authorize('admin', 'manager'), updateRules, ctrl.update);
router.post('/:id/assignments', authorize('admin', 'manager'), assignRules, ctrl.assign);

module.exports = router;
