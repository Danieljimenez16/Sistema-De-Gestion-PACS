const authService = require('../services/authService');
const { ok } = require('../utils/response');

const login = async (req, res, next) => {
  try {
    const result = await authService.login({
      email: req.body.email,
      password: req.body.password,
      ip: req.ip,
    });
    return res.status(200).json(ok(result));
  } catch (err) {
    return next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await authService.me(req.user.sub);
    return res.status(200).json(ok(user));
  } catch (err) {
    return next(err);
  }
};

const logout = (req, res) => {
  return res.status(200).json(ok({ message: 'Sesión cerrada' }));
};

const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password, skip_current_check } = req.body;
    const result = await authService.changePassword({
      userId: req.user.sub,
      currentPassword: current_password,
      newPassword: new_password,
      skipCurrentCheck: skip_current_check === true || req.user.mustChangePassword === true,
    });
    return res.status(200).json(ok(result));
  } catch (err) {
    return next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword({ email: req.body.email });
    return res.status(200).json(ok(result));
  } catch (err) {
    return next(err);
  }
};

module.exports = { login, me, logout, changePassword, forgotPassword };
