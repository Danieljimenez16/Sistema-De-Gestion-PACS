/**
 * MagicBento — Interactive bento grid with spotlight, tilt, particles & border glow
 * Faithful recreation of reactbits.dev/components/magic-bento
 * Original uses GSAP; this uses rAF + CSS transforms for zero extra deps.
 */
import React, { useCallback, useRef, useState } from 'react';
import { cls } from '../utils/helpers';

// ─── Ripple ───────────────────────────────────────────────────────────────────
interface Ripple { x: number; y: number; id: number }

// ─── BentoCard props ──────────────────────────────────────────────────────────
export interface BentoCardProps {
  title      : string;
  description: string;
  label?     : string;
  icon?      : React.ReactNode;
  children?  : React.ReactNode;
  colSpan?   : 1 | 2;
  rowSpan?   : 1 | 2;
  className? : string;
  enableSpotlight?: boolean;
  enableTilt?     : boolean;
  enableBorderGlow?: boolean;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  title, description, label, icon, children,
  colSpan = 1, rowSpan = 1, className = '',
  enableSpotlight  = true,
  enableTilt       = true,
  enableBorderGlow = true,
}) => {
  const ref           = useRef<HTMLDivElement>(null);
  const [glow, setGlow]   = useState({ x: 50, y: 50, intensity: 0 });
  const [tilt, setTilt]   = useState({ rx: 0, ry: 0 });
  const [hovered, setHov] = useState(false);
  const [ripples, setRip] = useState<Ripple[]>([]);
  const ridRef            = useRef(0);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r  = ref.current.getBoundingClientRect();
    const lx = e.clientX - r.left;
    const ly = e.clientY - r.top;
    const px = (lx / r.width)  * 100;
    const py = (ly / r.height) * 100;
    setGlow({ x: px, y: py, intensity: 1 });
    if (enableTilt) {
      const cx = r.width  / 2;
      const cy = r.height / 2;
      setTilt({ rx: ((ly - cy) / cy) * 5, ry: -((lx - cx) / cx) * 5 });
    }
  }, [enableTilt]);

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r  = ref.current.getBoundingClientRect();
    const id = ++ridRef.current;
    setRip(prev => [...prev, { x: e.clientX - r.left, y: e.clientY - r.top, id }]);
    setTimeout(() => setRip(prev => prev.filter(rp => rp.id !== id)), 700);
  };

  const spanStyle = {
    '--card-col-span': colSpan,
    '--card-row-span': rowSpan,
  } as React.CSSProperties;

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => { setHov(true);  setGlow(g => ({ ...g, intensity: 1 })); }}
      onMouseLeave={() => { setHov(false); setGlow(g => ({ ...g, intensity: 0 })); setTilt({ rx: 0, ry: 0 }); }}
      onClick={onClick}
      className={cls(
        'magic-bento-card relative overflow-hidden cursor-default select-none',
        enableBorderGlow && hovered ? 'magic-bento-card--border-glow' : '',
        className,
      )}
      style={{
        ...spanStyle,
        '--glow-x'        : `${glow.x}%`,
        '--glow-y'        : `${glow.y}%`,
        '--glow-intensity': String(glow.intensity * 0.9),
        '--glow-radius'   : '220px',
        transform: enableTilt && hovered
          ? `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(1.015) translateY(-2px)`
          : 'perspective(900px) rotateX(0) rotateY(0) scale(1)',
        transition: 'transform 0.18s ease-out, box-shadow 0.2s ease',
        boxShadow: hovered
          ? '0 12px 36px rgba(0,0,0,0.35), 0 0 30px rgba(59,130,246,0.16)'
          : '0 2px 10px rgba(0,0,0,0.25)',
      } as React.CSSProperties}
    >
      {/* Spotlight */}
      {enableSpotlight && (
        <div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
          style={{
            opacity: glow.intensity * 0.8,
            background: `radial-gradient(300px at ${glow.x}% ${glow.y}%, rgba(59,130,246,0.16) 0%, rgba(14,165,233,0.08) 40%, transparent 70%)`,
          }}
        />
      )}

      {/* Ripples */}
      {ripples.map(rp => (
        <div
          key={rp.id}
          className="pointer-events-none absolute rounded-full bg-white/[0.07]"
          style={{
            width: 180, height: 180,
            left: rp.x - 90, top: rp.y - 90,
            animation: 'ripple-expand 0.65s ease-out forwards',
          }}
        />
      ))}

      {/* Content */}
      <div className="magic-bento-card__header z-10 relative">
        {icon && <div className="text-blue-400 opacity-90">{icon}</div>}
        {label && <span className="magic-bento-card__label text-slate-500">{label}</span>}
      </div>
      <div className="magic-bento-card__content z-10 relative mt-auto">
        {children}
        <p className="magic-bento-card__title text-slate-100">{title}</p>
        <p className="magic-bento-card__description text-slate-400">{description}</p>
      </div>
    </div>
  );
};

// ─── MagicBento grid ─────────────────────────────────────────────────────────
export interface MagicBentoProps {
  children  : React.ReactNode;
  className?: string;
  enableGlobalSpotlight?: boolean;
}

export const MagicBento: React.FC<MagicBentoProps> = ({
  children, className = '', enableGlobalSpotlight = true,
}) => {
  const secRef = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState({ x: -9999, y: -9999, show: false });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableGlobalSpotlight) return;
    setSpot({ x: e.clientX, y: e.clientY, show: true });
  }, [enableGlobalSpotlight]);

  return (
    <div
      ref={secRef}
      onMouseMove={onMove}
      onMouseLeave={() => setSpot(s => ({ ...s, show: false }))}
      className={cls('bento-section', className)}
    >
      {/* Global spotlight */}
      {enableGlobalSpotlight && spot.show && (
        <div
          className="global-spotlight fixed pointer-events-none rounded-full"
          style={{
            width: 500, height: 500,
            left: spot.x - 250, top: spot.y - 250,
            background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 65%)',
          }}
        />
      )}

      <div className={cls('card-grid', className)}>
        {children}
      </div>
    </div>
  );
};
