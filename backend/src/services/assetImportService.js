const assetRepo = require('../repositories/assetRepository');
const importRepo = require('../repositories/importRepository');
const catalogRepo = require('../repositories/catalogRepository');
const userRepo = require('../repositories/userRepository');
const assetService = require('./assetService');
const AppError = require('../utils/AppError');

const REQUIRED_FIELDS = ['code', 'name', 'asset_type_name', 'status_name'];

const isValidDateParts = (year, month, day) => {
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
};

const isIsoDate = (value) => {
  if (!value) return true;
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  return isValidDateParts(Number(match[1]), Number(match[2]), Number(match[3]));
};

const cleanValue = (value) => {
  if (value == null) return undefined;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const normalizeRow = (row = {}) => {
  const normalized = {};

  Object.entries(row).forEach(([key, value]) => {
    const cleanKey = String(key).replace(/^\uFEFF/, '').trim();
    if (!cleanKey) return;

    const normalizedValue = cleanValue(value);
    if (normalizedValue !== undefined) normalized[cleanKey] = normalizedValue;
  });

  return normalized;
};

const mapByName = (items) => {
  const map = new Map();
  (items ?? []).forEach((item) => {
    if (item?.name) map.set(item.name.toLowerCase().trim(), item.id);
  });
  return map;
};

const loadCatalogs = async () => {
  const [types, brands, statuses, areas, locations] = await Promise.all([
    catalogRepo.getAssetTypes(),
    catalogRepo.getBrands(),
    catalogRepo.getAssetStatuses(),
    catalogRepo.getAreas(),
    catalogRepo.getLocations(),
  ]);

  return {
    assetTypes: mapByName(types.data),
    brands: mapByName(brands.data),
    statuses: mapByName(statuses.data),
    areas: mapByName(areas.data),
    locations: mapByName(locations.data),
  };
};

const buildDuplicateMaps = (rows) => {
  const codeRows = new Map();
  const serialRows = new Map();

  rows.forEach((row, index) => {
    const rowNumber = index + 1;

    if (row.code) {
      const codeKey = String(row.code).toLowerCase();
      const seenRows = codeRows.get(codeKey) ?? [];
      seenRows.push(rowNumber);
      codeRows.set(codeKey, seenRows);
    }

    if (row.serial) {
      const serialKey = String(row.serial).toLowerCase();
      const seenRows = serialRows.get(serialKey) ?? [];
      seenRows.push(rowNumber);
      serialRows.set(serialKey, seenRows);
    }
  });

  return { codeRows, serialRows };
};

const addDuplicateErrors = (row, duplicateMaps, errors) => {
  if (row.code) {
    const duplicateRows = duplicateMaps.codeRows.get(String(row.code).toLowerCase()) ?? [];
    if (duplicateRows.length > 1) {
      errors.push(`code '${row.code}' repetido en filas ${duplicateRows.join(', ')}`);
    }
  }

  if (row.serial) {
    const duplicateRows = duplicateMaps.serialRows.get(String(row.serial).toLowerCase()) ?? [];
    if (duplicateRows.length > 1) {
      errors.push(`serial '${row.serial}' repetido en filas ${duplicateRows.join(', ')}`);
    }
  }
};

const resolveCatalogName = (row, field, label, map, errors) => {
  const value = row[field];
  if (!value) return undefined;

  const resolved = map.get(String(value).toLowerCase().trim());
  if (!resolved) {
    errors.push(`${field} '${value}' no coincide con un ${label} registrado`);
    return undefined;
  }

  return resolved;
};

const buildAssetPayload = async (row, catalogs, duplicateMaps) => {
  const normalizedRow = normalizeRow(row);
  const errors = [];

  REQUIRED_FIELDS.forEach((field) => {
    if (!normalizedRow[field]) errors.push(`${field} requerido`);
  });

  if (normalizedRow.purchase_date && !isIsoDate(normalizedRow.purchase_date)) {
    errors.push(`purchase_date '${normalizedRow.purchase_date}' inválida. Debe usar YYYY-MM-DD`);
  }

  if (normalizedRow.warranty_expiry && !isIsoDate(normalizedRow.warranty_expiry)) {
    errors.push(`warranty_expiry '${normalizedRow.warranty_expiry}' inválida. Debe usar YYYY-MM-DD`);
  }

  addDuplicateErrors(normalizedRow, duplicateMaps, errors);

  if (normalizedRow.code) {
    const { data } = await assetRepo.findByCode(normalizedRow.code);
    if (data) errors.push(`code '${normalizedRow.code}' ya existe`);
  }

  if (normalizedRow.serial) {
    const { data } = await assetRepo.findBySerial(normalizedRow.serial);
    if (data) errors.push(`serial '${normalizedRow.serial}' ya existe`);
  }

  const payload = {
    code: normalizedRow.code,
    name: normalizedRow.name,
    serial: normalizedRow.serial,
    model: normalizedRow.model,
    description: normalizedRow.description,
    notes: normalizedRow.notes,
    purchase_date: normalizedRow.purchase_date,
    warranty_expiry: normalizedRow.warranty_expiry,
    asset_type_id: resolveCatalogName(normalizedRow, 'asset_type_name', 'tipo de activo', catalogs.assetTypes, errors),
    brand_id: resolveCatalogName(normalizedRow, 'brand_name', 'marca', catalogs.brands, errors),
    status_id: resolveCatalogName(normalizedRow, 'status_name', 'estado', catalogs.statuses, errors),
    area_id: resolveCatalogName(normalizedRow, 'area_name', 'área', catalogs.areas, errors),
    location_id: resolveCatalogName(normalizedRow, 'location_name', 'ubicación', catalogs.locations, errors),
  };

  if (normalizedRow.responsible_email) {
    const { data: user } = await userRepo.findByEmail(normalizedRow.responsible_email);
    if (!user?.id) {
      errors.push(`responsible_email '${normalizedRow.responsible_email}' no corresponde a un usuario registrado`);
    } else {
      payload.responsible_user_id = user.id;
    }
  }

  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

  return {
    row: normalizedRow,
    payload,
    errors,
  };
};

const validateRows = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new AppError('No se recibieron filas para procesar', 400);
  }

  const normalizedRows = rows.map(normalizeRow);
  const duplicateMaps = buildDuplicateMaps(normalizedRows);
  const catalogs = await loadCatalogs();
  const evaluatedRows = await Promise.all(
    normalizedRows.map((row) => buildAssetPayload(row, catalogs, duplicateMaps))
  );

  const validRows = [];
  const errorRows = [];

  evaluatedRows.forEach(({ row, payload, errors }, index) => {
    const rowNumber = index + 1;

    if (errors.length > 0) {
      errorRows.push({ ...row, _row: rowNumber, _error: errors.join('; ') });
      return;
    }

    validRows.push({ ...row, _row: rowNumber, _payload: payload });
  });

  return {
    rows: validRows,
    errors: errorRows,
    total: normalizedRows.length,
    valid: validRows.length,
    invalid: errorRows.length,
  };
};

const createImportRecord = async ({ totalRows, fileName, actorId }) => {
  const { data, error } = await importRepo.create({
    status: 'processing',
    total_rows: totalRows,
    processed_rows: 0,
    error_rows: 0,
    file_name: fileName ?? 'importacion_activos.csv',
    imported_by: actorId ?? null,
    started_at: new Date().toISOString(),
  });

  if (error || !data) throw new AppError('No se pudo registrar la importación', 500);
  return data;
};

const preview = async (rows) => validateRows(rows);

const commit = async ({ rows, actorId, ip, fileName }) => {
  const previewResult = await validateRows(rows);
  const importRecord = await createImportRecord({
    totalRows: previewResult.total,
    fileName,
    actorId,
  });

  const rowErrors = [...previewResult.errors];
  let processed = 0;

  for (const row of previewResult.rows) {
    try {
      await assetService.create(row._payload, actorId, ip);
      processed++;
    } catch (error) {
      rowErrors.push({
        ...row,
        _error: error.message ?? 'No se pudo crear el activo',
      });
    }
  }

  const errorCount = rowErrors.length;
  const finalStatus = processed > 0 ? 'completed' : 'failed';

  await importRepo.update(importRecord.id, {
    status: finalStatus,
    processed_rows: processed,
    error_rows: errorCount,
    finished_at: new Date().toISOString(),
  });

  return {
    import_id: importRecord.id,
    processed_rows: processed,
    error_rows: errorCount,
    skipped: 0,
    errors: rowErrors,
  };
};

const template = async () => {
  const { next_code: nextCode } = await assetService.nextCode();
  const match = String(nextCode).match(/^(.*?)(\d+)$/);
  const exampleCodes = [];

  if (match) {
    const prefix = match[1];
    const initial = Number(match[2]);
    const width = match[2].length;

    for (let index = 0; index < 3; index++) {
      exampleCodes.push(`${prefix}${String(initial + index).padStart(width, '0')}`);
    }
  } else {
    exampleCodes.push(nextCode, `${nextCode}-2`, `${nextCode}-3`);
  }

  return {
    headers: [
      'code', 'name', 'serial', 'model', 'description', 'notes',
      'asset_type_name', 'brand_name', 'status_name', 'area_name', 'location_name',
      'responsible_email', 'purchase_date', 'warranty_expiry',
    ],
    rows: [
      [exampleCodes[0], 'Laptop HP ProBook 440', 'SN900101', 'ProBook 440 G9', 'Laptop para oficina', 'Uso diario', 'Laptop', 'HP', 'Activo', 'Tecnología', 'Oficina Principal', 'usuario@empresa.com', '2024-01-15', '2027-01-15'],
      [exampleCodes[1], 'Monitor Dell 27"', 'SN900102', 'P2722H', 'Monitor Full HD', '', 'Monitor', 'Dell', 'Activo', 'Tecnología', 'Oficina Principal', '', '2023-06-10', '2026-06-10'],
      [exampleCodes[2], 'Router TP-Link', 'SN900103', 'Archer AX73', 'Router WiFi 6', 'Rack principal', 'Red', 'TP-Link', 'Activo', 'Infraestructura', 'Sala de Servidores', '', '2022-11-20', '2025-11-20'],
    ],
  };
};

const list = async () => {
  const { data, error } = await importRepo.findAll();
  if (error) throw new AppError('Error al obtener importaciones', 500);
  return data ?? [];
};

const getById = async (id) => {
  const { data, error } = await importRepo.findById(id);
  if (error || !data) throw new AppError('Importación no encontrada', 404);
  return data;
};

module.exports = { preview, commit, template, list, getById };