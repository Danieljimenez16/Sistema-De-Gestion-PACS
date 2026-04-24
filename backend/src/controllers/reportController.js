const reportService = require('../services/reportService');
const { ok } = require('../utils/response');

const dashboard = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await reportService.dashboard()));
  } catch (err) { return next(err); }
};

const assetsSummary = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await reportService.assetsSummary()));
  } catch (err) { return next(err); }
};

const assetsByArea = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await reportService.assetsByArea()));
  } catch (err) { return next(err); }
};

const licensesExpiringSoon = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    return res.status(200).json(ok(await reportService.licensesExpiringSoon(days)));
  } catch (err) { return next(err); }
};

const assetsExport = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await reportService.inventoryExport()));
  } catch (err) { return next(err); }
};

const licensesExport = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await reportService.licensesExport()));
  } catch (err) { return next(err); }
};

// Keep alias for backward compatibility
const inventoryExport = assetsExport;

module.exports = { dashboard, assetsSummary, assetsByArea, licensesExpiringSoon, assetsExport, licensesExport, inventoryExport };
