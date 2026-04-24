const { body } = require('express-validator');
const { handleValidation } = require('./authValidator');

const createRules = [
  body('name').trim().notEmpty().withMessage('Nombre requerido'),
  body('max_seats').optional().isInt({ min: 1 }).withMessage('max_seats debe ser entero positivo'),
  body('expiry_date').optional().isDate().withMessage('expiry_date inválida'),
  body('purchase_date').optional().isDate().withMessage('purchase_date inválida'),
  body('cost').optional().isFloat({ min: 0 }).withMessage('cost inválido'),
  handleValidation,
];

const updateRules = [
  body('name').optional().trim().notEmpty().withMessage('Nombre no puede estar vacío'),
  body('max_seats').optional().isInt({ min: 1 }).withMessage('max_seats debe ser entero positivo'),
  body('expiry_date').optional().isDate().withMessage('expiry_date inválida'),
  handleValidation,
];

const assignRules = [
  body('asset_id').optional().isUUID().withMessage('asset_id inválido'),
  body('user_id').optional().isUUID().withMessage('user_id inválido'),
  handleValidation,
];

module.exports = { createRules, updateRules, assignRules };
