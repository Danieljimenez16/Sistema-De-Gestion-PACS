const { Router } = require('express');
const ctrl = require('../controllers/importController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.post('/assets/preview', authorize('admin', 'manager'), ctrl.preview);
router.post('/assets/commit', authorize('admin', 'manager'), ctrl.commit);

module.exports = router;
