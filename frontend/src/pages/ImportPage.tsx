import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertTriangle, FileSpreadsheet, X, Download } from 'lucide-react';
import {
  PageHeader, Card, Button, Alert,
} from '../components/ui';
import { importService } from '../services';
import type { ImportPreview, ImportPreviewRow } from '../types';
import { cls } from '../utils/helpers';

type ImportStep = 'upload' | 'preview' | 'done';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

/**
 * Trigger download of the CSV template from the backend.
 */
const downloadTemplate = () => {
  const token = localStorage.getItem('token');
  const url = `${BASE_URL}/imports/assets/template`;
  const a = document.createElement('a');
  a.href = url + (token ? `?_t=${encodeURIComponent(token)}` : '');
  a.download = 'plantilla_importacion_activos.csv';
  // Use fetch to pass Authorization header
  fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then(res => res.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      a.href = blobUrl;
      a.click();
      URL.revokeObjectURL(blobUrl);
    })
    .catch(() => { a.href = url; a.click(); });
};

/**
 * Parse a CSV text string into an array of plain objects.
 * Handles quoted fields and trims whitespace.
 */
const parseCSV = (text: string): Record<string, unknown>[] => {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const splitCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = splitCSVLine(line);
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
    return obj;
  });
};

export const ImportPage: React.FC = () => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [previewData, setPreviewData] = useState<ImportPreview | null>(null);
  const [committing, setCommitting] = useState(false);
  const [importResult, setImportResult] = useState<{ processed: number; errors: number } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) {
      setError('Solo se aceptan archivos CSV. Para XLSX, expórtalo como CSV primero.');
      return;
    }
    setFile(f);
    setError('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setError('El archivo no contiene filas de datos. Verifica el formato CSV.');
        return;
      }
      if (rows.length > 5000) {
        setError('El archivo supera el límite de 5000 filas.');
        return;
      }
      const res = await importService.preview(rows);
      setPreviewData(res.data);
      setStep('preview');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? 'Error al procesar archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData?.import_id || !previewData.rows.length) return;
    setCommitting(true);
    setError('');
    try {
      // Send the valid rows back to backend for insertion
      const res = await importService.commit(previewData.import_id, previewData.rows as Record<string, unknown>[]);
      setImportResult({
        processed: res.data.processed_rows,
        errors: res.data.error_rows,
      });
      setStep('done');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? 'Error al confirmar importación');
    } finally {
      setCommitting(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    setError('');
  };

  const previewCols = previewData?.rows[0]
    ? Object.keys(previewData.rows[0]).filter(k => !k.startsWith('_'))
    : [];

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        title="Importar Activos"
        subtitle="Carga masiva de activos desde archivo CSV"
      />

      {/* Steps indicator */}
      <div className="flex items-center gap-0">
        {(['upload', 'preview', 'done'] as ImportStep[]).map((s, i) => {
          const labels = { upload: 'Subir archivo', preview: 'Revisar datos', done: 'Completado' };
          const done = ['upload', 'preview', 'done'].indexOf(step) > i;
          const active = step === s;
          return (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div className={cls(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                  done ? 'bg-green-600 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'
                )}>
                  {done ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span className={cls('text-sm', active ? 'text-slate-200 font-medium' : 'text-slate-500')}>
                  {labels[s]}
                </span>
              </div>
              {i < 2 && <div className={cls('flex-1 h-px mx-3', done ? 'bg-green-700' : 'bg-slate-700')} />}
            </React.Fragment>
          );
        })}
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Step 1 — Upload */}
      {step === 'upload' && (
        <Card>
          <div
            className={cls(
              'border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center gap-4 transition-colors cursor-pointer',
              dragging ? 'border-blue-500 bg-blue-950/30' : 'border-slate-600 hover:border-slate-500'
            )}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center">
              <FileSpreadsheet size={28} className="text-blue-400" />
            </div>
            <div className="text-center">
              <p className="text-slate-200 font-medium">Arrastra tu archivo CSV aquí</p>
              <p className="text-slate-500 text-sm mt-1">o haz clic para seleccionar · solo CSV · máx. 5000 filas</p>
            </div>
          </div>

          {file && (
            <div className="mt-4 flex items-center justify-between p-3 bg-slate-900 border border-slate-700 rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet size={18} className="text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-slate-200">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={e => { e.stopPropagation(); setFile(null); }} className="p-1 text-slate-500 hover:text-slate-200">
                  <X size={16} />
                </button>
                <Button variant="primary" size="sm" loading={loading} icon={<Upload size={13} />} onClick={handlePreview}>
                  Previsualizar
                </Button>
              </div>
            </div>
          )}

          {/* Template info */}
          <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-300 mb-1">¿Cómo preparar el archivo?</p>
                <p className="text-xs text-slate-500">La primera fila debe tener los encabezados exactos. Descarga la plantilla para comenzar.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={<Download size={13} />}
                onClick={downloadTemplate}
              >
                Descargar plantilla
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3">
              {[
                { col: 'code', req: true, desc: 'Código único del activo (ej: ELEM-001)' },
                { col: 'name', req: true, desc: 'Nombre descriptivo del activo' },
                { col: 'serial', req: false, desc: 'Número de serie (opcional)' },
                { col: 'model', req: false, desc: 'Modelo del equipo' },
                { col: 'asset_type_name', req: false, desc: 'Nombre del tipo (ej: Laptop)' },
                { col: 'brand_name', req: false, desc: 'Nombre de la marca (ej: HP)' },
                { col: 'status_name', req: false, desc: 'Estado (ej: Activo)' },
                { col: 'area_name', req: false, desc: 'Nombre del área' },
                { col: 'location_name', req: false, desc: 'Nombre de la ubicación' },
                { col: 'responsible_email', req: false, desc: 'Email del responsable' },
                { col: 'purchase_date', req: false, desc: 'Fecha compra (YYYY-MM-DD)' },
                { col: 'warranty_expiry', req: false, desc: 'Fin garantía (YYYY-MM-DD)' },
                { col: 'description', req: false, desc: 'Descripción adicional' },
                { col: 'notes', req: false, desc: 'Notas u observaciones' },
              ].map(({ col, req, desc }) => (
                <div key={col} className="flex items-start gap-2 py-0.5">
                  <code className={cls(
                    'text-xs px-1.5 py-0.5 rounded shrink-0',
                    req ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-slate-800 text-slate-400'
                  )}>{col}</code>
                  <span className="text-xs text-slate-500">{desc}{req && <span className="text-red-400 ml-1">*</span>}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-3">Los campos con <span className="text-red-400">*</span> son obligatorios. Para XLSX, expórtalo como CSV (UTF-8) desde Excel.</p>
          </div>
        </Card>
      )}

      {/* Step 2 — Preview */}
      {step === 'preview' && previewData && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-slate-300"><strong>{previewData.rows.length}</strong> filas válidas</span>
            </div>
            {previewData.errors.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle size={16} className="text-red-400" />
                <span className="text-slate-300"><strong>{previewData.errors.length}</strong> filas con errores</span>
              </div>
            )}
          </div>

          {previewData.rows.length === 0 ? (
            <Alert type="error" message="No hay filas válidas para importar. Revisa los errores y corrige el archivo." />
          ) : (
            /* Preview table */
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-700">
                    <th className="text-left px-3 py-2.5 text-slate-500 font-semibold">#</th>
                    {previewCols.slice(0, 8).map(col => (
                      <th key={col} className="text-left px-3 py-2.5 text-slate-400 font-semibold uppercase tracking-wider">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {previewData.rows.slice(0, 20).map((row: ImportPreviewRow, i: number) => (
                    <tr key={i} className="bg-slate-800">
                      <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                      {previewCols.slice(0, 8).map(col => (
                        <td key={col} className="px-3 py-2 text-slate-300">{String(row[col] ?? '—')}</td>
                      ))}
                    </tr>
                  ))}
                  {previewData.rows.length > 20 && (
                    <tr>
                      <td colSpan={previewCols.length + 1} className="text-center py-3 text-slate-500 text-xs">
                        … y {previewData.rows.length - 20} filas más
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Errors */}
          {previewData.errors.length > 0 && (
            <Card>
              <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                <AlertTriangle size={14} /> Filas con errores (no se importarán)
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {previewData.errors.map((e: ImportPreviewRow, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-xs p-2 bg-red-950/30 border border-red-900 rounded-lg">
                    <span className="text-red-500">Fila {(e._row as number) ?? i + 1}:</span>
                    <span className="text-red-400">{(e._error as string) ?? 'Error desconocido'}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={reset}>← Subir otro archivo</Button>
            <Button
              variant="primary"
              loading={committing}
              disabled={previewData.rows.length === 0}
              icon={<Upload size={14} />}
              onClick={handleCommit}
            >
              Importar {previewData.rows.length} activos
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — Done */}
      {step === 'done' && importResult && (
        <Card className="text-center py-12">
          <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Importación completada</h2>
          <p className="text-slate-400 text-sm mb-6">
            Se importaron <strong className="text-green-400">{importResult.processed}</strong> activos correctamente.
            {importResult.errors > 0 && (
              <> <strong className="text-red-400">{importResult.errors}</strong> filas con errores fueron omitidas.</>
            )}
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={reset}>Importar otro archivo</Button>
            <Button variant="primary" onClick={() => window.location.href = '/assets'}>
              Ver inventario →
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
