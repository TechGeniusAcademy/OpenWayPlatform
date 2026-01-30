import { useState, useMemo } from 'react';
import styles from './GlassmorphismGenerator.module.css';
import { FaWindowMaximize, FaCopy, FaCheck, FaDownload, FaExpand, FaCompress } from 'react-icons/fa';

const PRESETS = [
  { name: 'Subtle', blur: 10, opacity: 0.25, saturation: 100, border: 1, borderOpacity: 0.18 },
  { name: 'Light', blur: 16, opacity: 0.35, saturation: 120, border: 1, borderOpacity: 0.25 },
  { name: 'Medium', blur: 20, opacity: 0.45, saturation: 150, border: 1.5, borderOpacity: 0.3 },
  { name: 'Strong', blur: 25, opacity: 0.55, saturation: 180, border: 2, borderOpacity: 0.35 },
  { name: 'Frosted', blur: 40, opacity: 0.3, saturation: 100, border: 1, borderOpacity: 0.2 },
  { name: 'Crystal', blur: 12, opacity: 0.15, saturation: 200, border: 1, borderOpacity: 0.4 },
  { name: 'Matte', blur: 30, opacity: 0.6, saturation: 80, border: 0, borderOpacity: 0 },
  { name: 'Glossy', blur: 8, opacity: 0.2, saturation: 180, border: 1.5, borderOpacity: 0.5 },
  { name: 'Dark', blur: 20, opacity: 0.7, saturation: 100, border: 1, borderOpacity: 0.1 },
  { name: 'Neon', blur: 15, opacity: 0.1, saturation: 250, border: 2, borderOpacity: 0.6 },
];

const BACKGROUNDS = [
  { name: 'Gradient 1', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Gradient 2', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { name: 'Gradient 3', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { name: 'Gradient 4', value: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { name: 'Gradient 5', value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { name: 'Image', value: 'url(https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800)' },
];

function GlassmorphismGenerator() {
  const [blur, setBlur] = useState(16);
  const [opacity, setOpacity] = useState(0.35);
  const [saturation, setSaturation] = useState(120);
  const [borderWidth, setBorderWidth] = useState(1);
  const [borderOpacity, setBorderOpacity] = useState(0.25);
  const [borderRadius, setBorderRadius] = useState(16);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [selectedBg, setSelectedBg] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const glassStyle = useMemo(() => {
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);
    
    return {
      background: `rgba(${r}, ${g}, ${b}, ${opacity})`,
      backdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
      WebkitBackdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
      borderRadius: `${borderRadius}px`,
      border: borderWidth > 0 ? `${borderWidth}px solid rgba(${r}, ${g}, ${b}, ${borderOpacity})` : 'none',
    };
  }, [blur, opacity, saturation, borderWidth, borderOpacity, borderRadius, bgColor]);

  const cssCode = useMemo(() => {
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);
    
    let code = `/* Glassmorphism Effect */
background: rgba(${r}, ${g}, ${b}, ${opacity});
backdrop-filter: blur(${blur}px) saturate(${saturation}%);
-webkit-backdrop-filter: blur(${blur}px) saturate(${saturation}%);
border-radius: ${borderRadius}px;`;
    
    if (borderWidth > 0) {
      code += `\nborder: ${borderWidth}px solid rgba(${r}, ${g}, ${b}, ${borderOpacity});`;
    }
    
    return code;
  }, [blur, opacity, saturation, borderWidth, borderOpacity, borderRadius, bgColor]);

  const applyPreset = (preset) => {
    setBlur(preset.blur);
    setOpacity(preset.opacity);
    setSaturation(preset.saturation);
    setBorderWidth(preset.border);
    setBorderOpacity(preset.borderOpacity);
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
    a.download = 'glassmorphism.css';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`${styles.generator} ${isFullscreen ? styles.fullscreen : ''}`}>
      <div className={styles.header}>
        <h3><FaWindowMaximize /> Glassmorphism Generator</h3>
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
            style={{ background: BACKGROUNDS[selectedBg].value, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className={styles.glassCard} style={glassStyle}>
              <div className={styles.glassContent}>
                <h4>Glass Card</h4>
                <p>Это пример glassmorphism эффекта</p>
              </div>
            </div>
          </div>
          
          {/* Background selector */}
          <div className={styles.bgSelector}>
            <label>Фон:</label>
            <div className={styles.bgOptions}>
              {BACKGROUNDS.map((bg, index) => (
                <button
                  key={index}
                  className={`${styles.bgOption} ${selectedBg === index ? styles.active : ''}`}
                  style={{ background: bg.value, backgroundSize: 'cover' }}
                  onClick={() => setSelectedBg(index)}
                  title={bg.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className={styles.settings}>
          <div className={styles.settingsRow}>
            <div className={styles.settingGroup}>
              <label>Размытие: {blur}px</label>
              <input
                type="range"
                min="0"
                max="50"
                value={blur}
                onChange={(e) => setBlur(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
            <div className={styles.settingGroup}>
              <label>Прозрачность: {Math.round(opacity * 100)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
          </div>

          <div className={styles.settingsRow}>
            <div className={styles.settingGroup}>
              <label>Насыщенность: {saturation}%</label>
              <input
                type="range"
                min="0"
                max="300"
                value={saturation}
                onChange={(e) => setSaturation(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
            <div className={styles.settingGroup}>
              <label>Скругление: {borderRadius}px</label>
              <input
                type="range"
                min="0"
                max="50"
                value={borderRadius}
                onChange={(e) => setBorderRadius(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
          </div>

          <div className={styles.settingsRow}>
            <div className={styles.settingGroup}>
              <label>Толщина рамки: {borderWidth}px</label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={borderWidth}
                onChange={(e) => setBorderWidth(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
            <div className={styles.settingGroup}>
              <label>Прозрачность рамки: {Math.round(borderOpacity * 100)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={borderOpacity}
                onChange={(e) => setBorderOpacity(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
          </div>

          <div className={styles.colorRow}>
            <label>Цвет стекла:</label>
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
                    background: `rgba(255, 255, 255, ${preset.opacity})`,
                    backdropFilter: `blur(${preset.blur * 0.3}px)`,
                    border: preset.border > 0 ? `1px solid rgba(255, 255, 255, ${preset.borderOpacity})` : 'none'
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

export default GlassmorphismGenerator;
