import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Monitor, Key, AlertTriangle, MapPin,
} from 'lucide-react';
import {
  PageHeader, Card, FullPageSpinner,
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

export const ReportsPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.dashboard()
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <FullPageSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        subtitle="Análisis y visualización de datos del inventario"
      />

      {/* Charts */}
      {stats && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Visualizaciones</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Status distribution */}
            <Card className="border-transparent">
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
            <Card className="border-transparent">
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
            <Card className="border-transparent">
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
            <Card className="border-transparent">
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
