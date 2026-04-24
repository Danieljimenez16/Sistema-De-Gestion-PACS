const { body } = require('express-validator');
const { handleValidation } = require('./authValidator');

const createRules = [
  body('code').trim().notEmpty().withMessage('Código requerido'),
  body('name').trim().notEmpty().withMessage('Nombre requerido'),
  body('asset_type_id').isUUID().withMessage('asset_type_id requerido y debe ser UUID'),
  body('brand_id').optional().isUUID().withMessage('brand_id inválido'),
  body('status_id').isUUID().withMessage('status_id requerido y debe ser UUID'),
  body('location_id').optional().isUUID().withMessage('location_id inválido'),
  body('area_id').optional().isUUID().withMessage('area_id inválido'),
  body('responsible_user_id').optional().isUUID().withMessage('responsible_user_id inválido'),
  body('purchase_date').optional().isDate().withMessage('purchase_date inválida'),
  body('warranty_expiry').optional().isDate().withMessage('warranty_expiry inválida'),
  handleValidation,
];

const updateRules = [
  body('code').optional().trim().notEmpty().withMessage('Código no puede estar vacío'),
  body('name').optional().trim().notEmpty().withMessage('Nombre no puede estar vacío'),
  body('asset_type_id').optional().isUUID().withMessage('asset_type_id inválido'),
  body('brand_id').optional().isUUID().withMessage('brand_id inválido'),
  body('status_id').optional().isUUID().withMessage('status_id inválido'),
  body('location_id').optional().isUUID().withMessage('location_id inválido'),
  body('area_id').optional().isUUID().withMessage('area_id inválido'),
  body('responsible_user_id').optional().isUUID().withMessage('responsible_user_id inválido'),
  handleValidation,
];

const statusRules = [
  body('status_id').isUUID().withMessage('status_id requerido y debe ser UUID'),
  body('reason').optional().isString(),
  handleValidation,
];

const assignmentRules = [
  body('user_id').optional().isUUID().withMessage('user_id inválido'),
  body('area_id').optional().isUUID().withMessage('area_id inválido'),
  body('location_id').optional().isUUID().withMessage('location_id inválido'),
  handleValidation,
];

module.exports = { createRules, updateRules, statusRules, assignmentRules };
