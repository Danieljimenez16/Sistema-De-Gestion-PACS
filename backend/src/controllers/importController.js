const importService = require('../services/importService');
const { ok } = require('../utils/response');

/**
 * POST /imports/assets/preview
 * Body: { rows: [{ code, name, ... }] }
 * Validates rows, creates a pending import record, returns import_id + preview data.
 */
const preview = async (req, res, next) => {
  try {
    const rows = req.body.rows;
    if (!Array.isArray(rows)) {
      return res.status(400).json({ success: false, message: 'Se esperaba un array en body.rows' });
    }
    return res.status(200).json(ok(await importService.preview(rows, req.user.sub)));
  } catch (err) { return next(err); }
};

/**
 * POST /imports/assets/commit
 * Body: { import_id: string, rows: [...validRows] }
 * Persists the valid rows and marks the import as completed.
 */
const commit = async (req, res, next) => {
  try {
    const { import_id, rows } = req.body;
    return res.status(200).json(ok(
      await importService.commit(import_id, rows, req.user.sub, req.ip)
    ));
  } catch (err) { return next(err); }
};

/**
 * GET /imports
 * Returns list of past imports.
 */
const list = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await importService.list()));
  } catch (err) { return next(err); }
};

module.exports = { preview, commit, list };
