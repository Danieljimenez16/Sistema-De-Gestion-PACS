const importService = require('../services/importService');
const { ok } = require('../utils/response');

/**
 * GET /imports/assets/template
 * Returns a CSV template for asset imports.
 */
const template = (req, res) => {
  const headers = [
    'code', 'name', 'serial', 'model', 'description', 'notes',
    'asset_type_name', 'brand_name', 'status_name', 'area_name', 'location_name',
    'responsible_email', 'purchase_date', 'warranty_expiry',
  ];
  const exampleRow = [
    'ELEM-001', 'Laptop HP ProBook 440', 'SN123456', 'ProBook 440 G9', 'Laptop para oficina', '',
    'Laptop', 'HP', 'Activo', 'Tecnología', 'Oficina Principal',
    'usuario@empresa.com', '2024-01-15', '2027-01-15',
  ];
  const csv = [headers.join(','), exampleRow.map(v => `"${v}"`).join(',')].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla_importacion_activos.csv"');
  res.send('\uFEFF' + csv); // BOM for Excel UTF-8 compatibility
};

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

/**
 * GET /imports/:id
 * Returns details of a specific import.
 */
const getById = async (req, res, next) => {
  try {
    return res.status(200).json(ok(await importService.getById(req.params.id)));
  } catch (err) { return next(err); }
};

module.exports = { template, preview, commit, list, getById };

