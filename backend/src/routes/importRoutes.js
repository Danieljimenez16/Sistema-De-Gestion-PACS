const { Router } = require('express');
const ctrl = require('../controllers/importController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'manager'));

router.get('/assets/template', ctrl.template);
router.post('/assets/preview', ctrl.preview);
router.post('/assets/commit', ctrl.commit);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);

module.exports = router;