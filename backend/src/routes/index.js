const express = require('express');
const { ok } = require('../utils/response');

const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const catalogRoutes = require('./catalogRoutes');
const assetRoutes = require('./assetRoutes');
const licenseRoutes = require('./licenseRoutes');
const auditRoutes = require('./auditRoutes');
const reportRoutes = require('./reportRoutes');
const importRoutes = require('./importRoutes');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json(ok({ message: 'SIGAT-ES API v1' }));
});

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/catalogs', catalogRoutes);
router.use('/assets', assetRoutes);
router.use('/licenses', licenseRoutes);
router.use('/audit', auditRoutes);
router.use('/reports', reportRoutes);
router.use('/imports', importRoutes);

module.exports = router;
