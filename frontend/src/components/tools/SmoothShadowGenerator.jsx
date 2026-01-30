import { useState, useMemo } from 'react';
import styles from './SmoothShadowGenerator.module.css';
import { 
  FaCopy, FaCheck, FaMoon, FaExpand, FaCompress, 
  FaDownload, FaRandom, FaCode, FaUndo
} from 'react-icons/fa';

const PRESETS = [
  { name: 'Soft', layers: 4, offsetX: 0, offsetY: 4, blur: 16, spread: 0, color: '#000000', opacity: 0.1, curve: 'ease' },
  { name: 'Medium', layers: 5, offsetX: 0, offsetY: 8, blur: 24, spread: -2, color: '#000000', opacity: 0.15, curve: 'ease' },
  { name: 'Strong', layers: 6, offsetX: 0, offsetY: 16, blur: 48, spread: -4, color: '#000000', opacity: 0.2, curve: 'ease' },
  { name: 'Dreamy', layers: 8, offsetX: 0, offsetY: 32, blur: 64, spread: -8, color: '#6366f1', opacity: 0.25, curve: 'ease-out' },
  { name: 'Sharp', layers: 3, offsetX: 0, offsetY: 4, blur: 6, spread: 0, color: '#000000', opacity: 0.25, curve: 'linear' },
  { name: 'Long', layers: 6, offsetX: 0, offsetY: 48, blur: 80, spread: -12, color: '#000000', opacity: 0.12, curve: 'ease' },
  { name: 'Colored', layers: 5, offsetX: 0, offsetY: 12, blur: 32, spread: -4, color: '#8b5cf6', opacity: 0.3, curve: 'ease' },
  { name: 'Elevated', layers: 6, offsetX: 0, offsetY: 24, blur: 48, spread: -8, color: '#000000', opacity: 0.18, curve: 'ease-in-out' },
  { name: 'Subtle', layers: 3, offsetX: 0, offsetY: 2, blur: 8, spread: 0, color: '#000000', opacity: 0.06, curve: 'ease' },
  { name: 'Glow', layers: 4, offsetX: 0, offsetY: 0, blur: 24, spread: 4, color: '#3b82f6', opacity: 0.4, curve: 'ease' },
];

const CURVES = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease', label: 'Ease' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In-Out' },
];

// Функции для кривых интерполяции
const curveFunction = (t, curve) => {
  switch (curve) {
    case 'linear':
      return t;
    case 'ease':
      return t * t * (3 - 2 * t);
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return t * (2 - t);
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default:
      return t;
  }
};

// Конвертация HEX в RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

function SmoothShadowGenerator() {
  const [layers, setLayers] = useState(5);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(16);
  const [blur, setBlur] = useState(32);
  const [spread, setSpread] = useState(-4);
  const [color, setColor] = useState('#000000');
  const [opacity, setOpacity] = useState(0.15);
  const [curve, setCurve] = useState('ease');
  const [inset, setInset] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewShape, setPreviewShape] = useState('rounded');

  // Генерация слоёв тени
  const shadowLayers = useMemo(() => {
    const shadows = [];
    const rgb = hexToRgb(color);
    
    for (let i = 0; i < layers; i++) {
      const progress = layers === 1 ? 1 : i / (layers - 1);
      const curvedProgress = curveFunction(progress, curve);
      
      const layerOffsetX = Math.round(offsetX * curvedProgress);
      const layerOffsetY = Math.round(offsetY * curvedProgress);
      const layerBlur = Math.round(blur * curvedProgress);
      const layerSpread = Math.round(spread * curvedProgress);
      const layerOpacity = (opacity * (1 - curvedProgress * 0.5)).toFixed(3);
      
      const insetStr = inset ? 'inset ' : '';
      shadows.push(
        `${insetStr}${layerOffsetX}px ${layerOffsetY}px ${layerBlur}px ${layerSpread}px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${layerOpacity})`
      );
    }
    
    return shadows;
  }, [layers, offsetX, offsetY, blur, spread, color, opacity, curve, inset]);

  const shadowCSS = useMemo(() => {
    return shadowLayers.join(',\n    ');
  }, [shadowLayers]);

  const fullCSS = `box-shadow: ${shadowCSS};`;

  // Применить пресет
  const applyPreset = (preset) => {
    setLayers(preset.layers);
    setOffsetX(preset.offsetX);
    setOffsetY(preset.offsetY);
    setBlur(preset.blur);
    setSpread(preset.spread);
    setColor(preset.color);
    setOpacity(preset.opacity);
    setCurve(preset.curve);
    setInset(false);
  };

  // Сброс к дефолту
  const resetToDefault = () => {
    setLayers(5);
    setOffsetX(0);
    setOffsetY(16);
    setBlur(32);
    setSpread(-4);
    setColor('#000000');
    setOpacity(0.15);
    setCurve('ease');
    setInset(false);
  };

  // Случайная тень
  const randomShadow = () => {
    setLayers(Math.floor(Math.random() * 6) + 3);
    setOffsetX(Math.floor(Math.random() * 20) - 10);
    setOffsetY(Math.floor(Math.random() * 40) + 4);
    setBlur(Math.floor(Math.random() * 60) + 10);
    setSpread(Math.floor(Math.random() * 16) - 8);
    setColor('#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'));
    setOpacity(Math.random() * 0.3 + 0.1);
    setCurve(CURVES[Math.floor(Math.random() * CURVES.length)].value);
  };

  // Копировать
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullCSS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Скачать
  const downloadCSS = () => {
    const content = `.shadow-element {\n  ${fullCSS}\n}`;
    const blob = new Blob([content], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smooth-shadow.css';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`${styles.generator} ${isFullscreen ? styles.fullscreen : ''}`}>
      {/* Заголовок */}
      <div className={styles.header}>
        <h3><FaMoon /> Smooth Shadow Generator</h3>
        <div className={styles.headerActions}>
          <button 
            className={styles.iconBtn} 
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Свернуть' : 'Развернуть'}
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Предпросмотр */}
        <div className={styles.previewSection}>
          <div className={styles.previewContainer}>
            <div 
              className={`${styles.previewBox} ${styles[previewShape]}`}
              style={{ boxShadow: shadowLayers.join(', ') }}
            />
          </div>
          <div className={styles.shapeSelector}>
            <button 
              className={`${styles.shapeBtn} ${previewShape === 'rounded' ? styles.active : ''}`}
              onClick={() => setPreviewShape('rounded')}
            >
              Rounded
            </button>
            <button 
              className={`${styles.shapeBtn} ${previewShape === 'circle' ? styles.active : ''}`}
              onClick={() => setPreviewShape('circle')}
            >
              Circle
            </button>
            <button 
              className={`${styles.shapeBtn} ${previewShape === 'square' ? styles.active : ''}`}
              onClick={() => setPreviewShape('square')}
            >
              Square
            </button>
          </div>
          <div className={styles.previewActions}>
            <button onClick={randomShadow} className={styles.actionBtn}>
              <FaRandom /> Случайная
            </button>
            <button onClick={resetToDefault} className={styles.actionBtn}>
              <FaUndo /> Сбросить
            </button>
          </div>
        </div>

        {/* Настройки */}
        <div className={styles.settings}>
          <div className={styles.settingsRow}>
            {/* Количество слоёв */}
            <div className={styles.settingGroup}>
              <label>Слои: {layers}</label>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={layers}
                onChange={(e) => setLayers(Number(e.target.value))}
                className={styles.slider}
              />
            </div>

            {/* Кривая */}
            <div className={styles.settingGroup}>
              <label>Кривая</label>
              <select 
                value={curve} 
                onChange={(e) => setCurve(e.target.value)}
                className={styles.select}
              >
                {CURVES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.settingsRow}>
            {/* Смещение X */}
            <div className={styles.settingGroup}>
              <label>Смещение X: {offsetX}px</label>
              <input 
                type="range" 
                min="-50" 
                max="50" 
                value={offsetX}
                onChange={(e) => setOffsetX(Number(e.target.value))}
                className={styles.slider}
              />
            </div>

            {/* Смещение Y */}
            <div className={styles.settingGroup}>
              <label>Смещение Y: {offsetY}px</label>
              <input 
                type="range" 
                min="-50" 
                max="100" 
                value={offsetY}
                onChange={(e) => setOffsetY(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
          </div>

          <div className={styles.settingsRow}>
            {/* Размытие */}
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

            {/* Растяжение */}
            <div className={styles.settingGroup}>
              <label>Растяжение: {spread}px</label>
              <input 
                type="range" 
                min="-20" 
                max="20" 
                value={spread}
                onChange={(e) => setSpread(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
          </div>

          <div className={styles.settingsRow}>
            {/* Цвет */}
            <div className={styles.settingGroup}>
              <label>Цвет тени</label>
              <div className={styles.colorControl}>
                <input 
                  type="color" 
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className={styles.colorPicker}
                />
                <input 
                  type="text" 
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className={styles.colorInput}
                />
              </div>
            </div>

            {/* Прозрачность */}
            <div className={styles.settingGroup}>
              <label>Прозрачность: {Math.round(opacity * 100)}%</label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={opacity * 100}
                onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                className={styles.slider}
              />
            </div>
          </div>

          {/* Inset */}
          <div className={styles.checkboxGroup}>
            <label className={styles.checkbox}>
              <input 
                type="checkbox" 
                checked={inset}
                onChange={(e) => setInset(e.target.checked)}
              />
              <span>Внутренняя тень (inset)</span>
            </label>
          </div>
        </div>

        {/* Пресеты */}
        <div className={styles.presetsSection}>
          <label>Готовые пресеты</label>
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
                    boxShadow: `0 ${preset.offsetY / 4}px ${preset.blur / 4}px ${preset.spread / 4}px rgba(${hexToRgb(preset.color).r}, ${hexToRgb(preset.color).g}, ${hexToRgb(preset.color).b}, ${preset.opacity})`
                  }}
                />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Вывод CSS */}
        <div className={styles.outputSection}>
          <div className={styles.outputHeader}>
            <label><FaCode /> CSS код ({layers} слоёв)</label>
          </div>
          <div className={styles.codeBlock}>
            <pre>{fullCSS}</pre>
          </div>
          <div className={styles.outputActions}>
            <button onClick={copyToClipboard} className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}>
              {copied ? <><FaCheck /> Скопировано!</> : <><FaCopy /> Копировать</>}
            </button>
            <button onClick={downloadCSS} className={styles.downloadBtn}>
              <FaDownload /> Скачать .css
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SmoothShadowGenerator;
