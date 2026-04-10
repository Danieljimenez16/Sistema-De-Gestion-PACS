import React, { useEffect, useState } from 'react';
import {
  Monitor, Key, AlertTriangle, Activity,
  TrendingUp, Box, Wrench, Archive,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, FullPageSpinner, PageHeader, Badge } from '../components/ui';
import { reportService } from '../services';
import type { DashboardStats } from '../types';
import { fmt, ACTION_LABELS, ENTITY_LABELS } from '../utils/helpers';
import { cls } from '../utils/helpers';

const STATUS_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#64748b', '#a855f7'];

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, sub }) => (
  <Card className="relative overflow-hidden">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-400 font-medium">{label}</p>
        <p className="text-3xl font-bold text-slate-100 mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
      <div className={cls('p-3 rounded-xl', color)}>
        {icon}
      </div>
    </div>
    <div className={cls('absolute bottom-0 left-0 right-0 h-0.5', color.replace('bg-', 'bg-').replace('/20', '/60'))} />
  </Card>
);

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs">
      {label && <p className="text-slate-400 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-slate-200">{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    reportService.dashboard()
      .then(r => setStats(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <FullPageSpinner />;
  if (error || !stats) return (
    <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
      No se pudo cargar el dashboard. Verifica la conexión con el servidor.
    </div>
  );

  const utilizationPct = stats.total_assets > 0
    ? Math.round((stats.active_assets / stats.total_assets) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Vista general del inventario tecnológico"
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Activos"
          value={stats.total_assets}
          icon={<Monitor size={20} className="text-blue-400" />}
          color="bg-blue-500/20"
          sub={`${utilizationPct}% en uso`}
        />
        <StatCard
          label="Activos Activos"
          value={stats.active_assets}
          icon={<Activity size={20} className="text-green-400" />}
          color="bg-green-500/20"
          sub="En servicio"
        />
        <StatCard
          label="En Mantenimiento"
          value={stats.in_maintenance}
          icon={<Wrench size={20} className="text-amber-400" />}
          color="bg-amber-500/20"
          sub="Requieren atención"
        />
        <StatCard
          label="Licencias"
          value={stats.total_licenses}
          icon={<Key size={20} className="text-purple-400" />}
          color="bg-purple-500/20"
          sub={`${stats.expiring_soon} por vencer`}
        />
      </div>

      {/* Alert banner */}
      {stats.expiring_soon > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-950 border border-amber-800 rounded-xl text-amber-300 text-sm">
          <AlertTriangle size={16} />
          <span>
            <strong>{stats.expiring_soon} licencias</strong> vencen en los próximos 30 días.
          </span>
          <a href="/licenses" className="ml-auto underline hover:text-amber-200 text-xs">Ver licencias →</a>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart - by status */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Box size={16} className="text-blue-400" /> Activos por Estado
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={stats.assets_by_status}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {stats.assets_by_status.map((_, index) => (
                  <Cell key={index} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => <span className="text-slate-300 text-xs">{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Bar chart - by type */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-400" /> Activos por Tipo
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.assets_by_type} margin={{ left: -20 }}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Cantidad" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick stats */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Archive size={16} className="text-blue-400" /> Resumen de Stock
          </h3>
          <div className="space-y-3">
            {[
              { label: 'En Bodega', value: stats.total_assets - stats.active_assets - stats.in_maintenance - stats.retired, color: 'bg-slate-400' },
              { label: 'Dados de Baja', value: stats.retired, color: 'bg-red-400' },
              { label: 'En Mantenimiento', value: stats.in_maintenance, color: 'bg-amber-400' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cls('w-2 h-2 rounded-full', item.color)} />
                  <span className="text-sm text-slate-400">{item.label}</span>
                </div>
                <span className="text-sm font-semibold text-slate-200">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent activity */}
        <div className="lg:col-span-2">
          <Card>
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Activity size={16} className="text-blue-400" /> Actividad Reciente
            </h3>
            {stats.recent_activity.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                Sin actividad reciente
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recent_activity.slice(0, 8).map(event => (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Activity size={12} className="text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300">
                        <span className="font-medium">{ENTITY_LABELS[event.entity_type] ?? event.entity_type}</span>
                        {' · '}
                        <Badge label={ACTION_LABELS[event.action] ?? event.action} variant="info" />
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{fmt.datetime(event.performed_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
