const { body } = require('express-validator');
const { handleValidation } = require('./authValidator');

const HUMAN_NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'.-]*$/;

const createRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Nombre requerido')
    .bail()
    .matches(HUMAN_NAME_REGEX).withMessage('El nombre no debe contener números ni caracteres no permitidos'),
  body('area_id').optional().isUUID().withMessage('area_id inválido'),
  handleValidation,
];

const updateRules = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Nombre no puede estar vacío')
    .bail()
    .matches(HUMAN_NAME_REGEX).withMessage('El nombre no debe contener números ni caracteres no permitidos'),
  body('area_id').optional().isUUID().withMessage('area_id inválido'),
  handleValidation,
];

module.exports = { createRules, updateRules };