const { body, validationResult } = require('express-validator');
const { fail } = require('../utils/response');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json(fail('Validación fallida', errors.array()));
  }
  return next();
};

const loginRules = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Contraseña requerida'),
  handleValidation,
];

module.exports = { loginRules, handleValidation };
