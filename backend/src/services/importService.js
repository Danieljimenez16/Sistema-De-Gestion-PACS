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

module.exports = { preview, commit, template, list, getById };const assetRepo = require('../repositories/assetRepository');
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
      const seen = codeRows.get(codeKey) ?? [];
      seen.push(rowNumber);
      codeRows.set(codeKey, seen);
    }
    if (row.serial) {
      const serialKey = String(row.serial).toLowerCase();
      const seen = serialRows.get(serialKey) ?? [];
      seen.push(rowNumber);
      serialRows.set(serialKey, seen);
    }
  });

  return { codeRows, serialRows };
};

const addDuplicateErrors = (row, duplicateMaps, errors) => {
  if (row.code) {
    const rows = duplicateMaps.codeRows.get(String(row.code).toLowerCase()) ?? [];
    if (rows.length > 1) errors.push(`code '${row.code}' repetido en filas ${rows.join(', ')}`);
  }

  if (row.serial) {
    const rows = duplicateMaps.serialRows.get(String(row.serial).toLowerCase()) ?? [];
    if (rows.length > 1) errors.push(`serial '${row.serial}' repetido en filas ${rows.join(', ')}`);
  }
};

const resolveName = (row, field, label, map, errors) => {
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
    asset_type_id: resolveName(normalizedRow, 'asset_type_name', 'tipo de activo', catalogs.assetTypes, errors),
    brand_id: resolveName(normalizedRow, 'brand_name', 'marca', catalogs.brands, errors),
    status_id: resolveName(normalizedRow, 'status_name', 'estado', catalogs.statuses, errors),
    area_id: resolveName(normalizedRow, 'area_name', 'área', catalogs.areas, errors),
    location_id: resolveName(normalizedRow, 'location_name', 'ubicación', catalogs.locations, errors),
  };

  if (normalizedRow.responsible_email) {
    const { data: user } = await userRepo.findByEmail(normalizedRow.responsible_email);
    if (!user?.id) errors.push(`responsible_email '${normalizedRow.responsible_email}' no corresponde a un usuario registrado`);
    else payload.responsible_user_id = user.id;
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

  const evaluated = await Promise.all(normalizedRows.map((row) => buildAssetPayload(row, catalogs, duplicateMaps)));

  const validRows = [];
  const errorRows = [];

  evaluated.forEach(({ row, payload, errors }, index) => {
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
  const finalStatus = processed > 0 && errorCount === 0
    ? 'completed'
    : processed > 0
      ? 'completed'
      : 'failed';

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

module.exports = { preview, commit, template, list, getById };const assetRepo = require('../repositories/assetRepository');
const importRepo = require('../repositories/importRepository');
const auditRepo = require('../repositories/auditRepository');
const catalogRepo = require('../repositories/catalogRepository');
const userRepo = require('../repositories/userRepository');
const AppError = require('../utils/AppError');

const DATE_FIELDS = ['purchase_date', 'warranty_expiry'];
const ASSET_INSERT_FIELDS = [
  'code', 'name', 'serial', 'model', 'description', 'notes',
  'asset_type_id', 'brand_id', 'status_id', 'area_id', 'location_id',
  'responsible_user_id', 'purchase_date', 'warranty_expiry',
];
const PREVIEW_SNAPSHOT_VERSION = 1;

const pad = (value) => String(value).padStart(2, '0');

const isValidDateParts = (year, month, day) => {
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
};

const normalizeDateValue = (value) => {
  if (value == null) return undefined;

  const raw = String(value).trim();
  if (!raw) return undefined;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, yearStr, monthStr, dayStr] = isoMatch;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    return isValidDateParts(year, month, day) ? raw : raw;
  }

  return raw;
};

const normalizeRow = (row) => {
  const normalized = {};

  Object.entries(row ?? {}).forEach(([key, value]) => {
    const cleanKey = String(key).replace(/^\uFEFF/, '').trim();

    if (!cleanKey) return;

    const cleanValue = typeof value === 'string' ? value.trim() : value;
    if (cleanValue === '') return;

    normalized[cleanKey] = cleanValue;
  });

  DATE_FIELDS.forEach((field) => {
    normalized[field] = normalizeDateValue(normalized[field]);
    if (normalized[field] == null || normalized[field] === '') delete normalized[field];
  });

  return normalized;
};

const collectDuplicateErrors = (rows) => {
  const seenCodes = new Map();
  const seenSerials = new Map();

  return rows.map((row, index) => {
    const errors = [];

    if (row.code) {
      const codeKey = String(row.code).toLowerCase();
      const firstRow = seenCodes.get(codeKey);
      if (firstRow) errors.push(`code '${row.code}' repetido en archivo (fila ${firstRow})`);
      else seenCodes.set(codeKey, index + 1);
    }

    if (row.serial) {
      const serialKey = String(row.serial).toLowerCase();
      const firstRow = seenSerials.get(serialKey);
      if (firstRow) errors.push(`serial '${row.serial}' repetido en archivo (fila ${firstRow})`);
      else seenSerials.set(serialKey, index + 1);
    }

    return errors;
  });
};

const isIsoDate = (value) => {
  if (!value) return true;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  return isValidDateParts(Number(match[1]), Number(match[2]), Number(match[3]));
};

const pickInsertableFields = (row) => Object.fromEntries(
  Object.entries(row).filter(([key, value]) => ASSET_INSERT_FIELDS.includes(key) && value !== undefined)
);

const serializePreviewSnapshot = (validRows, errorRows) => JSON.stringify({
  version: PREVIEW_SNAPSHOT_VERSION,
  valid_rows: validRows,
  error_rows: errorRows,
});

const parsePreviewSnapshot = (notes) => {
  if (!notes) return null;

  if (typeof notes === 'object') {
    return {
      valid_rows: Array.isArray(notes.valid_rows) ? notes.valid_rows : [],
      error_rows: Array.isArray(notes.error_rows) ? notes.error_rows : [],
    };
  }

  if (typeof notes !== 'string') return null;

  try {
    const parsed = JSON.parse(notes);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      valid_rows: Array.isArray(parsed.valid_rows) ? parsed.valid_rows : [],
      error_rows: Array.isArray(parsed.error_rows) ? parsed.error_rows : [],
    };
  } catch {
    return null;
  }
};

/**
 * Pre-load all catalog lookup tables and return case-insensitive name→id maps.
 */
const loadCatalogs = async () => {
  const [types, brands, statuses, areas, locations] = await Promise.all([
    catalogRepo.getAssetTypes(),
    catalogRepo.getBrands(),
    catalogRepo.getAssetStatuses(),
    catalogRepo.getAreas(),
    catalogRepo.getLocations(),
  ]);

  const toMap = (arr) => {
    const m = {};
    (arr || []).forEach(item => { if (item.name) m[item.name.toLowerCase().trim()] = item.id; });
    return m;
  };

  return {
    typeMap: toMap(types.data),
    brandMap: toMap(brands.data),
    statusMap: toMap(statuses.data),
    areaMap: toMap(areas.data),
    locationMap: toMap(locations.data),
  };
};

/**
 * Resolve human-readable name fields to UUID foreign keys.
 * Mutates a copy of the row: removes *_name / responsible_email fields
 * and adds *_id fields. Returns resolved row + list of resolution errors.
 */
const resolveRow = async (row, catalogs) => {
  const errors = [];
  const resolved = { ...row };

  const resolve = (nameField, idField, map, label) => {
    if (!resolved[nameField]) { delete resolved[nameField]; return; }
    const key = String(resolved[nameField]).toLowerCase().trim();
    const id = map[key];
    if (id) {
      resolved[idField] = id;
    } else {
      errors.push(`${label} '${resolved[nameField]}' no encontrado/a en catálogo`);
    }
    delete resolved[nameField];
  };

  resolve('asset_type_name', 'asset_type_id', catalogs.typeMap, 'Tipo de activo');
  resolve('brand_name',      'brand_id',      catalogs.brandMap, 'Marca');
  resolve('status_name',     'status_id',     catalogs.statusMap, 'Estado');
  resolve('area_name',       'area_id',       catalogs.areaMap, 'Área');
  resolve('location_name',   'location_id',   catalogs.locationMap, 'Ubicación');

  // Resolve responsible_email → responsible_user_id
  if (resolved.responsible_email) {
    const email = String(resolved.responsible_email).trim();
    const { data: user } = await userRepo.findByEmail(email);
    if (user && user.id) {
      resolved.responsible_user_id = user.id;
    } else {
      errors.push(`Usuario con email '${email}' no encontrado`);
    }
    delete resolved.responsible_email;
  }

  return { resolved, catalogErrors: errors };
};

/**
 * Validate a single row: required fields, uniqueness, and catalog resolution.
 * Returns the resolved row (with ID fields) plus any errors.
 */
const validateRow = async (row, index, catalogs, duplicateErrors = []) => {
  const errors = [...duplicateErrors];
  if (!row.code) errors.push('code requerido');
  if (!row.name) errors.push('name requerido');
  if (!row.asset_type_name && !row.asset_type_id) errors.push('asset_type_name requerido');
  if (!row.status_name && !row.status_id) errors.push('status_name requerido');

  if (row.purchase_date && !isIsoDate(row.purchase_date)) {
    errors.push(`purchase_date '${row.purchase_date}' inválida. Debe usar YYYY-MM-DD`);
  }

  if (row.warranty_expiry && !isIsoDate(row.warranty_expiry)) {
    errors.push(`warranty_expiry '${row.warranty_expiry}' inválida. Debe usar YYYY-MM-DD`);
  }

  if (row.code) {
    const { data } = await assetRepo.findByCode(row.code);
    if (data) errors.push(`code '${row.code}' ya existe`);
  }
  if (row.serial) {
    const { data } = await assetRepo.findBySerial(row.serial);
    if (data) errors.push(`serial '${row.serial}' ya existe`);
  }

  const { resolved, catalogErrors } = await resolveRow(row, catalogs);
  errors.push(...catalogErrors);

  return { _row: index + 1, ...resolved, _errors: errors.length > 0 ? errors : undefined };
};

/**
 * Preview: validate rows (received as parsed JSON) without persisting assets.
 * Creates a pending import record and returns import_id so the client can commit later.
 * rows: array of plain objects with asset fields.
 * Name-based catalog fields are resolved to UUIDs during validation.
 */
const preview = async (rows, actorId) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new AppError('No se recibieron filas para procesar', 400);
  }

  const normalizedRows = rows.map(normalizeRow);
  const duplicateErrors = collectDuplicateErrors(normalizedRows);
  const catalogs = await loadCatalogs();
  const validated = await Promise.all(
    normalizedRows.map((row, i) => validateRow(row, i, catalogs, duplicateErrors[i]))
  );

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
    notes: serializePreviewSnapshot(validRows, errorRows),
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

  // Verify the import record exists
  const { data: importRecord, error: findErr } = await importRepo.findById(importId);
  if (findErr || !importRecord) throw new AppError('Importación no encontrada', 404);
  if (importRecord.status === 'completed') throw new AppError('Esta importación ya fue procesada', 409);

  const snapshot = parsePreviewSnapshot(importRecord.notes);
  const rowsToCommit = snapshot?.valid_rows?.length
    ? snapshot.valid_rows
    : (Array.isArray(rows) ? rows : []);

  if (rowsToCommit.length === 0) {
    throw new AppError('No hay filas válidas para importar', 422);
  }

  await importRepo.update(importId, { status: 'processing' });

  const catalogs = await loadCatalogs();
  let processed = 0;
  let errorCount = 0;
  const rowErrors = [];

  for (let index = 0; index < rowsToCommit.length; index++) {
    const originalRow = rowsToCommit[index];
    const normalizedRow = normalizeRow(originalRow);
    const { resolved, catalogErrors } = await resolveRow(normalizedRow, catalogs);
    const insertRow = pickInsertableFields(resolved);

    const validationErrors = [...catalogErrors];
    if (!insertRow.code) validationErrors.push('code requerido');
    if (!insertRow.name) validationErrors.push('name requerido');
    if (!insertRow.asset_type_id) validationErrors.push('asset_type_name requerido');
    if (!insertRow.status_id) validationErrors.push('status_name requerido');
    if (insertRow.purchase_date && !isIsoDate(insertRow.purchase_date)) {
      validationErrors.push(`purchase_date '${insertRow.purchase_date}' inválida. Debe usar YYYY-MM-DD`);
    }
    if (insertRow.warranty_expiry && !isIsoDate(insertRow.warranty_expiry)) {
      validationErrors.push(`warranty_expiry '${insertRow.warranty_expiry}' inválida. Debe usar YYYY-MM-DD`);
    }

    if (validationErrors.length > 0) {
      errorCount++;
      rowErrors.push({
        row: index + 1,
        code: insertRow.code ?? normalizedRow.code ?? null,
        error: validationErrors.join('; '),
      });
      continue;
    }

    const { error } = await assetRepo.create(insertRow);
    if (error) {
      errorCount++;
      rowErrors.push({
        row: index + 1,
        code: insertRow.code ?? null,
        error: error.message,
      });
    } else {
      processed++;
      await auditRepo.log({
        entity_type: 'asset', entity_id: null,
        action: 'import', new_values: insertRow,
        performed_by: actorId ?? null, ip_address: ip ?? null,
      });
    }
  }

  await importRepo.update(importId, {
    status: 'completed',
    processed_rows: processed,
    error_rows: errorCount,
    notes: JSON.stringify({
      version: PREVIEW_SNAPSHOT_VERSION,
      valid_rows: rowsToCommit,
      error_rows: rowErrors,
    }),
    finished_at: new Date().toISOString(),
  });

  return {
    import_id: importId,
    processed_rows: processed,
    error_rows: errorCount,
    skipped: rowsToCommit.length - processed - errorCount,
    errors: rowErrors,
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

/**
 * Get a specific import record by ID.
 */
const getById = async (id) => {
  const { data, error } = await importRepo.findById(id);
  if (error || !data) throw new AppError('Importación no encontrada', 404);

  const snapshot = parsePreviewSnapshot(data.notes);
  if (!snapshot) return data;

  return {
    ...data,
    preview_rows: snapshot.valid_rows,
    errors: snapshot.error_rows,
  };
};

module.exports = { preview, commit, list, getById };
