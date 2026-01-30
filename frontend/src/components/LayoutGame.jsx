import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styles from './LayoutGame.module.css';
import { 
  FaArrowLeft, FaPlay, FaCheck, FaTimes, FaStar, FaLock, FaCode, 
  FaExpand, FaCompress, FaTrophy, FaRuler, FaMousePointer, FaEye, FaEyeSlash,
  FaQuestionCircle, FaBook, FaKeyboard, FaTags, FaCrosshairs, FaSitemap,
  FaClone, FaPen, FaPalette, FaBoxes, FaImage, FaAdjust, FaFont, FaRocket
} from 'react-icons/fa';
import { BsLightningChargeFill } from 'react-icons/bs';
import api from '../utils/api';
import { toast } from 'react-toastify';
import emmet from 'emmet';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';

// Rainbow цвета для отступов
const INDENT_COLORS = [
  'rgba(255, 121, 198, 0.15)',
  'rgba(139, 233, 253, 0.15)',
  'rgba(80, 250, 123, 0.15)',
  'rgba(255, 184, 108, 0.15)',
  'rgba(189, 147, 249, 0.15)',
  'rgba(255, 255, 128, 0.15)',
];

// Компонент подсветки синтаксиса
const CodeHighlight = ({ code, language }) => {
  const highlighted = useMemo(() => {
    if (!code) return '';
    try {
      const lang = language === 'html' ? 'markup' : 'css';
      return Prism.highlight(code, Prism.languages[lang], lang);
    } catch (e) {
      return code;
    }
  }, [code, language]);

  // Разбиваем на строки для rainbow отступов
  const lines = code.split('\n');
  const highlightedLines = highlighted.split('\n');

  return (
    <div className={styles.highlightOverlay}>
      {lines.map((line, i) => {
        const spaces = line.match(/^(\s*)/)?.[1] || '';
        const indentLevel = Math.floor(spaces.length / 2);
        const bgColor = indentLevel > 0 ? INDENT_COLORS[indentLevel % INDENT_COLORS.length] : 'transparent';
        
        return (
          <div 
            key={i} 
            className={styles.highlightLine}
            style={{ background: bgColor }}
          >
            <span dangerouslySetInnerHTML={{ __html: highlightedLines[i] || '&nbsp;' }} />
          </div>
        );
      })}
    </div>
  );
};

function LayoutGame({ onBack }) {
  const [levels, setLevels] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  // Редактор
  const [htmlCode, setHtmlCode] = useState('');
  const [cssCode, setCssCode] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Emmet подсказки
  const [emmetSuggestion, setEmmetSuggestion] = useState(null);
  const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0 });
  const [activeEditor, setActiveEditor] = useState(null); // 'html' или 'css'
  const [showEmmetHelp, setShowEmmetHelp] = useState(false);
  
  // Инспектор
  const [inspectorEnabled, setInspectorEnabled] = useState(true);
  const [hoveredElement, setHoveredElement] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [showTargetOverlay, setShowTargetOverlay] = useState(true);
  
  // Refs
  const targetFrameRef = useRef(null);
  const previewFrameRef = useRef(null);
  const htmlEditorRef = useRef(null);
  const cssEditorRef = useRef(null);
  const htmlHighlightRef = useRef(null);
  const cssHighlightRef = useRef(null);

  // Синхронизация скролла редактора и подсветки
  const syncScroll = useCallback((textareaRef, highlightRef) => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Получить аббревиатуру перед курсором
  const getAbbreviation = useCallback((textarea) => {
    const cursorPos = textarea.selectionStart;
    const value = textarea.value;
    
    let abbrevStart = cursorPos;
    while (abbrevStart > 0 && !/[\s\n]/.test(value[abbrevStart - 1])) {
      abbrevStart--;
    }
    
    return {
      abbreviation: value.slice(abbrevStart, cursorPos),
      start: abbrevStart,
      end: cursorPos
    };
  }, []);

  // Попытка развернуть Emmet и показать подсказку
  const tryExpandEmmet = useCallback((abbreviation, isHtml) => {
    if (!abbreviation || abbreviation.length < 2) return null;
    
    try {
      const expanded = emmet(abbreviation, {
        type: isHtml ? 'markup' : 'stylesheet',
        options: {
          'output.indent': '  ',
          'output.newline': '\n'
        }
      });
      
      if (expanded && expanded !== abbreviation && expanded.length > abbreviation.length) {
        return expanded;
      }
    } catch (err) {
      // Не удалось развернуть
    }
    return null;
  }, []);

  // Обработчик ввода для показа подсказок
  const handleEditorInput = useCallback((e, isHtml) => {
    const textarea = e.target;
    const { abbreviation } = getAbbreviation(textarea);
    
    const expanded = tryExpandEmmet(abbreviation, isHtml);
    
    if (expanded) {
      // Вычисляем позицию подсказки относительно курсора
      const rect = textarea.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(textarea);
      const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      
      // Находим позицию курсора в тексте
      const textBeforeCursor = textarea.value.substr(0, textarea.selectionStart);
      const lines = textBeforeCursor.split('\n');
      const currentLineIndex = lines.length - 1;
      const currentLineText = lines[currentLineIndex];
      
      // Позиция с учётом скролла
      const scrollTop = textarea.scrollTop;
      const top = rect.top + paddingTop + (currentLineIndex * lineHeight) - scrollTop + lineHeight + 5;
      const left = rect.left + paddingLeft + Math.min(currentLineText.length * 7.8, 150);
      
      setSuggestionPos({
        top: Math.min(top, window.innerHeight - 200), // не выходить за экран
        left: Math.min(left, window.innerWidth - 320)
      });
      
      setEmmetSuggestion({
        abbreviation,
        expanded,
        isHtml
      });
      setActiveEditor(isHtml ? 'html' : 'css');
    } else {
      setEmmetSuggestion(null);
    }
  }, [getAbbreviation, tryExpandEmmet]);

  // Применить подсказку
  const applySuggestion = useCallback(() => {
    if (!emmetSuggestion) return;
    
    const textarea = activeEditor === 'html' ? htmlEditorRef.current : cssEditorRef.current;
    if (!textarea) return;
    
    const { abbreviation, expanded, isHtml } = emmetSuggestion;
    const { start, end } = getAbbreviation(textarea);
    const value = textarea.value;
    
    const newValue = value.slice(0, start) + expanded + value.slice(end);
    
    if (isHtml) {
      setHtmlCode(newValue);
    } else {
      setCssCode(newValue);
    }
    
    // Установить курсор
    setTimeout(() => {
      const newPos = start + expanded.length;
      textarea.focus();
      textarea.selectionStart = newPos;
      textarea.selectionEnd = newPos;
    }, 0);
    
    setEmmetSuggestion(null);
  }, [emmetSuggestion, activeEditor, getAbbreviation]);

  // Обработчик клавиш
  const handleEditorKeyDown = useCallback((e, isHtml) => {
    // Если есть подсказка и нажат Tab или Enter - применить
    if (emmetSuggestion && (e.key === 'Tab' || e.key === 'Enter')) {
      e.preventDefault();
      applySuggestion();
      return;
    }
    
    // Escape - закрыть подсказку
    if (e.key === 'Escape') {
      setEmmetSuggestion(null);
      return;
    }
    
    // Tab без подсказки - вставить отступ
    if (e.key === 'Tab' && !emmetSuggestion) {
      e.preventDefault();
      const textarea = e.target;
      const cursorPos = textarea.selectionStart;
      const value = textarea.value;
      const newValue = value.slice(0, cursorPos) + '  ' + value.slice(cursorPos);
      
      if (isHtml) {
        setHtmlCode(newValue);
      } else {
        setCssCode(newValue);
      }
      
      setTimeout(() => {
        textarea.selectionStart = cursorPos + 2;
        textarea.selectionEnd = cursorPos + 2;
      }, 0);
    }
  }, [emmetSuggestion, applySuggestion]);

  useEffect(() => {
    loadLevels();
    loadStats();
  }, []);

  const loadLevels = async () => {
    try {
      const response = await api.get('/layout-game/levels');
      setLevels(response.data);
    } catch (error) {
      console.error('Ошибка загрузки уровней:', error);
      toast.error('Не удалось загрузить уровни');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/layout-game/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  const selectLevel = async (level) => {
    try {
      const response = await api.get(`/layout-game/levels/${level.id}`);
      setSelectedLevel(response.data);
      setHtmlCode(`<div class="container">
  <!-- Ваша верстка здесь -->
  
</div>`);
      setCssCode(`/* Ваши стили здесь */
.container {
  
}
`);
      setLastResult(null);
      setSelectedElement(null);
      setHoveredElement(null);
    } catch (error) {
      console.error('Ошибка загрузки уровня:', error);
      toast.error('Не удалось загрузить уровень');
    }
  };

  // Обработка наведения на элемент в целевом макете
  const handleTargetMouseMove = useCallback((e) => {
    if (!inspectorEnabled || !targetFrameRef.current) return;
    
    const iframe = targetFrameRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;
    
    const rect = iframe.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const element = iframeDoc.elementFromPoint(x, y);
    if (element && element !== iframeDoc.body && element !== iframeDoc.documentElement) {
      const computed = iframeDoc.defaultView.getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      
      setHoveredElement({
        tag: element.tagName.toLowerCase(),
        classes: element.className || '',
        id: element.id || '',
        bounds: {
          width: Math.round(bounds.width),
          height: Math.round(bounds.height),
          top: Math.round(bounds.top),
          left: Math.round(bounds.left)
        },
        styles: {
          width: computed.width,
          height: computed.height,
          padding: computed.padding,
          paddingTop: computed.paddingTop,
          paddingRight: computed.paddingRight,
          paddingBottom: computed.paddingBottom,
          paddingLeft: computed.paddingLeft,
          margin: computed.margin,
          marginTop: computed.marginTop,
          marginRight: computed.marginRight,
          marginBottom: computed.marginBottom,
          marginLeft: computed.marginLeft,
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          fontFamily: computed.fontFamily,
          borderRadius: computed.borderRadius,
          border: computed.border,
          display: computed.display,
          flexDirection: computed.flexDirection,
          justifyContent: computed.justifyContent,
          alignItems: computed.alignItems,
          gap: computed.gap,
          position: computed.position
        }
      });
    }
  }, [inspectorEnabled]);

  const handleTargetClick = useCallback((e) => {
    if (!inspectorEnabled || !hoveredElement) return;
    e.preventDefault();
    setSelectedElement(hoveredElement);
  }, [inspectorEnabled, hoveredElement]);

  const handleTargetMouseLeave = useCallback(() => {
    setHoveredElement(null);
  }, []);

  // Обновление целевого iframe
  const updateTargetFrame = useCallback(() => {
    if (!targetFrameRef.current || !selectedLevel) return;
    
    const iframe = targetFrameRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          ${selectedLevel.target_css || ''}
        </style>
      </head>
      <body>
        ${selectedLevel.target_html || ''}
      </body>
      </html>
    `;
    
    doc.open();
    doc.write(fullHtml);
    doc.close();
  }, [selectedLevel]);

  // Обновление превью iframe
  const updatePreviewFrame = useCallback(() => {
    if (!previewFrameRef.current) return;
    
    const iframe = previewFrameRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          ${cssCode}
        </style>
      </head>
      <body>
        ${htmlCode}
      </body>
      </html>
    `;
    
    doc.open();
    doc.write(fullHtml);
    doc.close();
  }, [htmlCode, cssCode]);

  useEffect(() => {
    updateTargetFrame();
  }, [selectedLevel, updateTargetFrame]);

  useEffect(() => {
    const timer = setTimeout(updatePreviewFrame, 300);
    return () => clearTimeout(timer);
  }, [htmlCode, cssCode, updatePreviewFrame]);

  // Сравнение верстки
  const checkLayout = async () => {
    if (!selectedLevel) return;
    
    // Проверка что ученик написал реальный HTML (не только комментарии и пустой контейнер)
    const cleanHtml = htmlCode
      .replace(/<!--[\s\S]*?-->/g, '') // убираем комментарии
      .replace(/<div\s+class="container">\s*<\/div>/g, '') // убираем пустой контейнер
      .replace(/\s+/g, ' ')
      .trim();
    
    // Проверяем есть ли реальные HTML теги с контентом
    const hasRealContent = /<[a-z][^>]*>[^<]+<\/[a-z]+>/i.test(cleanHtml) || 
                          /<[a-z][^>]*\/>/i.test(cleanHtml);
    
    if (!hasRealContent) {
      toast.error('Напишите HTML разметку для проверки (теги с контентом)');
      return;
    }
    
    setIsChecking(true);
    setLastResult(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const html2canvas = (await import('html2canvas')).default;
      
      const targetDoc = targetFrameRef.current?.contentDocument;
      const previewDoc = previewFrameRef.current?.contentDocument;
      
      if (!targetDoc || !previewDoc) {
        throw new Error('Не удалось получить документы');
      }
      
      const width = selectedLevel.canvas_width || 800;
      const height = selectedLevel.canvas_height || 600;
      
      // Рендер целевого макета
      const targetCanvas = await html2canvas(targetDoc.body, {
        width, height, scale: 1, useCORS: true, backgroundColor: '#ffffff'
      });
      
      // Рендер верстки ученика
      const previewCanvas = await html2canvas(previewDoc.body, {
        width, height, scale: 1, useCORS: true, backgroundColor: '#ffffff'
      });
      
      // Сравнение пикселей - ВСЕ пиксели без исключений
      const targetCtx = targetCanvas.getContext('2d');
      const previewCtx = previewCanvas.getContext('2d');
      
      const targetData = targetCtx.getImageData(0, 0, width, height);
      const previewData = previewCtx.getImageData(0, 0, width, height);
      
      let matchingPixels = 0;
      let nonWhiteTargetPixels = 0; // Цветные пиксели в макете
      let nonWhitePreviewPixels = 0; // Цветные пиксели у ученика
      let nonWhiteMatching = 0; // Совпавшие цветные пиксели
      
      const totalPixels = width * height;
      const tolerance = 25;
      const whiteThreshold = 250;
      
      for (let i = 0; i < targetData.data.length; i += 4) {
        const targetR = targetData.data[i];
        const targetG = targetData.data[i + 1];
        const targetB = targetData.data[i + 2];
        
        const previewR = previewData.data[i];
        const previewG = previewData.data[i + 1];
        const previewB = previewData.data[i + 2];
        
        const rDiff = Math.abs(targetR - previewR);
        const gDiff = Math.abs(targetG - previewG);
        const bDiff = Math.abs(targetB - previewB);
        
        const isMatch = rDiff <= tolerance && gDiff <= tolerance && bDiff <= tolerance;
        
        if (isMatch) {
          matchingPixels++;
        }
        
        // Подсчет цветных (не белых) пикселей
        const isTargetWhite = targetR >= whiteThreshold && targetG >= whiteThreshold && targetB >= whiteThreshold;
        const isPreviewWhite = previewR >= whiteThreshold && previewG >= whiteThreshold && previewB >= whiteThreshold;
        
        if (!isTargetWhite) {
          nonWhiteTargetPixels++;
          if (isMatch) nonWhiteMatching++;
        }
        if (!isPreviewWhite) {
          nonWhitePreviewPixels++;
        }
      }
      
      // Проверка что ученик вообще что-то нарисовал
      if (nonWhitePreviewPixels < 100) {
        toast.error('Ваша верстка пустая или невидимая. Добавьте видимые элементы.');
        setIsChecking(false);
        return;
      }
      
      // Проверка что в макете есть цветные пиксели
      if (nonWhiteTargetPixels < 100) {
        // Макет почти пустой - используем обычное сравнение
        const accuracy = (matchingPixels / totalPixels) * 100;
        await submitResult(accuracy);
        return;
      }
      
      // Основная метрика: насколько хорошо ученик воспроизвел цветные элементы макета
      const colorAccuracy = (nonWhiteMatching / nonWhiteTargetPixels) * 100;
      
      // Штраф за лишние элементы (ученик добавил то, чего нет в макете)
      const extraPixels = Math.max(0, nonWhitePreviewPixels - nonWhiteTargetPixels);
      const extraPenalty = Math.min(30, (extraPixels / nonWhiteTargetPixels) * 50);
      
      // Штраф за недостающие элементы
      const missingPixels = nonWhiteTargetPixels - nonWhiteMatching;
      const missingPenalty = (missingPixels / nonWhiteTargetPixels) * 100;
      
      // Финальная точность
      let accuracy = colorAccuracy - extraPenalty;
      accuracy = Math.max(0, Math.min(100, accuracy));
      
      await submitResult(accuracy);
      
    } catch (error) {
      console.error('Ошибка проверки:', error);
      toast.error('Ошибка при проверке верстки');
      setIsChecking(false);
    }
  };
  
  // Отправка результата
  const submitResult = async (accuracy) => {
    try {
      const response = await api.post(`/layout-game/levels/${selectedLevel.id}/check`, {
        accuracy
      });

      setLastResult(response.data);

      if (response.data.completed) {
        toast.success(`🎉 ${response.data.message}`);
        if (response.data.pointsAwarded > 0) {
          toast.info(`+${response.data.pointsAwarded} очков!`);
        }
        loadLevels();
        loadStats();
      } else {
        toast.warning(response.data.message);
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      toast.error('Ошибка при сохранении результата');
    } finally {
      setIsChecking(false);
    }
  };

  // Форматирование цвета для отображения
  const formatColor = (color) => {
    if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') return 'прозрачный';
    return color;
  };

  // Рендер инспектора
  const renderInspector = () => {
    const element = selectedElement || hoveredElement;
    if (!element) {
      return (
        <div className={styles.inspectorEmpty}>
          <FaMousePointer className={styles.inspectorEmptyIcon} />
          <p>Наведите на элемент макета,<br/>чтобы увидеть его свойства</p>
        </div>
      );
    }

    return (
      <div className={styles.inspectorContent}>
        {/* Имя элемента */}
        <div className={styles.inspectorHeader}>
          <span className={styles.tagName}>&lt;{element.tag}&gt;</span>
          {element.classes && <span className={styles.className}>.{element.classes.split(' ').join('.')}</span>}
          {element.id && <span className={styles.idName}>#{element.id}</span>}
        </div>

        {/* Box Model */}
        <div className={styles.boxModel}>
          <div className={styles.boxModelTitle}>Box Model</div>
          <div className={styles.boxModelVisual}>
            <div className={styles.marginBox}>
              <span className={styles.boxLabel}>margin</span>
              <span className={styles.marginTop}>{parseInt(element.styles.marginTop) || 0}</span>
              <span className={styles.marginRight}>{parseInt(element.styles.marginRight) || 0}</span>
              <span className={styles.marginBottom}>{parseInt(element.styles.marginBottom) || 0}</span>
              <span className={styles.marginLeft}>{parseInt(element.styles.marginLeft) || 0}</span>
              
              <div className={styles.paddingBox}>
                <span className={styles.boxLabel}>padding</span>
                <span className={styles.paddingTop}>{parseInt(element.styles.paddingTop) || 0}</span>
                <span className={styles.paddingRight}>{parseInt(element.styles.paddingRight) || 0}</span>
                <span className={styles.paddingBottom}>{parseInt(element.styles.paddingBottom) || 0}</span>
                <span className={styles.paddingLeft}>{parseInt(element.styles.paddingLeft) || 0}</span>
                
                <div className={styles.contentBox}>
                  {element.bounds.width} × {element.bounds.height}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Свойства */}
        <div className={styles.inspectorProps}>
          <div className={styles.propSection}>
            <h4>Размеры</h4>
            <div className={styles.propRow}>
              <span>width</span>
              <span>{element.styles.width}</span>
            </div>
            <div className={styles.propRow}>
              <span>height</span>
              <span>{element.styles.height}</span>
            </div>
          </div>

          <div className={styles.propSection}>
            <h4>Цвета</h4>
            <div className={styles.propRow}>
              <span>background</span>
              <span className={styles.colorValue}>
                <span 
                  className={styles.colorSwatch} 
                  style={{ backgroundColor: element.styles.backgroundColor }}
                />
                {formatColor(element.styles.backgroundColor)}
              </span>
            </div>
            <div className={styles.propRow}>
              <span>color</span>
              <span className={styles.colorValue}>
                <span 
                  className={styles.colorSwatch} 
                  style={{ backgroundColor: element.styles.color }}
                />
                {element.styles.color}
              </span>
            </div>
          </div>

          <div className={styles.propSection}>
            <h4>Типографика</h4>
            <div className={styles.propRow}>
              <span>font-size</span>
              <span>{element.styles.fontSize}</span>
            </div>
            <div className={styles.propRow}>
              <span>font-weight</span>
              <span>{element.styles.fontWeight}</span>
            </div>
            <div className={styles.propRow}>
              <span>font-family</span>
              <span className={styles.fontFamily}>{element.styles.fontFamily?.split(',')[0]}</span>
            </div>
          </div>

          {element.styles.display === 'flex' && (
            <div className={styles.propSection}>
              <h4>Flexbox</h4>
              <div className={styles.propRow}>
                <span>flex-direction</span>
                <span>{element.styles.flexDirection}</span>
              </div>
              <div className={styles.propRow}>
                <span>justify-content</span>
                <span>{element.styles.justifyContent}</span>
              </div>
              <div className={styles.propRow}>
                <span>align-items</span>
                <span>{element.styles.alignItems}</span>
              </div>
              <div className={styles.propRow}>
                <span>gap</span>
                <span>{element.styles.gap}</span>
              </div>
            </div>
          )}

          {element.styles.borderRadius !== '0px' && (
            <div className={styles.propSection}>
              <h4>Другое</h4>
              <div className={styles.propRow}>
                <span>border-radius</span>
                <span>{element.styles.borderRadius}</span>
              </div>
              {element.styles.border !== 'none' && element.styles.border !== '0px none rgb(0, 0, 0)' && (
                <div className={styles.propRow}>
                  <span>border</span>
                  <span>{element.styles.border}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Экран выбора уровней
  if (!selectedLevel) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={onBack} className={styles.backBtn}>
            <FaArrowLeft /> Назад
          </button>
          <h1 className={styles.title}>
            <FaCode /> Верстка
          </h1>
          {stats && (
            <div className={styles.stats}>
              <span><FaTrophy /> {stats.completed_levels}/{stats.total_levels}</span>
              <span><BsLightningChargeFill /> {parseFloat(stats.average_accuracy).toFixed(1)}%</span>
            </div>
          )}
          <button 
            className={styles.emmetHelpBtn}
            onClick={() => setShowEmmetHelp(true)}
          >
            <FaQuestionCircle /> Справка Emmet
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>Загрузка уровней...</div>
        ) : levels.length === 0 ? (
          <div className={styles.empty}>
            <FaCode className={styles.emptyIcon} />
            <p>Пока нет доступных уровней</p>
            <p className={styles.emptyHint}>Администратор скоро добавит новые задания</p>
          </div>
        ) : (
          <div className={styles.levelsGrid}>
            {levels.map((level, index) => {
              const isLocked = index > 0 && !levels[index - 1].completed;
              
              return (
                <div 
                  key={level.id}
                  className={`${styles.levelCard} ${level.completed ? styles.completed : ''} ${isLocked ? styles.locked : ''}`}
                  onClick={() => !isLocked && selectLevel(level)}
                >
                  {isLocked && (
                    <div className={styles.lockOverlay}>
                      <FaLock />
                    </div>
                  )}
                  
                  <div className={styles.levelIcon}>
                    <FaCode />
                    <span className={styles.levelNumber}>{index + 1}</span>
                  </div>
                  
                  <div className={styles.levelInfo}>
                    <h3>{level.title}</h3>
                    <p>{level.description}</p>
                    
                    <div className={styles.levelMeta}>
                      <span className={styles.difficulty}>
                        {Array(level.difficulty).fill('⭐').join('')}
                      </span>
                      <span className={styles.points}>+{level.points_reward} очков</span>
                    </div>
                    
                    {level.completed && (
                      <div className={styles.completedBadge}>
                        <FaCheck /> {parseFloat(level.best_accuracy).toFixed(1)}%
                      </div>
                    )}
                    
                    {level.attempts > 0 && !level.completed && (
                      <div className={styles.attemptsBadge}>
                        Попыток: {level.attempts}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Модальное окно справки Emmet */}
        {showEmmetHelp && (
          <div className={styles.modalOverlay} onClick={() => setShowEmmetHelp(false)}>
            <div className={styles.emmetHelpModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2><FaBook /> Справка по Emmet</h2>
                <button className={styles.closeModal} onClick={() => setShowEmmetHelp(false)}>
                  <FaTimes />
                </button>
              </div>
              
              <div className={styles.modalContent}>
                <section className={styles.helpSection}>
                  <h3><FaKeyboard /> Как использовать</h3>
                  <p>Введите аббревиатуру и нажмите <kbd>Tab</kbd> или <kbd>Enter</kbd> для раскрытия.</p>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaTags /> HTML - Базовые теги</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>div</code>
                      <span>→</span>
                      <code>{`<div></div>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>p</code>
                      <span>→</span>
                      <code>{`<p></p>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>a</code>
                      <span>→</span>
                      <code>{`<a href=""></a>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>img</code>
                      <span>→</span>
                      <code>{`<img src="" alt="">`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>input</code>
                      <span>→</span>
                      <code>{`<input type="text">`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>btn</code>
                      <span>→</span>
                      <code>{`<button></button>`}</code>
                    </div>
                  </div>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaCrosshairs /> Классы и ID</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>div.container</code>
                      <span>→</span>
                      <code>{`<div class="container"></div>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>div#main</code>
                      <span>→</span>
                      <code>{`<div id="main"></div>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>.box</code>
                      <span>→</span>
                      <code>{`<div class="box"></div>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>p.text.large</code>
                      <span>→</span>
                      <code>{`<p class="text large"></p>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>div#id.class</code>
                      <span>→</span>
                      <code>{`<div id="id" class="class"></div>`}</code>
                    </div>
                  </div>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaSitemap /> Вложенность</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>div{'>'}p</code>
                      <span>→</span>
                      <code>{`<div><p></p></div>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>ul{'>'}li</code>
                      <span>→</span>
                      <code>{`<ul><li></li></ul>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>nav{'>'}ul{'>'}li{'>'}a</code>
                      <span>→</span>
                      <code>вложенная структура</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>div+p</code>
                      <span>→</span>
                      <code>{`<div></div><p></p>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>div{'>'}p^span</code>
                      <span>→</span>
                      <code>подняться на уровень</code>
                    </div>
                  </div>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaClone /> Умножение</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>li*5</code>
                      <span>→</span>
                      <code>5 элементов li</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>ul{'>'}li*3</code>
                      <span>→</span>
                      <code>ul с 3 li внутри</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>div.item$*3</code>
                      <span>→</span>
                      <code>item1, item2, item3</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>h${'{'}Заголовок{'}'}</code>
                      <span>→</span>
                      <code>h1-h6 с текстом</code>
                    </div>
                  </div>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaPen /> Текст и атрибуты</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>p{'{'}Текст{'}'}</code>
                      <span>→</span>
                      <code>{`<p>Текст</p>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>a[href=#]</code>
                      <span>→</span>
                      <code>{`<a href="#"></a>`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>input[type=email]</code>
                      <span>→</span>
                      <code>{`<input type="email">`}</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>img[src=img.jpg]</code>
                      <span>→</span>
                      <code>{`<img src="img.jpg">`}</code>
                    </div>
                  </div>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaPalette /> CSS - Основные свойства</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>m10</code>
                      <span>→</span>
                      <code>margin: 10px;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>p20</code>
                      <span>→</span>
                      <code>padding: 20px;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>w100</code>
                      <span>→</span>
                      <code>width: 100px;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>h50</code>
                      <span>→</span>
                      <code>height: 50px;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>w100p</code>
                      <span>→</span>
                      <code>width: 100%;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>fz16</code>
                      <span>→</span>
                      <code>font-size: 16px;</code>
                    </div>
                  </div>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaBoxes /> CSS - Flexbox</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>df</code>
                      <span>→</span>
                      <code>display: flex;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>jcc</code>
                      <span>→</span>
                      <code>justify-content: center;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>jcsb</code>
                      <span>→</span>
                      <code>justify-content: space-between;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>aic</code>
                      <span>→</span>
                      <code>align-items: center;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>fxd</code>
                      <span>→</span>
                      <code>flex-direction:</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>fww</code>
                      <span>→</span>
                      <code>flex-wrap: wrap;</code>
                    </div>
                  </div>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaImage /> CSS - Позиционирование</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>posa</code>
                      <span>→</span>
                      <code>position: absolute;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>posr</code>
                      <span>→</span>
                      <code>position: relative;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>posf</code>
                      <span>→</span>
                      <code>position: fixed;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>t0</code>
                      <span>→</span>
                      <code>top: 0;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>l10</code>
                      <span>→</span>
                      <code>left: 10px;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>z10</code>
                      <span>→</span>
                      <code>z-index: 10;</code>
                    </div>
                  </div>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaAdjust /> CSS - Внешний вид</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>bgc#f00</code>
                      <span>→</span>
                      <code>background-color: #f00;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>c#333</code>
                      <span>→</span>
                      <code>color: #333;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>bd1-s-#000</code>
                      <span>→</span>
                      <code>border: 1px solid #000;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>bdr5</code>
                      <span>→</span>
                      <code>border-radius: 5px;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>op50p</code>
                      <span>→</span>
                      <code>opacity: 50%;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>bxsh</code>
                      <span>→</span>
                      <code>box-shadow:</code>
                    </div>
                  </div>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaFont /> CSS - Текст</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>tac</code>
                      <span>→</span>
                      <code>text-align: center;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>fwb</code>
                      <span>→</span>
                      <code>font-weight: bold;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>lh1.5</code>
                      <span>→</span>
                      <code>line-height: 1.5;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>tdn</code>
                      <span>→</span>
                      <code>text-decoration: none;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>ttu</code>
                      <span>→</span>
                      <code>text-transform: uppercase;</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>ls2</code>
                      <span>→</span>
                      <code>letter-spacing: 2px;</code>
                    </div>
                  </div>
                </section>

                <section className={styles.helpSection}>
                  <h3><FaRocket /> Полезные комбинации</h3>
                  <div className={styles.emmetGrid}>
                    <div className={styles.emmetItem}>
                      <code>!</code>
                      <span>→</span>
                      <code>HTML5 шаблон</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>link:css</code>
                      <span>→</span>
                      <code>подключение CSS</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>script:src</code>
                      <span>→</span>
                      <code>подключение JS</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>ul.nav{'>'}li.nav-item*5{'>'}a</code>
                      <span>→</span>
                      <code>навигация</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>table{'>'}tr*3{'>'}td*3</code>
                      <span>→</span>
                      <code>таблица 3x3</code>
                    </div>
                    <div className={styles.emmetItem}>
                      <code>form{'>'}input*3+button</code>
                      <span>→</span>
                      <code>форма</code>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Экран игры
  return (
    <div className={`${styles.gameContainer} ${isFullscreen ? styles.fullscreen : ''}`}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <button onClick={() => setSelectedLevel(null)} className={styles.backBtn}>
          <FaArrowLeft /> К уровням
        </button>
        
        <div className={styles.levelTitle}>
          <h2>{selectedLevel.title}</h2>
          <span className={styles.levelDesc}>{selectedLevel.description}</span>
        </div>
        
        <div className={styles.toolbarActions}>
          <button 
            onClick={() => setInspectorEnabled(!inspectorEnabled)}
            className={`${styles.toolBtn} ${inspectorEnabled ? styles.active : ''}`}
            title="Инспектор элементов"
          >
            <FaRuler />
          </button>
          
          <button 
            onClick={() => setShowTargetOverlay(!showTargetOverlay)}
            className={`${styles.toolBtn} ${showTargetOverlay ? styles.active : ''}`}
            title="Показать/скрыть макет"
          >
            {showTargetOverlay ? <FaEye /> : <FaEyeSlash />}
          </button>
          
          <button 
            onClick={checkLayout} 
            className={styles.checkBtn}
            disabled={isChecking}
          >
            {isChecking ? 'Проверка...' : <><FaPlay /> Проверить</>}
          </button>
          
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)} 
            className={styles.fullscreenBtn}
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
      </div>

      {/* Result bar */}
      {lastResult && (
        <div className={`${styles.resultBar} ${lastResult.completed ? styles.success : styles.warning}`}>
          {lastResult.completed ? (
            <>
              <FaCheck /> Уровень пройден! Точность: {lastResult.accuracy.toFixed(1)}%
              {lastResult.pointsAwarded > 0 && ` (+${lastResult.pointsAwarded} очков)`}
            </>
          ) : (
            <>
              <FaTimes /> Точность: {lastResult.accuracy.toFixed(1)}% (нужно 95%)
            </>
          )}
        </div>
      )}

      {/* Main content */}
      <div className={styles.workspace}>
        {/* Левая панель - Целевой макет с инспектором */}
        <div className={styles.targetPanel}>
          <div className={styles.panelHeader}>
            <FaRuler /> Макет (цель) 
            <span className={styles.hint}>- наведите чтобы увидеть размеры</span>
          </div>
          <div 
            className={styles.targetFrame}
            onMouseMove={handleTargetMouseMove}
            onMouseLeave={handleTargetMouseLeave}
            onClick={handleTargetClick}
          >
            <iframe
              ref={targetFrameRef}
              className={styles.iframe}
              title="Target"
              style={{
                width: selectedLevel.canvas_width || 800,
                height: selectedLevel.canvas_height || 600,
                pointerEvents: 'none'
              }}
            />
            {/* Подсветка элемента */}
            {hoveredElement && inspectorEnabled && (
              <div 
                className={styles.elementHighlight}
                style={{
                  top: hoveredElement.bounds.top,
                  left: hoveredElement.bounds.left,
                  width: hoveredElement.bounds.width,
                  height: hoveredElement.bounds.height
                }}
              >
                <div className={styles.highlightLabel}>
                  {hoveredElement.bounds.width} × {hoveredElement.bounds.height}
                </div>
              </div>
            )}
          </div>
          
          {/* Инспектор */}
          {inspectorEnabled && (
            <div className={styles.inspector}>
              <div className={styles.inspectorTitle}>
                <FaMousePointer /> Инспектор
                {selectedElement && (
                  <button 
                    className={styles.clearSelection}
                    onClick={() => setSelectedElement(null)}
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
              {renderInspector()}
            </div>
          )}
        </div>

        {/* Центр - Редактор кода */}
        <div className={styles.editorPanel}>
          <div className={styles.panelHeader}>
            <FaCode /> Редактор
            <span className={styles.emmetHint}>Tab/Enter = Emmet</span>
          </div>
          <div className={styles.editorTabs}>
            <span className={styles.tabActive}>HTML</span>
          </div>
          <div className={styles.editorWrapper}>
            <div ref={htmlHighlightRef} className={styles.highlightContainer}>
              <CodeHighlight code={htmlCode} language="html" />
            </div>
            <textarea
              ref={htmlEditorRef}
              className={styles.codeEditor}
              value={htmlCode}
              onChange={(e) => {
                setHtmlCode(e.target.value);
                handleEditorInput(e, true);
              }}
              onKeyDown={(e) => handleEditorKeyDown(e, true)}
              onScroll={() => syncScroll(htmlEditorRef, htmlHighlightRef)}
              onBlur={() => setTimeout(() => setEmmetSuggestion(null), 200)}
              placeholder="Ваш HTML код... (Emmet: div.class, ul>li*3)"
              spellCheck={false}
            />
          </div>
          <div className={styles.editorTabs}>
            <span className={styles.tabActive}>CSS</span>
          </div>
          <div className={styles.editorWrapper}>
            <div ref={cssHighlightRef} className={styles.highlightContainer}>
              <CodeHighlight code={cssCode} language="css" />
            </div>
            <textarea
              ref={cssEditorRef}
              className={styles.codeEditor}
              value={cssCode}
              onChange={(e) => {
                setCssCode(e.target.value);
                handleEditorInput(e, false);
              }}
              onKeyDown={(e) => handleEditorKeyDown(e, false)}
              onScroll={() => syncScroll(cssEditorRef, cssHighlightRef)}
              onBlur={() => setTimeout(() => setEmmetSuggestion(null), 200)}
              placeholder="Ваши CSS стили... (Emmet: m10, p20, df, jcc)"
              spellCheck={false}
            />
          </div>
          
        </div>

        {/* Emmet подсказка - позиционируется над курсором */}
        {emmetSuggestion && (
          <div 
            className={styles.emmetSuggestionPopup}
            style={{
              top: suggestionPos.top,
              left: suggestionPos.left
            }}
            onClick={applySuggestion}
          >
            <div className={styles.suggestionHeader}>
              <span className={styles.suggestionAbbrev}>{emmetSuggestion.abbreviation}</span>
              <span className={styles.suggestionKeys}>Tab / Enter</span>
            </div>
            <pre className={styles.suggestionPreview}>
              {emmetSuggestion.expanded.length > 200 
                ? emmetSuggestion.expanded.slice(0, 200) + '...' 
                : emmetSuggestion.expanded}
            </pre>
          </div>
        )}

        {/* Правая панель - Превью */}
        <div className={styles.previewPanel}>
          <div className={styles.panelHeader}>
            <FaPlay /> Ваш результат
          </div>
          <div className={styles.previewContainer}>
            <iframe
              ref={previewFrameRef}
              className={styles.iframe}
              title="Preview"
              style={{
                width: selectedLevel.canvas_width || 800,
                height: selectedLevel.canvas_height || 600
              }}
            />
            {/* Полупрозрачный оверлей макета для сравнения */}
            {showTargetOverlay && (
              <div className={styles.overlayFrame}>
                <iframe
                  className={styles.iframe}
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                        ${selectedLevel.target_css || ''}
                      </style>
                    </head>
                    <body>${selectedLevel.target_html || ''}</body>
                    </html>
                  `}
                  title="Overlay"
                  style={{
                    width: selectedLevel.canvas_width || 800,
                    height: selectedLevel.canvas_height || 600
                  }}
                />
              </div>
            )}
          </div>
          <div className={styles.overlayControls}>
            <label>
              <input 
                type="checkbox" 
                checked={showTargetOverlay}
                onChange={(e) => setShowTargetOverlay(e.target.checked)}
              />
              Показать макет поверх (для сравнения)
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LayoutGame;
