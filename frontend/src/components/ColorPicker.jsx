import { useState, useRef, useEffect } from 'react';
import styles from './ColorPicker.module.css';

const ColorPicker = ({ color, onChange, onClose }) => {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const [alpha, setAlpha] = useState(100);
  const [hexInput, setHexInput] = useState('');
  const [isDraggingSaturation, setIsDraggingSaturation] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);
  const [isDraggingAlpha, setIsDraggingAlpha] = useState(false);
  
  const saturationRef = useRef(null);
  const hueRef = useRef(null);
  const alphaRef = useRef(null);
  const pickerRef = useRef(null);

  // Конвертация HEX в HSL
  const hexToHSL = (hex) => {
    // Удаляем # если есть
    hex = hex.replace('#', '');
    
    // Конвертируем в RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  // Конвертация HSL в HEX
  const hslToHex = (h, s, l) => {
    s /= 100;
    l /= 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    
    if (h >= 0 && h < 60) {
      r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
      r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
      r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
      r = x; g = 0; b = c;
    } else if (h >= 300 && h < 360) {
      r = c; g = 0; b = x;
    }
    
    const toHex = (value) => {
      const hex = Math.round((value + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Инициализация из текущего цвета
  useEffect(() => {
    if (color) {
      const hsl = hexToHSL(color);
      setHue(hsl.h);
      setSaturation(hsl.s);
      setLightness(hsl.l);
      setHexInput(color.replace('#', '').toUpperCase());
    }
  }, []);

  // Обновление цвета при изменении HSL
  useEffect(() => {
    const newColor = hslToHex(hue, saturation, lightness);
    onChange(newColor);
    setHexInput(newColor.replace('#', '').toUpperCase());
  }, [hue, saturation, lightness]);

  // Обработка клика на палитре насыщенности/яркости
  const handleSaturationMouseDown = (e) => {
    setIsDraggingSaturation(true);
    updateSaturationFromMouse(e);
  };

  const updateSaturationFromMouse = (e) => {
    if (!saturationRef.current) return;
    
    const rect = saturationRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    
    const newSaturation = (x / rect.width) * 100;
    const newLightness = 100 - (y / rect.height) * 100;
    
    setSaturation(newSaturation);
    setLightness(newLightness);
  };

  // Обработка ползунка Hue
  const handleHueMouseDown = (e) => {
    setIsDraggingHue(true);
    updateHueFromMouse(e);
  };

  const updateHueFromMouse = (e) => {
    if (!hueRef.current) return;
    
    const rect = hueRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const newHue = (x / rect.width) * 360;
    
    setHue(newHue);
  };

  // Обработка ползунка Alpha
  const handleAlphaMouseDown = (e) => {
    setIsDraggingAlpha(true);
    updateAlphaFromMouse(e);
  };

  const updateAlphaFromMouse = (e) => {
    if (!alphaRef.current) return;
    
    const rect = alphaRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const newAlpha = (x / rect.width) * 100;
    
    setAlpha(newAlpha);
  };

  // Глобальные обработчики мыши
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingSaturation) {
        updateSaturationFromMouse(e);
      }
      if (isDraggingHue) {
        updateHueFromMouse(e);
      }
      if (isDraggingAlpha) {
        updateAlphaFromMouse(e);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingSaturation(false);
      setIsDraggingHue(false);
      setIsDraggingAlpha(false);
    };

    if (isDraggingSaturation || isDraggingHue || isDraggingAlpha) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSaturation, isDraggingHue, isDraggingAlpha]);

  // Обработка ввода HEX
  const handleHexInputChange = (e) => {
    let value = e.target.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    if (value.length > 6) value = value.substring(0, 6);
    setHexInput(value);
    
    if (value.length === 6) {
      const hsl = hexToHSL(value);
      setHue(hsl.h);
      setSaturation(hsl.s);
      setLightness(hsl.l);
    }
  };

  // Обработка клика вне палитры
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose && onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Предустановленные цвета (Figma-style)
  const presetColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
    '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6',
    '#1ABC9C', '#E67E22', '#34495E', '#95A5A6', '#7F8C8D',
    '#C0392B', '#2980B9', '#27AE60', '#D68910', '#8E44AD',
    '#16A085', '#D35400', '#2C3E50', '#7F8C8D', '#BDC3C7'
  ];

  const currentColor = hslToHex(hue, saturation, lightness);

  return (
    <div className={styles['color-picker-overlay']}>
      <div className={styles['color-picker']} ref={pickerRef}>
        {/* Заголовок */}
        <div className={styles['color-picker-header']}>
          <span>Выбор цвета</span>
          <button onClick={onClose} className={styles['color-picker-close']}>×</button>
        </div>

        {/* Основная палитра насыщенности и яркости */}
        <div 
          className={styles['saturation-lightness-picker']}
          ref={saturationRef}
          onMouseDown={handleSaturationMouseDown}
          style={{ 
            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))` 
          }}
        >
          <div 
            className={styles['saturation-cursor']}
            style={{
              left: `${saturation}%`,
              top: `${100 - lightness}%`
            }}
          />
        </div>

        {/* Ползунок Hue */}
        <div className={styles['hue-slider-container']}>
          <div 
            className={styles['hue-slider']}
            ref={hueRef}
            onMouseDown={handleHueMouseDown}
          >
            <div 
              className={styles['hue-cursor']}
              style={{ left: `${(hue / 360) * 100}%` }}
            />
          </div>
        </div>

        {/* Ползунок Alpha */}
        <div className={styles['alpha-slider-container']}>
          <div 
            className={styles['alpha-slider']}
            ref={alphaRef}
            onMouseDown={handleAlphaMouseDown}
            style={{
              background: `linear-gradient(to right, transparent, ${currentColor})`
            }}
          >
            <div 
              className={styles['alpha-cursor']}
              style={{ left: `${alpha}%` }}
            />
          </div>
          <span className={styles['alpha-value']}>{Math.round(alpha)}%</span>
        </div>

        {/* Превью и HEX ввод */}
        <div className={styles['color-input-section']}>
          <div className={styles['color-preview']} style={{ background: currentColor }} />
          <div className={styles['hex-input-container']}>
            <span className={styles['hex-label']}>#</span>
            <input 
              type="text"
              className={styles['hex-input']}
              value={hexInput}
              onChange={handleHexInputChange}
              maxLength={6}
              placeholder="FFFFFF"
            />
          </div>
        </div>

        {/* Предустановленные цвета */}
        <div className={styles['preset-colors']}>
          <div className={styles['preset-colors-label']}>Быстрые цвета</div>
          <div className={styles['preset-colors-grid']}>
            {presetColors.map((presetColor, index) => (
              <button
                key={index}
                className={styles['preset-color']}
                style={{ background: presetColor }}
                onClick={() => {
                  const hsl = hexToHSL(presetColor);
                  setHue(hsl.h);
                  setSaturation(hsl.s);
                  setLightness(hsl.l);
                }}
                title={presetColor}
              />
            ))}
          </div>
        </div>

        {/* RGB значения */}
        <div className={styles['rgb-values']}>
          <div className={styles['rgb-value']}>
            <span>H</span>
            <input 
              type="number" 
              value={Math.round(hue)} 
              onChange={(e) => setHue(Math.max(0, Math.min(360, parseInt(e.target.value) || 0)))}
              min="0"
              max="360"
            />
          </div>
          <div className={styles['rgb-value']}>
            <span>S</span>
            <input 
              type="number" 
              value={Math.round(saturation)} 
              onChange={(e) => setSaturation(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
              min="0"
              max="100"
            />
          </div>
          <div className={styles['rgb-value']}>
            <span>L</span>
            <input 
              type="number" 
              value={Math.round(lightness)} 
              onChange={(e) => setLightness(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
              min="0"
              max="100"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
