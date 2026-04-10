const { Router } = require('express');
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { loginRules } = require('../validators/authValidator');

const router = Router();

router.post('/login', loginRules, ctrl.login);
router.get('/me', authenticate, ctrl.me);
router.post('/logout', authenticate, ctrl.logout);

module.exports = router;
