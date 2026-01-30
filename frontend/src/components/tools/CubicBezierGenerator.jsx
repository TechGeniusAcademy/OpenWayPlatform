import { useState, useRef, useMemo, useCallback } from 'react';
import styles from './CubicBezierGenerator.module.css';
import { FaChartLine, FaCopy, FaCheck, FaDownload, FaExpand, FaCompress, FaPlay, FaRedo } from 'react-icons/fa';

const PRESETS = [
  { name: 'linear', values: [0, 0, 1, 1] },
  { name: 'ease', values: [0.25, 0.1, 0.25, 1] },
  { name: 'ease-in', values: [0.42, 0, 1, 1] },
  { name: 'ease-out', values: [0, 0, 0.58, 1] },
  { name: 'ease-in-out', values: [0.42, 0, 0.58, 1] },
  { name: 'easeInSine', values: [0.12, 0, 0.39, 0] },
  { name: 'easeOutSine', values: [0.61, 1, 0.88, 1] },
  { name: 'easeInOutSine', values: [0.37, 0, 0.63, 1] },
  { name: 'easeInQuad', values: [0.11, 0, 0.5, 0] },
  { name: 'easeOutQuad', values: [0.5, 1, 0.89, 1] },
  { name: 'easeInOutQuad', values: [0.45, 0, 0.55, 1] },
  { name: 'easeInCubic', values: [0.32, 0, 0.67, 0] },
  { name: 'easeOutCubic', values: [0.33, 1, 0.68, 1] },
  { name: 'easeInOutCubic', values: [0.65, 0, 0.35, 1] },
  { name: 'easeInQuart', values: [0.5, 0, 0.75, 0] },
  { name: 'easeOutQuart', values: [0.25, 1, 0.5, 1] },
  { name: 'easeInOutQuart', values: [0.76, 0, 0.24, 1] },
  { name: 'easeInQuint', values: [0.64, 0, 0.78, 0] },
  { name: 'easeOutQuint', values: [0.22, 1, 0.36, 1] },
  { name: 'easeInOutQuint', values: [0.83, 0, 0.17, 1] },
  { name: 'easeInExpo', values: [0.7, 0, 0.84, 0] },
  { name: 'easeOutExpo', values: [0.16, 1, 0.3, 1] },
  { name: 'easeInOutExpo', values: [0.87, 0, 0.13, 1] },
  { name: 'easeInCirc', values: [0.55, 0, 1, 0.45] },
  { name: 'easeOutCirc', values: [0, 0.55, 0.45, 1] },
  { name: 'easeInOutCirc', values: [0.85, 0, 0.15, 1] },
  { name: 'easeInBack', values: [0.36, 0, 0.66, -0.56] },
  { name: 'easeOutBack', values: [0.34, 1.56, 0.64, 1] },
  { name: 'easeInOutBack', values: [0.68, -0.6, 0.32, 1.6] },
];

function CubicBezierGenerator() {
  const [x1, setX1] = useState(0.25);
  const [y1, setY1] = useState(0.1);
  const [x2, setX2] = useState(0.25);
  const [y2, setY2] = useState(1);
  const [duration, setDuration] = useState(1000);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const svgRef = useRef(null);
  const draggingPoint = useRef(null);

  const cubicBezier = `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
  
  const cssCode = `/* Cubic Bezier Animation */
transition: all ${duration}ms ${cubicBezier};

/* Или для animation */
animation-timing-function: ${cubicBezier};`;

  // SVG размеры и отступы
  const padding = 40;
  const graphSize = 200;

  const toSvgX = useCallback((val) => padding + val * graphSize, []);
  const toSvgY = useCallback((val) => padding + graphSize - val * graphSize, []);
  const fromSvgX = useCallback((svgX) => Math.max(0, Math.min(1, (svgX - padding) / graphSize)), []);
  const fromSvgY = useCallback((svgY) => Math.max(-0.5, Math.min(1.5, (padding + graphSize - svgY) / graphSize)), []);

  const handleMouseDown = (point) => (e) => {
    e.preventDefault();
    draggingPoint.current = point;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e) => {
    if (!draggingPoint.current || !svgRef.current) return;
    
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const scaleX = 280 / rect.width;
    const scaleY = 280 / rect.height;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;
    
    if (draggingPoint.current === 'p1') {
      setX1(Math.round(fromSvgX(svgX) * 100) / 100);
      setY1(Math.round(fromSvgY(svgY) * 100) / 100);
    } else {
      setX2(Math.round(fromSvgX(svgX) * 100) / 100);
      setY2(Math.round(fromSvgY(svgY) * 100) / 100);
    }
  }, [fromSvgX, fromSvgY]);

  const handleMouseUp = useCallback(() => {
    draggingPoint.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const applyPreset = (preset) => {
    setX1(preset.values[0]);
    setY1(preset.values[1]);
    setX2(preset.values[2]);
    setY2(preset.values[3]);
  };

  const playAnimation = () => {
    setIsAnimating(false);
    setAnimationKey(prev => prev + 1);
    setTimeout(() => setIsAnimating(true), 50);
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
    a.download = 'cubic-bezier.css';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Путь кривой Безье
  const curvePath = useMemo(() => {
    return `M ${toSvgX(0)} ${toSvgY(0)} C ${toSvgX(x1)} ${toSvgY(y1)}, ${toSvgX(x2)} ${toSvgY(y2)}, ${toSvgX(1)} ${toSvgY(1)}`;
  }, [x1, y1, x2, y2, toSvgX, toSvgY]);

  return (
    <div className={`${styles.generator} ${isFullscreen ? styles.fullscreen : ''}`}>
      <div className={styles.header}>
        <h3><FaChartLine /> Cubic Bezier Generator</h3>
        <div className={styles.headerActions}>
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
        <div className={styles.mainSection}>
          {/* SVG Graph */}
          <div className={styles.graphSection}>
            <svg 
              ref={svgRef}
              viewBox="0 0 280 280" 
              className={styles.graph}
            >
              {/* Grid */}
              <defs>
                <pattern id="bezierGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
                </pattern>
              </defs>
              
              {/* Background */}
              <rect x={padding} y={padding} width={graphSize} height={graphSize} fill="url(#bezierGrid)" />
              <rect x={padding} y={padding} width={graphSize} height={graphSize} fill="none" stroke="#cbd5e1" strokeWidth="1"/>
              
              {/* Diagonal reference line */}
              <line 
                x1={toSvgX(0)} y1={toSvgY(0)} 
                x2={toSvgX(1)} y2={toSvgY(1)} 
                stroke="#e2e8f0" 
                strokeWidth="1" 
                strokeDasharray="4"
              />
              
              {/* Control lines */}
              <line 
                x1={toSvgX(0)} y1={toSvgY(0)} 
                x2={toSvgX(x1)} y2={toSvgY(y1)} 
                stroke="#94a3b8" 
                strokeWidth="1.5"
              />
              <line 
                x1={toSvgX(1)} y1={toSvgY(1)} 
                x2={toSvgX(x2)} y2={toSvgY(y2)} 
                stroke="#94a3b8" 
                strokeWidth="1.5"
              />
              
              {/* Bezier curve */}
              <path 
                d={curvePath}
                fill="none" 
                stroke="#667eea" 
                strokeWidth="3"
                strokeLinecap="round"
              />
              
              {/* Start and end points */}
              <circle cx={toSvgX(0)} cy={toSvgY(0)} r="5" fill="#334155"/>
              <circle cx={toSvgX(1)} cy={toSvgY(1)} r="5" fill="#334155"/>
              
              {/* Control points */}
              <circle 
                cx={toSvgX(x1)} 
                cy={toSvgY(y1)} 
                r="8" 
                fill="#667eea"
                stroke="white"
                strokeWidth="2"
                className={styles.controlPoint}
                onMouseDown={handleMouseDown('p1')}
              />
              <circle 
                cx={toSvgX(x2)} 
                cy={toSvgY(y2)} 
                r="8" 
                fill="#f5576c"
                stroke="white"
                strokeWidth="2"
                className={styles.controlPoint}
                onMouseDown={handleMouseDown('p2')}
              />
              
              {/* Labels */}
              <text x={padding - 5} y={toSvgY(0) + 4} fontSize="10" fill="#64748b" textAnchor="end">0</text>
              <text x={padding - 5} y={toSvgY(1) + 4} fontSize="10" fill="#64748b" textAnchor="end">1</text>
              <text x={toSvgX(0)} y={padding + graphSize + 15} fontSize="10" fill="#64748b" textAnchor="middle">0</text>
              <text x={toSvgX(1)} y={padding + graphSize + 15} fontSize="10" fill="#64748b" textAnchor="middle">1</text>
            </svg>
            
            <div className={styles.bezierValue}>
              {cubicBezier}
            </div>
          </div>

          {/* Animation Preview */}
          <div className={styles.previewSection}>
            <div className={styles.previewHeader}>
              <span>Предпросмотр</span>
              <button className={styles.playBtn} onClick={playAnimation}>
                <FaPlay /> Запустить
              </button>
            </div>
            
            <div className={styles.animationTrack}>
              <div 
                key={animationKey}
                className={`${styles.animationBall} ${isAnimating ? styles.animate : ''}`}
                style={{ 
                  transitionDuration: `${duration}ms`,
                  transitionTimingFunction: cubicBezier
                }}
              />
            </div>
            
            <div className={styles.comparisonTrack}>
              <span>linear</span>
              <div className={styles.animationTrackSmall}>
                <div 
                  key={animationKey}
                  className={`${styles.animationBallSmall} ${isAnimating ? styles.animate : ''}`}
                  style={{ 
                    transitionDuration: `${duration}ms`,
                    transitionTimingFunction: 'linear'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <div className={styles.controlsRow}>
            <div className={styles.controlGroup}>
              <label>X1: {x1}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={x1}
                onChange={(e) => setX1(parseFloat(e.target.value))}
                className={styles.slider}
              />
            </div>
            <div className={styles.controlGroup}>
              <label>Y1: {y1}</label>
              <input
                type="range"
                min="-0.5"
                max="1.5"
                step="0.01"
                value={y1}
                onChange={(e) => setY1(parseFloat(e.target.value))}
                className={`${styles.slider} ${styles.sliderBlue}`}
              />
            </div>
          </div>
          <div className={styles.controlsRow}>
            <div className={styles.controlGroup}>
              <label>X2: {x2}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={x2}
                onChange={(e) => setX2(parseFloat(e.target.value))}
                className={`${styles.slider} ${styles.sliderPink}`}
              />
            </div>
            <div className={styles.controlGroup}>
              <label>Y2: {y2}</label>
              <input
                type="range"
                min="-0.5"
                max="1.5"
                step="0.01"
                value={y2}
                onChange={(e) => setY2(parseFloat(e.target.value))}
                className={`${styles.slider} ${styles.sliderPink}`}
              />
            </div>
          </div>
          <div className={styles.controlGroup}>
            <label>Длительность: {duration}ms</label>
            <input
              type="range"
              min="100"
              max="3000"
              step="100"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
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
                title={`cubic-bezier(${preset.values.join(', ')})`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

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

export default CubicBezierGenerator;
