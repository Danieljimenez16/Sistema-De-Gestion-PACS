const { nodeEnv } = require('../config/env');

const getHealthStatus = () => ({
  status: 'ok',
  service: 'SIGAT-ES backend',
  environment: nodeEnv,
  timestamp: new Date().toISOString(),
});

module.exports = {
  getHealthStatus,
};
