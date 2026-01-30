import { useState, useMemo } from 'react';
import styles from './NeumorphismGenerator.module.css';
import { FaCircle, FaCopy, FaCheck, FaDownload, FaExpand, FaCompress } from 'react-icons/fa';

const PRESETS = [
  { name: 'Soft', color: '#e0e5ec', distance: 20, intensity: 15, blur: 60, radius: 50 },
  { name: 'Medium', color: '#e0e5ec', distance: 10, intensity: 20, blur: 30, radius: 30 },
  { name: 'Strong', color: '#e0e5ec', distance: 8, intensity: 30, blur: 20, radius: 20 },
  { name: 'Flat', color: '#e0e5ec', distance: 5, intensity: 10, blur: 10, radius: 10 },
  { name: 'Dark', color: '#2d3436', distance: 15, intensity: 25, blur: 40, radius: 40 },
  { name: 'Blue', color: '#a3d9ff', distance: 12, intensity: 18, blur: 35, radius: 35 },
  { name: 'Pink', color: '#ffc0cb', distance: 15, intensity: 20, blur: 40, radius: 45 },
  { name: 'Green', color: '#b8e6c1', distance: 12, intensity: 18, blur: 35, radius: 30 },
  { name: 'Purple', color: '#d4c4fb', distance: 15, intensity: 20, blur: 40, radius: 40 },
  { name: 'Warm', color: '#ffe4c4', distance: 12, intensity: 18, blur: 35, radius: 35 },
];

const SHAPES = [
  { id: 'flat', name: 'Flat', icon: '▬' },
  { id: 'concave', name: 'Concave', icon: '◠' },
  { id: 'convex', name: 'Convex', icon: '◡' },
  { id: 'pressed', name: 'Pressed', icon: '▼' },
];

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 224, g: 229, b: 236 };
}

function adjustBrightness(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const adjust = (value) => Math.min(255, Math.max(0, Math.round(value + (255 * percent / 100))));
  return `rgb(${adjust(r)}, ${adjust(g)}, ${adjust(b)})`;
}

function NeumorphismGenerator() {
  const [bgColor, setBgColor] = useState('#e0e5ec');
  const [distance, setDistance] = useState(20);
  const [intensity, setIntensity] = useState(15);
  const [blur, setBlur] = useState(60);
  const [radius, setRadius] = useState(50);
  const [size, setSize] = useState(150);
  const [shape, setShape] = useState('flat');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { lightShadow, darkShadow, boxShadow, gradient, cssCode } = useMemo(() => {
    const light = adjustBrightness(bgColor, intensity);
    const dark = adjustBrightness(bgColor, -intensity);
    
    let shadow = '';
    let grad = '';
    
    switch (shape) {
      case 'flat':
        shadow = `${distance}px ${distance}px ${blur}px ${dark}, -${distance}px -${distance}px ${blur}px ${light}`;
        grad = 'none';
        break;
      case 'concave':
        shadow = `${distance}px ${distance}px ${blur}px ${dark}, -${distance}px -${distance}px ${blur}px ${light}`;
        grad = `linear-gradient(145deg, ${dark}, ${light})`;
        break;
      case 'convex':
        shadow = `${distance}px ${distance}px ${blur}px ${dark}, -${distance}px -${distance}px ${blur}px ${light}`;
        grad = `linear-gradient(145deg, ${light}, ${dark})`;
        break;
      case 'pressed':
        shadow = `inset ${distance}px ${distance}px ${blur}px ${dark}, inset -${distance}px -${distance}px ${blur}px ${light}`;
        grad = 'none';
        break;
      default:
        shadow = `${distance}px ${distance}px ${blur}px ${dark}, -${distance}px -${distance}px ${blur}px ${light}`;
        grad = 'none';
    }
    
    const code = `/* Neumorphism Style */
border-radius: ${radius}px;
background: ${grad !== 'none' ? grad : bgColor};
box-shadow: ${shadow};`;
    
    return {
      lightShadow: light,
      darkShadow: dark,
      boxShadow: shadow,
      gradient: grad,
      cssCode: code
    };
  }, [bgColor, distance, intensity, blur, radius, shape]);

  const applyPreset = (preset) => {
    setBgColor(preset.color);
    setDistance(preset.distance);
    setIntensity(preset.intensity);
    setBlur(preset.blur);
    setRadius(preset.radius);
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
    a.download = 'neumorphism.css';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`${styles.generator} ${isFullscreen ? styles.fullscreen : ''}`}>
      <div className={styles.header}>
        <h3><FaCircle /> Neumorphism Generator</h3>
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
        {/* Preview */}
        <div className={styles.previewSection}>
          <div 
            className={styles.previewContainer}
            style={{ background: bgColor }}
          >
            <div 
              className={styles.previewBox}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: `${radius}px`,
                background: gradient !== 'none' ? gradient : bgColor,
                boxShadow: boxShadow
              }}
            />
          </div>
          
          <div className={styles.shapeSelector}>
            {SHAPES.map(s => (
              <button
                key={s.id}
                className={`${styles.shapeBtn} ${shape === s.id ? styles.active : ''}`}
                onClick={() => setShape(s.id)}
              >
                <span className={styles.shapeIcon}>{s.icon}</span>
                <span>{s.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className={styles.settings}>
          <div className={styles.settingsRow}>
            <div className={styles.settingGroup}>
              <label>Цвет фона</label>
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
            <div className={styles.settingGroup}>
              <label>Размер: {size}px</label>
              <input
                type="range"
                min="50"
                max="300"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
          </div>

          <div className={styles.settingsRow}>
            <div className={styles.settingGroup}>
              <label>Расстояние: {distance}px</label>
              <input
                type="range"
                min="1"
                max="50"
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
            <div className={styles.settingGroup}>
              <label>Интенсивность: {intensity}%</label>
              <input
                type="range"
                min="1"
                max="50"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
          </div>

          <div className={styles.settingsRow}>
            <div className={styles.settingGroup}>
              <label>Размытие: {blur}px</label>
              <input
                type="range"
                min="0"
                max="100"
                value={blur}
                onChange={(e) => setBlur(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
            <div className={styles.settingGroup}>
              <label>Радиус: {radius}px</label>
              <input
                type="range"
                min="0"
                max="150"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
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
                <div 
                  className={styles.presetPreview}
                  style={{
                    background: preset.color,
                    boxShadow: `${preset.distance * 0.3}px ${preset.distance * 0.3}px ${preset.blur * 0.3}px ${adjustBrightness(preset.color, -preset.intensity)}, -${preset.distance * 0.3}px -${preset.distance * 0.3}px ${preset.blur * 0.3}px ${adjustBrightness(preset.color, preset.intensity)}`,
                    borderRadius: `${preset.radius * 0.3}px`
                  }}
                />
                <span>{preset.name}</span>
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

export default NeumorphismGenerator;
