const { Router } = require('express');
const ctrl = require('../controllers/importController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');

const router = Router();

router.use(authenticate, authorize('admin', 'manager'));

router.post('/assets/preview', ctrl.preview);
router.post('/assets/commit', ctrl.commit);

module.exports = router;
