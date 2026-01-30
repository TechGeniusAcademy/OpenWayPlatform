import { useState, useMemo } from 'react';
import { FaDesktop, FaTabletAlt, FaMobileAlt, FaTv, FaLaptop, FaCopy, FaCheck, FaExpand, FaRuler } from 'react-icons/fa';
import styles from './ScreenSizeMap.module.css';

const DEVICES = [
  // Phones
  { name: 'iPhone SE', width: 375, height: 667, category: 'phone', brand: 'Apple' },
  { name: 'iPhone 12/13/14', width: 390, height: 844, category: 'phone', brand: 'Apple' },
  { name: 'iPhone 12/13/14 Pro Max', width: 428, height: 926, category: 'phone', brand: 'Apple' },
  { name: 'iPhone 15 Pro', width: 393, height: 852, category: 'phone', brand: 'Apple' },
  { name: 'iPhone 15 Pro Max', width: 430, height: 932, category: 'phone', brand: 'Apple' },
  { name: 'Samsung Galaxy S21', width: 360, height: 800, category: 'phone', brand: 'Samsung' },
  { name: 'Samsung Galaxy S22 Ultra', width: 384, height: 824, category: 'phone', brand: 'Samsung' },
  { name: 'Google Pixel 7', width: 412, height: 915, category: 'phone', brand: 'Google' },
  { name: 'Google Pixel 7 Pro', width: 412, height: 892, category: 'phone', brand: 'Google' },
  { name: 'OnePlus 11', width: 412, height: 919, category: 'phone', brand: 'OnePlus' },
  
  // Tablets
  { name: 'iPad Mini', width: 768, height: 1024, category: 'tablet', brand: 'Apple' },
  { name: 'iPad Air', width: 820, height: 1180, category: 'tablet', brand: 'Apple' },
  { name: 'iPad Pro 11"', width: 834, height: 1194, category: 'tablet', brand: 'Apple' },
  { name: 'iPad Pro 12.9"', width: 1024, height: 1366, category: 'tablet', brand: 'Apple' },
  { name: 'Samsung Galaxy Tab S8', width: 800, height: 1280, category: 'tablet', brand: 'Samsung' },
  { name: 'Surface Pro 8', width: 912, height: 1368, category: 'tablet', brand: 'Microsoft' },
  
  // Laptops
  { name: 'MacBook Air 13"', width: 1280, height: 800, category: 'laptop', brand: 'Apple' },
  { name: 'MacBook Pro 14"', width: 1512, height: 982, category: 'laptop', brand: 'Apple' },
  { name: 'MacBook Pro 16"', width: 1728, height: 1117, category: 'laptop', brand: 'Apple' },
  { name: 'Laptop HD', width: 1366, height: 768, category: 'laptop', brand: 'Generic' },
  { name: 'Laptop Full HD', width: 1920, height: 1080, category: 'laptop', brand: 'Generic' },
  
  // Desktops
  { name: 'Desktop HD', width: 1280, height: 720, category: 'desktop', brand: 'Generic' },
  { name: 'Desktop Full HD', width: 1920, height: 1080, category: 'desktop', brand: 'Generic' },
  { name: 'Desktop QHD', width: 2560, height: 1440, category: 'desktop', brand: 'Generic' },
  { name: 'Desktop 4K', width: 3840, height: 2160, category: 'desktop', brand: 'Generic' },
  { name: 'iMac 24"', width: 2240, height: 1260, category: 'desktop', brand: 'Apple' },
  { name: 'iMac 27" 5K', width: 2560, height: 1440, category: 'desktop', brand: 'Apple' },
  
  // TV
  { name: 'TV 720p', width: 1280, height: 720, category: 'tv', brand: 'Generic' },
  { name: 'TV 1080p', width: 1920, height: 1080, category: 'tv', brand: 'Generic' },
  { name: 'TV 4K', width: 3840, height: 2160, category: 'tv', brand: 'Generic' },
];

const BREAKPOINTS = {
  tailwind: [
    { name: 'sm', min: 640, color: '#06b6d4' },
    { name: 'md', min: 768, color: '#8b5cf6' },
    { name: 'lg', min: 1024, color: '#22c55e' },
    { name: 'xl', min: 1280, color: '#f59e0b' },
    { name: '2xl', min: 1536, color: '#ef4444' },
  ],
  bootstrap: [
    { name: 'sm', min: 576, color: '#06b6d4' },
    { name: 'md', min: 768, color: '#8b5cf6' },
    { name: 'lg', min: 992, color: '#22c55e' },
    { name: 'xl', min: 1200, color: '#f59e0b' },
    { name: 'xxl', min: 1400, color: '#ef4444' },
  ],
  materialui: [
    { name: 'xs', min: 0, color: '#9ca3af' },
    { name: 'sm', min: 600, color: '#06b6d4' },
    { name: 'md', min: 900, color: '#8b5cf6' },
    { name: 'lg', min: 1200, color: '#22c55e' },
    { name: 'xl', min: 1536, color: '#f59e0b' },
  ],
  custom: [
    { name: 'mobile', min: 320, color: '#06b6d4' },
    { name: 'tablet', min: 768, color: '#8b5cf6' },
    { name: 'laptop', min: 1024, color: '#22c55e' },
    { name: 'desktop', min: 1440, color: '#f59e0b' },
  ],
};

const CATEGORY_ICONS = {
  phone: <FaMobileAlt />,
  tablet: <FaTabletAlt />,
  laptop: <FaLaptop />,
  desktop: <FaDesktop />,
  tv: <FaTv />,
};

const CATEGORY_COLORS = {
  phone: '#06b6d4',
  tablet: '#8b5cf6',
  laptop: '#22c55e',
  desktop: '#f59e0b',
  tv: '#ef4444',
};

function ScreenSizeMap() {
  const [selectedFramework, setSelectedFramework] = useState('tailwind');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'table'
  const [sortBy, setSortBy] = useState('width'); // 'width' | 'name' | 'category'
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [copied, setCopied] = useState(null);

  const breakpoints = BREAKPOINTS[selectedFramework];

  const filteredDevices = useMemo(() => {
    let devices = [...DEVICES];
    
    if (selectedCategory !== 'all') {
      devices = devices.filter(d => d.category === selectedCategory);
    }
    
    if (sortBy === 'width') {
      devices.sort((a, b) => a.width - b.width);
    } else if (sortBy === 'name') {
      devices.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'category') {
      const categoryOrder = ['phone', 'tablet', 'laptop', 'desktop', 'tv'];
      devices.sort((a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category));
    }
    
    return devices;
  }, [selectedCategory, sortBy]);

  const getBreakpoint = (width) => {
    let result = { name: 'base', color: '#9ca3af' };
    for (const bp of breakpoints) {
      if (width >= bp.min) {
        result = bp;
      }
    }
    return result;
  };

  const getCustomBreakpoint = () => getBreakpoint(customWidth);

  const maxWidth = Math.max(...DEVICES.map(d => d.width));

  const copyMediaQuery = (bp, index) => {
    const nextBp = breakpoints[index + 1];
    let query;
    
    if (selectedFramework === 'tailwind') {
      query = nextBp 
        ? `@media (min-width: ${bp.min}px) and (max-width: ${nextBp.min - 1}px)`
        : `@media (min-width: ${bp.min}px)`;
    } else {
      query = nextBp 
        ? `@media (min-width: ${bp.min}px) and (max-width: ${nextBp.min - 1}px)`
        : `@media (min-width: ${bp.min}px)`;
    }
    
    navigator.clipboard.writeText(query);
    setCopied(bp.name);
    setTimeout(() => setCopied(null), 2000);
  };

  const generateCSS = () => {
    let css = `/* ${selectedFramework.charAt(0).toUpperCase() + selectedFramework.slice(1)} Breakpoints */\n\n`;
    
    breakpoints.forEach((bp, index) => {
      const nextBp = breakpoints[index + 1];
      if (nextBp) {
        css += `/* ${bp.name}: ${bp.min}px - ${nextBp.min - 1}px */\n`;
        css += `@media (min-width: ${bp.min}px) and (max-width: ${nextBp.min - 1}px) {\n  /* styles */\n}\n\n`;
      } else {
        css += `/* ${bp.name}: ${bp.min}px and up */\n`;
        css += `@media (min-width: ${bp.min}px) {\n  /* styles */\n}\n\n`;
      }
    });
    
    return css;
  };

  const handleCopyAllBreakpoints = () => {
    navigator.clipboard.writeText(generateCSS());
    setCopied('all');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className={styles.generator}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <FaRuler className={styles.titleIcon} />
          <h2>Screen Size Map</h2>
        </div>
        <p className={styles.subtitle}>Интерактивная карта размеров экранов и брейкпоинтов</p>
      </div>

      <div className={styles.content}>
        {/* Панель управления */}
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label>Фреймворк</label>
            <div className={styles.frameworkBtns}>
              {Object.keys(BREAKPOINTS).map(fw => (
                <button
                  key={fw}
                  className={`${styles.frameworkBtn} ${selectedFramework === fw ? styles.active : ''}`}
                  onClick={() => setSelectedFramework(fw)}
                >
                  {fw === 'tailwind' ? 'Tailwind' : 
                   fw === 'bootstrap' ? 'Bootstrap' : 
                   fw === 'materialui' ? 'Material UI' : 'Custom'}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label>Категория</label>
            <div className={styles.categoryBtns}>
              <button
                className={`${styles.categoryBtn} ${selectedCategory === 'all' ? styles.active : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                Все
              </button>
              {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
                <button
                  key={cat}
                  className={`${styles.categoryBtn} ${selectedCategory === cat ? styles.active : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                  style={{ '--cat-color': CATEGORY_COLORS[cat] }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label>Режим просмотра</label>
            <div className={styles.viewBtns}>
              <button
                className={`${styles.viewBtn} ${viewMode === 'visual' ? styles.active : ''}`}
                onClick={() => setViewMode('visual')}
              >
                <FaExpand /> Визуальный
              </button>
              <button
                className={`${styles.viewBtn} ${viewMode === 'table' ? styles.active : ''}`}
                onClick={() => setViewMode('table')}
              >
                <FaRuler /> Таблица
              </button>
            </div>
          </div>
        </div>

        {/* Шкала брейкпоинтов */}
        <div className={styles.breakpointsSection}>
          <div className={styles.sectionHeader}>
            <h3>Брейкпоинты {selectedFramework}</h3>
            <button className={styles.copyAllBtn} onClick={handleCopyAllBreakpoints}>
              {copied === 'all' ? <><FaCheck /> Скопировано!</> : <><FaCopy /> Копировать все</>}
            </button>
          </div>
          
          <div className={styles.breakpointScale}>
            <div className={styles.scaleTrack}>
              {breakpoints.map((bp, index) => {
                const nextBp = breakpoints[index + 1];
                const width = nextBp 
                  ? ((nextBp.min - bp.min) / maxWidth) * 100
                  : ((maxWidth - bp.min) / maxWidth) * 100;
                const left = (bp.min / maxWidth) * 100;
                
                return (
                  <div
                    key={bp.name}
                    className={styles.breakpointSegment}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: `${bp.color}30`,
                      borderColor: bp.color,
                    }}
                    onClick={() => copyMediaQuery(bp, index)}
                    title={`Клик для копирования media query`}
                  >
                    <span className={styles.bpName} style={{ color: bp.color }}>{bp.name}</span>
                    <span className={styles.bpValue}>{bp.min}px</span>
                    {copied === bp.name && <span className={styles.copiedBadge}>✓</span>}
                  </div>
                );
              })}
            </div>
            <div className={styles.scaleLabels}>
              <span>0</span>
              <span>500</span>
              <span>1000</span>
              <span>1500</span>
              <span>2000</span>
              <span>2500</span>
              <span>3000</span>
              <span>3500</span>
              <span>4000px</span>
            </div>
          </div>
        </div>

        {/* Тестер размера */}
        <div className={styles.testerSection}>
          <h3>Тестер размера</h3>
          <div className={styles.testerInputs}>
            <div className={styles.inputGroup}>
              <label>Ширина</label>
              <input
                type="number"
                value={customWidth}
                onChange={(e) => setCustomWidth(Number(e.target.value))}
                min="320"
                max="4000"
              />
              <span>px</span>
            </div>
            <span className={styles.times}>×</span>
            <div className={styles.inputGroup}>
              <label>Высота</label>
              <input
                type="number"
                value={customHeight}
                onChange={(e) => setCustomHeight(Number(e.target.value))}
                min="320"
                max="3000"
              />
              <span>px</span>
            </div>
            <div className={styles.testerResult}>
              <span 
                className={styles.breakpointBadge}
                style={{ backgroundColor: getCustomBreakpoint().color }}
              >
                {getCustomBreakpoint().name}
              </span>
              <span className={styles.aspectRatio}>
                Соотношение: {(customWidth / customHeight).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Визуальная карта устройств */}
        {viewMode === 'visual' ? (
          <div className={styles.visualMap}>
            <div className={styles.sectionHeader}>
              <h3>Карта устройств ({filteredDevices.length})</h3>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className={styles.sortSelect}
              >
                <option value="width">По ширине</option>
                <option value="name">По названию</option>
                <option value="category">По категории</option>
              </select>
            </div>
            
            <div className={styles.devicesGrid}>
              {filteredDevices.map((device, idx) => {
                const bp = getBreakpoint(device.width);
                const scale = Math.min(60 / device.width, 55 / device.height, 0.05);
                
                return (
                  <div 
                    key={idx} 
                    className={styles.deviceCard}
                    style={{ '--device-color': CATEGORY_COLORS[device.category] }}
                  >
                    <div className={styles.devicePreview}>
                      <div 
                        className={styles.deviceFrame}
                        style={{
                          width: Math.max(20, device.width * scale),
                          height: Math.max(20, device.height * scale),
                          borderColor: CATEGORY_COLORS[device.category],
                        }}
                      >
                        <span className={styles.deviceIcon}>{CATEGORY_ICONS[device.category]}</span>
                      </div>
                    </div>
                    <div className={styles.deviceInfo}>
                      <h4>{device.name}</h4>
                      <p className={styles.deviceDimensions}>
                        {device.width} × {device.height}
                      </p>
                      <span 
                        className={styles.deviceBreakpoint}
                        style={{ backgroundColor: bp.color }}
                      >
                        {bp.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={styles.tableView}>
            <table className={styles.devicesTable}>
              <thead>
                <tr>
                  <th>Устройство</th>
                  <th>Бренд</th>
                  <th>Ширина</th>
                  <th>Высота</th>
                  <th>Соотношение</th>
                  <th>Брейкпоинт</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((device, idx) => {
                  const bp = getBreakpoint(device.width);
                  return (
                    <tr key={idx}>
                      <td>
                        <span className={styles.deviceNameCell}>
                          <span style={{ color: CATEGORY_COLORS[device.category] }}>
                            {CATEGORY_ICONS[device.category]}
                          </span>
                          {device.name}
                        </span>
                      </td>
                      <td>{device.brand}</td>
                      <td>{device.width}px</td>
                      <td>{device.height}px</td>
                      <td>{(device.width / device.height).toFixed(2)}</td>
                      <td>
                        <span 
                          className={styles.tableBadge}
                          style={{ backgroundColor: bp.color }}
                        >
                          {bp.name}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScreenSizeMap;
