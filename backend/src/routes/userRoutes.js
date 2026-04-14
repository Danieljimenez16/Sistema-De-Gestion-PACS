const { Router } = require('express');
const ctrl = require('../controllers/userController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');
const { createRules, updateRules, statusRules } = require('../validators/userValidator');

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'manager'), ctrl.list);
router.get('/password-requests', authorize('admin'), ctrl.getPendingPasswordRequests);
router.get('/:id', authorize('admin', 'manager'), ctrl.getById);
router.post('/', authorize('admin'), createRules, ctrl.create);
router.put('/:id', authorize('admin'), updateRules, ctrl.update);
router.patch('/:id/status', authorize('admin'), statusRules, ctrl.setStatus);
router.post('/:id/reset-password', authorize('admin'), ctrl.resetPassword);

module.exports = router;
