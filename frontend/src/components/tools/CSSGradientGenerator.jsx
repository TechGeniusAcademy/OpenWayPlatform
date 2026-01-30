import { useState, useCallback, useMemo } from 'react';
import styles from './CSSGradientGenerator.module.css';
import { 
  FaCopy, FaPlus, FaTrash, FaRandom, FaUndo, FaRedo, 
  FaCheck, FaExchangeAlt, FaPalette, FaCode, FaSave,
  FaDownload, FaExpand, FaCompress
} from 'react-icons/fa';

const PRESETS = [
  { name: 'Sunset', colors: [{ color: '#ff6b6b', position: 0 }, { color: '#feca57', position: 100 }] },
  { name: 'Ocean', colors: [{ color: '#667eea', position: 0 }, { color: '#764ba2', position: 100 }] },
  { name: 'Forest', colors: [{ color: '#11998e', position: 0 }, { color: '#38ef7d', position: 100 }] },
  { name: 'Fire', colors: [{ color: '#f12711', position: 0 }, { color: '#f5af19', position: 100 }] },
  { name: 'Night', colors: [{ color: '#232526', position: 0 }, { color: '#414345', position: 100 }] },
  { name: 'Cotton Candy', colors: [{ color: '#D299C2', position: 0 }, { color: '#FEF9D7', position: 100 }] },
  { name: 'Rainbow', colors: [
    { color: '#ff0000', position: 0 },
    { color: '#ff7f00', position: 17 },
    { color: '#ffff00', position: 33 },
    { color: '#00ff00', position: 50 },
    { color: '#0000ff', position: 67 },
    { color: '#4b0082', position: 83 },
    { color: '#9400d3', position: 100 }
  ]},
  { name: 'Aurora', colors: [
    { color: '#00C9FF', position: 0 },
    { color: '#92FE9D', position: 50 },
    { color: '#00C9FF', position: 100 }
  ]},
  { name: 'Peach', colors: [{ color: '#ED4264', position: 0 }, { color: '#FFEDBC', position: 100 }] },
  { name: 'Deep Space', colors: [{ color: '#000000', position: 0 }, { color: '#434343', position: 100 }] },
  { name: 'Aqua Marine', colors: [{ color: '#1A2980', position: 0 }, { color: '#26D0CE', position: 100 }] },
  { name: 'Passion', colors: [{ color: '#e53935', position: 0 }, { color: '#e35d5b', position: 100 }] },
];

const DIRECTIONS = [
  { value: 'to right', label: '→ Вправо', angle: 90 },
  { value: 'to left', label: '← Влево', angle: 270 },
  { value: 'to bottom', label: '↓ Вниз', angle: 180 },
  { value: 'to top', label: '↑ Вверх', angle: 0 },
  { value: 'to bottom right', label: '↘ Вниз-вправо', angle: 135 },
  { value: 'to bottom left', label: '↙ Вниз-влево', angle: 225 },
  { value: 'to top right', label: '↗ Вверх-вправо', angle: 45 },
  { value: 'to top left', label: '↖ Вверх-влево', angle: 315 },
];

const RADIAL_SHAPES = [
  { value: 'circle', label: 'Круг' },
  { value: 'ellipse', label: 'Эллипс' },
];

const RADIAL_POSITIONS = [
  { value: 'center', label: 'Центр' },
  { value: 'top', label: 'Сверху' },
  { value: 'bottom', label: 'Снизу' },
  { value: 'left', label: 'Слева' },
  { value: 'right', label: 'Справа' },
  { value: 'top left', label: 'Сверху-слева' },
  { value: 'top right', label: 'Сверху-справа' },
  { value: 'bottom left', label: 'Снизу-слева' },
  { value: 'bottom right', label: 'Снизу-справа' },
];

function CSSGradientGenerator() {
  const [gradientType, setGradientType] = useState('linear');
  const [direction, setDirection] = useState('to right');
  const [customAngle, setCustomAngle] = useState(90);
  const [useCustomAngle, setUseCustomAngle] = useState(false);
  const [radialShape, setRadialShape] = useState('circle');
  const [radialPosition, setRadialPosition] = useState('center');
  const [colorStops, setColorStops] = useState([
    { id: 1, color: '#667eea', position: 0 },
    { id: 2, color: '#764ba2', position: 100 }
  ]);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [outputFormat, setOutputFormat] = useState('css');

  // Сохранение в историю
  const saveToHistory = useCallback((newStops) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newStops]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Генерация CSS
  const gradientCSS = useMemo(() => {
    const sortedStops = [...colorStops].sort((a, b) => a.position - b.position);
    const stopsString = sortedStops.map(stop => `${stop.color} ${stop.position}%`).join(', ');
    
    if (gradientType === 'linear') {
      const angleValue = useCustomAngle ? `${customAngle}deg` : direction;
      return `linear-gradient(${angleValue}, ${stopsString})`;
    } else if (gradientType === 'radial') {
      return `radial-gradient(${radialShape} at ${radialPosition}, ${stopsString})`;
    } else {
      return `conic-gradient(from ${customAngle}deg at ${radialPosition}, ${stopsString})`;
    }
  }, [gradientType, direction, customAngle, useCustomAngle, radialShape, radialPosition, colorStops]);

  // Полный CSS код
  const fullCSS = useMemo(() => {
    if (outputFormat === 'css') {
      return `background: ${gradientCSS};`;
    } else if (outputFormat === 'tailwind') {
      return `bg-gradient-to-r from-[${colorStops[0]?.color}] to-[${colorStops[colorStops.length - 1]?.color}]`;
    } else {
      return `background: ${gradientCSS};\nbackground: -webkit-${gradientCSS};\nbackground: -moz-${gradientCSS};`;
    }
  }, [gradientCSS, outputFormat, colorStops]);

  // Добавить цвет
  const addColorStop = () => {
    const newId = Math.max(...colorStops.map(s => s.id)) + 1;
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    const middlePosition = Math.floor((colorStops[colorStops.length - 1]?.position || 100) / 2);
    const newStops = [...colorStops, { id: newId, color: randomColor, position: middlePosition }];
    setColorStops(newStops);
    saveToHistory(newStops);
  };

  // Удалить цвет
  const removeColorStop = (id) => {
    if (colorStops.length <= 2) return;
    const newStops = colorStops.filter(stop => stop.id !== id);
    setColorStops(newStops);
    saveToHistory(newStops);
  };

  // Изменить цвет
  const updateColorStop = (id, field, value) => {
    const newStops = colorStops.map(stop => 
      stop.id === id ? { ...stop, [field]: value } : stop
    );
    setColorStops(newStops);
  };

  // Применить пресет
  const applyPreset = (preset) => {
    const newStops = preset.colors.map((c, i) => ({ ...c, id: i + 1 }));
    setColorStops(newStops);
    saveToHistory(newStops);
  };

  // Случайный градиент
  const randomGradient = () => {
    const numColors = Math.floor(Math.random() * 3) + 2;
    const newStops = [];
    for (let i = 0; i < numColors; i++) {
      newStops.push({
        id: i + 1,
        color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
        position: Math.round((i / (numColors - 1)) * 100)
      });
    }
    setColorStops(newStops);
    saveToHistory(newStops);
    setCustomAngle(Math.floor(Math.random() * 360));
  };

  // Поменять цвета местами
  const reverseColors = () => {
    const newStops = colorStops.map((stop, i, arr) => ({
      ...stop,
      position: 100 - stop.position
    }));
    setColorStops(newStops);
    saveToHistory(newStops);
  };

  // Копировать в буфер
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullCSS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Отмена
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setColorStops(history[historyIndex - 1]);
    }
  };

  // Повтор
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setColorStops(history[historyIndex + 1]);
    }
  };

  // Скачать как CSS файл
  const downloadCSS = () => {
    const content = `.gradient {\n  ${fullCSS.replace(/\n/g, '\n  ')}\n}`;
    const blob = new Blob([content], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gradient.css';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`${styles.generator} ${isFullscreen ? styles.fullscreen : ''}`}>
      {/* Заголовок */}
      <div className={styles.header}>
        <h3><FaPalette /> CSS Gradient Generator</h3>
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
          <div 
            className={styles.preview} 
            style={{ background: gradientCSS }}
          />
          <div className={styles.previewActions}>
            <button onClick={randomGradient} className={styles.actionBtn}>
              <FaRandom /> Случайный
            </button>
            <button onClick={reverseColors} className={styles.actionBtn}>
              <FaExchangeAlt /> Развернуть
            </button>
            <button onClick={undo} disabled={historyIndex <= 0} className={styles.actionBtn}>
              <FaUndo /> Отмена
            </button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className={styles.actionBtn}>
              <FaRedo /> Повтор
            </button>
          </div>
        </div>

        {/* Настройки */}
        <div className={styles.settings}>
          {/* Тип градиента */}
          <div className={styles.settingGroup}>
            <label>Тип градиента</label>
            <div className={styles.typeSelector}>
              <button 
                className={`${styles.typeBtn} ${gradientType === 'linear' ? styles.active : ''}`}
                onClick={() => setGradientType('linear')}
              >
                Linear
              </button>
              <button 
                className={`${styles.typeBtn} ${gradientType === 'radial' ? styles.active : ''}`}
                onClick={() => setGradientType('radial')}
              >
                Radial
              </button>
              <button 
                className={`${styles.typeBtn} ${gradientType === 'conic' ? styles.active : ''}`}
                onClick={() => setGradientType('conic')}
              >
                Conic
              </button>
            </div>
          </div>

          {/* Настройки направления для linear */}
          {gradientType === 'linear' && (
            <div className={styles.settingGroup}>
              <label>Направление</label>
              <div className={styles.directionControls}>
                <label className={styles.checkbox}>
                  <input 
                    type="checkbox" 
                    checked={useCustomAngle}
                    onChange={(e) => setUseCustomAngle(e.target.checked)}
                  />
                  Свой угол
                </label>
                {useCustomAngle ? (
                  <div className={styles.angleControl}>
                    <input 
                      type="range" 
                      min="0" 
                      max="360" 
                      value={customAngle}
                      onChange={(e) => setCustomAngle(Number(e.target.value))}
                      className={styles.angleSlider}
                    />
                    <input 
                      type="number" 
                      min="0" 
                      max="360" 
                      value={customAngle}
                      onChange={(e) => setCustomAngle(Number(e.target.value))}
                      className={styles.angleInput}
                    />
                    <span>°</span>
                  </div>
                ) : (
                  <select 
                    value={direction} 
                    onChange={(e) => setDirection(e.target.value)}
                    className={styles.select}
                  >
                    {DIRECTIONS.map(dir => (
                      <option key={dir.value} value={dir.value}>{dir.label}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Настройки для radial */}
          {gradientType === 'radial' && (
            <>
              <div className={styles.settingGroup}>
                <label>Форма</label>
                <select 
                  value={radialShape} 
                  onChange={(e) => setRadialShape(e.target.value)}
                  className={styles.select}
                >
                  {RADIAL_SHAPES.map(shape => (
                    <option key={shape.value} value={shape.value}>{shape.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.settingGroup}>
                <label>Позиция</label>
                <select 
                  value={radialPosition} 
                  onChange={(e) => setRadialPosition(e.target.value)}
                  className={styles.select}
                >
                  {RADIAL_POSITIONS.map(pos => (
                    <option key={pos.value} value={pos.value}>{pos.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Настройки для conic */}
          {gradientType === 'conic' && (
            <>
              <div className={styles.settingGroup}>
                <label>Начальный угол</label>
                <div className={styles.angleControl}>
                  <input 
                    type="range" 
                    min="0" 
                    max="360" 
                    value={customAngle}
                    onChange={(e) => setCustomAngle(Number(e.target.value))}
                    className={styles.angleSlider}
                  />
                  <input 
                    type="number" 
                    min="0" 
                    max="360" 
                    value={customAngle}
                    onChange={(e) => setCustomAngle(Number(e.target.value))}
                    className={styles.angleInput}
                  />
                  <span>°</span>
                </div>
              </div>
              <div className={styles.settingGroup}>
                <label>Позиция</label>
                <select 
                  value={radialPosition} 
                  onChange={(e) => setRadialPosition(e.target.value)}
                  className={styles.select}
                >
                  {RADIAL_POSITIONS.map(pos => (
                    <option key={pos.value} value={pos.value}>{pos.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Цвета */}
          <div className={styles.settingGroup}>
            <div className={styles.colorsHeader}>
              <label>Цвета ({colorStops.length})</label>
              <button onClick={addColorStop} className={styles.addColorBtn}>
                <FaPlus /> Добавить
              </button>
            </div>
            <div className={styles.colorStops}>
              {colorStops.map((stop, index) => (
                <div key={stop.id} className={styles.colorStop}>
                  <input 
                    type="color" 
                    value={stop.color}
                    onChange={(e) => updateColorStop(stop.id, 'color', e.target.value)}
                    className={styles.colorPicker}
                  />
                  <input 
                    type="text" 
                    value={stop.color}
                    onChange={(e) => updateColorStop(stop.id, 'color', e.target.value)}
                    className={styles.colorInput}
                    placeholder="#000000"
                  />
                  <div className={styles.positionControl}>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={stop.position}
                      onChange={(e) => updateColorStop(stop.id, 'position', Number(e.target.value))}
                      className={styles.positionSlider}
                    />
                    <span className={styles.positionValue}>{stop.position}%</span>
                  </div>
                  <button 
                    onClick={() => removeColorStop(stop.id)}
                    disabled={colorStops.length <= 2}
                    className={styles.removeBtn}
                    title="Удалить цвет"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
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
                style={{
                  background: `linear-gradient(to right, ${preset.colors.map(c => `${c.color} ${c.position}%`).join(', ')})`
                }}
                title={preset.name}
              >
                <span className={styles.presetName}>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Вывод CSS */}
        <div className={styles.outputSection}>
          <div className={styles.outputHeader}>
            <label><FaCode /> CSS код</label>
            <div className={styles.outputFormat}>
              <button 
                className={`${styles.formatBtn} ${outputFormat === 'css' ? styles.active : ''}`}
                onClick={() => setOutputFormat('css')}
              >
                CSS
              </button>
              <button 
                className={`${styles.formatBtn} ${outputFormat === 'prefixed' ? styles.active : ''}`}
                onClick={() => setOutputFormat('prefixed')}
              >
                + Prefixes
              </button>
            </div>
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

export default CSSGradientGenerator;
