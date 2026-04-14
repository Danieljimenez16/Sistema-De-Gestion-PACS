/**
 * ChromaGrid — Interactive gradient grid with mouse-tracking overlay
 * Faithful recreation of reactbits.dev/components/chroma-grid
 * Original uses GSAP; this uses CSS custom properties + React state.
 */
import React, { useRef, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ChromaItem {
  id        : string;
  title     : string;
  subtitle  : string;
  handle?   : string;
  gradient  : string;   // CSS gradient string
  borderColor: string;
  icon?     : React.ReactNode;
  badge?    : string;
  onClick?  : () => void;
}

// ─── Card ─────────────────────────────────────────────────────────────────────
const ChromaCard: React.FC<ChromaItem & {
  gridX: number; gridY: number; radius: number;
}> = ({
  title, subtitle, handle, gradient, borderColor, icon, badge, onClick,
  gridX, gridY, radius,
}) => {
  const ref   = useRef<HTMLDivElement>(null);
  const [mx, setMx] = useState(50);
  const [my, setMy] = useState(50);
  const [hov, setHov] = useState(false);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r  = ref.current.getBoundingClientRect();
    setMx(((e.clientX - r.left) / r.width)  * 100);
    setMy(((e.clientY - r.top)  / r.height) * 100);
  }, []);

  // The chroma overlay uses the GRID-level cursor position (passed as gridX/gridY)
  // for the global spotlight effect via mask-image
  const gx = gridX;
  const gy = gridY;

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      className="chroma-card"
      style={{
        '--card-gradient': gradient,
        '--card-border'  : borderColor,
        '--mouse-x'      : `${mx}%`,
        '--mouse-y'      : `${my}%`,
        '--spotlight-color': 'rgba(255,255,255,0.28)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        transform: hov ? 'scale(1.03) translateY(-2px)' : 'scale(1)',
        boxShadow: hov ? `0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px ${borderColor}` : 'none',
      } as React.CSSProperties}
    >
      {/* Global chroma overlay (grayscale mask from grid center) */}
      <div
        className="chroma-overlay"
        style={{
          '--x': `${gx}px`,
          '--y': `${gy}px`,
          '--r': `${radius}px`,
        } as React.CSSProperties}
      />
      {/* Fade layer (inverse of overlay) */}
      <div
        className="chroma-fade"
        style={{
          '--x': `${gx}px`,
          '--y': `${gy}px`,
          '--r': `${radius}px`,
          opacity: hov ? 0 : 1,
        } as React.CSSProperties}
      />

      {/* Content (no image — role icon + info) */}
      <div className="chroma-img-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 100 }}>
        {icon && (
          <div style={{ fontSize: 48, opacity: 0.9 }}>
            {icon}
          </div>
        )}
      </div>

      <div className="chroma-info">
        <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
        {badge && (
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em', opacity: 0.65, alignSelf: 'start', marginTop: 2,
          }}>{badge}</span>
        )}
        <span className="role" style={{ fontSize: 12 }}>{subtitle}</span>
        {handle && <span className="handle" style={{ fontSize: 11 }}>{handle}</span>}
      </div>
    </div>
  );
};

// ─── Grid ─────────────────────────────────────────────────────────────────────
interface ChromaGridProps {
  items     : ChromaItem[];
  columns?  : number;
  radius?   : number;
  className?: string;
}

export const ChromaGrid: React.FC<ChromaGridProps> = ({
  items, columns = 3, radius = 280, className = '',
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [gpos, setGpos] = useState({ x: -9999, y: -9999 });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setGpos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div
      ref={gridRef}
      onMouseMove={onMove}
      onMouseLeave={() => setGpos({ x: -9999, y: -9999 })}
      className={`chroma-grid ${className}`}
      style={{ '--cols': columns } as React.CSSProperties}
    >
      {items.map(item => (
        <ChromaCard
          key={item.id}
          {...item}
          gridX={gpos.x}
          gridY={gpos.y}
          radius={radius}
        />
      ))}
    </div>
  );
};
