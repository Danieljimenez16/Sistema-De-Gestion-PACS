const assetRepo = require('../repositories/assetRepository');
const importRepo = require('../repositories/importRepository');
const auditRepo = require('../repositories/auditRepository');
const AppError = require('../utils/AppError');

/**
 * Preview: validate rows without persisting.
 * rows: array of objects with asset fields.
 */
const preview = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new AppError('No se recibieron filas para procesar', 400);
  }

  const results = await Promise.all(
    rows.map(async (row, i) => {
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

      return { row: i + 1, data: row, valid: errors.length === 0, errors };
    })
  );

  const valid = results.filter((r) => r.valid).length;
  const invalid = results.length - valid;
  return { total: results.length, valid, invalid, rows: results };
};

/**
 * Commit: persist valid rows after preview.
 */
const commit = async (rows, actorId, ip) => {
  const previewResult = await preview(rows);
  const validRows = previewResult.rows.filter((r) => r.valid).map((r) => r.data);

  if (validRows.length === 0) {
    throw new AppError('No hay filas válidas para importar', 422);
  }

  const { data: importRecord } = await importRepo.create({
    status: 'processing',
    total_rows: rows.length,
    imported_by: actorId,
    file_name: 'manual_import',
  });

  let processed = 0;
  let errorCount = 0;

  for (const row of validRows) {
    const { error } = await assetRepo.create(row);
    if (error) {
      errorCount++;
    } else {
      processed++;
      await auditRepo.log({
        entity_type: 'asset', entity_id: null,
        action: 'import', new_values: row,
        performed_by: actorId, ip_address: ip,
      });
    }
  }

  await importRepo.update(importRecord.id, {
    status: 'completed',
    processed_rows: processed,
    error_rows: errorCount,
    finished_at: new Date().toISOString(),
  });

  return {
    import_id: importRecord.id,
    total: rows.length,
    processed,
    errors: errorCount,
    skipped: rows.length - validRows.length,
  };
};

module.exports = { preview, commit };
