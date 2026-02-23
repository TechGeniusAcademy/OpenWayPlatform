import { useState, useCallback, useMemo, useRef } from "react";
import styles from "./CSSGradientGenerator.module.css";
import {
  FaCopy, FaPlus, FaTrash, FaRandom, FaUndo, FaRedo,
  FaCheck, FaExchangeAlt, FaPalette, FaCode, FaDownload,
  FaExpand, FaCompress, FaImage
} from "react-icons/fa";
import { BsRepeat } from "react-icons/bs";
import { MdOutlineFormatColorFill } from "react-icons/md";

const PRESETS = [
  { name: "Sunset",       colors: [{ color: "#ff6b6b", opacity: 100, position: 0  }, { color: "#feca57", opacity: 100, position: 100 }] },
  { name: "Ocean",        colors: [{ color: "#667eea", opacity: 100, position: 0  }, { color: "#764ba2", opacity: 100, position: 100 }] },
  { name: "Forest",       colors: [{ color: "#11998e", opacity: 100, position: 0  }, { color: "#38ef7d", opacity: 100, position: 100 }] },
  { name: "Fire",         colors: [{ color: "#f12711", opacity: 100, position: 0  }, { color: "#f5af19", opacity: 100, position: 100 }] },
  { name: "Night",        colors: [{ color: "#232526", opacity: 100, position: 0  }, { color: "#414345", opacity: 100, position: 100 }] },
  { name: "Cotton Candy", colors: [{ color: "#D299C2", opacity: 100, position: 0  }, { color: "#FEF9D7", opacity: 100, position: 100 }] },
  { name: "Peach",        colors: [{ color: "#ED4264", opacity: 100, position: 0  }, { color: "#FFEDBC", opacity: 100, position: 100 }] },
  { name: "Aqua",         colors: [{ color: "#1A2980", opacity: 100, position: 0  }, { color: "#26D0CE", opacity: 100, position: 100 }] },
  { name: "Rose Gold",    colors: [{ color: "#f4a0a0", opacity: 100, position: 0  }, { color: "#f8d7a0", opacity: 100, position: 100 }] },
  { name: "Neon",         colors: [{ color: "#00f260", opacity: 100, position: 0  }, { color: "#0575e6", opacity: 100, position: 100 }] },
  { name: "Cosmic",       colors: [{ color: "#2d1b69", opacity: 100, position: 0  }, { color: "#e91e63", opacity: 100, position: 50 }, { color: "#ff6f00", opacity: 100, position: 100 }] },
  { name: "Candy",        colors: [{ color: "#fc5c7d", opacity: 100, position: 0  }, { color: "#6a82fb", opacity: 100, position: 100 }] },
  { name: "Nordic",       colors: [{ color: "#3d5a80", opacity: 100, position: 0  }, { color: "#98c1d9", opacity: 100, position: 100 }] },
  { name: "Mango",        colors: [{ color: "#ff8008", opacity: 100, position: 0  }, { color: "#ffc837", opacity: 100, position: 100 }] },
  { name: "Berry",        colors: [{ color: "#6a3093", opacity: 100, position: 0  }, { color: "#a044ff", opacity: 100, position: 100 }] },
  { name: "Emerald",      colors: [{ color: "#348f50", opacity: 100, position: 0  }, { color: "#56b4d3", opacity: 100, position: 100 }] },
  { name: "Aurora",       colors: [{ color: "#00C9FF", opacity: 100, position: 0  }, { color: "#92FE9D", opacity: 100, position: 50 }, { color: "#00C9FF", opacity: 100, position: 100 }] },
  { name: "Lavender",     colors: [{ color: "#a18cd1", opacity: 100, position: 0  }, { color: "#fbc2eb", opacity: 100, position: 100 }] },
  { name: "Steel",        colors: [{ color: "#485563", opacity: 100, position: 0  }, { color: "#29323c", opacity: 100, position: 100 }] },
  { name: "Cyber",        colors: [{ color: "#141e30", opacity: 100, position: 0  }, { color: "#243b55", opacity: 100, position: 50 }, { color: "#00d2ff", opacity: 100, position: 100 }] },
  { name: "Rainbow", colors: [
    { color: "#ff0000", opacity: 100, position: 0   },
    { color: "#ff7f00", opacity: 100, position: 17  },
    { color: "#ffff00", opacity: 100, position: 33  },
    { color: "#00ff00", opacity: 100, position: 50  },
    { color: "#0000ff", opacity: 100, position: 67  },
    { color: "#4b0082", opacity: 100, position: 83  },
    { color: "#9400d3", opacity: 100, position: 100 }
  ]},
  { name: "Transp.", colors: [{ color: "#667eea", opacity: 100, position: 0 }, { color: "#667eea", opacity: 0, position: 100 }] },
  { name: "Double",  colors: [{ color: "#f093fb", opacity: 100, position: 0 }, { color: "#f5576c", opacity: 100, position: 50 }, { color: "#4facfe", opacity: 100, position: 100 }] },
  { name: "Deep Space", colors: [{ color: "#000000", opacity: 100, position: 0 }, { color: "#434343", opacity: 100, position: 100 }] },
];

const DIRECTIONS = [
  { value: "to right",       label: "→",  angle: 90  },
  { value: "to left",        label: "←",  angle: 270 },
  { value: "to bottom",      label: "↓",  angle: 180 },
  { value: "to top",         label: "↑",  angle: 0   },
  { value: "to bottom right",label: "↘",  angle: 135 },
  { value: "to bottom left", label: "↙",  angle: 225 },
  { value: "to top right",   label: "↗",  angle: 45  },
  { value: "to top left",    label: "↖",  angle: 315 },
];

const RADIAL_SHAPES    = [{ value: "circle", label: "Круг" }, { value: "ellipse", label: "Эллипс" }];
const RADIAL_POSITIONS = [
  { value: "center",       label: "Центр"        },
  { value: "top",          label: "Сверху"       },
  { value: "bottom",       label: "Снизу"        },
  { value: "left",         label: "Слева"        },
  { value: "right",        label: "Справа"       },
  { value: "top left",     label: "↖ Сверху-слева"  },
  { value: "top right",    label: "↗ Сверху-справа" },
  { value: "bottom left",  label: "↙ Снизу-слева"   },
  { value: "bottom right", label: "↘ Снизу-справа"  },
];

const PREVIEW_CONTEXTS = [
  { id: "bg",   label: "Фон"    },
  { id: "card", label: "Карточка" },
  { id: "btn",  label: "Кнопка"   },
  { id: "text", label: "Текст"    },
];

const OUTPUT_FORMATS = [
  { id: "css",     label: "CSS"   },
  { id: "prefixed",label: "+ Prefix" },
  { id: "scss",    label: "SCSS"  },
  { id: "js",      label: "JS"    },
  { id: "svg",     label: "SVG"   },
];

let nextId = 3;

function toColorStr(hex, opacity) {
  if (opacity >= 100) return hex;
  const alpha = Math.round((opacity / 100) * 255)
    .toString(16).padStart(2, "0");
  return hex + alpha;
}

function randomHex() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
}

function CSSGradientGenerator() {
  const [gradientType, setGradientType]       = useState("linear");
  const [direction,    setDirection]          = useState("to right");
  const [customAngle,  setCustomAngle]        = useState(90);
  const [useCustomAngle, setUseCustomAngle]   = useState(false);
  const [radialShape,  setRadialShape]        = useState("circle");
  const [radialPos,    setRadialPos]          = useState("center");
  const [repeating,    setRepeating]          = useState(false);
  const [colorStops,   setColorStops]         = useState([
    { id: 1, color: "#667eea", opacity: 100, position: 0   },
    { id: 2, color: "#764ba2", opacity: 100, position: 100 },
  ]);
  const [selectedStop, setSelectedStop]       = useState(1);
  const [copied,       setCopied]             = useState(false);
  const [history,      setHistory]            = useState([]);
  const [historyIndex, setHistoryIndex]       = useState(-1);
  const [isFullscreen, setIsFullscreen]       = useState(false);
  const [outputFormat, setOutputFormat]       = useState("css");
  const [previewCtx,   setPreviewCtx]         = useState("bg");

  const gradBarRef  = useRef(null);
  const wheelRef    = useRef(null);

  // ── history ──
  const saveHistory = useCallback((stops) => {
    const h = history.slice(0, historyIndex + 1);
    h.push(stops.map(s => ({ ...s })));
    setHistory(h);
    setHistoryIndex(h.length - 1);
  }, [history, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(i => i - 1);
      setColorStops(history[historyIndex - 1].map(s => ({ ...s })));
    }
  };
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(i => i + 1);
      setColorStops(history[historyIndex + 1].map(s => ({ ...s })));
    }
  };

  // ── gradient CSS ──
  const sortedStops = useMemo(
    () => [...colorStops].sort((a, b) => a.position - b.position),
    [colorStops]
  );

  const stopsString = useMemo(
    () => sortedStops.map(s => `${toColorStr(s.color, s.opacity)} ${s.position}%`).join(", "),
    [sortedStops]
  );

  const gradientCSS = useMemo(() => {
    const prefix = repeating ? "repeating-" : "";
    if (gradientType === "linear") {
      const dir = useCustomAngle ? `${customAngle}deg` : direction;
      return `${prefix}linear-gradient(${dir}, ${stopsString})`;
    }
    if (gradientType === "radial") {
      return `${prefix}radial-gradient(${radialShape} at ${radialPos}, ${stopsString})`;
    }
    return `${prefix}conic-gradient(from ${customAngle}deg at ${radialPos}, ${stopsString})`;
  }, [gradientType, direction, customAngle, useCustomAngle, radialShape, radialPos, repeating, stopsString]);

  // ── output ──
  const fullOutput = useMemo(() => {
    const val = gradientCSS;
    switch (outputFormat) {
      case "css":      return `background: ${val};`;
      case "prefixed": return `background: -webkit-${val};\nbackground: -moz-${val};\nbackground: ${val};`;
      case "scss":     return `$gradient: ${val};\n\n.element {\n  background: $gradient;\n}`;
      case "js":       return `const gradient = \`${val}\`;\n\nelement.style.background = gradient;`;
      case "svg": {
        const stops = sortedStops.map(
          (s, i) => `  <stop offset="${s.position}%" stop-color="${s.color}" stop-opacity="${(s.opacity/100).toFixed(2)}" />`
        ).join("\n");
        return `<svg xmlns="http://www.w3.org/2000/svg">\n  <defs>\n    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">\n${stops}\n    </linearGradient>\n  </defs>\n  <rect width="100%" height="100%" fill="url(#grad)" />\n</svg>`;
      }
      default: return `background: ${val};`;
    }
  }, [gradientCSS, outputFormat, sortedStops]);

  // ── color stop ops ──
  const addStop = () => {
    const id = nextId++;
    const mid = 50;
    const ns = [...colorStops, { id, color: randomHex(), opacity: 100, position: mid }];
    setColorStops(ns);
    setSelectedStop(id);
    saveHistory(ns);
  };

  const removeStop = (id) => {
    if (colorStops.length <= 2) return;
    const ns = colorStops.filter(s => s.id !== id);
    setColorStops(ns);
    if (selectedStop === id) setSelectedStop(ns[0].id);
    saveHistory(ns);
  };

  const updateStop = (id, field, value) => {
    setColorStops(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const applyPreset = (preset) => {
    const ns = preset.colors.map((c, i) => ({ ...c, id: i + 1 }));
    nextId = ns.length + 1;
    setColorStops(ns);
    setSelectedStop(1);
    saveHistory(ns);
  };

  const randomGradient = () => {
    const n = Math.floor(Math.random() * 3) + 2;
    const ns = Array.from({ length: n }, (_, i) => ({
      id: i + 1,
      color: randomHex(),
      opacity: 100,
      position: Math.round((i / (n - 1)) * 100),
    }));
    nextId = n + 1;
    setColorStops(ns);
    setCustomAngle(Math.floor(Math.random() * 360));
    setUseCustomAngle(true);
    saveHistory(ns);
  };

  const reverseColors = () => {
    const ns = colorStops.map(s => ({ ...s, position: 100 - s.position }));
    setColorStops(ns);
    saveHistory(ns);
  };

  // ── angle wheel ──
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const el = wheelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const calc = (cx2, cy2) => {
      const dx = cx2 - cx;
      const dy = cy2 - cy;
      let a = Math.round(Math.atan2(dx, -dy) * 180 / Math.PI);
      if (a < 0) a += 360;
      setCustomAngle(a);
      setUseCustomAngle(true);
    };

    calc(e.clientX, e.clientY);

    const onMove = (me) => calc(me.clientX, me.clientY);
    const onUp   = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup",   onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup",   onUp);
  }, []);

  // ── gradient bar drag ──
  const handleBarDrag = useCallback((id, e) => {
    e.preventDefault();
    const bar = gradBarRef.current;
    if (!bar) return;
    setSelectedStop(id);

    const calc = (cx2) => {
      const rect = bar.getBoundingClientRect();
      let p = Math.round(((cx2 - rect.left) / rect.width) * 100);
      p = Math.max(0, Math.min(100, p));
      updateStop(id, "position", p);
    };
    calc(e.clientX);

    const onMove = (me) => calc(me.clientX);
    const onUp   = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup",   onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup",   onUp);
  }, []);

  // ── copy ──
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // ── download CSS ──
  const downloadCSS = () => {
    const blob = new Blob([`.gradient {\n  ${fullOutput.replace(/\n/g, "\n  ")}\n}`], { type: "text/css" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), { href: url, download: "gradient.css" });
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── export PNG via canvas ──
  const exportPNG = () => {
    const canvas = document.createElement("canvas");
    canvas.width  = 1200;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");
    let grad;
    if (gradientType === "radial") {
      grad = ctx.createRadialGradient(600, 300, 0, 600, 300, 600);
    } else {
      const rad = ((45 === customAngle && !useCustomAngle) ? 45 : (useCustomAngle ? customAngle : 90)) * Math.PI / 180;
      const x1 = 600 - 600 * Math.sin(rad), y1 = 300 + 300 * Math.cos(rad);
      const x2 = 600 + 600 * Math.sin(rad), y2 = 300 - 300 * Math.cos(rad);
      grad = ctx.createLinearGradient(x1, y1, x2, y2);
    }
    sortedStops.forEach(s => {
      try { grad.addColorStop(s.position / 100, toColorStr(s.color, s.opacity)); } catch {}
    });
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 600);
    const url = canvas.toDataURL("image/png");
    const a   = Object.assign(document.createElement("a"), { href: url, download: "gradient.png" });
    a.click();
  };

  const activeStop = colorStops.find(s => s.id === selectedStop) || colorStops[0];
  const wheelAngle = useCustomAngle ? customAngle : (DIRECTIONS.find(d => d.value === direction)?.angle ?? 90);
  const sx = 50 + 38 * Math.sin(wheelAngle * Math.PI / 180);
  const sy = 50 - 38 * Math.cos(wheelAngle * Math.PI / 180);

  return (
    <div className={`${styles.gen} ${isFullscreen ? styles.fullscreen : ""}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <FaPalette />
          <span>CSS Gradient Generator</span>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.hBtn} onClick={undo} disabled={historyIndex <= 0} title="Отмена"><FaUndo /></button>
          <button className={styles.hBtn} onClick={redo} disabled={historyIndex >= history.length - 1} title="Повтор"><FaRedo /></button>
          <button className={styles.hBtn} onClick={randomGradient} title="Случайный"><FaRandom /></button>
          <button className={styles.hBtn} onClick={reverseColors} title="Развернуть"><FaExchangeAlt /></button>
          <button className={styles.hBtn} onClick={() => setIsFullscreen(f => !f)} title={isFullscreen ? "Свернуть" : "Развернуть"}>
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className={styles.body}>

        {/* ── LEFT PANEL ── */}
        <div className={styles.left}>

          {/* Type */}
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Тип</label>
            <div className={styles.tabs}>
              {["linear","radial","conic"].map(t => (
                <button
                  key={t} onClick={() => setGradientType(t)}
                  className={`${styles.tab} ${gradientType === t ? styles.tabActive : ""}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Repeating toggle */}
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Параметры</label>
            <label className={styles.toggle}>
              <input type="checkbox" checked={repeating} onChange={e => setRepeating(e.target.checked)} />
              <span className={styles.toggleTrack} />
              <span>Повторяющийся</span>
            </label>
          </div>

          {/* Linear direction */}
          {gradientType === "linear" && (
            <div className={styles.section}>
              <label className={styles.sectionLabel}>Направление</label>
              <div className={styles.angleRow}>
                {/* Wheel */}
                <div
                  ref={wheelRef}
                  className={styles.wheel}
                  onPointerDown={handleWheel}
                  title="Перетащи для выбора угла"
                >
                  <svg viewBox="0 0 100 100" className={styles.wheelSvg}>
                    <circle cx="50" cy="50" r="44" className={styles.wheelRing} />
                    {DIRECTIONS.map(d => {
                      const rx = 50 + 36 * Math.sin(d.angle * Math.PI / 180);
                      const ry = 50 - 36 * Math.cos(d.angle * Math.PI / 180);
                      return <circle key={d.value} cx={rx} cy={ry} r="3" className={styles.wheelDot} />;
                    })}
                    <line x1="50" y1="50" x2={sx} y2={sy} className={styles.wheelNeedle} strokeLinecap="round" />
                    <circle cx="50" cy="50" r="4" className={styles.wheelCenter} />
                  </svg>
                  <span className={styles.wheelAngle}>{wheelAngle}°</span>
                </div>

                {/* Direction quick buttons */}
                <div className={styles.dirGrid}>
                  {DIRECTIONS.map(d => (
                    <button
                      key={d.value}
                      title={d.value}
                      className={`${styles.dirBtn} ${!useCustomAngle && direction === d.value ? styles.dirBtnActive : ""}`}
                      onClick={() => { setDirection(d.value); setUseCustomAngle(false); }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual angle input */}
              <div className={styles.angleInputRow}>
                <input
                  type="range" min="0" max="360" value={wheelAngle}
                  onChange={e => { setCustomAngle(Number(e.target.value)); setUseCustomAngle(true); }}
                  className={styles.slider}
                />
                <input
                  type="number" min="0" max="360" value={wheelAngle}
                  onChange={e => { setCustomAngle(Number(e.target.value)); setUseCustomAngle(true); }}
                  className={styles.numInput}
                />
                <span className={styles.unit}>°</span>
              </div>
            </div>
          )}

          {/* Radial options */}
          {gradientType === "radial" && (
            <div className={styles.section}>
              <label className={styles.sectionLabel}>Форма и позиция</label>
              <div className={styles.selectRow}>
                <select className={styles.select} value={radialShape} onChange={e => setRadialShape(e.target.value)}>
                  {RADIAL_SHAPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select className={styles.select} value={radialPos} onChange={e => setRadialPos(e.target.value)}>
                  {RADIAL_POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Conic options */}
          {gradientType === "conic" && (
            <div className={styles.section}>
              <label className={styles.sectionLabel}>Угол и позиция</label>
              <div className={styles.angleInputRow}>
                <input
                  type="range" min="0" max="360" value={customAngle}
                  onChange={e => setCustomAngle(Number(e.target.value))}
                  className={styles.slider}
                />
                <input
                  type="number" min="0" max="360" value={customAngle}
                  onChange={e => setCustomAngle(Number(e.target.value))}
                  className={styles.numInput}
                />
                <span className={styles.unit}>°</span>
              </div>
              <select className={styles.select} value={radialPos} onChange={e => setRadialPos(e.target.value)} style={{ marginTop: 8 }}>
                {RADIAL_POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          )}

          {/* Color stops - gradient bar */}
          <div className={styles.section}>
            <div className={styles.sectionLabelRow}>
              <label className={styles.sectionLabel}>Цвета ({colorStops.length})</label>
              <button className={styles.addBtn} onClick={addStop}><FaPlus /> Добавить</button>
            </div>

            {/* Visual gradient bar */}
            <div
              ref={gradBarRef}
              className={styles.gradBar}
              style={{ background: gradientType === "linear" ? `linear-gradient(to right, ${stopsString})` : gradientCSS }}
            >
              {colorStops.map(s => (
                <div
                  key={s.id}
                  className={`${styles.barStop} ${selectedStop === s.id ? styles.barStopActive : ""}`}
                  style={{ left: `${s.position}%` }}
                  onPointerDown={e => handleBarDrag(s.id, e)}
                  title={`${s.color} — ${s.position}%`}
                >
                  <div className={styles.barStopSwatch} style={{ background: s.color }} />
                </div>
              ))}
            </div>

            {/* Selected stop editor */}
            {activeStop && (
              <div className={styles.stopEditor}>
                <div className={styles.stopEditorTop}>
                  <input
                    type="color" value={activeStop.color}
                    onChange={e => updateStop(activeStop.id, "color", e.target.value)}
                    className={styles.colorPicker}
                  />
                  <input
                    type="text" value={activeStop.color}
                    onChange={e => updateStop(activeStop.id, "color", e.target.value)}
                    className={styles.hexInput}
                    placeholder="#000000"
                  />
                  <span className={styles.stopLabel}>Прозрачность</span>
                  <input
                    type="number" min="0" max="100" value={activeStop.opacity}
                    onChange={e => updateStop(activeStop.id, "opacity", Math.max(0, Math.min(100, Number(e.target.value))))}
                    className={styles.numInput}
                  />
                  <span className={styles.unit}>%</span>
                </div>
                <div className={styles.stopEditorPos}>
                  <span className={styles.stopLabel}>Позиция</span>
                  <input
                    type="range" min="0" max="100" value={activeStop.position}
                    onChange={e => updateStop(activeStop.id, "position", Number(e.target.value))}
                    className={styles.slider}
                  />
                  <span className={styles.posVal}>{activeStop.position}%</span>
                </div>
              </div>
            )}

            {/* All stops list */}
            <div className={styles.stopsList}>
              {colorStops.map((s, i) => (
                <div
                  key={s.id}
                  className={`${styles.stopRow} ${selectedStop === s.id ? styles.stopRowActive : ""}`}
                  onClick={() => setSelectedStop(s.id)}
                >
                  <div className={styles.stopSwatch} style={{ background: toColorStr(s.color, s.opacity) }} />
                  <span className={styles.stopHex}>{s.color}</span>
                  <span className={styles.stopOpacity}>{s.opacity}%</span>
                  <span className={styles.stopPos}>{s.position}%</span>
                  <button
                    className={styles.removeBtn}
                    onClick={e => { e.stopPropagation(); removeStop(s.id); }}
                    disabled={colorStops.length <= 2}
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Presets */}
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Пресеты</label>
            <div className={styles.presets}>
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  className={styles.presetBtn}
                  onClick={() => applyPreset(p)}
                  style={{ background: `linear-gradient(135deg, ${p.colors.map(c => c.color).join(", ")})` }}
                  title={p.name}
                >
                  <span className={styles.presetName}>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

        </div>{/* end left */}

        {/* ── RIGHT PANEL ── */}
        <div className={styles.right}>

          {/* Preview context tabs */}
          <div className={styles.tabs} style={{ marginBottom: 12 }}>
            {PREVIEW_CONTEXTS.map(c => (
              <button
                key={c.id} onClick={() => setPreviewCtx(c.id)}
                className={`${styles.tab} ${previewCtx === c.id ? styles.tabActive : ""}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className={styles.previewWrap}>
            {previewCtx === "bg" && (
              <div className={styles.previewBg} style={{ background: gradientCSS }} />
            )}
            {previewCtx === "card" && (
              <div className={styles.previewCardCtx}>
                <div className={styles.previewCard} style={{ background: gradientCSS }}>
                  <div className={styles.previewCardContent}>
                    <div className={styles.previewCardTitle}>Заголовок</div>
                    <div className={styles.previewCardSub}>Описание карточки с градиентом</div>
                    <div className={styles.previewCardBtn}>Кнопка</div>
                  </div>
                </div>
              </div>
            )}
            {previewCtx === "btn" && (
              <div className={styles.previewBtnCtx}>
                <button className={styles.previewBtn} style={{ background: gradientCSS }}>
                  Кнопка с градиентом
                </button>
                <button className={styles.previewBtnOutline} style={{ borderImage: `${gradientCSS} 1`, color: "white" }}>
                  Outline
                </button>
              </div>
            )}
            {previewCtx === "text" && (
              <div className={styles.previewTextCtx}>
                <span
                  className={styles.previewText}
                  style={{ backgroundImage: gradientCSS, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                >
                  OpenWay
                </span>
              </div>
            )}
          </div>

          {/* Output format tabs */}
          <div className={styles.outputHeader}>
            <div className={styles.tabs}>
              {OUTPUT_FORMATS.map(f => (
                <button
                  key={f.id} onClick={() => setOutputFormat(f.id)}
                  className={`${styles.tab} ${outputFormat === f.id ? styles.tabActive : ""}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Code block */}
          <div className={styles.codeBlock}>
            <pre className={styles.code}>{fullOutput}</pre>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button onClick={copy} className={`${styles.btnCopy} ${copied ? styles.btnCopied : ""}`}>
              {copied ? <><FaCheck /> Скопировано!</> : <><FaCopy /> Копировать</>}
            </button>
            <button onClick={downloadCSS} className={styles.btnAlt}><FaDownload /> .css</button>
            <button onClick={exportPNG}   className={styles.btnAlt}><FaImage /> .png</button>
          </div>

          {/* Hex value display */}
          <div className={styles.cssValueBox}>
            <span className={styles.cssValueLabel}><FaCode /> Значение</span>
            <span className={styles.cssValue}>{gradientCSS}</span>
          </div>

        </div>{/* end right */}

      </div>{/* end body */}
    </div>
  );
}

export default CSSGradientGenerator;
