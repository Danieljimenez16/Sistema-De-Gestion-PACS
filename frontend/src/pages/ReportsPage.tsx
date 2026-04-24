import React, { useEffect, useState } from 'react';
import {
  BarChart3, Download,
  Monitor, Key, Users, AlertTriangle,
} from 'lucide-react';
import {
  PageHeader, Card, Button, Badge, FullPageSpinner,
} from '../components/ui';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { reportService } from '../services';
import type { DashboardStats } from '../types';

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
 * Convert a JSON array to a CSV string and trigger a browser download.
 */
const downloadJSONasCSV = (data: Record<string, unknown>[], filename: string) => {
  if (!data.length) return;
  const flattenValue = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v).replace(/"/g, '""');
    return String(v);
  };
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => `"${flattenValue(row[h])}"`).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const ReportCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onExport: () => void;
  badge?: string;
}> = ({ title, description, icon, onExport, badge }) => (
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
    <Button variant="outline" size="sm" icon={<Download size={13} />} onClick={onExport}>
      Exportar
    </Button>
  </Card>
);

export const ReportsPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.dashboard()
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async (type: 'assets' | 'licenses') => {
    try {
      if (type === 'assets') {
        const res = await reportService.assetsExport();
        const data = Array.isArray(res.data) ? res.data : [];
        downloadJSONasCSV(data, `inventario_activos_${new Date().toISOString().slice(0, 10)}.csv`);
      } else {
        const res = await reportService.licensesExport();
        const data = Array.isArray(res.data) ? res.data : [];
        downloadJSONasCSV(data, `licencias_${new Date().toISOString().slice(0, 10)}.csv`);
      }
    } catch {
      alert('Export no disponible en este momento. Verifica la conexión con el servidor.');
    }
  };

  if (loading) return <FullPageSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        subtitle="Análisis y exportación de datos del inventario"
      />

      {/* Export cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Exportaciones disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ReportCard
            title="Inventario de Activos"
            description="Reporte completo con todos los campos, filtros aplicados"
            icon={<Monitor size={18} className="text-blue-400" />}
            onExport={() => handleExport('assets')}
          />
          <ReportCard
            title="Gestión de Licencias"
            description="Estado de licencias, asientos usados y vencimientos"
            icon={<Key size={18} className="text-blue-400" />}
            onExport={() => handleExport('licenses')}
            badge={stats?.expiring_soon ? `${stats.expiring_soon} por vencer` : undefined}
          />
          <ReportCard
            title="Historial de Asignaciones"
            description="Trazabilidad completa de asignaciones y responsables"
            icon={<Users size={18} className="text-green-400" />}
            onExport={() => handleExport('assets')}
          />
          <ReportCard
            title="Activos por Dar de Baja"
            description="Activos con garantía vencida o estado crítico"
            icon={<AlertTriangle size={18} className="text-red-400" />}
            onExport={() => handleExport('assets')}
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
            </Card>

            {/* Assets by type */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Monitor size={15} className="text-blue-400" /> Activos por Tipo
              </h3>
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
            </Card>

          </div>
        </div>
      )}
    </div>
  );
};
