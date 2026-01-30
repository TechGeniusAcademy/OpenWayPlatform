import { useState, useMemo } from 'react';
import { FaWater, FaCopy, FaDownload, FaCheck, FaRandom, FaSyncAlt } from 'react-icons/fa';
import styles from './WavesGenerator.module.css';

const PRESETS = [
  { name: 'Gentle', complexity: 2, height: 100, layers: 1, colors: ['#0099ff'] },
  { name: 'Ocean', complexity: 3, height: 120, layers: 3, colors: ['#006994', '#0099cc', '#00bfff'] },
  { name: 'Sunset', complexity: 4, height: 150, layers: 3, colors: ['#ff6b6b', '#ffa500', '#ffcc00'] },
  { name: 'Forest', complexity: 3, height: 130, layers: 2, colors: ['#2d5a27', '#4a9c44'] },
  { name: 'Purple Dream', complexity: 5, height: 140, layers: 3, colors: ['#4a0080', '#8000ff', '#bf80ff'] },
  { name: 'Minimal', complexity: 1, height: 80, layers: 1, colors: ['#333333'] },
  { name: 'Cotton Candy', complexity: 4, height: 120, layers: 2, colors: ['#ff9a9e', '#fecfef'] },
  { name: 'Deep Sea', complexity: 3, height: 160, layers: 4, colors: ['#000428', '#004e92', '#0077b6', '#00b4d8'] },
  { name: 'Fire', complexity: 5, height: 130, layers: 3, colors: ['#8b0000', '#ff4500', '#ffd700'] },
  { name: 'Mint', complexity: 2, height: 100, layers: 2, colors: ['#00b09b', '#96c93d'] },
  { name: 'Night Sky', complexity: 4, height: 140, layers: 3, colors: ['#0f0c29', '#302b63', '#24243e'] },
  { name: 'Peach', complexity: 3, height: 110, layers: 2, colors: ['#ed6ea0', '#ec8c69'] },
];

const WAVE_TYPES = [
  { id: 'smooth', name: 'Smooth', icon: '〰️' },
  { id: 'sharp', name: 'Sharp', icon: '⚡' },
  { id: 'steps', name: 'Steps', icon: '📶' },
];

function WavesGenerator() {
  const [waveType, setWaveType] = useState('smooth');
  const [complexity, setComplexity] = useState(3);
  const [height, setHeight] = useState(120);
  const [layers, setLayers] = useState(2);
  const [colors, setColors] = useState(['#0099ff', '#00ccff']);
  const [flip, setFlip] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [seed, setSeed] = useState(Math.random());
  const [copied, setCopied] = useState(false);

  // Генерация точек волны на основе seed
  const generateWavePoints = (layerIndex, totalLayers, currentSeed) => {
    const points = [];
    const segments = complexity * 2 + 2;
    const layerOffset = (layerIndex / totalLayers) * 30;
    const layerHeight = height - layerOffset;
    
    // Используем seed для генерации "случайных" но воспроизводимых значений
    const seededRandom = (i) => {
      const x = Math.sin(currentSeed * 9999 + i * 7919 + layerIndex * 104729) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * 100;
      let y;
      
      if (waveType === 'smooth') {
        const wave1 = Math.sin((i / segments) * Math.PI * complexity + currentSeed * 10) * 20;
        const wave2 = Math.sin((i / segments) * Math.PI * complexity * 2 + currentSeed * 5) * 10;
        y = layerHeight + wave1 + wave2 + seededRandom(i) * 15;
      } else if (waveType === 'sharp') {
        const sawTooth = ((i % 2) === 0 ? 1 : -1) * (seededRandom(i) * 25 + 10);
        y = layerHeight + sawTooth;
      } else { // steps
        const stepHeight = Math.floor(seededRandom(i) * 4) * 15;
        y = layerHeight + stepHeight;
      }
      
      points.push({ x, y: Math.max(50, Math.min(180, y)) });
    }
    
    return points;
  };

  // Создание SVG path из точек
  const createPath = (points) => {
    if (points.length < 2) return '';
    
    let path = `M 0 200 L 0 ${points[0].y}`;
    
    if (waveType === 'smooth') {
      // Кубические кривые Безье для плавных волн
      for (let i = 0; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];
        const cpx1 = current.x + (next.x - current.x) / 3;
        const cpx2 = current.x + (next.x - current.x) * 2 / 3;
        path += ` C ${cpx1} ${current.y}, ${cpx2} ${next.y}, ${next.x} ${next.y}`;
      }
    } else if (waveType === 'sharp') {
      // Острые пики
      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x} ${points[i].y}`;
      }
    } else { // steps
      // Ступенчатые волны
      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x} ${points[i - 1].y} L ${points[i].x} ${points[i].y}`;
      }
    }
    
    path += ` L 100 200 Z`;
    return path;
  };

  // Генерация SVG кода
  const svgCode = useMemo(() => {
    const actualLayers = Math.min(layers, colors.length);
    const layerPaths = [];
    
    for (let i = 0; i < actualLayers; i++) {
      const points = generateWavePoints(i, actualLayers, seed);
      const pathD = createPath(points);
      const color = colors[i] || colors[colors.length - 1];
      const opacity = 1 - (i * 0.15);
      
      const animationStyle = animate ? `
        <animateTransform 
          attributeName="transform" 
          type="translate" 
          values="0,0; ${5 + i * 2},0; 0,0" 
          dur="${3 + i * 0.5}s" 
          repeatCount="indefinite"
        />` : '';
      
      layerPaths.push(`  <path d="${pathD}" fill="${color}" opacity="${opacity.toFixed(2)}">${animationStyle}
  </path>`);
    }
    
    const transform = flip ? 'transform="rotate(180 50 100)"' : '';
    
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200" preserveAspectRatio="none" ${transform}>
${layerPaths.join('\n')}
</svg>`;
  }, [waveType, complexity, height, layers, colors, flip, animate, seed]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(svgCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wave.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRandomize = () => {
    setSeed(Math.random());
  };

  const addLayer = () => {
    if (colors.length < 5) {
      const newColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
      setColors([...colors, newColor]);
      setLayers(layers + 1);
    }
  };

  const removeLayer = () => {
    if (colors.length > 1) {
      setColors(colors.slice(0, -1));
      setLayers(Math.max(1, layers - 1));
    }
  };

  const updateColor = (index, color) => {
    const newColors = [...colors];
    newColors[index] = color;
    setColors(newColors);
  };

  const applyPreset = (preset) => {
    setComplexity(preset.complexity);
    setHeight(preset.height);
    setLayers(preset.layers);
    setColors([...preset.colors]);
    setSeed(Math.random());
  };

  return (
    <div className={styles.generator}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <FaWater className={styles.titleIcon} />
          <h2>Waves Generator</h2>
        </div>
        <p className={styles.subtitle}>Создавай красивые SVG волны для своих проектов</p>
      </div>

      <div className={styles.content}>
        {/* Превью */}
        <div className={styles.previewSection}>
          <div className={styles.previewLabel}>Превью</div>
          <div 
            className={styles.preview}
            style={{ transform: flip ? 'scaleY(-1)' : 'none' }}
          >
            <div 
              className={styles.waveSvg}
              dangerouslySetInnerHTML={{ __html: svgCode }}
            />
          </div>
          <div className={styles.previewActions}>
            <button className={styles.actionBtn} onClick={handleRandomize} title="Новая волна">
              <FaRandom /> Рандом
            </button>
            <button 
              className={`${styles.actionBtn} ${flip ? styles.active : ''}`} 
              onClick={() => setFlip(!flip)}
              title="Перевернуть"
            >
              <FaSyncAlt /> Flip
            </button>
          </div>
        </div>

        {/* Настройки */}
        <div className={styles.settings}>
          {/* Тип волны */}
          <div className={styles.settingGroup}>
            <label>Тип волны</label>
            <div className={styles.waveTypes}>
              {WAVE_TYPES.map(type => (
                <button
                  key={type.id}
                  className={`${styles.waveTypeBtn} ${waveType === type.id ? styles.active : ''}`}
                  onClick={() => setWaveType(type.id)}
                >
                  <span>{type.icon}</span>
                  <span>{type.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Сложность */}
          <div className={styles.settingGroup}>
            <label>Сложность: {complexity}</label>
            <input
              type="range"
              min="1"
              max="8"
              value={complexity}
              onChange={(e) => setComplexity(Number(e.target.value))}
              className={styles.slider}
            />
          </div>

          {/* Высота */}
          <div className={styles.settingGroup}>
            <label>Высота: {height}px</label>
            <input
              type="range"
              min="50"
              max="180"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className={styles.slider}
            />
          </div>

          {/* Слои и цвета */}
          <div className={styles.settingGroup}>
            <label>Слои ({colors.length})</label>
            <div className={styles.layersControl}>
              <button onClick={removeLayer} disabled={colors.length <= 1}>−</button>
              <span>{colors.length} / 5</span>
              <button onClick={addLayer} disabled={colors.length >= 5}>+</button>
            </div>
            <div className={styles.colorPickers}>
              {colors.map((color, index) => (
                <div key={index} className={styles.colorPicker}>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => updateColor(index, e.target.value)}
                  />
                  <span>Слой {index + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Анимация */}
          <div className={styles.settingGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={animate}
                onChange={(e) => setAnimate(e.target.checked)}
              />
              <span>Добавить анимацию</span>
            </label>
          </div>
        </div>

        {/* Пресеты */}
        <div className={styles.presetsSection}>
          <div className={styles.presetsLabel}>Пресеты</div>
          <div className={styles.presets}>
            {PRESETS.map((preset, index) => (
              <button
                key={index}
                className={styles.presetBtn}
                onClick={() => applyPreset(preset)}
                style={{
                  background: preset.colors.length > 1 
                    ? `linear-gradient(135deg, ${preset.colors.join(', ')})` 
                    : preset.colors[0]
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Вывод кода */}
        <div className={styles.outputSection}>
          <div className={styles.outputHeader}>
            <span>SVG код</span>
            <div className={styles.outputActions}>
              <button onClick={handleCopy} className={styles.copyBtn}>
                {copied ? <><FaCheck /> Скопировано!</> : <><FaCopy /> Копировать</>}
              </button>
              <button onClick={handleDownload} className={styles.downloadBtn}>
                <FaDownload /> Скачать
              </button>
            </div>
          </div>
          <pre className={styles.codeOutput}>
            <code>{svgCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

export default WavesGenerator;
