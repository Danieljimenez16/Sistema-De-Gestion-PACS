const { fail } = require('../utils/response');

/**
 * authorize('admin', 'manager') — allow if req.user.role is in allowed list
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json(fail('Acceso denegado: permisos insuficientes'));
  }
  return next();
};

module.exports = { authorize };
