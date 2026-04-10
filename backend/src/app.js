const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1', routes);
app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  app.listen(env.port, () => {
    console.log(`Servidor corriendo en http://localhost:${env.port}`);
  });
}

module.exports = app;
