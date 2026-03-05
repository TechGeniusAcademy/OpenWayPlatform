/**
 * AntiPhotoOverlay — физически обоснованная защита от съёмки экрана телефоном.
 *
 * Принцип (rolling shutter attack):
 *   Матрица CMOS в телефонных камерах сканирует строки сверху вниз (~1-20мс на кадр).
 *   Если экран мерцает в момент сканирования, часть кадра захватывает одно
 *   состояние, часть — другое → видимые горизонтальные полосы в итоговом снимке.
 *
 *   Слой A — горизонтальные полосы 15Hz (setInterval 67ms, НЕ RAF):
 *     15Hz < порога слияния мельканий ~20Hz → глаз не замечает;
 *     камера на 30fps получает чередующиеся кадры → видимое мерцание.
 *
 *   Слой B — смещённые полосы другого размера 20Hz (setInterval 50ms):
 *     Beat-частота A×B = 5Hz — моаре-паттерн усиливает артефакт.
 *
 *   Canvas C — moving scanline + diagonal noise (60fps RAF):
 *     Сканлайн движется со скоростью, совпадающей со скоростью rolling shutter,
 *     создавая «diagonal banding» в захваченном камерой видео.
 *
 * Для глаза: суммарное изменение яркости < 3% — практически незаметно.
 * Для камеры: каждый захваченный кадр содержит полосы.
 */
import React, { useEffect, useRef } from 'react';
import styles from './AntiPhotoOverlay.module.css';

// Скорость сканлайна в px/frame при 60fps
const SCAN_SPEED = 4;

export default function AntiPhotoOverlay() {
  const canvasRef  = useRef(null);
  const layer15Ref = useRef(null);
  const layer20Ref = useRef(null);
  const rafRef     = useRef(null);
  const int15Ref   = useRef(null);
  const int20Ref   = useRef(null);

  useEffect(() => {
    const canvas  = canvasRef.current;
    const div15   = layer15Ref.current;
    const div20   = layer20Ref.current;
    if (!canvas || !div15 || !div20) return;

    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // ── Слой A: горизонтальные полосы 15Hz ───────────────────────────────────
    // Alpha 0.04 — почти невидимо, но камера фиксирует перепад.
    let state15 = false;
    const BAR_A = 4; // px высота полосы
    int15Ref.current = setInterval(() => {
      state15 = !state15;
      div15.style.backgroundImage = state15
        ? `repeating-linear-gradient(
            180deg,
            rgba(255,255,255,0.018) 0px,
            rgba(255,255,255,0.018) ${BAR_A}px,
            transparent              ${BAR_A}px,
            transparent              ${BAR_A * 2}px
          )`
        : `repeating-linear-gradient(
            180deg,
            transparent              0px,
            transparent              ${BAR_A}px,
            rgba(0,0,0,0.012)        ${BAR_A}px,
            rgba(0,0,0,0.012)        ${BAR_A * 2}px
          )`;
    }, 67); // ~15Hz

    // ── Слой B: смещённые полосы другого размера 20Hz ────────────────────────
    let state20 = false;
    const BAR_B = 6;
    int20Ref.current = setInterval(() => {
      state20 = !state20;
      div20.style.backgroundImage = state20
        ? `repeating-linear-gradient(
            180deg,
            rgba(255,255,255,0.012) 0px,
            rgba(255,255,255,0.012) ${BAR_B}px,
            transparent               ${BAR_B}px,
            transparent               ${BAR_B * 2}px
          )`
        : `repeating-linear-gradient(
            180deg,
            rgba(0,0,0,0.009)         0px,
            rgba(0,0,0,0.009)         ${BAR_B}px,
            transparent               ${BAR_B}px,
            transparent               ${BAR_B * 2}px
          )`;
    }, 50); // ~20Hz

    // ── Canvas C: движущийся сканлайн + diagonal noise (60fps) ───────────────
    let scanY = 0;
    let frame = 0;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      frame++;

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Главный сканлайн — симулирует «exposure line» rolling shutter
      const grad = ctx.createLinearGradient(0, scanY - 3, 0, scanY + 3);
      grad.addColorStop(0,   'rgba(255,255,255,0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.022)');
      grad.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 3, W, 6);

      scanY = (scanY + SCAN_SPEED) % H;

      // Второй сканлайн в противофазе — двойная полоса на фото
      const scanY2 = (scanY + Math.floor(H / 2)) % H;
      const grad2  = ctx.createLinearGradient(0, scanY2 - 2, 0, scanY2 + 2);
      grad2.addColorStop(0,   'rgba(0,0,0,0)');
      grad2.addColorStop(0.5, 'rgba(0,0,0,0.016)');
      grad2.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, scanY2 - 2, W, 4);

      // Diagonal micro-pattern — дополнительный артефакт на CMOS-сдвиге
      if (frame % 2 === 0) {
        ctx.strokeStyle = 'rgba(200,200,255,0.020)';
        ctx.lineWidth   = 0.5;
        const offset = (frame * 1.5) % 30;
        for (let d = -H + offset; d < W + H; d += 30) {
          ctx.beginPath();
          ctx.moveTo(d, 0);
          ctx.lineTo(d + H, H);
          ctx.stroke();
        }
      }
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(int15Ref.current);
      clearInterval(int20Ref.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <>
      {/* Слой A: 15Hz горизонтальные полосы */}
      <div ref={layer15Ref} className={styles.stripLayer} />
      {/* Слой B: 20Hz смещённые полосы */}
      <div ref={layer20Ref} className={styles.stripLayer} />
      {/* Canvas C: сканлайн + diagonal noise */}
      <canvas ref={canvasRef} className={styles.canvas} />
    </>
  );
}
