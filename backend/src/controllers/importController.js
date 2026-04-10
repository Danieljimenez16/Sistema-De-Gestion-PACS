const importService = require('../services/importService');
const { ok } = require('../utils/response');

const preview = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await importService.preview(req.body.rows)));
  } catch (err) { return next(err); }
};

const commit = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await importService.commit(req.body.rows, req.user.sub, req.ip)));
  } catch (err) { return next(err); }
};

module.exports = { preview, commit };
