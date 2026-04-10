const express = require('express');

const healthRoutes = require('./healthRoutes');
const { ok } = require('../utils/response');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json(
    ok({
      message: 'SIGAT-ES API v1',
    })
  );
});

router.use('/health', healthRoutes);

module.exports = router;
