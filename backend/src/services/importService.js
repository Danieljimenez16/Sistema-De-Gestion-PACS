const assetRepo = require('../repositories/assetRepository');
const importRepo = require('../repositories/importRepository');
const auditRepo = require('../repositories/auditRepository');
const AppError = require('../utils/AppError');

/**
 * Validate a single row and return errors array.
 */
const validateRow = async (row, index) => {
  const errors = [];
  if (!row.code) errors.push('code requerido');
  if (!row.name) errors.push('name requerido');

  if (row.code) {
    const { data } = await assetRepo.findByCode(row.code);
    if (data) errors.push(`code '${row.code}' ya existe`);
  }
  if (row.serial) {
    const { data } = await assetRepo.findBySerial(row.serial);
    if (data) errors.push(`serial '${row.serial}' ya existe`);
  }

  return { _row: index + 1, ...row, _errors: errors.length > 0 ? errors : undefined };
};

/**
 * Preview: validate rows (received as parsed JSON) without persisting assets.
 * Creates a pending import record and returns import_id so the client can commit later.
 * rows: array of plain objects with asset fields.
 */
const preview = async (rows, actorId) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new AppError('No se recibieron filas para procesar', 400);
  }

  const validated = await Promise.all(rows.map((row, i) => validateRow(row, i)));

  const validRows = validated.filter(r => !r._errors).map(({ _row, _errors, ...data }) => data);
  const errorRows = validated
    .filter(r => r._errors)
    .map(({ _errors, ...rest }) => ({ ...rest, _error: _errors.join('; ') }));

  // Create a pending import record to track this preview session
  const { data: importRecord, error: importErr } = await importRepo.create({
    status: 'pending',
    total_rows: rows.length,
    processed_rows: 0,
    error_rows: errorRows.length,
    imported_by: actorId ?? null,
    file_name: 'csv_import',
    started_at: new Date().toISOString(),
  });

  if (importErr) throw new AppError('Error al registrar importación', 500);

  return {
    import_id: importRecord.id,
    rows: validRows,
    errors: errorRows,
    total: rows.length,
    valid: validRows.length,
    invalid: errorRows.length,
  };
};

/**
 * Commit: persist the valid rows provided by the client.
 * import_id: references the pending import record from preview.
 * rows: valid rows to insert (returned by preview.rows).
 */
const commit = async (importId, rows, actorId, ip) => {
  if (!importId) throw new AppError('import_id requerido', 400);
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new AppError('No hay filas válidas para importar', 422);
  }

  // Verify the import record exists
  const { data: importRecord, error: findErr } = await importRepo.findById(importId);
  if (findErr || !importRecord) throw new AppError('Importación no encontrada', 404);
  if (importRecord.status === 'completed') throw new AppError('Esta importación ya fue procesada', 409);

  await importRepo.update(importId, { status: 'processing' });

  let processed = 0;
  let errorCount = 0;

  for (const row of rows) {
    const { error } = await assetRepo.create(row);
    if (error) {
      errorCount++;
    } else {
      processed++;
      await auditRepo.log({
        entity_type: 'asset', entity_id: null,
        action: 'import', new_values: row,
        performed_by: actorId ?? null, ip_address: ip ?? null,
      });
    }
  }

  await importRepo.update(importId, {
    status: 'completed',
    processed_rows: processed,
    error_rows: errorCount,
    finished_at: new Date().toISOString(),
  });

  return {
    import_id: importId,
    processed_rows: processed,
    error_rows: errorCount,
    skipped: rows.length - processed - errorCount,
  };
};

/**
 * List import records (for history view).
 */
const list = async () => {
  const { data, error } = await importRepo.findAll();
  if (error) throw new AppError('Error al obtener importaciones', 500);
  return data ?? [];
};

module.exports = { preview, commit, list };
