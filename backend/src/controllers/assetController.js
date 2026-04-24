const assetService = require('../services/assetService');
const { ok } = require('../utils/response');

const list = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await assetService.list(req.query)));
  } catch (err) { return next(err); }
};

const getById = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await assetService.getById(req.params.id)));
  } catch (err) { return next(err); }
};

const create = async (req, res, next) => {
  try {
    return res.status(201).json(ok(await assetService.create(req.body, req.user.sub, req.ip)));
  } catch (err) { return next(err); }
};

const update = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await assetService.update(req.params.id, req.body, req.user.sub, req.ip)));
  } catch (err) { return next(err); }
};

const changeStatus = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await assetService.changeStatus(
      req.params.id, req.body.status_id, req.body.reason, req.user.sub, req.ip
    )));
  } catch (err) { return next(err); }
};

const assign = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await assetService.assign(req.params.id, req.body, req.user.sub, req.ip)));
  } catch (err) { return next(err); }
};

const getStatusHistory = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await assetService.getStatusHistory(req.params.id)));
  } catch (err) { return next(err); }
};

const getHistory = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await assetService.getHistory(req.params.id)));
  } catch (err) { return next(err); }
};

const nextCode = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await assetService.nextCode()));
  } catch (err) { return next(err); }
};

const remove = async (req, res, next) => {
  try {
    await assetService.remove(req.params.id, req.user.sub, req.ip);
    return res.status(204).send();
  } catch (err) { return next(err); }
};

module.exports = { list, getById, create, update, changeStatus, assign, getStatusHistory, getHistory, nextCode, remove };
