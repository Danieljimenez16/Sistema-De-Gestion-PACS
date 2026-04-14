/**
 * Folder — Interactive 3D folder with magnetic papers
 * Direct port of reactbits.dev/components/folder
 * CSS based on original Folder.css
 */
import React, { useState } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function darkenColor(hex: string, pct: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h, 16);
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - pct / 100)));
  const g = Math.max(0, Math.round(((n >>  8) & 0xff) * (1 - pct / 100)));
  const b = Math.max(0, Math.round(((n)       & 0xff) * (1 - pct / 100)));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface FolderProps {
  color?    : string;
  size?     : number;
  items?    : React.ReactNode[];
  label?    : string;
  onClick?  : () => void;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const Folder: React.FC<FolderProps> = ({
  color     = '#5227FF',
  size      = 1,
  items     = [],
  label,
  onClick,
  className = '',
}) => {
  const [open, setOpen]       = useState(false);
  const [offsets, setOffsets] = useState([
    { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 },
  ]);

  const backColor = darkenColor(color, 22);
  const papers    = [...items.slice(0, 3)];
  while (papers.length < 3) papers.push(null);

  const paperColors = ['#d4d4d8', '#e4e4e7', '#f4f4f5']; // zinc tones for dark theme

  const w = 100 * size;
  const h = 80  * size;
  const r = 10  * size;

  const handleClick = () => {
    setOpen(o => !o);
    onClick?.();
  };

  const magMove = (idx: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!open) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ox   = (e.clientX - (rect.left + rect.width  / 2)) * 0.15;
    const oy   = (e.clientY - (rect.top  + rect.height / 2)) * 0.15;
    setOffsets(prev => prev.map((o, i) => i === idx ? { x: ox, y: oy } : o));
  };
  const magReset = (idx: number) =>
    setOffsets(prev => prev.map((o, i) => i === idx ? { x: 0, y: 0 } : o));

  // Paper transforms (matching original Folder.css)
  const paperTransform = (i: number): string => {
    if (!open) return `translate(-50%, 10%)`;
    const [ox, oy] = [offsets[i].x, offsets[i].y];
    if (i === 0) return `translate(calc(-120% + ${ox}px), calc(-70% + ${oy}px)) rotateZ(-15deg)`;
    if (i === 1) return `translate(calc(10%  + ${ox}px), calc(-70% + ${oy}px)) rotateZ(15deg)`;
    return         `translate(calc(-50% + ${ox}px), calc(-100% + ${oy}px)) rotateZ(5deg)`;
  };

  return (
    <div
      className={`flex flex-col items-center gap-2 select-none ${className}`}
    >
      {/* Folder body */}
      <div
        onClick={handleClick}
        className="cursor-pointer"
        style={{
          width: w, height: h, position: 'relative',
          transition: 'transform 0.2s ease-in',
          transform: open ? 'translateY(-8px)' : undefined,
        }}
      >
        {/* Back */}
        <div style={{
          position: 'relative', width: w, height: h,
          background: backColor,
          borderRadius: `0 ${r}px ${r}px ${r}px`,
        }}>
          {/* Folder tab */}
          <div style={{
            position: 'absolute', bottom: '100%', left: 0,
            width: 30 * size, height: 10 * size,
            background: backColor,
            borderRadius: `${5 * size}px ${5 * size}px 0 0`,
          }} />

          {/* Papers */}
          {papers.map((item, i) => (
            <div
              key={i}
              onMouseMove={e => magMove(i, e)}
              onMouseLeave={() => magReset(i)}
              style={{
                position: 'absolute', zIndex: 2,
                bottom: '10%', left: '50%',
                width  : `${(70 + i * 10) * size}px`,
                height : open ? `${76 * size}px` : `${(80 - i * 10) * size}px`,
                background: paperColors[i],
                borderRadius: r,
                transform: paperTransform(i),
                transition: 'all 0.3s ease-in-out',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {item && (
                <div style={{
                  fontSize: 9 * size, color: '#3f3f46',
                  padding: 4, textAlign: 'center', lineHeight: 1.3,
                  maxWidth: '90%', overflow: 'hidden',
                }}>
                  {item}
                </div>
              )}
            </div>
          ))}

          {/* Front face */}
          <div style={{
            position: 'absolute', zIndex: 3,
            width: '100%', height: '100%',
            background: color,
            borderRadius: `${5 * size}px ${r}px ${r}px ${r}px`,
            transformOrigin: 'bottom',
            transform: open
              ? 'skew(15deg) scaleY(0.6)'
              : 'skew(0deg) scaleY(1)',
            transition: 'all 0.3s ease-in-out',
          }} />
        </div>
      </div>

      {/* Label */}
      {label && (
        <span className="text-xs text-slate-400 font-medium leading-tight text-center max-w-[90px]">
          {label}
        </span>
      )}
    </div>
  );
};
