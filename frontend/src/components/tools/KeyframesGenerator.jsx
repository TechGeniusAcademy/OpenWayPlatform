import { useState, useMemo } from 'react';
import styles from './KeyframesGenerator.module.css';
import { FaFilm, FaCopy, FaCheck, FaDownload, FaExpand, FaCompress, FaPlay, FaPlus, FaTrash, FaPause } from 'react-icons/fa';

const PRESETS = [
  {
    name: 'Fade In',
    keyframes: [
      { percent: 0, opacity: 0, transform: '' },
      { percent: 100, opacity: 1, transform: '' }
    ]
  },
  {
    name: 'Fade Out',
    keyframes: [
      { percent: 0, opacity: 1, transform: '' },
      { percent: 100, opacity: 0, transform: '' }
    ]
  },
  {
    name: 'Slide In Left',
    keyframes: [
      { percent: 0, opacity: 0, transform: 'translateX(-100px)' },
      { percent: 100, opacity: 1, transform: 'translateX(0)' }
    ]
  },
  {
    name: 'Slide In Right',
    keyframes: [
      { percent: 0, opacity: 0, transform: 'translateX(100px)' },
      { percent: 100, opacity: 1, transform: 'translateX(0)' }
    ]
  },
  {
    name: 'Slide In Up',
    keyframes: [
      { percent: 0, opacity: 0, transform: 'translateY(50px)' },
      { percent: 100, opacity: 1, transform: 'translateY(0)' }
    ]
  },
  {
    name: 'Slide In Down',
    keyframes: [
      { percent: 0, opacity: 0, transform: 'translateY(-50px)' },
      { percent: 100, opacity: 1, transform: 'translateY(0)' }
    ]
  },
  {
    name: 'Zoom In',
    keyframes: [
      { percent: 0, opacity: 0, transform: 'scale(0.5)' },
      { percent: 100, opacity: 1, transform: 'scale(1)' }
    ]
  },
  {
    name: 'Zoom Out',
    keyframes: [
      { percent: 0, opacity: 1, transform: 'scale(1)' },
      { percent: 100, opacity: 0, transform: 'scale(0.5)' }
    ]
  },
  {
    name: 'Bounce',
    keyframes: [
      { percent: 0, transform: 'translateY(0)' },
      { percent: 20, transform: 'translateY(0)' },
      { percent: 40, transform: 'translateY(-30px)' },
      { percent: 50, transform: 'translateY(0)' },
      { percent: 60, transform: 'translateY(-15px)' },
      { percent: 80, transform: 'translateY(0)' },
      { percent: 100, transform: 'translateY(0)' }
    ]
  },
  {
    name: 'Shake',
    keyframes: [
      { percent: 0, transform: 'translateX(0)' },
      { percent: 10, transform: 'translateX(-10px)' },
      { percent: 20, transform: 'translateX(10px)' },
      { percent: 30, transform: 'translateX(-10px)' },
      { percent: 40, transform: 'translateX(10px)' },
      { percent: 50, transform: 'translateX(-10px)' },
      { percent: 60, transform: 'translateX(10px)' },
      { percent: 70, transform: 'translateX(-10px)' },
      { percent: 80, transform: 'translateX(10px)' },
      { percent: 90, transform: 'translateX(-10px)' },
      { percent: 100, transform: 'translateX(0)' }
    ]
  },
  {
    name: 'Pulse',
    keyframes: [
      { percent: 0, transform: 'scale(1)' },
      { percent: 50, transform: 'scale(1.1)' },
      { percent: 100, transform: 'scale(1)' }
    ]
  },
  {
    name: 'Rotate',
    keyframes: [
      { percent: 0, transform: 'rotate(0deg)' },
      { percent: 100, transform: 'rotate(360deg)' }
    ]
  },
  {
    name: 'Flip',
    keyframes: [
      { percent: 0, transform: 'perspective(400px) rotateY(0)' },
      { percent: 100, transform: 'perspective(400px) rotateY(360deg)' }
    ]
  },
  {
    name: 'Swing',
    keyframes: [
      { percent: 0, transform: 'rotate(0deg)' },
      { percent: 20, transform: 'rotate(15deg)' },
      { percent: 40, transform: 'rotate(-10deg)' },
      { percent: 60, transform: 'rotate(5deg)' },
      { percent: 80, transform: 'rotate(-5deg)' },
      { percent: 100, transform: 'rotate(0deg)' }
    ]
  },
  {
    name: 'Heartbeat',
    keyframes: [
      { percent: 0, transform: 'scale(1)' },
      { percent: 14, transform: 'scale(1.3)' },
      { percent: 28, transform: 'scale(1)' },
      { percent: 42, transform: 'scale(1.3)' },
      { percent: 70, transform: 'scale(1)' },
      { percent: 100, transform: 'scale(1)' }
    ]
  },
];

const TIMING_FUNCTIONS = [
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
];

function KeyframesGenerator() {
  const [animationName, setAnimationName] = useState('myAnimation');
  const [keyframes, setKeyframes] = useState([
    { percent: 0, opacity: 1, transform: '' },
    { percent: 100, opacity: 1, transform: '' }
  ]);
  const [duration, setDuration] = useState(1);
  const [timingFunction, setTimingFunction] = useState('ease');
  const [iterationCount, setIterationCount] = useState('infinite');
  const [direction, setDirection] = useState('normal');
  const [fillMode, setFillMode] = useState('forwards');
  const [isPlaying, setIsPlaying] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const cssCode = useMemo(() => {
    let keyframesCSS = `@keyframes ${animationName} {\n`;
    
    keyframes.forEach(kf => {
      keyframesCSS += `  ${kf.percent}% {\n`;
      if (kf.opacity !== undefined && kf.opacity !== 1) {
        keyframesCSS += `    opacity: ${kf.opacity};\n`;
      }
      if (kf.transform) {
        keyframesCSS += `    transform: ${kf.transform};\n`;
      }
      keyframesCSS += `  }\n`;
    });
    
    keyframesCSS += `}\n\n`;
    keyframesCSS += `/* Использование */\n`;
    keyframesCSS += `.element {\n`;
    keyframesCSS += `  animation: ${animationName} ${duration}s ${timingFunction} ${iterationCount} ${direction} ${fillMode};\n`;
    keyframesCSS += `}`;
    
    return keyframesCSS;
  }, [animationName, keyframes, duration, timingFunction, iterationCount, direction, fillMode]);

  const animationStyle = useMemo(() => {
    // Создаём inline keyframes
    const keyframesString = keyframes.map(kf => {
      let props = [];
      if (kf.opacity !== undefined) props.push(`opacity: ${kf.opacity}`);
      if (kf.transform) props.push(`transform: ${kf.transform}`);
      return `${kf.percent}% { ${props.join('; ')} }`;
    }).join(' ');

    return {
      animation: isPlaying 
        ? `${animationName} ${duration}s ${timingFunction} ${iterationCount} ${direction} ${fillMode}`
        : 'none'
    };
  }, [animationName, keyframes, duration, timingFunction, iterationCount, direction, fillMode, isPlaying]);

  const addKeyframe = () => {
    const sortedKeyframes = [...keyframes].sort((a, b) => a.percent - b.percent);
    let newPercent = 50;
    
    // Найти место для нового keyframe
    for (let i = 0; i < sortedKeyframes.length - 1; i++) {
      const gap = sortedKeyframes[i + 1].percent - sortedKeyframes[i].percent;
      if (gap > 10) {
        newPercent = sortedKeyframes[i].percent + Math.floor(gap / 2);
        break;
      }
    }
    
    setKeyframes([...keyframes, { percent: newPercent, opacity: 1, transform: '' }]);
  };

  const removeKeyframe = (index) => {
    if (keyframes.length > 2) {
      setKeyframes(keyframes.filter((_, i) => i !== index));
    }
  };

  const updateKeyframe = (index, field, value) => {
    const newKeyframes = [...keyframes];
    newKeyframes[index] = { ...newKeyframes[index], [field]: value };
    setKeyframes(newKeyframes);
  };

  const applyPreset = (preset) => {
    setKeyframes(preset.keyframes.map(kf => ({ ...kf })));
    setAnimationName(preset.name.toLowerCase().replace(/\s+/g, '-'));
    restartAnimation();
  };

  const restartAnimation = () => {
    setIsPlaying(false);
    setAnimationKey(prev => prev + 1);
    setTimeout(() => setIsPlaying(true), 50);
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
    a.download = `${animationName}.css`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Создаём style для keyframes
  const keyframesStyleTag = useMemo(() => {
    let css = `@keyframes ${animationName} {\n`;
    keyframes.forEach(kf => {
      css += `  ${kf.percent}% {\n`;
      if (kf.opacity !== undefined) css += `    opacity: ${kf.opacity};\n`;
      if (kf.transform) css += `    transform: ${kf.transform};\n`;
      css += `  }\n`;
    });
    css += `}`;
    return css;
  }, [animationName, keyframes]);

  return (
    <div className={`${styles.generator} ${isFullscreen ? styles.fullscreen : ''}`}>
      <style>{keyframesStyleTag}</style>
      
      <div className={styles.header}>
        <h3><FaFilm /> Keyframes Generator</h3>
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
          <div className={styles.previewHeader}>
            <span>Предпросмотр</span>
            <div className={styles.previewControls}>
              <button 
                className={styles.controlBtn}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <FaPause /> : <FaPlay />}
              </button>
              <button 
                className={styles.controlBtn}
                onClick={restartAnimation}
              >
                Перезапустить
              </button>
            </div>
          </div>
          <div className={styles.previewContainer}>
            <div 
              key={animationKey}
              className={styles.previewBox}
              style={animationStyle}
            >
              Привет!
            </div>
          </div>
        </div>

        {/* Animation Settings */}
        <div className={styles.settings}>
          <div className={styles.settingGroup}>
            <label>Название анимации</label>
            <input
              type="text"
              value={animationName}
              onChange={(e) => setAnimationName(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
              className={styles.textInput}
              placeholder="myAnimation"
            />
          </div>

          <div className={styles.settingsRow}>
            <div className={styles.settingGroup}>
              <label>Длительность: {duration}s</label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className={styles.slider}
              />
            </div>
            <div className={styles.settingGroup}>
              <label>Timing Function</label>
              <select
                value={timingFunction}
                onChange={(e) => setTimingFunction(e.target.value)}
                className={styles.select}
              >
                {TIMING_FUNCTIONS.map(tf => (
                  <option key={tf} value={tf}>{tf}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.settingsRow}>
            <div className={styles.settingGroup}>
              <label>Iteration Count</label>
              <select
                value={iterationCount}
                onChange={(e) => setIterationCount(e.target.value)}
                className={styles.select}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="5">5</option>
                <option value="infinite">infinite</option>
              </select>
            </div>
            <div className={styles.settingGroup}>
              <label>Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className={styles.select}
              >
                <option value="normal">normal</option>
                <option value="reverse">reverse</option>
                <option value="alternate">alternate</option>
                <option value="alternate-reverse">alternate-reverse</option>
              </select>
            </div>
          </div>

          <div className={styles.settingGroup}>
            <label>Fill Mode</label>
            <select
              value={fillMode}
              onChange={(e) => setFillMode(e.target.value)}
              className={styles.select}
            >
              <option value="none">none</option>
              <option value="forwards">forwards</option>
              <option value="backwards">backwards</option>
              <option value="both">both</option>
            </select>
          </div>
        </div>

        {/* Keyframes Editor */}
        <div className={styles.keyframesSection}>
          <div className={styles.keyframesHeader}>
            <label>Keyframes</label>
            <button className={styles.addBtn} onClick={addKeyframe}>
              <FaPlus /> Добавить
            </button>
          </div>
          
          <div className={styles.keyframesList}>
            {keyframes.sort((a, b) => a.percent - b.percent).map((kf, index) => (
              <div key={index} className={styles.keyframeItem}>
                <div className={styles.keyframePercent}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={kf.percent}
                    onChange={(e) => updateKeyframe(index, 'percent', Number(e.target.value))}
                    className={styles.percentInput}
                  />
                  <span>%</span>
                </div>
                <div className={styles.keyframeProps}>
                  <div className={styles.propGroup}>
                    <label>opacity</label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={kf.opacity ?? 1}
                      onChange={(e) => updateKeyframe(index, 'opacity', Number(e.target.value))}
                      className={styles.propInput}
                    />
                  </div>
                  <div className={styles.propGroup}>
                    <label>transform</label>
                    <input
                      type="text"
                      value={kf.transform || ''}
                      onChange={(e) => updateKeyframe(index, 'transform', e.target.value)}
                      className={styles.transformInput}
                      placeholder="translateX(0) scale(1)"
                    />
                  </div>
                </div>
                {keyframes.length > 2 && (
                  <button 
                    className={styles.removeBtn}
                    onClick={() => removeKeyframe(index)}
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
            ))}
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

export default KeyframesGenerator;
