import React, { useEffect, useRef, useState } from 'react';
import { cls } from '../utils/helpers';

// ─── FadeIn ───────────────────────────────────────────────────────────────────
interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'left' | 'none';
  className?: string;
  duration?: number;
}

export const FadeIn: React.FC<FadeInProps> = ({
  children, delay = 0, direction = 'up', className = '', duration = 550,
}) => {
  const [go, setGo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGo(true), delay); return () => clearTimeout(t); }, [delay]);

  const anim = { up: 'animate-fade-up', left: 'animate-slide-left', none: 'animate-fade-in' }[direction];

  return (
    <div
      className={cls(go ? anim : 'opacity-0', className)}
      style={{ animationDuration: `${duration}ms`, animationFillMode: 'both' }}
    >
      {children}
    </div>
  );
};

// ─── Aurora background ────────────────────────────────────────────────────────
export const Aurora: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={cls('absolute inset-0 overflow-hidden pointer-events-none', className)} aria-hidden>
    <div className="aurora-blob aurora-blob-1" />
    <div className="aurora-blob aurora-blob-2" />
    <div className="aurora-blob aurora-blob-3" />
    <div className="dot-grid" />
  </div>
);

// ─── GlowCard ─────────────────────────────────────────────────────────────────
export const GlowCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current!.getBoundingClientRect();
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cls('glow-card relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800/60 backdrop-blur-sm transition-all duration-300', className)}
      style={hovered ? {
        background: `radial-gradient(380px at ${pos.x}px ${pos.y}px, rgba(59,130,246,0.10) 0%, transparent 70%), rgb(30 41 59 / 0.6)`,
      } : undefined}
    >
      {children}
    </div>
  );
};

// ─── CountUp ──────────────────────────────────────────────────────────────────
export const CountUp: React.FC<{
  end: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}> = ({ end, duration = 1400, className = '', prefix = '', suffix = '' }) => {
  const [count, setCount] = useState(0);
  const start = useRef<number | null>(null);

  useEffect(() => {
    if (end === 0) return;
    let raf: number;
    const tick = (ts: number) => {
      if (!start.current) start.current = ts;
      const p = Math.min((ts - start.current) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(ease * end));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);

  return <span className={cls('animate-count-pop', className)}>{prefix}{count.toLocaleString()}{suffix}</span>;
};

// ─── BlurText ─────────────────────────────────────────────────────────────────
export const BlurText: React.FC<{
  text: string;
  className?: string;
  wordDelay?: number;
  startDelay?: number;
}> = ({ text, className = '', wordDelay = 80, startDelay = 0 }) => (
  <span className={className}>
    {text.split(' ').map((word, i) => (
      <span
        key={i}
        className="inline-block animate-blur-in"
        style={{ animationDelay: `${startDelay + i * wordDelay}ms`, animationFillMode: 'both' }}
      >
        {word}{i < text.split(' ').length - 1 ? '\u00A0' : ''}
      </span>
    ))}
  </span>
);

// ─── Stagger wrapper ──────────────────────────────────────────────────────────
export const Stagger: React.FC<{
  children: React.ReactNode[];
  staggerMs?: number;
  startDelay?: number;
  className?: string;
}> = ({ children, staggerMs = 80, startDelay = 0, className = '' }) => (
  <div className={className}>
    {React.Children.map(children, (child, i) => (
      <FadeIn key={i} delay={startDelay + i * staggerMs} direction="up">
        {child}
      </FadeIn>
    ))}
  </div>
);

// ─── RoleBadge ────────────────────────────────────────────────────────────────
const ROLE_CLASSES: Record<string, string> = {
  admin:  'role-admin',
  editor: 'role-editor',
  reader: 'role-reader',
};
const ROLE_DOTS: Record<string, string> = {
  admin:  'bg-red-400',
  editor: 'bg-amber-400',
  reader: 'bg-teal-400',
};

export const RoleBadge: React.FC<{ role?: string }> = ({ role }) => {
  const key = (role ?? '').toLowerCase();
  const cls2 = ROLE_CLASSES[key] ?? 'bg-slate-800 text-slate-400 border border-slate-700';
  const dot  = ROLE_DOTS[key]   ?? 'bg-slate-400';
  return (
    <span className={cls('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', cls2)}>
      <span className={cls('w-1.5 h-1.5 rounded-full', dot)} />
      {role ?? 'Sin rol'}
    </span>
  );
};
