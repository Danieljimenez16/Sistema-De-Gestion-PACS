const { fail } = require('../utils/response');

const notFoundHandler = (req, res) => {
  res.status(404).json(fail('Endpoint no encontrado'));
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json(
    fail(
      err.message || 'Error interno del servidor',
      err.errors || {}
    )
  );
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
