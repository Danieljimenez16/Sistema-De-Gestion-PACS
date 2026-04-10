const auditService = require('../services/auditService');
const { ok } = require('../utils/response');

const list = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await auditService.list(req.query)));
  } catch (err) { return next(err); }
};

const getById = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await auditService.getById(req.params.id)));
  } catch (err) { return next(err); }
};

module.exports = { list, getById };
