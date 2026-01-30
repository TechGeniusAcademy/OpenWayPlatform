import { useState, useMemo, useRef } from 'react';
import styles from './ClipPathGenerator.module.css';
import { FaCut, FaCopy, FaCheck, FaDownload, FaExpand, FaCompress, FaUndo } from 'react-icons/fa';

const PRESETS = [
  { name: 'Triangle', points: [[50, 0], [0, 100], [100, 100]] },
  { name: 'Trapezoid', points: [[20, 0], [80, 0], [100, 100], [0, 100]] },
  { name: 'Parallelogram', points: [[25, 0], [100, 0], [75, 100], [0, 100]] },
  { name: 'Rhombus', points: [[50, 0], [100, 50], [50, 100], [0, 50]] },
  { name: 'Pentagon', points: [[50, 0], [100, 38], [82, 100], [18, 100], [0, 38]] },
  { name: 'Hexagon', points: [[25, 0], [75, 0], [100, 50], [75, 100], [25, 100], [0, 50]] },
  { name: 'Heptagon', points: [[50, 0], [90, 20], [100, 60], [75, 100], [25, 100], [0, 60], [10, 20]] },
  { name: 'Octagon', points: [[30, 0], [70, 0], [100, 30], [100, 70], [70, 100], [30, 100], [0, 70], [0, 30]] },
  { name: 'Nonagon', points: [[50, 0], [83, 12], [100, 43], [94, 78], [68, 100], [32, 100], [6, 78], [0, 43], [17, 12]] },
  { name: 'Decagon', points: [[50, 0], [80, 10], [100, 35], [100, 65], [80, 90], [50, 100], [20, 90], [0, 65], [0, 35], [20, 10]] },
  { name: 'Bevel', points: [[20, 0], [80, 0], [100, 20], [100, 80], [80, 100], [20, 100], [0, 80], [0, 20]] },
  { name: 'Rabbet', points: [[0, 15], [15, 15], [15, 0], [85, 0], [85, 15], [100, 15], [100, 85], [85, 85], [85, 100], [15, 100], [15, 85], [0, 85]] },
  { name: 'Arrow Left', points: [[40, 0], [40, 20], [100, 20], [100, 80], [40, 80], [40, 100], [0, 50]] },
  { name: 'Arrow Right', points: [[0, 20], [60, 20], [60, 0], [100, 50], [60, 100], [60, 80], [0, 80]] },
  { name: 'Point Left', points: [[25, 0], [100, 0], [100, 100], [25, 100], [0, 50]] },
  { name: 'Point Right', points: [[0, 0], [75, 0], [100, 50], [75, 100], [0, 100]] },
  { name: 'Chevron Left', points: [[100, 0], [75, 50], [100, 100], [25, 100], [0, 50], [25, 0]] },
  { name: 'Chevron Right', points: [[75, 0], [100, 50], [75, 100], [0, 100], [25, 50], [0, 0]] },
  { name: 'Star', points: [[50, 0], [61, 35], [98, 35], [68, 57], [79, 91], [50, 70], [21, 91], [32, 57], [2, 35], [39, 35]] },
  { name: 'Cross', points: [[35, 0], [65, 0], [65, 35], [100, 35], [100, 65], [65, 65], [65, 100], [35, 100], [35, 65], [0, 65], [0, 35], [35, 35]] },
  { name: 'Message', points: [[0, 0], [100, 0], [100, 75], [75, 75], [75, 100], [50, 75], [0, 75]] },
  { name: 'Frame', points: [[0, 0], [100, 0], [100, 100], [0, 100], [0, 25], [15, 25], [15, 75], [85, 75], [85, 25], [0, 25]] },
];

function ClipPathGenerator() {
  const [points, setPoints] = useState([[50, 0], [0, 100], [100, 100]]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [bgColor, setBgColor] = useState('#667eea');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInset, setShowInset] = useState(false);
  const [insetValue, setInsetValue] = useState(0);
  const [borderRadius, setBorderRadius] = useState(0);
  const svgRef = useRef(null);

  const clipPath = useMemo(() => {
    if (borderRadius > 0) {
      return `inset(${insetValue}% round ${borderRadius}px)`;
    }
    if (showInset) {
      return `inset(${insetValue}%)`;
    }
    const polygonPoints = points.map(([x, y]) => `${x}% ${y}%`).join(', ');
    return `polygon(${polygonPoints})`;
  }, [points, showInset, insetValue, borderRadius]);

  const cssCode = `/* Clip Path */
clip-path: ${clipPath};
-webkit-clip-path: ${clipPath};`;

  const handleSvgClick = (e) => {
    if (showInset || borderRadius > 0) return;
    
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setPoints([...points, [Math.round(x), Math.round(y)]]);
  };

  const handlePointDrag = (index, e) => {
    if (showInset || borderRadius > 0) return;
    
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    
    const onMouseMove = (moveEvent) => {
      const x = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((moveEvent.clientY - rect.top) / rect.height) * 100));
      
      const newPoints = [...points];
      newPoints[index] = [Math.round(x), Math.round(y)];
      setPoints(newPoints);
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setSelectedPoint(null);
    };
    
    setSelectedPoint(index);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const removePoint = (index, e) => {
    e.stopPropagation();
    if (points.length > 3) {
      const newPoints = points.filter((_, i) => i !== index);
      setPoints(newPoints);
    }
  };

  const applyPreset = (preset) => {
    setPoints(preset.points.map(p => [...p]));
    setShowInset(false);
    setBorderRadius(0);
  };

  const resetPoints = () => {
    setPoints([[50, 0], [0, 100], [100, 100]]);
    setShowInset(false);
    setInsetValue(0);
    setBorderRadius(0);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cssCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCSS = () => {
    const blob = new Blob([cssCode], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clip-path.css';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`${styles.generator} ${isFullscreen ? styles.fullscreen : ''}`}>
      <div className={styles.header}>
        <h3><FaCut /> Clip-Path Generator</h3>
        <div className={styles.headerActions}>
          <button 
            className={styles.iconBtn}
            onClick={resetPoints}
            title="Сбросить"
          >
            <FaUndo />
          </button>
          <button 
            className={styles.iconBtn}
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Свернуть' : 'На весь экран'}
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Preview */}
        <div className={styles.previewSection}>
          <div className={styles.previewWrapper}>
            <svg 
              ref={svgRef}
              className={styles.previewSvg}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              onClick={handleSvgClick}
            >
              {/* Grid */}
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.3"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
              
              {/* Clipped shape */}
              <rect 
                width="100" 
                height="100" 
                fill={bgColor}
                style={{ clipPath: clipPath }}
              />
              
              {/* Points */}
              {!showInset && borderRadius === 0 && points.map(([x, y], index) => (
                <g key={index}>
                  <circle
                    cx={x}
                    cy={y}
                    r="3"
                    fill={selectedPoint === index ? '#ef4444' : '#667eea'}
                    stroke="white"
                    strokeWidth="1"
                    className={styles.point}
                    onMouseDown={(e) => handlePointDrag(index, e)}
                    onDoubleClick={(e) => removePoint(index, e)}
                  />
                  <text
                    x={x}
                    y={y - 5}
                    fontSize="3"
                    fill="#64748b"
                    textAnchor="middle"
                  >
                    {index + 1}
                  </text>
                </g>
              ))}
            </svg>
            
            <div className={styles.previewHint}>
              {showInset || borderRadius > 0 
                ? 'Используйте слайдеры для настройки inset/radius' 
                : 'Кликните чтобы добавить точку • Перетаскивайте точки • Двойной клик для удаления'}
            </div>
          </div>
          
          {/* Color picker */}
          <div className={styles.colorRow}>
            <label>Цвет:</label>
            <div className={styles.colorControl}>
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className={styles.colorPicker}
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className={styles.colorInput}
              />
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className={styles.settings}>
          <div className={styles.settingGroup}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={showInset}
                onChange={(e) => {
                  setShowInset(e.target.checked);
                  if (e.target.checked) setBorderRadius(0);
                }}
              />
              <span>Использовать inset()</span>
            </label>
          </div>
          
          {showInset && (
            <div className={styles.settingGroup}>
              <label>Inset: {insetValue}%</label>
              <input
                type="range"
                min="0"
                max="45"
                value={insetValue}
                onChange={(e) => setInsetValue(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
          )}
          
          <div className={styles.settingGroup}>
            <label>Border Radius: {borderRadius}px</label>
            <input
              type="range"
              min="0"
              max="100"
              value={borderRadius}
              onChange={(e) => {
                setBorderRadius(Number(e.target.value));
                if (Number(e.target.value) > 0) setShowInset(true);
              }}
              className={styles.slider}
            />
          </div>
        </div>

        {/* Presets */}
        <div className={styles.presetsSection}>
          <label>Пресеты</label>
          <div className={styles.presets}>
            {PRESETS.map((preset, index) => (
              <button
                key={index}
                className={styles.presetBtn}
                onClick={() => applyPreset(preset)}
                title={preset.name}
              >
                <svg viewBox="0 0 100 100" className={styles.presetPreview}>
                  <polygon
                    points={preset.points.map(([x, y]) => `${x},${y}`).join(' ')}
                    fill="#667eea"
                  />
                </svg>
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Points list */}
        {!showInset && borderRadius === 0 && (
          <div className={styles.pointsList}>
            <label>Точки ({points.length})</label>
            <div className={styles.pointsGrid}>
              {points.map(([x, y], index) => (
                <div key={index} className={styles.pointItem}>
                  <span className={styles.pointIndex}>{index + 1}</span>
                  <input
                    type="number"
                    value={x}
                    onChange={(e) => {
                      const newPoints = [...points];
                      newPoints[index] = [Number(e.target.value), y];
                      setPoints(newPoints);
                    }}
                    min="0"
                    max="100"
                    className={styles.pointInput}
                  />
                  <span>%</span>
                  <input
                    type="number"
                    value={y}
                    onChange={(e) => {
                      const newPoints = [...points];
                      newPoints[index] = [x, Number(e.target.value)];
                      setPoints(newPoints);
                    }}
                    min="0"
                    max="100"
                    className={styles.pointInput}
                  />
                  <span>%</span>
                  {points.length > 3 && (
                    <button 
                      className={styles.removePointBtn}
                      onClick={(e) => removePoint(index, e)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Output */}
        <div className={styles.outputSection}>
          <div className={styles.outputHeader}>
            <label>CSS код</label>
          </div>
          <div className={styles.codeBlock}>
            <pre>{cssCode}</pre>
          </div>
          <div className={styles.outputActions}>
            <button 
              className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
              onClick={copyToClipboard}
            >
              {copied ? <><FaCheck /> Скопировано!</> : <><FaCopy /> Копировать CSS</>}
            </button>
            <button className={styles.downloadBtn} onClick={downloadCSS}>
              <FaDownload /> Скачать
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClipPathGenerator;
