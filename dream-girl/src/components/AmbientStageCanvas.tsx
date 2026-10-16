import React, { useEffect, useRef } from 'react';
import type { WorldTheme } from '../data/characters';

interface AmbientStageCanvasProps {
  leftColor?: string;
  rightColor?: string;
  theme: WorldTheme;
  intensity?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  pulseSpeed: number;
  pulseOffset: number;
  side: 'left' | 'right';
}

export const AmbientStageCanvas: React.FC<AmbientStageCanvasProps> = ({
  leftColor = '#f59e0b',
  rightColor = '#ec4899',
  theme,
  intensity = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const count = Math.min(70, Math.floor((width * height) / 22000));
    const particles: Particle[] = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35 * intensity,
      vy: (-0.25 - Math.random() * 0.45) * intensity,
      size: 1.2 + Math.random() * 2.8,
      alpha: 0.15 + Math.random() * 0.55,
      pulseSpeed: 0.015 + Math.random() * 0.03,
      pulseOffset: i * 0.7,
      side: i % 2 === 0 ? 'left' : 'right',
    }));

    let tick = 0;

    const render = () => {
      tick += 1;
      ctx.clearRect(0, 0, width, height);

      // Dual key-light radial washes (left contender vs right contender)
      const leftGrad = ctx.createRadialGradient(
        width * 0.22,
        height * 0.45,
        20,
        width * 0.22,
        height * 0.45,
        Math.max(width, height) * 0.55
      );
      leftGrad.addColorStop(0, `${leftColor}22`);
      leftGrad.addColorStop(0.5, `${leftColor}0b`);
      leftGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = leftGrad;
      ctx.fillRect(0, 0, width, height);

      const rightGrad = ctx.createRadialGradient(
        width * 0.78,
        height * 0.45,
        20,
        width * 0.78,
        height * 0.45,
        Math.max(width, height) * 0.55
      );
      rightGrad.addColorStop(0, `${rightColor}22`);
      rightGrad.addColorStop(0.5, `${rightColor}0b`);
      rightGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = rightGrad;
      ctx.fillRect(0, 0, width, height);

      // Update & draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const currentAlpha =
          p.alpha * (0.6 + 0.4 * Math.sin(tick * p.pulseSpeed + p.pulseOffset));
        const color = p.x < width * 0.5 ? leftColor : rightColor;

        ctx.save();
        ctx.globalAlpha = currentAlpha;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = theme === 'fantasy' ? 10 : 6;

        ctx.beginPath();
        if (theme === 'fantasy' && p.size > 2.6) {
          // Draw subtle 4-point starlight for fantasy theme
          const r = p.size * 1.4;
          ctx.moveTo(p.x, p.y - r);
          ctx.quadraticCurveTo(p.x, p.y, p.x + r, p.y);
          ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + r);
          ctx.quadraticCurveTo(p.x, p.y, p.x - r, p.y);
          ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - r);
        } else {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [leftColor, rightColor, theme, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 opacity-90"
    />
  );
};
