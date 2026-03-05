/**
 * useAntiCheat — комплексная защита страницы тестирования.
 * Уровни защиты:
 *   1. Блокировка действий (ПКМ, копирование, перетаскивание, горячие клавиши DevTools)
 *   2. Обнаружение DevTools (resize-эвристика + toString-трюк)
 *   3. Обнаружение PrintScreen
 *   4. Контроль вкладок (blur/visibility) + авто-завершение при злоупотреблении
 *   5. Перехват Screen Capture API
 *   6. Инъекция CSS user-select: none
 *   7. Логирование нарушений на бэкенд
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';

const TAB_SWITCH_LIMIT    = 5;   // авто-завершить тест после N переключений вкладок
const DEVTOOLS_DELTA      = 100; // px — увеличение разницы outer/inner относительно baseline
const DEVTOOLS_STABILITY  = 3;   // нужно N подряд срабатываний прежде чем реагировать

export function useAntiCheat({ enabled = false, attemptId = null, onForceSubmit = null }) {
  const [blurred, setBlurred] = useState(false);
  const [contentHidden, setContentHidden] = useState(false);
  const [contentFadingOut, setContentFadingOut] = useState(false);
  const [violationCount, setViolationCount] = useState(0);

  const vCountRef       = useRef(0);
  const tabSwitchRef    = useRef(0);
  const devToolsOpenRef = useRef(false);
  const forceSubmitRef  = useRef(onForceSubmit);
  const attemptIdRef    = useRef(attemptId);
  const printScreenTimerRef = useRef(null);
  const fadeTimerRef    = useRef(null);

  // Скрыть контент — внутренний хелпер с плавным исчезновением
  const hideContent = useCallback(() => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setContentFadingOut(false);
    setContentHidden(true);
  }, []);

  const revealContent = useCallback(() => {
    // Сначала запускаем fade-out (3с), затем убираем элемент
    setContentFadingOut(true);
    fadeTimerRef.current = setTimeout(() => {
      setContentHidden(false);
      setContentFadingOut(false);
      fadeTimerRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => { forceSubmitRef.current = onForceSubmit; }, [onForceSubmit]);
  useEffect(() => { attemptIdRef.current = attemptId; }, [attemptId]);

  // ─── Central violation logger ───────────────────────────────────────────────
  const logViolation = useCallback(async (type, detail = '') => {
    if (!enabled) return;

    vCountRef.current += 1;
    const count = vCountRef.current;
    setViolationCount(count);

    // Fire-and-forget: log to backend
    const id = attemptIdRef.current;
    if (id) {
      api.post(`/tests/attempt/${id}/violation`, {
        type,
        detail,
        count,
        ua: navigator.userAgent.slice(0, 300),
      }).catch(() => {});
    }

    // Auto-submit after too many tab switches
    if (type === 'tab_switch') {
      tabSwitchRef.current += 1;
      if (tabSwitchRef.current >= TAB_SWITCH_LIMIT && forceSubmitRef.current) {
        forceSubmitRef.current();
      }
    }
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── 1. Block actions & shortcuts ───────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const stopDefault = (e) => e.preventDefault();

    const onCopy = (e) => { e.preventDefault(); logViolation('copy_attempt', 'Попытка копирования'); };
    const onCut  = (e) => { e.preventDefault(); logViolation('cut_attempt', 'Попытка вырезания'); };

    const onKeydown = (e) => {
      const ctrl  = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const k     = e.key?.toLowerCase() ?? '';

      // DevTools keys
      if (e.key === 'F12') {
        e.preventDefault();
        logViolation('devtools_key', 'F12');
        return;
      }
      if (ctrl && shift && (k === 'i' || k === 'j' || k === 'c')) {
        e.preventDefault();
        logViolation('devtools_key', `Ctrl+Shift+${e.key}`);
        return;
      }
      // View source
      if (ctrl && k === 'u') { e.preventDefault(); logViolation('view_source', 'Ctrl+U'); return; }
      // Save
      if (ctrl && k === 's') { e.preventDefault(); return; }
      // Select all
      if (ctrl && k === 'a') { e.preventDefault(); return; }
      // Print
      if (ctrl && k === 'p') { e.preventDefault(); return; }
      // PrintScreen
      if (e.key === 'PrintScreen') {
        // Скрываем немедленно
        hideContent();
        // Пробуем перезаписать буфер обмена пустым — не даём сохранить скриншот
        try { navigator.clipboard.writeText(''); } catch (_) {}
        // Логируем нарушение
        logViolation('screenshot', 'PrintScreen нажат');
        // Держим контент скрытым 10 секунд, затем плавное исчезновение (3с fade)
        if (printScreenTimerRef.current) clearTimeout(printScreenTimerRef.current);
        printScreenTimerRef.current = setTimeout(() => {
          revealContent();
          printScreenTimerRef.current = null;
        }, 10000);
      }
      // Win+Shift+S (Snipping Tool)
      if ((e.metaKey || e.ctrlKey) && shift && k === 's' && !e.altKey) {
        e.preventDefault();
      }
      // Alt+PrintScreen
      if (e.key === 'PrintScreen' && e.altKey) {
        hideContent();
        try { navigator.clipboard.writeText(''); } catch (_) {}
        logViolation('screenshot', 'Alt+PrintScreen нажат');
        if (printScreenTimerRef.current) clearTimeout(printScreenTimerRef.current);
        printScreenTimerRef.current = setTimeout(() => {
          revealContent();
          printScreenTimerRef.current = null;
        }, 10000);
      }
    };

    document.addEventListener('contextmenu', stopDefault);
    document.addEventListener('selectstart', stopDefault);
    document.addEventListener('copy',       onCopy);
    document.addEventListener('cut',        onCut);
    document.addEventListener('paste',      stopDefault);
    document.addEventListener('dragstart',  stopDefault);
    window.addEventListener('keydown',      onKeydown);

    // Inject CSS: disable user-select globally
    const style = document.createElement('style');
    style.id = '__anticheat_css';
    style.textContent = [
      '* {',
      '  -webkit-user-select: none !important;',
      '  -moz-user-select: none !important;',
      '  user-select: none !important;',
      '  -webkit-touch-callout: none !important;',
      '}',
      'input, textarea { user-select: text !important; -webkit-user-select: text !important; }',
    ].join('\n');
    document.head.appendChild(style);

    return () => {
      document.removeEventListener('contextmenu', stopDefault);
      document.removeEventListener('selectstart', stopDefault);
      document.removeEventListener('copy',       onCopy);
      document.removeEventListener('cut',        onCut);
      document.removeEventListener('paste',      stopDefault);
      document.removeEventListener('dragstart',  stopDefault);
      window.removeEventListener('keydown',      onKeydown);
      document.getElementById('__anticheat_css')?.remove();
      if (printScreenTimerRef.current) clearTimeout(printScreenTimerRef.current);
    };
  }, [enabled, logViolation]);

  // ─── 2. Tab visibility & window focus ───────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const onVisChange = () => {
      if (document.hidden) {
        setBlurred(true);
        logViolation('tab_switch', `Переключение вкладки #${tabSwitchRef.current + 1}`);
      } else {
        setBlurred(false);
      }
    };

    const onBlur  = () => { setBlurred(true);  logViolation('window_blur', 'Окно потеряло фокус'); };
    const onFocus = () => { setBlurred(false); };

    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('blur',  onBlur);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('blur',  onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, logViolation]);

  // ─── 3. DevTools detection: window resize heuristic ─────────────────────────
  useEffect(() => {
    if (!enabled) return;

    let consecutiveHits = 0;
    let baselineW = window.outerWidth  - window.innerWidth;
    let baselineH = window.outerHeight - window.innerHeight;
    let baselineCaptured = false;
    let skipChecks = 3; // пропустить первые N проверок для стабилизации baseline

    const check = () => {
      if (skipChecks > 0) {
        // Обновляем baseline пока ждём — берём максимум, чтобы не среагировать на зум
        baselineW = Math.max(baselineW, window.outerWidth  - window.innerWidth);
        baselineH = Math.max(baselineH, window.outerHeight - window.innerHeight);
        skipChecks--;
        if (skipChecks === 0) baselineCaptured = true;
        return;
      }

      const curW = window.outerWidth  - window.innerWidth;
      const curH = window.outerHeight - window.innerHeight;
      // Реагируем на любое увеличение разрыва относительно baseline на DEVTOOLS_DELTA
      const isOpen = (curW - baselineW > DEVTOOLS_DELTA) || (curH - baselineH > DEVTOOLS_DELTA);

      if (isOpen) {
        consecutiveHits++;
        if (consecutiveHits >= DEVTOOLS_STABILITY && !devToolsOpenRef.current) {
          devToolsOpenRef.current = true;
          hideContent();
          logViolation('devtools_open', `DevTools detected (dW:+${curW - baselineW} dH:+${curH - baselineH})`);
        }
      } else {
        consecutiveHits = 0;
        // При закрытии DevTools — обновить baseline на случай изменения размера окна
        baselineW = Math.min(baselineW, curW);
        baselineH = Math.min(baselineH, curH);
        if (devToolsOpenRef.current) {
          devToolsOpenRef.current = false;
          revealContent();
        }
      }
    };

    // При resize обновляем baseline только если DevTools закрыт
    const onResize = () => {
      if (!devToolsOpenRef.current) {
        // Даём 200мс стабилизироваться после ресайза, потом сбрасываем baseline
        setTimeout(() => {
          if (!devToolsOpenRef.current) {
            baselineW = window.outerWidth  - window.innerWidth;
            baselineH = window.outerHeight - window.innerHeight;
            consecutiveHits = 0;
          }
        }, 200);
      }
    };

    window.addEventListener('resize', onResize);
    const id = setInterval(check, 500);
    return () => { window.removeEventListener('resize', onResize); clearInterval(id); };
  }, [enabled, logViolation, hideContent, revealContent]);

  // ─── 4. DevTools detection: element.id toString trick ───────────────────────
  useEffect(() => {
    if (!enabled) return;

    const sentinel = document.createElement('div');
    Object.defineProperty(sentinel, 'id', {
      get() {
        logViolation('devtools_inspect', 'Элемент проинспектирован в DevTools');
        return 'sentinel';
      },
    });

    // Pushing to console — works when DevTools are open
    const id = setInterval(() => {
      // eslint-disable-next-line no-console
      console.log('%c ', 'font-size:0', sentinel);
    }, 3000);

    return () => clearInterval(id);
  }, [enabled, logViolation]);

  // ─── 5. Screen Capture API interception ─────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    if (!navigator.mediaDevices?.getDisplayMedia) return;

    const original = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);

    navigator.mediaDevices.getDisplayMedia = async (...args) => {
      logViolation('screen_capture', 'Попытка записи экрана (getDisplayMedia)');
      setBlurred(true);
      try {
        const stream = await original(...args);
        // Successfully capturing — blur the content continuously
        stream.getVideoTracks().forEach(track => {
          track.addEventListener('ended', () => setBlurred(false));
        });
        return stream;
      } catch (err) {
        setBlurred(false);
        throw err;
      }
    };

    return () => {
      navigator.mediaDevices.getDisplayMedia = original;
    };
  }, [enabled, logViolation]);

  // ─── 6. Rate-limit rapid actions (anti-automation) ──────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const clickTimes = [];

    const onMouseDown = () => {
      const now = Date.now();
      clickTimes.push(now);
      // Keep last 10 clicks
      if (clickTimes.length > 10) clickTimes.shift();
      // If 10 clicks in under 2 seconds — suspicious
      if (clickTimes.length === 10 && now - clickTimes[0] < 2000) {
        logViolation('automation', 'Аномально быстрые клики');
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [enabled, logViolation]);

  return { blurred, contentHidden, contentFadingOut, violationCount };
}
