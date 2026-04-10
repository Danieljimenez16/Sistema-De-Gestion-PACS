export const theme = {
  colors: {
    bg: {
      base: '#020617',      // slate-950
      surface: '#0f172a',   // slate-900
      card: '#1e293b',      // slate-800
      elevated: '#334155',  // slate-700
    },
    border: {
      default: '#334155',   // slate-700
      subtle: '#1e293b',    // slate-800
    },
    text: {
      primary: '#f1f5f9',   // slate-100
      secondary: '#94a3b8', // slate-400
      muted: '#64748b',     // slate-500
    },
    accent: {
      primary: '#3b82f6',   // blue-500
      hover: '#2563eb',     // blue-600
      light: '#1d4ed8',     // blue-700
    },
    status: {
      active: { bg: '#14532d', text: '#86efac', dot: '#22c55e' },        // green
      maintenance: { bg: '#713f12', text: '#fde68a', dot: '#f59e0b' },   // amber
      retired: { bg: '#450a0a', text: '#fca5a5', dot: '#ef4444' },       // red
      stored: { bg: '#1e293b', text: '#94a3b8', dot: '#64748b' },        // gray
      damaged: { bg: '#3b0764', text: '#d8b4fe', dot: '#a855f7' },       // purple
    },
  },
  sidebar: {
    width: '256px',
    collapsedWidth: '72px',
  },
};

export const STATUS_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  'Activo': theme.colors.status.active,
  'En Mantenimiento': theme.colors.status.maintenance,
  'Dado de Baja': theme.colors.status.retired,
  'En Bodega': theme.colors.status.stored,
  'Dañado': theme.colors.status.damaged,
};

export const STATUS_COLORS_CHART = [
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#64748b',
  '#a855f7',
];
