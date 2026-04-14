/**
 * FloatingLines — Canvas-based animated wave lines
 * Faithful recreation of reactbits.dev/backgrounds/floating-lines
 * Original uses Three.js + GLSL shaders; this uses Canvas 2D for zero extra deps.
 */
import React, { useEffect, useRef } from 'react';

interface FloatingLinesProps {
  lineCount?: number;
  speed?: number;
  colors?: string[];
  opacity?: number;
  interactive?: boolean;
  className?: string;
}

export const FloatingLines: React.FC<FloatingLinesProps> = ({
  lineCount = 9,
  speed = 0.6,
  colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#06b6d4', '#2563eb'],
  opacity = 0.55,
  interactive = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef  = useRef({ x: -9999, y: -9999 });
  const rafRef    = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    interface Line {
      phase: number;
      spd: number;
      amp: number;
      freq: number;
      yFrac: number;
      colA: string;
      colB: string;
      width: number;
    }

    let lines: Line[] = [];
    let t = 0;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const buildLines = () => {
      lines = Array.from({ length: lineCount }, (_, i) => ({
        phase: (i / lineCount) * Math.PI * 2,
        spd:   0.25 + Math.random() * speed,
        amp:   18 + Math.random() * 38,
        freq:  1.5 + Math.random() * 2.5,
        yFrac: (i + 0.5) / lineCount,
        colA:  colors[i % colors.length],
        colB:  colors[(i + 2) % colors.length],
        width: 0.6 + Math.random() * 1.6,
      }));
    };

    const draw = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { x: mx, y: my } = mouseRef.current;
      const mxN = mx / canvas.width;
      const myN = my / canvas.height;

      for (const ln of lines) {
        ctx.beginPath();
        ctx.lineWidth = ln.width;

        const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
        grad.addColorStop(0,    'transparent');
        grad.addColorStop(0.15, ln.colA + '66');
        grad.addColorStop(0.45, ln.colB + 'cc');
        grad.addColorStop(0.7,  ln.colA + 'aa');
        grad.addColorStop(1,    'transparent');
        ctx.strokeStyle = grad;
        ctx.globalAlpha = opacity;

        const segs = 100;
        for (let s = 0; s <= segs; s++) {
          const fx = s / segs;
          const baseY = Math.sin(fx * Math.PI * ln.freq + t * ln.spd + ln.phase) * ln.amp;

          // Mouse bend
          let bend = 0;
          if (interactive && mx > 0) {
            const dx = fx - mxN;
            const dy = ln.yFrac - myN;
            const d  = Math.sqrt(dx * dx + dy * dy);
            if (d < 0.28) {
              bend = Math.exp(-d * 14) * 36 * (myN < ln.yFrac ? -1 : 1);
            }
          }

          const x = fx * canvas.width;
          const y = ln.yFrac * canvas.height + baseY + bend;
          s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      t += 0.012;
      rafRef.current = requestAnimationFrame(draw);
    };

    const onMouse = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    if (interactive) {
      canvas.addEventListener('mousemove', onMouse);
      canvas.addEventListener('mouseleave', onLeave);
    }
    resize();
    buildLines();
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMouse);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineCount, speed, opacity, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ pointerEvents: interactive ? 'auto' : 'none' }}
    />
  );
};
