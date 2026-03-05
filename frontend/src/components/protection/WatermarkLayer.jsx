/**
 * WatermarkLayer — динамический плавающий водяной знак.
 * Рендерится в Canvas поверх всей страницы.
 * Содержит: ID ученика, имя, ID теста, временную метку.
 * Несколько копий одновременно двигаются с разной скоростью.
 */
import React, { useEffect, useRef } from 'react';
import styles from './WatermarkLayer.module.css';

const MARK_COUNT = 5;
const FPS        = 20;

export default function WatermarkLayer({ userId, username, testId }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialise mark positions
    const marks = Array.from({ length: MARK_COUNT }, (_, i) => ({
      x:     Math.random() * window.innerWidth,
      y:     Math.random() * window.innerHeight,
      dx:    (Math.random() - 0.5) * 0.5 + (i % 2 === 0 ? 0.2 : -0.2),
      dy:    (Math.random() - 0.5) * 0.5 + (i % 2 === 0 ? 0.15 : -0.15),
      angle: [-0.4, -0.2, 0, 0.2, 0.4][i],
      alpha: 0.13 + Math.random() * 0.07,
    }));

    let lastFrame = 0;

    const draw = (ts) => {
      rafRef.current = requestAnimationFrame(draw);
      if (ts - lastFrame < 1000 / FPS) return;
      lastFrame = ts;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const timeStr = new Date().toLocaleTimeString('ru-RU');
      const line1 = `UID:${userId} | ${username}`;
      const line2 = `TEST:${testId} | ${timeStr}`;

      marks.forEach((m) => {
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.angle);

        // Primary text
        ctx.font        = 'bold 12px "SF Mono", "Consolas", monospace';
        ctx.fillStyle   = `rgba(80, 80, 180, ${m.alpha})`;
        ctx.textAlign   = 'center';
        ctx.fillText(line1, 0, 0);
        ctx.fillText(line2, 0, 16);

        // Shadow for depth
        ctx.font      = '11px monospace';
        ctx.fillStyle = `rgba(180, 80, 80, ${m.alpha * 0.6})`;
        ctx.fillText(line1, 1, 1);
        ctx.fillText(line2, 1, 17);

        ctx.restore();

        // Animate position
        m.x += m.dx;
        m.y += m.dy;

        // Bounce off edges
        if (m.x < 80  || m.x > canvas.width  - 80)  m.dx *= -1;
        if (m.y < 20  || m.y > canvas.height - 20)  m.dy *= -1;
      });
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [userId, username, testId]);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
