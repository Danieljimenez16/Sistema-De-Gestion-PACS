const { Router } = require('express');
const ctrl = require('../controllers/auditController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');

const router = Router();

router.use(authenticate, authorize('admin', 'manager'));

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);

module.exports = router;
