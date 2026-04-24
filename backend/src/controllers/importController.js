const importService = require('../services/assetImportService');
const { ok } = require('../utils/response');

const template = async (req, res, next) => {
  try {
    const data = await importService.template();
    const escape = (value) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [
      data.headers.join(','),
      ...data.rows.map((row) => row.map(escape).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_importacion_activos.csv"');
    res.send('\uFEFF' + csv);
  } catch (error) {
    next(error);
  }
};

const preview = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await importService.preview(req.body.rows)));
  } catch (error) {
    return next(error);
  }
};

const commit = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await importService.commit({
      rows: req.body.rows,
      actorId: req.user?.sub,
      ip: req.ip,
      fileName: req.body.file_name,
    })));
  } catch (error) {
    return next(error);
  }
};

const list = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await importService.list()));
  } catch (error) {
    return next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await importService.getById(req.params.id)));
  } catch (error) {
    return next(error);
  }
};

module.exports = { template, preview, commit, list, getById };

