const { body } = require('express-validator');
const { handleValidation } = require('./authValidator');

const createRules = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 8 }).withMessage('Contraseña mínimo 8 caracteres'),
  body('full_name').notEmpty().withMessage('Nombre requerido'),
  body('role_id').isUUID().withMessage('role_id debe ser UUID válido'),
  handleValidation,
];

const updateRules = [
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('password').optional().isLength({ min: 8 }).withMessage('Contraseña mínimo 8 caracteres'),
  body('full_name').optional().notEmpty().withMessage('Nombre no puede estar vacío'),
  body('role_id').optional().isUUID().withMessage('role_id debe ser UUID válido'),
  handleValidation,
];

const statusRules = [
  body('is_active').isBoolean().withMessage('is_active debe ser boolean'),
  handleValidation,
];

module.exports = { createRules, updateRules, statusRules };
