const { Router } = require('express');
const ctrl = require('../controllers/importController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');

const router = Router();

router.use(authenticate);

// Template download (must be before /:id to avoid conflict)
router.get('/assets/template', ctrl.template);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/assets/preview', authorize('admin', 'manager'), ctrl.preview);
router.post('/assets/commit', authorize('admin', 'manager'), ctrl.commit);

module.exports = router;
