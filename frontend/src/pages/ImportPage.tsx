import React, { useRef, useState } from 'react';
import { Upload, CheckCircle, AlertTriangle, FileSpreadsheet, X, Download } from 'lucide-react';
import { PageHeader, Card, Button, Alert } from '../components/ui';
import { importService } from '../services';
import type { ImportPreview, ImportPreviewRow } from '../types';
import { cls, getErrorMessage } from '../utils/helpers';
import { useToast } from '../components/Toast';

type ImportStep = 'upload' | 'preview' | 'done';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';
const REQUIRED_HEADERS = ['code', 'name', 'asset_type_name', 'status_name'];

const downloadTemplate = () => {
  const token = localStorage.getItem('token');
  const url = `${BASE_URL}/imports/assets/template`;
  fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then(async (res) => {
      if (!res.ok) throw new Error('No se pudo descargar la plantilla');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'plantilla_importacion_activos.csv';
      link.click();
      URL.revokeObjectURL(blobUrl);
    })
    .catch(() => {
      window.open(url, '_blank', 'noopener,noreferrer');
    });
};

const parseCSV = (text: string): Record<string, unknown>[] => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const splitCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      if (char === '"') {
        if (inQuotes && line[index + 1] === '"') {
          current += '"';
          index++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  };

  const headers = splitCSVLine(lines[0]).map((header) => header.replace(/^\uFEFF/, '').trim());
  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    const row: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });
};

export const ImportPage: React.FC = () => {
  const { addToast } = useToast();
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [previewData, setPreviewData] = useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = useState<{ processed: number; errors: ImportPreviewRow[] } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setRows([]);
    setPreviewData(null);
    setImportResult(null);
    setError('');
  };

  const handleFile = (candidate: File) => {
    if (!candidate.name.toLowerCase().endsWith('.csv')) {
      const message = 'Solo se aceptan archivos CSV.';
      setError(message);
      addToast('error', message);
      return;
    }
    setFile(candidate);
    setError('');
  };

  const handlePreview = async () => {
    if (!file) {
      addToast('error', 'Selecciona un archivo CSV antes de continuar.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const text = await file.text();
      const parsedRows = parseCSV(text);
      if (parsedRows.length === 0) throw new Error('El archivo no contiene filas de datos.');

      const headers = Object.keys(parsedRows[0] ?? {});
      const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
      if (missingHeaders.length > 0) {
        throw new Error(`Faltan columnas obligatorias en el CSV: ${missingHeaders.join(', ')}`);
      }

      const response = await importService.preview(parsedRows);
      setRows(parsedRows);
      setPreviewData(response.data);
      setStep('preview');

      if (response.data.errors.length > 0) {
        addToast('warning', `Se detectaron ${response.data.errors.length} fila(s) con error.`);
      } else {
        addToast('success', `${response.data.rows.length} fila(s) listas para importar.`);
      }
    } catch (previewError) {
      const message = getErrorMessage(previewError, 'No se pudo analizar el archivo CSV.');
      setError(message);
      addToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData || previewData.rows.length === 0) {
      addToast('error', 'No hay filas válidas para importar.');
      return;
    }

    setCommitting(true);
    setError('');
    try {
      const response = await importService.commit(
        previewData.rows as Record<string, unknown>[],
        file?.name,
        previewData.import_id
      );
      setImportResult({
        processed: response.data.processed_rows,
        errors: response.data.errors ?? [],
      });
      setStep('done');

      if ((response.data.errors ?? []).length > 0) {
        addToast('warning', `Se importaron ${response.data.processed_rows} activos y hubo ${(response.data.errors ?? []).length} error(es).`);
      } else {
        addToast('success', `Se importaron ${response.data.processed_rows} activos correctamente.`);
      }
    } catch (commitError) {
      const message = getErrorMessage(commitError, 'No se pudo completar la importación.');
      setError(message);
      addToast('error', message);
    } finally {
      setCommitting(false);
    }
  };

  const previewColumns = previewData?.rows[0]
    ? Object.keys(previewData.rows[0]).filter((key) => !key.startsWith('_'))
    : [];

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader title="Importar Activos" subtitle="Carga masiva desde archivo CSV con validación previa" />

      {error && <Alert type="error" message={error} />}

      {step === 'upload' && (
        <Card>
          <div
            className={cls(
              'border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center gap-4 transition-colors cursor-pointer',
              dragging ? 'border-blue-500 bg-blue-950/30' : 'border-slate-600 hover:border-slate-500'
            )}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const droppedFile = event.dataTransfer.files[0];
              if (droppedFile) handleFile(droppedFile);
            }}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(event) => {
                const selectedFile = event.target.files?.[0];
                if (selectedFile) handleFile(selectedFile);
              }}
            />
            <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center">
              <FileSpreadsheet size={28} className="text-blue-400" />
            </div>
            <div className="text-center">
              <p className="text-slate-200 font-medium">Arrastra tu CSV aquí</p>
              <p className="text-slate-500 text-sm mt-1">o haz clic para seleccionar un archivo</p>
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
                <button onClick={(event) => { event.stopPropagation(); setFile(null); }} className="p-1 text-slate-500 hover:text-slate-200">
                  <X size={16} />
                </button>
                <Button variant="primary" size="sm" loading={loading} icon={<Upload size={13} />} onClick={handlePreview}>
                  Previsualizar
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="flex items-start justify-between mb-3 gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-300 mb-1">Plantilla recomendada</p>
                <p className="text-xs text-slate-500">Descarga el CSV base y respeta los encabezados exactos.</p>
              </div>
              <Button variant="outline" size="sm" icon={<Download size={13} />} onClick={downloadTemplate}>
                Descargar plantilla
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3">
              {[
                { col: 'code', req: true, desc: 'Código único del activo' },
                { col: 'name', req: true, desc: 'Nombre descriptivo' },
                { col: 'serial', req: false, desc: 'Número de serie' },
                { col: 'model', req: false, desc: 'Modelo' },
                { col: 'description', req: false, desc: 'Descripción' },
                { col: 'notes', req: false, desc: 'Notas' },
                { col: 'asset_type_name', req: true, desc: 'Tipo exacto registrado' },
                { col: 'brand_name', req: false, desc: 'Marca exacta registrada' },
                { col: 'status_name', req: true, desc: 'Estado exacto registrado' },
                { col: 'area_name', req: false, desc: 'Área exacta registrada' },
                { col: 'location_name', req: false, desc: 'Ubicación exacta registrada' },
                { col: 'responsible_email', req: false, desc: 'Correo de responsable' },
                { col: 'purchase_date', req: false, desc: 'Fecha compra en YYYY-MM-DD' },
                { col: 'warranty_expiry', req: false, desc: 'Fin de garantía en YYYY-MM-DD' },
              ].map(({ col, req, desc }) => (
                <div key={col} className="flex items-start gap-2 py-0.5">
                  <code className={cls('text-xs px-1.5 py-0.5 rounded shrink-0', req ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-slate-800 text-slate-400')}>
                    {col}
                  </code>
                  <span className="text-xs text-slate-500">{desc}{req && <span className="text-red-400 ml-1">*</span>}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {step === 'preview' && previewData && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <CheckCircle size={16} className="text-green-400" />
              <span><strong>{previewData.valid}</strong> filas válidas</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <AlertTriangle size={16} className="text-amber-400" />
              <span><strong>{previewData.invalid}</strong> filas con error</span>
            </div>
          </div>

          {previewData.rows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-700">
                    <th className="text-left px-3 py-2.5 text-slate-500 font-semibold">#</th>
                    {previewColumns.slice(0, 8).map((column) => (
                      <th key={column} className="text-left px-3 py-2.5 text-slate-400 font-semibold uppercase tracking-wider">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {previewData.rows.slice(0, 20).map((row, index) => (
                    <tr key={index} className="bg-slate-800">
                      <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                      {previewColumns.slice(0, 8).map((column) => (
                        <td key={column} className="px-3 py-2 text-slate-300">{String(row[column] ?? '—')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {previewData.errors.length > 0 && (
            <Card>
              <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                <AlertTriangle size={14} /> Filas con errores
              </h4>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {previewData.errors.map((row, index) => (
                  <div key={index} className="flex items-center gap-3 text-xs p-2 bg-red-950/30 border border-red-900 rounded-lg">
                    <span className="text-red-500">Fila {String(row._row ?? index + 1)}:</span>
                    <span className="text-red-400">{String(row._error ?? 'Error desconocido')}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={reset}>← Subir otro archivo</Button>
            <Button variant="primary" loading={committing} disabled={previewData.rows.length === 0} icon={<Upload size={14} />} onClick={handleCommit}>
              Importar {previewData.rows.length} activos
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && importResult && (
        <Card className="text-center py-12">
          <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Importación completada</h2>
          <p className="text-slate-400 text-sm mb-6">
            Se importaron <strong className="text-green-400">{importResult.processed}</strong> activos correctamente.
            {importResult.errors.length > 0 && <> <strong className="text-red-400">{importResult.errors.length}</strong> filas fallaron.</>}
          </p>
          {importResult.errors.length > 0 && (
            <div className="max-w-3xl mx-auto mb-6 text-left space-y-2">
              {importResult.errors.map((row, index) => (
                <div key={index} className="text-xs p-3 bg-red-950/30 border border-red-900 rounded-lg">
                  <span className="text-red-400 font-medium">Fila {String(row._row ?? index + 1)}:</span>
                  <span className="text-red-300 ml-2">{String(row._error ?? 'Error desconocido')}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={reset}>Importar otro archivo</Button>
          </div>
        </Card>
      )}
    </div>
  );
};