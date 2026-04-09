const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    message: 'Ruta principal del backend de SIGAT-ES',
  });
});

module.exports = router;