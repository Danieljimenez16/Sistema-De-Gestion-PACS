/**
 * Counter — Slot-machine style animated number counter
 * Faithful recreation of reactbits.dev/components/counter
 * Original uses Framer Motion spring; this uses rAF + CSS transition.
 */
import React, { useEffect, useRef, useState } from 'react';

// ─── Single digit slot ────────────────────────────────────────────────────────
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const DigitSlot: React.FC<{ digit: number; height: number }> = ({ digit, height }) => (
  <div style={{ height, overflow: 'hidden', display: 'inline-block', position: 'relative' }}>
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        transform: `translateY(-${digit * 10}%)`,
        transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'transform',
      }}
    >
      {DIGITS.map(d => (
        <div
          key={d}
          style={{
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {d}
        </div>
      ))}
    </div>
  </div>
);

// ─── Counter ─────────────────────────────────────────────────────────────────
interface CounterProps {
  value: number;
  fontSize?: number;
  gap?: number;
  padding?: string;
  borderRadius?: number;
  textColor?: string;
  fontWeight?: number | string;
  gradientHeight?: number;
  gradientColor?: string;
  className?: string;
  animDuration?: number;
}

export const Counter: React.FC<CounterProps> = ({
  value,
  fontSize     = 48,
  gap          = 2,
  padding      = '4px 8px',
  borderRadius = 8,
  textColor    = '#ffffff',
  fontWeight   = 700,
  gradientHeight,
  gradientColor = 'rgba(0,0,0,0.8)',
  className    = '',
  animDuration = 1400,
}) => {
  const [displayed, setDisplayed] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef   = useRef(0);

  useEffect(() => {
    if (value === 0) { setDisplayed(0); return; }
    startRef.current = null;
    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const p = Math.min((ts - startRef.current) / animDuration, 1);
      const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setDisplayed(Math.round(ease * value));
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, animDuration]);

  const digitHeight = fontSize * 1.25;
  // Pad to same length as final value
  const totalLen = String(value).length;
  const padded   = String(displayed).padStart(totalLen, '0');
  const digits   = padded.split('').map(Number);
  const gh       = gradientHeight ?? Math.round(digitHeight * 0.35);

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap,
        padding,
        borderRadius,
        fontSize,
        fontWeight,
        color: textColor,
        position: 'relative',
        lineHeight: 1,
        overflow: 'hidden',
      }}
    >
      {/* Top fade */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: gh,
        background: `linear-gradient(to bottom, ${gradientColor}, transparent)`,
        pointerEvents: 'none', zIndex: 2,
      }} />
      {/* Bottom fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: gh,
        background: `linear-gradient(to top, ${gradientColor}, transparent)`,
        pointerEvents: 'none', zIndex: 2,
      }} />

      {digits.map((d, i) => (
        <DigitSlot key={i} digit={d} height={digitHeight} />
      ))}
    </div>
  );
};
