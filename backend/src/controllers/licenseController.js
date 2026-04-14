const licenseService = require('../services/licenseService');
const { ok } = require('../utils/response');

const list = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await licenseService.list(req.query)));
  } catch (err) { return next(err); }
};

const getById = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await licenseService.getById(req.params.id)));
  } catch (err) { return next(err); }
};

const create = async (req, res, next) => {
  try {
    return res.status(201).json(ok(await licenseService.create(req.body, req.user.sub, req.ip)));
  } catch (err) { return next(err); }
};

const update = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await licenseService.update(req.params.id, req.body, req.user.sub, req.ip)));
  } catch (err) { return next(err); }
};

const assign = async (req, res, next) => {
  try {
    return res.status(201).json(ok(await licenseService.assign(req.params.id, req.body, req.user.sub, req.ip)));
  } catch (err) { return next(err); }
};

const getAssignments = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await licenseService.getAssignments(req.params.id)));
  } catch (err) { return next(err); }
};

const remove = async (req, res, next) => {
  try {
    await licenseService.remove(req.params.id, req.user.sub, req.ip);
    return res.status(204).send();
  } catch (err) { return next(err); }
};

module.exports = { list, getById, create, update, remove, assign, getAssignments };
