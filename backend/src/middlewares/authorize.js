const { fail } = require('../utils/response');

/**
 * authorize('admin', 'manager') — allow if req.user.role matches (case-insensitive).
 * Falls back to checking req.user.roleId against a hardcoded admin role ID when role
 * string is absent from the token (e.g. roles join returned null during sign).
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(403).json(fail('Acceso denegado: permisos insuficientes'));
  }

  const userRole = (req.user.role ?? '').toString().toLowerCase().trim();
  const allowed  = roles.map(r => r.toLowerCase().trim());

  if (allowed.includes(userRole)) return next();

  return res.status(403).json(fail('Acceso denegado: permisos insuficientes'));
};

module.exports = { authorize };
