const userService = require('../services/userService');
const { ok } = require('../utils/response');

const list = async (req, res, next) => {
  try {
    const data = await userService.list(req.query);
    return res.status(200).json(ok(data));
  } catch (err) { return next(err); }
};

const getById = async (req, res, next) => {
  try {
    const data = await userService.getById(req.params.id);
    return res.status(200).json(ok(data));
  } catch (err) { return next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = await userService.create(req.body, req.user.sub, req.ip);
    return res.status(201).json(ok(data));
  } catch (err) { return next(err); }
};

const update = async (req, res, next) => {
  try {
    const data = await userService.update(req.params.id, req.body, req.user.sub, req.ip);
    return res.status(200).json(ok(data));
  } catch (err) { return next(err); }
};

const setStatus = async (req, res, next) => {
  try {
    const data = await userService.setStatus(req.params.id, req.body.is_active, req.user.sub, req.ip);
    return res.status(200).json(ok(data));
  } catch (err) { return next(err); }
};

const resetPassword = async (req, res, next) => {
  try {
    const data = await userService.resetPassword(req.params.id, req.user.sub, req.ip);
    return res.status(200).json(ok(data));
  } catch (err) { return next(err); }
};

const getPendingPasswordRequests = async (req, res, next) => {
  try {
    const data = await userService.getPendingPasswordRequests();
    return res.status(200).json(ok(data));
  } catch (err) { return next(err); }
};

module.exports = { list, getById, create, update, setStatus, resetPassword, getPendingPasswordRequests };
