const { getHealthStatus } = require('../services/healthService');
const { ok } = require('../utils/response');

const getHealth = (req, res) => {
  res.status(200).json(ok(getHealthStatus()));
};

module.exports = {
  getHealth,
};
