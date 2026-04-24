import React, { useEffect, useState } from 'react';
import {
  BarChart3, Download,
  Monitor, Key, Users, AlertTriangle, MapPin,
} from 'lucide-react';
import {
  PageHeader, Card, Button, Badge, FullPageSpinner, Alert,
} from '../components/ui';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { reportService } from '../services';
import type { DashboardStats } from '../types';
import { downloadCSV } from '../utils/helpers';

const BLUE_PALETTE = ['#3b82f6', '#2563eb', '#0ea5e9', '#0284c7', '#38bdf8', '#93c5fd'];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl">
      {label && <p className="text-slate-400 mb-1 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-slate-200">{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

/**
 * Convert nested objects to flat strings for CSV export.
 */
const flattenForExport = (data: Record<string, unknown>[]): Record<string, string>[] =>
  data.map(row => {
    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const obj = v as Record<string, unknown>;
        flat[k] = (obj.name ?? obj.full_name ?? obj.email ?? JSON.stringify(obj)) as string;
      } else {
        flat[k] = v == null ? '' : String(v);
      }
    }
    return flat;
  });

const ReportCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onExport: () => void;
  loading?: boolean;
  badge?: string;
}> = ({ title, description, icon, onExport, loading, badge }) => (
  <Card className="flex items-start justify-between">
    <div className="flex items-start gap-3">
      <div className="p-2.5 bg-blue-600/20 rounded-lg">{icon}</div>
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-semibold text-slate-200 text-sm">{title}</p>
          {badge && <Badge label={badge} variant="info" />}
        </div>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
    <Button variant="outline" size="sm" icon={<Download size={13} />} onClick={onExport} loading={loading}>
      Exportar
    </Button>
  </Card>
);

export const ReportsPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState<Record<string, boolean>>({});
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    reportService.dashboard()
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const withExport = (key: string, fn: () => Promise<void>) => async () => {
    setExportLoading(p => ({ ...p, [key]: true }));
    setExportError('');
    try {
      await fn();
    } catch {
      setExportError('No se pudo generar el reporte. Verifica la conexión con el servidor.');
    } finally {
      setExportLoading(p => ({ ...p, [key]: false }));
    }
  };

  const handleExportAssets = withExport('assets', async () => {
    const res = await reportService.assetsExport();
    const data = Array.isArray(res.data) ? flattenForExport(res.data as Record<string, unknown>[]) : [];
    if (!data.length) { setExportError('No hay activos para exportar.'); return; }
    downloadCSV(data, `inventario_activos_${new Date().toISOString().slice(0, 10)}.csv`);
  });

  const handleExportLicenses = withExport('licenses', async () => {
    const res = await reportService.licensesExport();
    const data = Array.isArray(res.data) ? flattenForExport(res.data as Record<string, unknown>[]) : [];
    if (!data.length) { setExportError('No hay licencias para exportar.'); return; }
    downloadCSV(data, `licencias_${new Date().toISOString().slice(0, 10)}.csv`);
  });

  const handleExportUnassigned = withExport('unassigned', async () => {
    const res = await reportService.unassigned();
    const data = Array.isArray(res.data) ? flattenForExport(res.data as Record<string, unknown>[]) : [];
    if (!data.length) { setExportError('No hay activos sin asignar.'); return; }
    downloadCSV(data, `activos_sin_responsable_${new Date().toISOString().slice(0, 10)}.csv`);
  });

  const handleExportExpiring = withExport('expiring', async () => {
    const res = await reportService.licensesExpiring(30);
    const data = Array.isArray(res.data) ? flattenForExport(res.data as Record<string, unknown>[]) : [];
    if (!data.length) { setExportError('No hay licencias por vencer en los próximos 30 días.'); return; }
    downloadCSV(data, `licencias_por_vencer_${new Date().toISOString().slice(0, 10)}.csv`);
  });

  if (loading) return <FullPageSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        subtitle="Análisis y exportación de datos del inventario"
      />

      {exportError && (
        <Alert type="error" message={exportError} />
      )}

      {/* Export cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Exportaciones disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ReportCard
            title="Inventario completo de Activos"
            description="Reporte completo de todos los activos con estado, área y responsable"
            icon={<Monitor size={18} className="text-blue-400" />}
            onExport={handleExportAssets}
            loading={exportLoading['assets']}
          />
          <ReportCard
            title="Gestión de Licencias"
            description="Estado de licencias, asientos y vencimientos"
            icon={<Key size={18} className="text-blue-400" />}
            onExport={handleExportLicenses}
            loading={exportLoading['licenses']}
            badge={stats?.expiring_soon ? `${stats.expiring_soon} por vencer` : undefined}
          />
          <ReportCard
            title="Activos sin Responsable"
            description="Activos que no tienen un usuario asignado como responsable"
            icon={<Users size={18} className="text-amber-400" />}
            onExport={handleExportUnassigned}
            loading={exportLoading['unassigned']}
            badge={stats?.unassigned_assets ? `${stats.unassigned_assets} sin asignar` : undefined}
          />
          <ReportCard
            title="Licencias por Vencer (30 días)"
            description="Licencias que vencen en los próximos 30 días"
            icon={<AlertTriangle size={18} className="text-red-400" />}
            onExport={handleExportExpiring}
            loading={exportLoading['expiring']}
            badge={stats?.expiring_soon ? `${stats.expiring_soon} licencias` : undefined}
          />
        </div>
      </div>

      {/* Charts */}
      {stats && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Visualizaciones</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Status distribution */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <BarChart3 size={15} className="text-blue-400" /> Distribución por Estado
              </h3>
              {stats.assets_by_status.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={stats.assets_by_status} cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3} dataKey="value">
                      {stats.assets_by_status.map((entry, i) => (
                        <Cell key={entry.name} fill={entry.color ?? BLUE_PALETTE[i % BLUE_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-slate-300 text-xs">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-60 text-slate-500 text-sm">Sin datos</div>
              )}
            </Card>

            {/* Assets by type */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Monitor size={15} className="text-blue-400" /> Activos por Tipo
              </h3>
              {stats.assets_by_type.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stats.assets_by_type} margin={{ left: -15 }}>
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Cantidad" radius={[4, 4, 0, 0]}>
                      {stats.assets_by_type.map((entry, i) => (
                        <Cell key={entry.name} fill={entry.color ?? BLUE_PALETTE[i % BLUE_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-60 text-slate-500 text-sm">Sin datos</div>
              )}
            </Card>

            {/* Assets by area */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <MapPin size={15} className="text-blue-400" /> Activos por Área
              </h3>
              {stats.assets_by_area.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stats.assets_by_area} margin={{ left: -15 }}>
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Cantidad" radius={[4, 4, 0, 0]}>
                      {stats.assets_by_area.map((entry, i) => (
                        <Cell key={entry.name} fill={entry.color ?? BLUE_PALETTE[i % BLUE_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-60 text-slate-500 text-sm">Sin datos</div>
              )}
            </Card>

            {/* Risk summary */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-400" /> Alertas y Riesgos
              </h3>
              {stats.risk_summary.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stats.risk_summary} margin={{ left: -15 }}>
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Casos" radius={[4, 4, 0, 0]}>
                      {stats.risk_summary.map((entry, i) => (
                        <Cell key={entry.name} fill={entry.color ?? BLUE_PALETTE[i % BLUE_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-60 text-green-700 text-sm font-medium">
                  ✓ Sin alertas activas
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
