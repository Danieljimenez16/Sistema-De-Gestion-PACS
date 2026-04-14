const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const requestLogger = require('./middlewares/logger');

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SIGAT-ES API',
    data: {
      version: 'v1',
      baseUrl: '/api/v1',
      health: '/api/v1/health',
    },
  });
});

app.use('/api/v1', routes);
app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  app.listen(env.port, () => {
    console.log(`Servidor corriendo en http://localhost:${env.port}`);
  });
}

module.exports = app;
