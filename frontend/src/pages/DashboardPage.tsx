import React, { useEffect, useState } from 'react';
import {
  Monitor, Key, AlertTriangle, Activity,
  TrendingUp, Box, Wrench, Archive,
  Users, ShieldAlert, MapPin, PackageCheck,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';
import { Card, FullPageSpinner, PageHeader, Badge } from '../components/ui';
import { FadeIn } from '../components/animations';
import { Counter } from '../components/Counter';
import { MagicBento, BentoCard } from '../components/MagicBento';
import { reportService } from '../services';
import type { DashboardSeriesPoint, DashboardStats } from '../types';
import { fmt, ACTION_LABELS, ENTITY_LABELS } from '../utils/helpers';
import { cls } from '../utils/helpers';

const BLUE_PALETTE = ['#3b82f6', '#2563eb', '#0ea5e9', '#0284c7', '#38bdf8', '#93c5fd'];

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  sub?: string;
  suffix?: string;
  tone?: 'blue' | 'amber' | 'red';
}

type TooltipPayload = {
  name?: string;
  value?: number | string;
  color?: string;
};

const toneClasses = {
  blue: {
    icon: 'bg-blue-500/15 text-blue-300',
    line: 'bg-blue-500/70',
  },
  amber: {
    icon: 'bg-amber-500/15 text-amber-300',
    line: 'bg-amber-500/70',
  },
  red: {
    icon: 'bg-red-500/15 text-red-300',
    line: 'bg-red-500/70',
  },
};

const hasSeriesData = (series: DashboardSeriesPoint[]) =>
  series.some(item => item.value > 0);

const chartColor = (entry: DashboardSeriesPoint, index: number) =>
  entry.color ?? BLUE_PALETTE[index % BLUE_PALETTE.length];

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, sub, suffix, tone = 'blue' }) => (
  <Card className="relative overflow-hidden border-blue-900/40 bg-slate-900/80 glow-card">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-slate-400 font-medium">{label}</p>
        <div className="mt-1 flex items-end gap-1">
          {typeof value === 'number' ? (
            <Counter
              value={value}
              fontSize={30}
              fontWeight={700}
              textColor="#f1f5f9"
              gradientColor="rgba(15,23,42,0.9)"
              gradientHeight={10}
              padding="0"
            />
          ) : (
            <p className="text-3xl font-bold text-slate-100">{value}</p>
          )}
          {suffix && <span className="pb-1 text-lg font-semibold text-slate-300">{suffix}</span>}
        </div>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
      <div className={cls('p-3 rounded-lg flex-shrink-0', toneClasses[tone].icon)}>
        {icon}
      </div>
    </div>
    <div className={cls('absolute bottom-0 left-0 right-0 h-0.5', toneClasses[tone].line)} />
  </Card>
);

const EmptyChart: React.FC<{ message?: string }> = ({ message = 'Sin datos suficientes' }) => (
  <div className="flex h-full min-h-[180px] items-center justify-center rounded-lg border border-dashed border-blue-900/40 bg-slate-950/40 text-xs text-slate-500">
    {message}
  </div>
);

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-blue-900/60 rounded-lg px-3 py-2 text-xs shadow-xl shadow-blue-950/30">
      {label && <p className="text-slate-400 mb-1 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={`${p.name ?? 'serie'}-${i}`} className="text-slate-200">
          <span style={{ color: p.color }}>{p.name}</span>: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const SeriesBarChart: React.FC<{ data: DashboardSeriesPoint[]; barName: string }> = ({ data, barName }) => (
  hasSeriesData(data) ? (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" opacity={0.35} />
        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" name={barName} radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={chartColor(entry, index)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  ) : <EmptyChart />
);

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

  const activePct = stats.total_assets > 0
    ? Math.round((stats.active_assets / stats.total_assets) * 100)
    : 0;
  const riskTotal =
    stats.expiring_soon +
    stats.expired_licenses +
    stats.warranty_expiring_soon +
    stats.expired_warranties +
    stats.in_maintenance +
    stats.overused_licenses;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Indicadores operativos del inventario, licencias y riesgos"
      />

      <FadeIn delay={0} direction="up">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Activos registrados"
            value={stats.total_assets}
            icon={<Monitor size={20} />}
            sub={`${stats.assigned_assets} asignados · ${stats.unassigned_assets} sin responsable`}
          />
          <StatCard
            label="Activos en uso"
            value={stats.active_assets}
            icon={<PackageCheck size={20} />}
            sub={`${activePct}% del inventario total`}
          />
          <StatCard
            label="Uso de licencias"
            value={stats.license_utilization_pct}
            suffix="%"
            icon={<Key size={20} />}
            sub={`${stats.license_used_seats} de ${stats.license_capacity} asientos usados`}
          />
          <StatCard
            label="Atención requerida"
            value={riskTotal}
            icon={<AlertTriangle size={20} />}
            tone={riskTotal > 0 ? 'amber' : 'blue'}
            sub={`${stats.expiring_soon + stats.expired_licenses} licencias · ${stats.warranty_expiring_soon + stats.expired_warranties} garantías`}
          />
        </div>
      </FadeIn>

      {riskTotal > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-amber-950/70 border border-amber-800 rounded-lg text-amber-300 text-sm">
          <ShieldAlert size={16} />
          <span>
            Hay <strong>{riskTotal}</strong> puntos que requieren seguimiento en licencias, garantías o mantenimiento.
          </span>
          <a href="/reports" className="ml-auto underline hover:text-amber-200 text-xs">Ver reportes</a>
        </div>
      )}

      <MagicBento enableGlobalSpotlight className="dashboard-bento">
        <BentoCard
          title="Activos por Estado"
          description="Distribución real según el catálogo de estados"
          icon={<Box size={18} />}
          label="ESTADO"
          enableSpotlight
          enableTilt={false}
          enableBorderGlow
        >
          <div className="h-56 w-full">
            {hasSeriesData(stats.assets_by_status) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.assets_by_status}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.assets_by_status.map((entry, index) => (
                      <Cell key={entry.name} fill={chartColor(entry, index)} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={7}
                    formatter={v => <span className="text-slate-400 text-xs">{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </BentoCard>

        <BentoCard
          title="Activos por Tipo"
          description="Categorias con mayor volumen en inventario"
          icon={<TrendingUp size={18} />}
          label="TIPO"
          enableSpotlight
          enableTilt={false}
          enableBorderGlow
        >
          <div className="h-56 w-full">
            <SeriesBarChart data={stats.assets_by_type} barName="Activos" />
          </div>
        </BentoCard>

        <BentoCard
          title="Activos por Área"
          description="Carga operativa por área responsable"
          icon={<Users size={18} />}
          label="ÁREA"
          enableSpotlight
          enableTilt={false}
          enableBorderGlow
        >
          <div className="h-56 w-full">
            <SeriesBarChart data={stats.assets_by_area} barName="Activos" />
          </div>
        </BentoCard>

        <BentoCard
          title="Ubicaciones"
          description="Inventario por ubicación física"
          icon={<MapPin size={18} />}
          label="UBICACIÓN"
          enableSpotlight
          enableTilt={false}
          enableBorderGlow
        >
          <div className="h-56 w-full">
            <SeriesBarChart data={stats.assets_by_location} barName="Activos" />
          </div>
        </BentoCard>

        <BentoCard
          title="Uso de Licencias"
          description="Asientos usados y disponibles por licencia"
          icon={<Key size={18} />}
          label="LICENCIAS"
          colSpan={2}
          enableSpotlight
          enableTilt={false}
          enableBorderGlow
        >
          <div className="h-64 w-full">
            {stats.license_usage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.license_usage} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" opacity={0.35} />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={7} formatter={v => <span className="text-slate-400 text-xs">{v}</span>} />
                  <Bar dataKey="used" name="Usados" stackId="seats" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="available" name="Disponibles" stackId="seats" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="overused" name="Sobreasignados" stackId="seats" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="Sin licencias con asientos máximos configurados" />}
          </div>
        </BentoCard>

        <BentoCard
          title="Resumen Operativo"
          description="Asignación, bodega y mantenimiento"
          icon={<Archive size={18} />}
          label="OPERACIÓN"
          enableSpotlight
          enableTilt={false}
          enableBorderGlow
        >
          <div className="h-56 w-full">
            <SeriesBarChart data={stats.operational_summary} barName="Activos" />
          </div>
        </BentoCard>

        <BentoCard
          title="Riesgos"
          description="Vencimientos y estados que requieren acción"
          icon={<Wrench size={18} />}
          label="RIESGO"
          enableSpotlight
          enableTilt={false}
          enableBorderGlow
        >
          <div className="h-56 w-full">
            <SeriesBarChart data={stats.risk_summary} barName="Casos" />
          </div>
        </BentoCard>

        <BentoCard
          title="Actividad Reciente"
          description="Últimos cambios registrados en auditoría"
          icon={<Activity size={18} />}
          label="AUDITORIA"
          colSpan={2}
          enableSpotlight
          enableTilt={false}
          enableBorderGlow
        >
          {stats.recent_activity.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">Sin actividad reciente</div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {stats.recent_activity.slice(0, 8).map(event => (
                <div key={event.id} className="flex items-start gap-2.5 rounded-lg border border-blue-900/20 bg-slate-950/35 px-3 py-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Activity size={12} className="text-blue-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300">
                      <span className="font-medium">{ENTITY_LABELS[event.entity_type] ?? event.entity_type}</span>
                      {' · '}
                      <Badge label={ACTION_LABELS[event.action] ?? event.action} variant="info" size="sm" />
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{fmt.datetime(event.performed_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </BentoCard>
      </MagicBento>
    </div>
  );
};
