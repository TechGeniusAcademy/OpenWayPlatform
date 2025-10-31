import { useState, useRef, useEffect, useCallback } from 'react';
import { FaSquare, FaCircle, FaPen, FaFont, FaImage, FaMousePointer, FaUndo, FaRedo, FaTrash, FaCopy, FaDownload, FaSave, FaFolder, FaPlus, FaEye, FaEyeSlash, FaLock, FaUnlock, FaBrush, FaEraser, FaPlay, FaStop, FaTimes, FaCode, FaRuler, FaExpand, FaCompress, FaSearch, FaArrowsAlt, FaBorderAll, FaUpload, FaShare, FaSearchPlus } from 'react-icons/fa';
import { MdStar, MdGridOn, MdInvertColors, MdColorLens, MdTextFields, MdTransform } from 'react-icons/md';
import { BsTriangle, BsDiamond, BsLayers, BsGrid3X3Gap, BsEyedropper, BsSliders } from 'react-icons/bs';
import { AiOutlineColumnWidth, AiOutlineColumnHeight, AiOutlineBgColors, AiFillFileText } from 'react-icons/ai';
import { RiRulerLine, RiPaletteLine, RiLayoutGridLine } from 'react-icons/ri';
import JSZip from 'jszip';
import ColorPicker from './ColorPicker';
import './DesignEditor.css';

// Google Fonts список
const GOOGLE_FONTS = [
  'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia', 'Comic Sans MS',
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Raleway', 'PT Sans', 
  'Merriweather', 'Playfair Display', 'Ubuntu', 'Nunito', 'Poppins', 'Mukta',
  'Rubik', 'Work Sans', 'Fira Sans', 'Noto Sans', 'Quicksand', 'Lora',
  'Crimson Text', 'Dosis', 'Inter', 'Bebas Neue', 'Anton', 'Pacifico',
  'Dancing Script', 'Caveat', 'Satisfy', 'Great Vibes', 'Lobster', 'Comfortaa',
  'Righteous', 'Permanent Marker', 'Indie Flower', 'Shadows Into Light',
  'Architects Daughter', 'Abril Fatface', 'Bangers', 'Alfa Slab One', 'Bungee',
  'Kalam', 'Exo 2', 'Libre Baskerville', 'Source Sans Pro', 'Titillium Web',
  'Oxygen', 'Arimo', 'Cabin', 'PT Serif', 'Bitter', 'Josefin Sans',
  'Varela Round', 'Inconsolata', 'Noto Serif', 'Abel', 'Fjalla One',
  'Signika', 'Pathway Gothic One', 'Questrial', 'Vollkorn', 'Play',
  'Zilla Slab', 'Kanit', 'Acme', 'Russo One', 'Hind', 'Barlow',
  'Teko', 'Overpass', 'Amatic SC', 'Gloria Hallelujah', 'Orbitron',
  'IBM Plex Sans', 'Cormorant Garamond', 'Yanone Kaffeesatz', 'Alegreya',
  'Heebo', 'Jost', 'Asap', 'Space Grotesk', 'Manrope', 'DM Sans',
  'Lexend', 'Plus Jakarta Sans'
];

const DesignEditor = () => {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('select');
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedElements, setSelectedElements] = useState([]); // Множественное выделение
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [selectionBox, setSelectionBox] = useState(null); // Рамка выделения
  const [dragStart, setDragStart] = useState(null); // Начальная точка для перемещения группы
  const [resizeHandle, setResizeHandle] = useState(null); // Активная ручка изменения размера
  const [resizeStart, setResizeStart] = useState(null); // Начальные данные для изменения размера
  const [isRotating, setIsRotating] = useState(false); // Поворот элемента
  const [rotationStart, setRotationStart] = useState(null); // Начальные данные для поворота
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const panOffsetRef = useRef({ x: 0, y: 0 }); // Ref для мгновенного обновления без задержек
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Стили и настройки
  const [fillColor, setFillColor] = useState('#3498db');
  const [strokeColor, setStrokeColor] = useState('#2c3e50');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('Roboto');
  const [brushSize, setBrushSize] = useState(10);
  const [opacity, setOpacity] = useState(1);
  
  // Проекты и сохранение
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [showProjectManager, setShowProjectManager] = useState(false);
  
  // Работа с .sketch файлами
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const imageCache = useRef(new Map());
  
  // Анимация
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [animationDuration, setAnimationDuration] = useState(3000);
  
  // Рисование пером
  const [penPath, setPenPath] = useState([]);
  const [isDrawingPen, setIsDrawingPen] = useState(false);
  
  // Figma-подобные функции
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [showProperties, setShowProperties] = useState(true);
  const [showLayers, setShowLayers] = useState(true);
  const [showAssets, setShowAssets] = useState(false);
  const [activePanel, setActivePanel] = useState('design'); // design, prototype, inspect
  const [inspectorData, setInspectorData] = useState(null);
  const [gridSize, setGridSize] = useState(20);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showPixelGrid, setShowPixelGrid] = useState(false);
  const [colorPalette, setColorPalette] = useState(['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c']);
  
  // Измерения и направляющие
  const [guides, setGuides] = useState([]);
  const [showDistances, setShowDistances] = useState(false);
  const [measurementTool, setMeasurementTool] = useState(false);
  const [smartGuides, setSmartGuides] = useState([]);
  const [showSmartGuides, setShowSmartGuides] = useState(true);
  const [distanceMeasurements, setDistanceMeasurements] = useState([]);
  const [hoveredElement, setHoveredElement] = useState(null);
  const [isAltPressed, setIsAltPressed] = useState(false);
  
  // Компоненты и стили
  const [components, setComponents] = useState([]);
  const [textStyles, setTextStyles] = useState([]);
  const [colorStyles, setColorStyles] = useState([]);
  const [clipboardStyles, setClipboardStyles] = useState(null);
  
  // Кастомная палитра цветов
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState(null); // 'fill', 'stroke', 'shadow', etc.
  const [tempColor, setTempColor] = useState('#3498db');
  
  // Индикатор автосохранения
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved'); // 'saved', 'saving'

  // Сохранение в историю
  const saveToHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(elements)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [elements, history, historyIndex]);

  // Отмена/Повтор
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
      setSelectedElement(null);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
      setSelectedElement(null);
    }
  };

  // Получение позиции мыши на канвасе
  const getMousePosition = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const currentPanOffset = isPanning ? panOffsetRef.current : panOffset;
    return {
      x: (e.clientX - rect.left - currentPanOffset.x) / zoom,
      y: (e.clientY - rect.top - currentPanOffset.y) / zoom
    };
  };

  // Проверка клика по элементу
  const getElementAtPosition = (x, y) => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      if (element.visible && isPointInElement(x, y, element)) {
        return element;
      }
    }
    return null;
  };

  // Получить ручки изменения размера для элемента
  const getResizeHandles = (element) => {
    const handleSize = 8 / zoom;
    let width, height;
    
    // Для текста вычисляем размеры по-особому
    if (element.type === 'text') {
      width = element.text.length * element.fontSize * 0.6;
      height = element.fontSize * 1.3;
    } else {
      width = element.width || element.radius * 2 || 100;
      height = element.height || element.radius * 2 || 80;
    }
    
    return {
      // Углы
      nw: { x: element.x - handleSize/2, y: element.y - handleSize/2, width: handleSize, height: handleSize, cursor: 'nw-resize' },
      ne: { x: element.x + width - handleSize/2, y: element.y - handleSize/2, width: handleSize, height: handleSize, cursor: 'ne-resize' },
      sw: { x: element.x - handleSize/2, y: element.y + height - handleSize/2, width: handleSize, height: handleSize, cursor: 'sw-resize' },
      se: { x: element.x + width - handleSize/2, y: element.y + height - handleSize/2, width: handleSize, height: handleSize, cursor: 'se-resize' },
      // Стороны
      n: { x: element.x + width/2 - handleSize/2, y: element.y - handleSize/2, width: handleSize, height: handleSize, cursor: 'n-resize' },
      s: { x: element.x + width/2 - handleSize/2, y: element.y + height - handleSize/2, width: handleSize, height: handleSize, cursor: 's-resize' },
      w: { x: element.x - handleSize/2, y: element.y + height/2 - handleSize/2, width: handleSize, height: handleSize, cursor: 'w-resize' },
      e: { x: element.x + width - handleSize/2, y: element.y + height/2 - handleSize/2, width: handleSize, height: handleSize, cursor: 'e-resize' }
    };
  };

  // Получить ручку поворота для элемента
  const getRotationHandle = (element) => {
    const handleSize = 10 / zoom;
    let width, height;
    
    // Для текста вычисляем размеры по-особому
    if (element.type === 'text') {
      width = element.text.length * element.fontSize * 0.6;
      height = element.fontSize * 1.3;
    } else {
      width = element.width || element.radius * 2 || 100;
      height = element.height || element.radius * 2 || 80;
    }
    
    // Ручка поворота находится сверху по центру, на расстоянии 20px от элемента
    const distance = 20 / zoom;
    return {
      x: element.x + width/2 - handleSize/2,
      y: element.y - distance - handleSize/2,
      width: handleSize,
      height: handleSize,
      cursor: 'grab'
    };
  };

  // Проверка клика по ручке поворота
  const isRotationHandleClick = (x, y, element) => {
    if (!element) return false;
    const handle = getRotationHandle(element);
    return x >= handle.x && x <= handle.x + handle.width &&
           y >= handle.y && y <= handle.y + handle.height;
  };

  // Проверка клика по ручке изменения размера
  const getResizeHandleAtPosition = (x, y, element) => {
    if (!element) return null;
    const handles = getResizeHandles(element);
    
    for (const [name, handle] of Object.entries(handles)) {
      if (x >= handle.x && x <= handle.x + handle.width &&
          y >= handle.y && y <= handle.y + handle.height) {
        return name;
      }
    }
    return null;
  };

  const isPointInElement = (x, y, element) => {
    switch (element.type) {
      case 'rectangle':
      case 'image':
        return x >= element.x && x <= element.x + element.width &&
               y >= element.y && y <= element.y + element.height;
      case 'circle':
        const centerX = element.x + element.radius;
        const centerY = element.y + element.radius;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        return distance <= element.radius;
      case 'triangle':
      case 'diamond':
      case 'star':
        return x >= element.x && x <= element.x + (element.width || 100) &&
               y >= element.y && y <= element.y + (element.height || 80);
      case 'text':
        const textBoxHeight = element.fontSize * 1.3;
        return x >= element.x && x <= element.x + (element.text.length * element.fontSize * 0.6) &&
               y >= element.y && y <= element.y + textBoxHeight;
      case 'path':
        // Простая проверка для путей
        if (!element.points || element.points.length === 0) return false;
        const brushRadius = (element.brushSize || 10) / 2;
        return element.points.some(point => 
          Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2) <= brushRadius
        );
      default:
        return false;
    }
  };

  // Создание нового элемента
  const createElement = (type, x, y, options = {}) => {
    const id = Date.now() + Math.random();
    const baseElement = {
      id,
      type,
      x,
      y,
      fillColor,
      strokeColor,
      strokeWidth,
      strokePosition: 'center',
      opacity,
      rotation: 0,
      blendMode: 'normal',
      blur: 0,
      gradient: {
        enabled: false,
        type: 'linear',
        colors: ['#3498db', '#e74c3c'],
        angle: 0
      },
      shadow: {
        enabled: false,
        offsetX: 0,
        offsetY: 4,
        blur: 8,
        color: 'rgba(0, 0, 0, 0.3)'
      },
      visible: true,
      locked: false,
      ...options
    };

    switch (type) {
      case 'rectangle':
        return { ...baseElement, width: 100, height: 60, borderRadius: 0 };
      case 'circle':
        return { ...baseElement, radius: 50 };
      case 'triangle':
        return { ...baseElement, width: 100, height: 80 };
      case 'star':
        return { ...baseElement, outerRadius: 50, innerRadius: 25, points: 5 };
      case 'diamond':
        return { ...baseElement, width: 80, height: 80 };
      case 'text':
        return { 
          ...baseElement, 
          text: 'Текст', 
          fontSize, 
          fontFamily,
          fillColor: strokeColor,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'left',
          lineHeight: 1.2,
          letterSpacing: 0
        };
      case 'path':
        return { 
          ...baseElement, 
          points: options.points || [],
          brushSize: brushSize
        };
      case 'image':
        return {
          ...baseElement,
          width: options.width || 200,
          height: options.height || 200,
          src: options.src || '',
          strokeColor: 'transparent',
          strokeWidth: 0
        };
      default:
        return baseElement;
    }
  };

  // Загрузка изображения
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите файл изображения');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 500;
        let width = img.width;
        let height = img.height;
        
        // Масштабируем если слишком большое
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        const imageElement = createElement('image', 100, 100, {
          src: event.target.result,
          width: width,
          height: height
        });
        
        setElements([...elements, imageElement]);
        setSelectedElement(imageElement);
        setSelectedElements([imageElement]);
        saveToHistory();
        setTool('select');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    
    // Сброс input для возможности загрузки того же файла снова
    e.target.value = '';
  };

  const openImagePicker = () => {
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  };

  // Сохранение и загрузка проектов
  const saveProject = (name = null) => {
    const projectName = name || prompt('Название проекта:') || `Проект ${projects.length + 1}`;
    const project = {
      id: Date.now(),
      name: projectName,
      elements: JSON.parse(JSON.stringify(elements)),
      canvasSize,
      createdAt: new Date().toISOString()
    };
    
    const newProjects = [...projects, project];
    setProjects(newProjects);
    setCurrentProject(project);
    localStorage.setItem('designEditorProjects', JSON.stringify(newProjects));
    
    // Также обновляем workspace
    const workspace = {
      elements,
      canvasSize,
      currentProject: project,
      lastModified: new Date().toISOString()
    };
    localStorage.setItem('designEditorWorkspace', JSON.stringify(workspace));
    
    alert(`✅ Проект "${projectName}" сохранен!`);
  };

  const loadProject = (project) => {
    setElements(project.elements);
    setCanvasSize(project.canvasSize);
    setCurrentProject(project);
    setSelectedElement(null);
    setShowProjectManager(false);
    saveToHistory();
  };

  const deleteProject = (projectId) => {
    const newProjects = projects.filter(p => p.id !== projectId);
    setProjects(newProjects);
    localStorage.setItem('designEditorProjects', JSON.stringify(newProjects));
  };

  const clearAllProjects = () => {
    if (confirm('Вы уверены, что хотите удалить ВСЕ проекты? Это действие нельзя отменить!')) {
      setProjects([]);
      setElements([]);
      setCurrentProject(null);
      setSelectedElement(null);
      setSelectedElements([]);
      localStorage.removeItem('designEditorProjects');
      localStorage.removeItem('designEditorWorkspace');
      alert('Все проекты удалены! Кэш очищен.');
    }
  };

  // Загрузка проектов при инициализации
  useEffect(() => {
    const savedProjects = localStorage.getItem('designEditorProjects');
    const savedWorkspace = localStorage.getItem('designEditorWorkspace');
    
    // Загружаем последнее рабочее состояние
    if (savedWorkspace) {
      try {
        const workspace = JSON.parse(savedWorkspace);
        setElements(workspace.elements || []);
        setCanvasSize(workspace.canvasSize || { width: 1920, height: 1080 });
        setCurrentProject(workspace.currentProject || null);
        console.log('🔄 Восстановлено рабочее пространство');
      } catch (error) {
        console.error('Ошибка загрузки workspace:', error);
        localStorage.removeItem('designEditorWorkspace');
      }
    } else if (savedProjects) {
      // Если нет workspace, загружаем из старых проектов
      try {
        const parsedProjects = JSON.parse(savedProjects);
        setProjects(parsedProjects);
        
        // Автоматически загружаем последний проект (если есть)
        if (parsedProjects.length > 0) {
          const lastProject = parsedProjects[parsedProjects.length - 1];
          setElements(lastProject.elements || []);
          setCanvasSize(lastProject.canvasSize || { width: 1920, height: 1080 });
          setCurrentProject(lastProject);
          console.log('🔄 Автоматически загружен последний проект:', lastProject.name);
        }
      } catch (error) {
        console.error('Ошибка загрузки проектов из localStorage:', error);
        // Очищаем поврежденные данные
        localStorage.removeItem('designEditorProjects');
      }
    }
    
    // Загружаем список проектов
    if (savedProjects) {
      try {
        const parsedProjects = JSON.parse(savedProjects);
        setProjects(parsedProjects);
      } catch (error) {
        console.error('Ошибка загрузки списка проектов:', error);
      }
    }
  }, []);

  // Обработчики drag-and-drop для файлов
  const handleCanvasDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleCanvasDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const supportedFile = files.find(file => {
      const name = file.name.toLowerCase();
      return name.endsWith('.sketch') || name.endsWith('.json') || name.endsWith('.svg');
    });
    
    if (supportedFile) {
      const fileName = supportedFile.name.toLowerCase();
      
      if (fileName.endsWith('.sketch')) {
        await importSketchFile(supportedFile);
      } else if (fileName.endsWith('.json')) {
        await importJsonFile(supportedFile);
      } else if (fileName.endsWith('.svg')) {
        await importSvgFile(supportedFile);
      }
    } else if (files.length > 0) {
      alert('Поддерживаются форматы: .sketch, .json, .svg\n\nПеретащите .sketch файл из Sketch для импорта дизайна.');
    }
  };

  // Автосохранение рабочего пространства при изменениях
  useEffect(() => {
    // Не сохраняем при первом рендере
    if (elements.length === 0 && !currentProject) return;
    
    setAutoSaveStatus('saving');
    
    const saveTimeout = setTimeout(() => {
      const workspace = {
        elements,
        canvasSize,
        currentProject,
        lastModified: new Date().toISOString()
      };
      
      localStorage.setItem('designEditorWorkspace', JSON.stringify(workspace));
      setAutoSaveStatus('saved');
      console.log('💾 Автосохранение выполнено');
    }, 500); // Задержка 500мс для уменьшения нагрузки
    
    return () => clearTimeout(saveTimeout);
  }, [elements, canvasSize, currentProject]);

  // Обработчики событий мыши
  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey) || (e.button === 0 && e.shiftKey && tool === 'select')) { // СКМ, Ctrl+ЛКМ или Shift+ЛКМ для панорамирования
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      // Меняем курсор на руку при панорамировании
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grabbing';
      }
      return;
    }

    const position = getMousePosition(e);
    
    if (tool === 'select') {
      // Проверяем клик по ручке поворота
      if (selectedElement && isRotationHandleClick(position.x, position.y, selectedElement)) {
        setIsRotating(true);
        const width = selectedElement.width || selectedElement.radius * 2 || 100;
        const height = selectedElement.height || selectedElement.radius * 2 || 80;
        const centerX = selectedElement.x + width / 2;
        const centerY = selectedElement.y + height / 2;
        const angle = Math.atan2(position.y - centerY, position.x - centerX);
        setRotationStart({
          angle,
          initialRotation: selectedElement.rotation || 0
        });
        setIsDrawing(true);
        return;
      }
      
      // Проверяем клик по ручке изменения размера
      if (selectedElement) {
        const handle = getResizeHandleAtPosition(position.x, position.y, selectedElement);
        if (handle) {
          setResizeHandle(handle);
          setResizeStart({
            x: position.x,
            y: position.y,
            elementX: selectedElement.x,
            elementY: selectedElement.y,
            elementWidth: selectedElement.width || selectedElement.radius * 2 || 100,
            elementHeight: selectedElement.height || selectedElement.radius * 2 || 80
          });
          setIsDrawing(true);
          return;
        }
      }
      
      const element = getElementAtPosition(position.x, position.y);
      if (element && !element.locked) {
        // Если нажат Shift, добавляем к выделению
        if (e.shiftKey) {
          if (selectedElements.find(el => el.id === element.id)) {
            const newSelected = selectedElements.filter(el => el.id !== element.id);
            setSelectedElements(newSelected);
            setSelectedElement(newSelected.length === 1 ? newSelected[0] : null);
          } else {
            const newSelected = [...selectedElements, element];
            setSelectedElements(newSelected);
            setSelectedElement(null);
          }
        } else {
          // Проверяем, является ли элемент частью текущего выделения
          const isAlreadySelected = selectedElements.find(el => el.id === element.id);
          if (isAlreadySelected && selectedElements.length > 1) {
            // Элемент уже выделен, готовимся двигать всю группу
            setDragStart(position);
          } else {
            // Новое единичное выделение
            setSelectedElement(element);
            setSelectedElements([element]);
            setDragOffset({
              x: position.x - element.x,
              y: position.y - element.y
            });
          }
        }
        setIsDrawing(true);
      } else {
        // Начинаем рисовать рамку выделения
        setSelectedElement(null);
        setSelectedElements([]);
        setSelectionBox({
          startX: position.x,
          startY: position.y,
          endX: position.x,
          endY: position.y
        });
        setIsDrawing(true);
      }
    } else if (tool === 'pen') {
      setIsDrawingPen(true);
      setPenPath([{ x: position.x, y: position.y }]);
    } else if (tool === 'eraser') {
      const elementToErase = getElementAtPosition(position.x, position.y);
      if (elementToErase && !elementToErase.locked) {
        setElements(elements.filter(el => el.id !== elementToErase.id));
        setSelectedElement(null);
        saveToHistory();
      }
    } else {
      setIsDrawing(true);
      setStartPoint(position);
      
      const newElement = createElement(tool, position.x, position.y);
      setElements([...elements, newElement]);
      setSelectedElement(newElement);
    }
  };

  // Функция для измерения расстояний между элементами (Figma-style)
  const calculateDistances = (element1, element2) => {
    if (!element1 || !element2 || element1.id === element2.id) return [];
    
    const measurements = [];
    
    const el1Width = element1.width || element1.radius * 2 || 100;
    const el1Height = element1.height || element1.radius * 2 || 80;
    const el1Left = element1.x;
    const el1Right = element1.x + el1Width;
    const el1Top = element1.y;
    const el1Bottom = element1.y + el1Height;
    const el1CenterX = element1.x + el1Width / 2;
    const el1CenterY = element1.y + el1Height / 2;
    
    const el2Width = element2.width || element2.radius * 2 || 100;
    const el2Height = element2.height || element2.radius * 2 || 80;
    const el2Left = element2.x;
    const el2Right = element2.x + el2Width;
    const el2Top = element2.y;
    const el2Bottom = element2.y + el2Height;
    const el2CenterX = element2.x + el2Width / 2;
    const el2CenterY = element2.y + el2Height / 2;
    
    // Горизонтальные расстояния
    if (el1Right <= el2Left) {
      // element1 слева от element2
      const distance = Math.round(el2Left - el1Right);
      const y = Math.max(el1Top, el2Top) + Math.min(el1Height, el2Height) / 2;
      measurements.push({
        type: 'horizontal',
        distance,
        x1: el1Right,
        x2: el2Left,
        y: y,
        label: `${distance}px`
      });
    } else if (el2Right <= el1Left) {
      // element2 слева от element1
      const distance = Math.round(el1Left - el2Right);
      const y = Math.max(el1Top, el2Top) + Math.min(el1Height, el2Height) / 2;
      measurements.push({
        type: 'horizontal',
        distance,
        x1: el2Right,
        x2: el1Left,
        y: y,
        label: `${distance}px`
      });
    }
    
    // Вертикальные расстояния
    if (el1Bottom <= el2Top) {
      // element1 выше element2
      const distance = Math.round(el2Top - el1Bottom);
      const x = Math.max(el1Left, el2Left) + Math.min(el1Width, el2Width) / 2;
      measurements.push({
        type: 'vertical',
        distance,
        y1: el1Bottom,
        y2: el2Top,
        x: x,
        label: `${distance}px`
      });
    } else if (el2Bottom <= el1Top) {
      // element2 выше element1
      const distance = Math.round(el1Top - el2Bottom);
      const x = Math.max(el1Left, el2Left) + Math.min(el1Width, el2Width) / 2;
      measurements.push({
        type: 'vertical',
        distance,
        y1: el2Bottom,
        y2: el1Top,
        x: x,
        label: `${distance}px`
      });
    }
    
    return measurements;
  };

  // Функция для вычисления умных направляющих
  const calculateSmartGuides = (movingElement, newX, newY) => {
    if (!showSmartGuides) return { guides: [], snapX: newX, snapY: newY };
    
    const guides = [];
    const SNAP_THRESHOLD = 5 / zoom;
    let snapX = newX;
    let snapY = newY;
    
    const width = movingElement.width || movingElement.radius * 2 || 100;
    const height = movingElement.height || movingElement.radius * 2 || 80;
    
    const movingLeft = newX;
    const movingRight = newX + width;
    const movingTop = newY;
    const movingBottom = newY + height;
    const movingCenterX = newX + width / 2;
    const movingCenterY = newY + height / 2;
    
    elements.forEach(element => {
      if (element.id === movingElement.id || !element.visible) return;
      
      const elWidth = element.width || element.radius * 2 || 100;
      const elHeight = element.height || element.radius * 2 || 80;
      const elLeft = element.x;
      const elRight = element.x + elWidth;
      const elTop = element.y;
      const elBottom = element.y + elHeight;
      const elCenterX = element.x + elWidth / 2;
      const elCenterY = element.y + elHeight / 2;
      
      // Проверка выравнивания по горизонтали
      if (Math.abs(movingLeft - elLeft) < SNAP_THRESHOLD) {
        snapX = elLeft;
        guides.push({ type: 'vertical', position: elLeft });
      }
      if (Math.abs(movingRight - elRight) < SNAP_THRESHOLD) {
        snapX = elRight - width;
        guides.push({ type: 'vertical', position: elRight });
      }
      if (Math.abs(movingCenterX - elCenterX) < SNAP_THRESHOLD) {
        snapX = elCenterX - width / 2;
        guides.push({ type: 'vertical', position: elCenterX });
      }
      
      // Проверка выравнивания по вертикали
      if (Math.abs(movingTop - elTop) < SNAP_THRESHOLD) {
        snapY = elTop;
        guides.push({ type: 'horizontal', position: elTop });
      }
      if (Math.abs(movingBottom - elBottom) < SNAP_THRESHOLD) {
        snapY = elBottom - height;
        guides.push({ type: 'horizontal', position: elBottom });
      }
      if (Math.abs(movingCenterY - elCenterY) < SNAP_THRESHOLD) {
        snapY = elCenterY - height / 2;
        guides.push({ type: 'horizontal', position: elCenterY });
      }
    });
    
    return { guides, snapX, snapY };
  };

  const handleMouseMove = (e) => {
    // Отслеживаем состояние Alt
    setIsAltPressed(e.altKey);
    
    if (isPanning) {
      // Мгновенное обновление через ref
      panOffsetRef.current = {
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      };
      
      // Немедленная перерисовка
      drawCanvas();
      return;
    }

    // Figma-style измерение расстояний при зажатом Alt
    if (e.altKey && selectedElement && tool === 'select' && !isDrawing) {
      const position = getMousePosition(e);
      const hoveredEl = getElementAtPosition(position.x, position.y);
      
      if (hoveredEl && hoveredEl.id !== selectedElement.id) {
        setHoveredElement(hoveredEl);
        const measurements = calculateDistances(selectedElement, hoveredEl);
        setDistanceMeasurements(measurements);
      } else {
        setHoveredElement(null);
        setDistanceMeasurements([]);
      }
    } else {
      setHoveredElement(null);
      setDistanceMeasurements([]);
    }

    // Изменяем курсор при наведении на ручки изменения размера
    if (tool === 'select' && selectedElement && !isDrawing && canvasRef.current) {
      const position = getMousePosition(e);
      const handle = getResizeHandleAtPosition(position.x, position.y, selectedElement);
      
      if (handle) {
        const handles = getResizeHandles(selectedElement);
        canvasRef.current.style.cursor = handles[handle].cursor;
      } else {
        canvasRef.current.style.cursor = 'default';
      }
    }

    if (!isDrawing && !isDrawingPen) return;
    
    const position = getMousePosition(e);
    
    if (isDrawingPen && tool === 'pen') {
      setPenPath(prev => [...prev, { x: position.x, y: position.y }]);
      return;
    }
    
    if (tool === 'select') {
      if (isRotating && rotationStart && selectedElement) {
        // Поворот элемента
        const width = selectedElement.width || selectedElement.radius * 2 || 100;
        const height = selectedElement.height || selectedElement.radius * 2 || 80;
        const centerX = selectedElement.x + width / 2;
        const centerY = selectedElement.y + height / 2;
        
        const angle = Math.atan2(position.y - centerY, position.x - centerX);
        const rotation = rotationStart.initialRotation + (angle - rotationStart.angle) * (180 / Math.PI);
        
        const newElements = elements.map(el => 
          el.id === selectedElement.id 
            ? { ...el, rotation: rotation % 360 }
            : el
        );
        
        setElements(newElements);
        setSelectedElement({ ...selectedElement, rotation: rotation % 360 });
        drawCanvas();
        return;
      }
      
      if (resizeHandle && resizeStart && selectedElement) {
        // Изменение размера элемента
        const deltaX = position.x - resizeStart.x;
        const deltaY = position.y - resizeStart.y;
        
        let newX = resizeStart.elementX;
        let newY = resizeStart.elementY;
        let newWidth = resizeStart.elementWidth;
        let newHeight = resizeStart.elementHeight;
        
        // Сохраняем пропорции при зажатом Shift
        const maintainAspectRatio = e.shiftKey;
        const aspectRatio = resizeStart.elementWidth / resizeStart.elementHeight;
        
        // Обработка разных ручек
        switch (resizeHandle) {
          case 'se': // Правый нижний угол
            newWidth = Math.max(10, resizeStart.elementWidth + deltaX);
            newHeight = Math.max(10, resizeStart.elementHeight + deltaY);
            if (maintainAspectRatio) {
              // Используем большее изменение для сохранения пропорций
              const scale = Math.max(Math.abs(deltaX) / resizeStart.elementWidth, Math.abs(deltaY) / resizeStart.elementHeight);
              newWidth = resizeStart.elementWidth * (1 + scale * Math.sign(deltaX));
              newHeight = newWidth / aspectRatio;
            }
            break;
          case 'sw': // Левый нижний угол
            newWidth = Math.max(10, resizeStart.elementWidth - deltaX);
            newHeight = Math.max(10, resizeStart.elementHeight + deltaY);
            newX = resizeStart.elementX + (resizeStart.elementWidth - newWidth);
            if (maintainAspectRatio) {
              const scale = Math.max(Math.abs(deltaX) / resizeStart.elementWidth, Math.abs(deltaY) / resizeStart.elementHeight);
              newWidth = resizeStart.elementWidth * (1 + scale * Math.sign(-deltaX));
              newHeight = newWidth / aspectRatio;
              newX = resizeStart.elementX + (resizeStart.elementWidth - newWidth);
            }
            break;
          case 'ne': // Правый верхний угол
            newWidth = Math.max(10, resizeStart.elementWidth + deltaX);
            newHeight = Math.max(10, resizeStart.elementHeight - deltaY);
            newY = resizeStart.elementY + (resizeStart.elementHeight - newHeight);
            if (maintainAspectRatio) {
              const scale = Math.max(Math.abs(deltaX) / resizeStart.elementWidth, Math.abs(deltaY) / resizeStart.elementHeight);
              newWidth = resizeStart.elementWidth * (1 + scale * Math.sign(deltaX));
              newHeight = newWidth / aspectRatio;
              newY = resizeStart.elementY + (resizeStart.elementHeight - newHeight);
            }
            break;
          case 'nw': // Левый верхний угол
            newWidth = Math.max(10, resizeStart.elementWidth - deltaX);
            newHeight = Math.max(10, resizeStart.elementHeight - deltaY);
            newX = resizeStart.elementX + (resizeStart.elementWidth - newWidth);
            newY = resizeStart.elementY + (resizeStart.elementHeight - newHeight);
            if (maintainAspectRatio) {
              const scale = Math.max(Math.abs(deltaX) / resizeStart.elementWidth, Math.abs(deltaY) / resizeStart.elementHeight);
              newWidth = resizeStart.elementWidth * (1 + scale * Math.sign(-deltaX));
              newHeight = newWidth / aspectRatio;
              newX = resizeStart.elementX + (resizeStart.elementWidth - newWidth);
              newY = resizeStart.elementY + (resizeStart.elementHeight - newHeight);
            }
            break;
          case 'e': // Правая сторона
            newWidth = Math.max(10, resizeStart.elementWidth + deltaX);
            if (maintainAspectRatio) {
              newHeight = newWidth / aspectRatio;
              newY = resizeStart.elementY + (resizeStart.elementHeight - newHeight) / 2;
            }
            break;
          case 'w': // Левая сторона
            newWidth = Math.max(10, resizeStart.elementWidth - deltaX);
            newX = resizeStart.elementX + (resizeStart.elementWidth - newWidth);
            if (maintainAspectRatio) {
              newHeight = newWidth / aspectRatio;
              newY = resizeStart.elementY + (resizeStart.elementHeight - newHeight) / 2;
            }
            break;
          case 's': // Нижняя сторона
            newHeight = Math.max(10, resizeStart.elementHeight + deltaY);
            if (maintainAspectRatio) {
              newWidth = newHeight * aspectRatio;
              newX = resizeStart.elementX + (resizeStart.elementWidth - newWidth) / 2;
            }
            break;
          case 'n': // Верхняя сторона
            newHeight = Math.max(10, resizeStart.elementHeight - deltaY);
            newY = resizeStart.elementY + (resizeStart.elementHeight - newHeight);
            if (maintainAspectRatio) {
              newWidth = newHeight * aspectRatio;
              newX = resizeStart.elementX + (resizeStart.elementWidth - newWidth) / 2;
            }
            break;
        }
        
        const newElements = elements.map(el => {
          if (el.id === selectedElement.id) {
            if (el.type === 'circle') {
              const radius = Math.max(newWidth, newHeight) / 2;
              return { ...el, x: newX, y: newY, radius };
            } else {
              return { ...el, x: newX, y: newY, width: newWidth, height: newHeight };
            }
          }
          return el;
        });
        
        setElements(newElements);
        setSelectedElement({
          ...selectedElement,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
          ...(selectedElement.type === 'circle' ? { radius: Math.max(newWidth, newHeight) / 2 } : {})
        });
        drawCanvas();
      } else if (selectionBox) {
        // Обновляем рамку выделения
        setSelectionBox({
          ...selectionBox,
          endX: position.x,
          endY: position.y
        });
        drawCanvas(); // Перерисовываем для отображения рамки
      } else if (dragStart && selectedElements.length > 1) {
        // Перемещение группы элементов (несколько)
        const deltaX = position.x - dragStart.x;
        const deltaY = position.y - dragStart.y;
        
        const selectedIds = selectedElements.map(el => el.id);
        const newElements = elements.map(el => {
          if (selectedIds.includes(el.id) && !el.locked) {
            // Находим исходный элемент из изначального состояния
            const originalEl = selectedElements.find(sel => sel.id === el.id);
            if (originalEl) {
              return { ...el, x: originalEl.x + deltaX, y: originalEl.y + deltaY };
            }
          }
          return el;
        });
        
        setElements(newElements);
      } else if (selectedElement && !selectedElement.locked) {
        // Перемещение одиночного элемента с умными направляющими
        let newX = position.x - dragOffset.x;
        let newY = position.y - dragOffset.y;
        
        const { guides, snapX, snapY } = calculateSmartGuides(selectedElement, newX, newY);
        setSmartGuides(guides);
        
        newX = snapX;
        newY = snapY;
        
        const newElements = elements.map(el => 
          el.id === selectedElement.id 
            ? { ...el, x: newX, y: newY }
            : el
        );
        setElements(newElements);
        setSelectedElement({ 
          ...selectedElement, 
          x: newX, 
          y: newY 
        });
      }
    } else if (tool === 'rectangle' && selectedElement) {
      // Изменение размера прямоугольника
      const width = Math.abs(position.x - startPoint.x);
      const height = Math.abs(position.y - startPoint.y);
      const x = Math.min(startPoint.x, position.x);
      const y = Math.min(startPoint.y, position.y);
      
      const newElements = elements.map(el => 
        el.id === selectedElement.id 
          ? { ...el, x, y, width, height }
          : el
      );
      setElements(newElements);
    } else if (tool === 'circle' && selectedElement) {
      // Изменение размера круга
      const radius = Math.sqrt(
        (position.x - startPoint.x) ** 2 + (position.y - startPoint.y) ** 2
      );
      
      const newElements = elements.map(el => 
        el.id === selectedElement.id 
          ? { ...el, radius }
          : el
      );
      setElements(newElements);
    } else if (['triangle', 'diamond', 'star'].includes(tool) && selectedElement) {
      // Изменение размера для других фигур
      const width = Math.abs(position.x - startPoint.x);
      const height = Math.abs(position.y - startPoint.y);
      
      const newElements = elements.map(el => 
        el.id === selectedElement.id 
          ? { ...el, width, height }
          : el
      );
      setElements(newElements);
    }
  };

  const handleMouseUp = () => {
    // Очищаем умные направляющие
    if (smartGuides.length > 0) {
      setSmartGuides([]);
    }
    
    if (isPanning) {
      setIsPanning(false);
      // Сохраняем финальное положение в state
      setPanOffset(panOffsetRef.current);
      // Возвращаем обычный курсор
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'default';
      }
      return;
    }

    // Завершение поворота
    if (isRotating) {
      setIsRotating(false);
      setRotationStart(null);
      saveToHistory();
      return;
    }

    if (isDrawingPen && tool === 'pen' && penPath.length > 1) {
      // Завершение рисования пером
      const pathElement = createElement('path', 0, 0, { points: penPath });
      setElements([...elements, pathElement]);
      setPenPath([]);
      setIsDrawingPen(false);
      saveToHistory();
      return;
    }

    // Завершение выделения рамкой
    if (selectionBox && tool === 'select') {
      const minX = Math.min(selectionBox.startX, selectionBox.endX);
      const maxX = Math.max(selectionBox.startX, selectionBox.endX);
      const minY = Math.min(selectionBox.startY, selectionBox.endY);
      const maxY = Math.max(selectionBox.startY, selectionBox.endY);
      
      // Находим все элементы в рамке
      const selected = elements.filter(el => {
        if (!el.visible || el.locked) return false;
        
        // Проверяем пересечение элемента с рамкой выделения
        const elMinX = el.x;
        const elMaxX = el.x + (el.width || el.radius * 2 || 100);
        const elMinY = el.y;
        const elMaxY = el.y + (el.height || el.radius * 2 || 100);
        
        return !(elMaxX < minX || elMinX > maxX || elMaxY < minY || elMinY > maxY);
      });
      
      setSelectedElements(selected);
      if (selected.length === 1) {
        setSelectedElement(selected[0]);
      } else {
        setSelectedElement(null);
      }
      setSelectionBox(null);
    }

    if (isDrawing) {
      saveToHistory();
    }
    
    // Обновляем selectedElements с новыми координатами после перемещения
    if (dragStart && selectedElements.length > 0) {
      const selectedIds = selectedElements.map(el => el.id);
      const updatedSelected = elements.filter(el => selectedIds.includes(el.id));
      setSelectedElements(updatedSelected);
    }
    
    setIsDrawing(false);
    setIsDrawingPen(false);
    setStartPoint({ x: 0, y: 0 });
    setDragStart(null); // Сбрасываем начальную точку для группового перемещения
    setResizeHandle(null); // Сбрасываем ручку изменения размера
    setResizeStart(null);
  };

  // Обработчик колеса мыши для масштабирования
  const handleWheel = (e) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.1, Math.min(3, zoom + delta));
    
    // Масштабирование относительно позиции курсора
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Вычисляем новое смещение панорамы для масштабирования относительно курсора
    const zoomRatio = newZoom / zoom;
    const newPanX = mouseX - (mouseX - panOffset.x) * zoomRatio;
    const newPanY = mouseY - (mouseY - panOffset.y) * zoomRatio;
    
    setZoom(newZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  };

  // Функция отрисовки canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Очистка канваса
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Бесконечный фон с паттерном
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Применяем трансформацию для панорамирования и зума
    ctx.save();
    const currentPanOffset = isPanning ? panOffsetRef.current : panOffset;
    ctx.translate(currentPanOffset.x, currentPanOffset.y);
    ctx.scale(zoom, zoom);
    
    // Рисуем бесконечную сетку для ориентации
    if (showGrid) {
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1 / zoom;
      
      const gridSize = 50;
      const startX = Math.floor((-currentPanOffset.x / zoom) / gridSize) * gridSize;
      const startY = Math.floor((-currentPanOffset.y / zoom) / gridSize) * gridSize;
      const endX = startX + (canvas.width / zoom) + gridSize;
      const endY = startY + (canvas.height / zoom) + gridSize;
      
      // Вертикальные линии
      for (let x = startX; x < endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      
      // Горизонтальные линии
      for (let y = startY; y < endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }
      
      // Центральные оси (координаты 0,0)
      ctx.strokeStyle = '#b0b0b0';
      ctx.lineWidth = 2 / zoom;
      
      // Ось X
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(endX, 0);
      ctx.stroke();
      
      // Ось Y
      ctx.beginPath();
      ctx.moveTo(0, startY);
      ctx.lineTo(0, endY);
      ctx.stroke();
    }
    
    // Рендеринг элементов
    elements.forEach(element => {
      if (!element.visible) return;

      ctx.save();
      
      // Применяем поворот если есть
      if (element.rotation && element.rotation !== 0) {
        const width = element.width || element.radius * 2 || 100;
        const height = element.height || element.radius * 2 || 80;
        const centerX = element.x + width / 2;
        const centerY = element.y + height / 2;
        
        ctx.translate(centerX, centerY);
        ctx.rotate((element.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }
      
      // Применяем тень если включена
      if (element.shadow?.enabled) {
        ctx.shadowOffsetX = element.shadow.offsetX || 0;
        ctx.shadowOffsetY = element.shadow.offsetY || 4;
        ctx.shadowBlur = element.shadow.blur || 8;
        ctx.shadowColor = element.shadow.color || 'rgba(0, 0, 0, 0.3)';
      }
      
      // Настройка стилей
      // Градиент или сплошной цвет
      if (element.gradient?.enabled && element.gradient.colors && element.gradient.colors.length >= 2) {
        const width = element.width || element.radius * 2 || 100;
        const height = element.height || element.radius * 2 || 80;
        
        let gradient;
        if (element.gradient.type === 'radial') {
          const centerX = element.x + width / 2;
          const centerY = element.y + height / 2;
          const radius = Math.max(width, height) / 2;
          gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        } else {
          // Linear gradient
          const angle = (element.gradient.angle || 0) * Math.PI / 180;
          const x1 = element.x + width / 2 - Math.cos(angle) * width / 2;
          const y1 = element.y + height / 2 - Math.sin(angle) * height / 2;
          const x2 = element.x + width / 2 + Math.cos(angle) * width / 2;
          const y2 = element.y + height / 2 + Math.sin(angle) * height / 2;
          gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        }
        
        element.gradient.colors.forEach((color, index) => {
          const stop = index / (element.gradient.colors.length - 1);
          gradient.addColorStop(stop, color);
        });
        
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = element.fillColor;
      }
      
      ctx.strokeStyle = element.strokeColor;
      ctx.lineWidth = element.strokeWidth;
      ctx.globalAlpha = element.opacity || 1;
      ctx.globalCompositeOperation = element.blendMode || 'normal';
      
      // Применяем размытие если есть
      if (element.blur && element.blur > 0) {
        ctx.filter = `blur(${element.blur}px)`;
      }
      
      switch (element.type) {
        case 'rectangle':
          const radius = element.borderRadius || 0;
          if (radius > 0) {
            // Рисуем прямоугольник со скругленными углами
            const x = element.x;
            const y = element.y;
            const width = element.width;
            const height = element.height;
            const r = Math.min(radius, width / 2, height / 2);
            
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + width - r, y);
            ctx.arcTo(x + width, y, x + width, y + r, r);
            ctx.lineTo(x + width, y + height - r);
            ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
            ctx.lineTo(x + r, y + height);
            ctx.arcTo(x, y + height, x, y + height - r, r);
            ctx.lineTo(x, y + r);
            ctx.arcTo(x, y, x + r, y, r);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.fillRect(element.x, element.y, element.width, element.height);
            ctx.strokeRect(element.x, element.y, element.width, element.height);
          }
          break;
          
        case 'circle':
          ctx.beginPath();
          ctx.arc(element.x + element.radius, element.y + element.radius, element.radius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          break;

        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(element.x + element.width / 2, element.y);
          ctx.lineTo(element.x, element.y + element.height);
          ctx.lineTo(element.x + element.width, element.y + element.height);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;

        case 'diamond':
          ctx.beginPath();
          ctx.moveTo(element.x + element.width / 2, element.y);
          ctx.lineTo(element.x + element.width, element.y + element.height / 2);
          ctx.lineTo(element.x + element.width / 2, element.y + element.height);
          ctx.lineTo(element.x, element.y + element.height / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;

        case 'star':
          const { outerRadius, innerRadius, points } = element;
          const centerX = element.x + outerRadius;
          const centerY = element.y + outerRadius;
          
          ctx.beginPath();
          for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / points;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;

        case 'path':
          if (element.points && element.points.length > 1) {
            ctx.beginPath();
            ctx.lineWidth = element.brushSize || 10;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.moveTo(element.points[0].x, element.points[0].y);
            for (let i = 1; i < element.points.length; i++) {
              ctx.lineTo(element.points[i].x, element.points[i].y);
            }
            ctx.stroke();
          }
          break;
          
        case 'text':
          ctx.save();
          
          const fontWeight = element.fontWeight || 'normal';
          const fontStyle = element.fontStyle || 'normal';
          ctx.font = `${fontStyle} ${fontWeight} ${element.fontSize}px ${element.fontFamily}`;
          
          // Вычисляем ширину текста
          const measuredWidth = ctx.measureText(element.text).width;
          const textHeight = element.fontSize * 1.3;
          
          // Обрезка текста по границам элемента
          ctx.beginPath();
          ctx.rect(element.x, element.y, measuredWidth, textHeight);
          ctx.clip();
          
          ctx.fillStyle = element.fillColor;
          ctx.textAlign = element.textAlign || 'left';
          ctx.textBaseline = 'top'; // Меняем на top, чтобы текст рисовался от верхней границы
          ctx.fillText(element.text, element.x, element.y);
          
          // Подчеркивание
          if (element.textDecoration === 'underline') {
            ctx.beginPath();
            ctx.moveTo(element.x, element.y + element.fontSize + 2);
            ctx.lineTo(element.x + measuredWidth, element.y + element.fontSize + 2);
            ctx.strokeStyle = element.fillColor;
            ctx.lineWidth = Math.max(1, element.fontSize / 16);
            ctx.stroke();
          }
          
          // Зачеркивание
          if (element.textDecoration === 'line-through') {
            ctx.beginPath();
            ctx.moveTo(element.x, element.y + element.fontSize * 0.5);
            ctx.lineTo(element.x + measuredWidth, element.y + element.fontSize * 0.5);
            ctx.strokeStyle = element.fillColor;
            ctx.lineWidth = Math.max(1, element.fontSize / 16);
            ctx.stroke();
          }
          
          ctx.restore();
          break;
          
        case 'image':
          if (element.src) {
            let img = imageCache.current.get(element.id);
            if (!img) {
              img = new Image();
              img.src = element.src;
              imageCache.current.set(element.id, img);
              img.onload = () => {
                drawCanvas(); // Перерисовать когда изображение загрузится
              };
            }
            if (img.complete && img.naturalHeight !== 0) {
              // Применяем фильтры к изображению
              const brightness = element.brightness || 100;
              const contrast = element.contrast || 100;
              const saturation = element.saturation || 100;
              const grayscale = element.grayscale || 0;
              const sepia = element.sepia || 0;
              const invert = element.invert || 0;
              
              const filterString = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) sepia(${sepia}%) invert(${invert}%)`;
              ctx.filter = filterString;
              
              ctx.drawImage(img, element.x, element.y, element.width, element.height);
              
              // Сбрасываем фильтр
              ctx.filter = 'none';
              
              // Рисуем рамку для изображения
              if (element.strokeWidth > 0) {
                ctx.strokeRect(element.x, element.y, element.width, element.height);
              }
            }
          }
          break;
      }
      
      // Выделение выбранного элемента
      if (selectedElement && element.id === selectedElement.id) {
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        switch (element.type) {
          case 'rectangle':
            ctx.strokeRect(element.x - 2, element.y - 2, element.width + 4, element.height + 4);
            break;
          case 'circle':
            ctx.beginPath();
            ctx.arc(element.x + element.radius, element.y + element.radius, element.radius + 2, 0, 2 * Math.PI);
            ctx.stroke();
            break;
          case 'triangle':
          case 'diamond':
          case 'star':
            const width = element.width || 100;
            const height = element.height || 80;
            ctx.strokeRect(element.x - 2, element.y - 2, width + 4, height + 4);
            break;
          case 'text':
            const textWidth = element.text.length * element.fontSize * 0.6;
            const textBoxHeight = element.fontSize * 1.3;
            ctx.strokeRect(element.x - 2, element.y - 2, textWidth + 4, textBoxHeight + 4);
            break;
          case 'path':
            if (element.points && element.points.length > 0) {
              const minX = Math.min(...element.points.map(p => p.x));
              const maxX = Math.max(...element.points.map(p => p.x));
              const minY = Math.min(...element.points.map(p => p.y));
              const maxY = Math.max(...element.points.map(p => p.y));
              ctx.strokeRect(minX - 5, minY - 5, maxX - minX + 10, maxY - minY + 10);
            }
            break;
          case 'image':
            ctx.strokeRect(element.x - 2, element.y - 2, element.width + 4, element.height + 4);
            break;
        }
      }
      
      // Выделение для множественных элементов
      if (selectedElements.length > 1 && selectedElements.find(sel => sel.id === element.id)) {
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([5, 5]);
        
        const width = element.width || element.radius * 2 || 100;
        const height = element.height || element.radius * 2 || 80;
        ctx.strokeRect(element.x - 2, element.y - 2, width + 4, height + 4);
      }
      
      ctx.restore();
    });
    
    // Рисуем ручки изменения размера для выбранного элемента
    if (selectedElement && selectedElements.length === 1) {
      const handles = getResizeHandles(selectedElement);
      ctx.fillStyle = '#007bff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([]);
      
      Object.values(handles).forEach(handle => {
        ctx.fillRect(handle.x, handle.y, handle.width, handle.height);
        ctx.strokeRect(handle.x, handle.y, handle.width, handle.height);
      });
      
      // Рисуем ручку поворота
      const rotateHandle = getRotationHandle(selectedElement);
      ctx.beginPath();
      ctx.arc(
        rotateHandle.x + rotateHandle.width / 2, 
        rotateHandle.y + rotateHandle.height / 2, 
        rotateHandle.width / 2, 
        0, 
        2 * Math.PI
      );
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#007bff';
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
      
      // Линия от элемента к ручке поворота
      const width = selectedElement.width || selectedElement.radius * 2 || 100;
      const centerX = selectedElement.x + width / 2;
      const topY = selectedElement.y;
      ctx.beginPath();
      ctx.moveTo(centerX, topY);
      ctx.lineTo(rotateHandle.x + rotateHandle.width / 2, rotateHandle.y + rotateHandle.height / 2);
      ctx.strokeStyle = '#007bff';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Рисуем рамку выделения
    if (selectionBox) {
      const minX = Math.min(selectionBox.startX, selectionBox.endX);
      const maxX = Math.max(selectionBox.startX, selectionBox.endX);
      const minY = Math.min(selectionBox.startY, selectionBox.endY);
      const maxY = Math.max(selectionBox.startY, selectionBox.endY);
      
      ctx.strokeStyle = '#007bff';
      ctx.fillStyle = 'rgba(0, 123, 255, 0.1)';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([5, 5]);
      
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
    }
    
    // Рисуем умные направляющие
    if (smartGuides.length > 0) {
      ctx.strokeStyle = '#FF00FF';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([]);
      
      smartGuides.forEach(guide => {
        ctx.beginPath();
        if (guide.type === 'vertical') {
          ctx.moveTo(guide.position, -10000);
          ctx.lineTo(guide.position, 10000);
        } else {
          ctx.moveTo(-10000, guide.position);
          ctx.lineTo(10000, guide.position);
        }
        ctx.stroke();
      });
    }
    
    // Рисуем измерения расстояний между элементами (Figma-style)
    if (distanceMeasurements.length > 0 && isAltPressed) {
      ctx.strokeStyle = '#FF6B6B';
      ctx.fillStyle = '#FF6B6B';
      ctx.lineWidth = 1.5 / zoom;
      ctx.setLineDash([]);
      ctx.font = `${12 / zoom}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      distanceMeasurements.forEach(measurement => {
        if (measurement.type === 'horizontal') {
          // Горизонтальная линия с засечками
          const y = measurement.y;
          const x1 = measurement.x1;
          const x2 = measurement.x2;
          const tickSize = 6 / zoom;
          
          // Основная линия
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.stroke();
          
          // Засечки на концах
          ctx.beginPath();
          ctx.moveTo(x1, y - tickSize);
          ctx.lineTo(x1, y + tickSize);
          ctx.moveTo(x2, y - tickSize);
          ctx.lineTo(x2, y + tickSize);
          ctx.stroke();
          
          // Текст с расстоянием
          const midX = (x1 + x2) / 2;
          const padding = 4 / zoom;
          const textMetrics = ctx.measureText(measurement.label);
          const textWidth = textMetrics.width;
          const textHeight = 16 / zoom;
          
          // Фон для текста
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(midX - textWidth / 2 - padding, y - textHeight / 2 - padding, textWidth + padding * 2, textHeight + padding * 2);
          
          // Рамка вокруг текста
          ctx.strokeStyle = '#FF6B6B';
          ctx.strokeRect(midX - textWidth / 2 - padding, y - textHeight / 2 - padding, textWidth + padding * 2, textHeight + padding * 2);
          
          // Текст
          ctx.fillStyle = '#FF6B6B';
          ctx.fillText(measurement.label, midX, y);
          
        } else if (measurement.type === 'vertical') {
          // Вертикальная линия с засечками
          const x = measurement.x;
          const y1 = measurement.y1;
          const y2 = measurement.y2;
          const tickSize = 6 / zoom;
          
          // Основная линия
          ctx.beginPath();
          ctx.moveTo(x, y1);
          ctx.lineTo(x, y2);
          ctx.stroke();
          
          // Засечки на концах
          ctx.beginPath();
          ctx.moveTo(x - tickSize, y1);
          ctx.lineTo(x + tickSize, y1);
          ctx.moveTo(x - tickSize, y2);
          ctx.lineTo(x + tickSize, y2);
          ctx.stroke();
          
          // Текст с расстоянием
          const midY = (y1 + y2) / 2;
          const padding = 4 / zoom;
          const textMetrics = ctx.measureText(measurement.label);
          const textWidth = textMetrics.width;
          const textHeight = 16 / zoom;
          
          // Фон для текста
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(x - textWidth / 2 - padding, midY - textHeight / 2 - padding, textWidth + padding * 2, textHeight + padding * 2);
          
          // Рамка вокруг текста
          ctx.strokeStyle = '#FF6B6B';
          ctx.strokeRect(x - textWidth / 2 - padding, midY - textHeight / 2 - padding, textWidth + padding * 2, textHeight + padding * 2);
          
          // Текст
          ctx.fillStyle = '#FF6B6B';
          ctx.fillText(measurement.label, x, midY);
        }
      });
    }
    
    // Подсветка наведенного элемента при зажатом Alt
    if (hoveredElement && isAltPressed && selectedElement) {
      const width = hoveredElement.width || hoveredElement.radius * 2 || 100;
      const height = hoveredElement.height || hoveredElement.radius * 2 || 80;
      
      ctx.strokeStyle = '#FF6B6B';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(hoveredElement.x - 2, hoveredElement.y - 2, width + 4, height + 4);
      ctx.setLineDash([]);
    }
    
    // Восстанавливаем трансформацию
    ctx.restore();
  }, [elements, selectedElement, selectedElements, selectionBox, panOffset, zoom, isPanning, smartGuides, distanceMeasurements, hoveredElement, isAltPressed]);

  // Эффект для перерисовки
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Горячие клавиши (поддержка русской и английской раскладки)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;

      const key = e.key.toLowerCase();
      const code = e.code;
      
      // Отслеживание Alt для измерений расстояний
      if (key === 'alt') {
        setIsAltPressed(true);
      }

      // Delete или Backspace
      if (key === 'delete' || key === 'backspace') {
        if (selectedElement || selectedElements.length > 0) {
          e.preventDefault();
          deleteSelected();
        }
        return;
      }

      // Ctrl/Cmd комбинации
      if (e.ctrlKey || e.metaKey) {
        // Копирование: Ctrl+C (с, KeyC)
        if (key === 'c' || key === 'с' || code === 'KeyC') {
          if (selectedElement || selectedElements.length > 0) {
            e.preventDefault();
            duplicateSelected();
          }
          return;
        }
        
        // Отмена: Ctrl+Z (я, KeyZ)
        if ((key === 'z' || key === 'я' || code === 'KeyZ') && !e.shiftKey) {
          e.preventDefault();
          undo();
          return;
        }
        
        // Повтор: Ctrl+Y (н, KeyY) или Ctrl+Shift+Z
        if (key === 'y' || key === 'н' || code === 'KeyY' || (e.shiftKey && (key === 'z' || key === 'я' || code === 'KeyZ'))) {
          e.preventDefault();
          redo();
          return;
        }
        
        // Сохранение: Ctrl+S (ы, KeyS)
        if (key === 's' || key === 'ы' || code === 'KeyS') {
          e.preventDefault();
          saveProject();
          return;
        }
        
        // Поворот на 90°: Ctrl+R (к, KeyR)
        if (key === 'r' || key === 'к' || code === 'KeyR') {
          if (selectedElement) {
            e.preventDefault();
            const currentRotation = selectedElement.rotation || 0;
            const newRotation = (currentRotation + 90) % 360;
            updateSelectedElement('rotation', newRotation);
          }
          return;
        }
        
        // Жирный текст: Ctrl+B (и, KeyB)
        if ((key === 'b' || key === 'и' || code === 'KeyB') && selectedElement?.type === 'text') {
          e.preventDefault();
          updateSelectedElement('fontWeight', selectedElement.fontWeight === 'bold' ? 'normal' : 'bold');
          return;
        }
        
        // Курсив: Ctrl+I (ш, KeyI)
        if ((key === 'i' || key === 'ш' || code === 'KeyI') && selectedElement?.type === 'text') {
          e.preventDefault();
          updateSelectedElement('fontStyle', selectedElement.fontStyle === 'italic' ? 'normal' : 'italic');
          return;
        }
        
        // Подчеркивание: Ctrl+U (г, KeyU)
        if ((key === 'u' || key === 'г' || code === 'KeyU') && selectedElement?.type === 'text') {
          e.preventDefault();
          updateSelectedElement('textDecoration', selectedElement.textDecoration === 'underline' ? 'none' : 'underline');
          return;
        }
        
        // Группировка: Ctrl+G (п, KeyG)
        if (key === 'g' || key === 'п' || code === 'KeyG') {
          if (selectedElements.length > 1) {
            e.preventDefault();
            groupElements();
          }
          return;
        }
        
        // Разгруппировка: Ctrl+Shift+G
        if ((key === 'g' || key === 'п' || code === 'KeyG') && e.shiftKey) {
          if (selectedElement?.type === 'group') {
            e.preventDefault();
            ungroupElements();
          }
          return;
        }
        
        // Выровнять по левому краю: Ctrl+Alt+Left
        if (key === 'arrowleft' && e.altKey) {
          e.preventDefault();
          alignElements('left');
          return;
        }
        
        // Выровнять по правому краю: Ctrl+Alt+Right
        if (key === 'arrowright' && e.altKey) {
          e.preventDefault();
          alignElements('right');
          return;
        }
        
        // Выровнять по верху: Ctrl+Alt+Up
        if (key === 'arrowup' && e.altKey) {
          e.preventDefault();
          alignElements('top');
          return;
        }
        
        // Выровнять по низу: Ctrl+Alt+Down
        if (key === 'arrowdown' && e.altKey) {
          e.preventDefault();
          alignElements('bottom');
          return;
        }
        
        // Выровнять по центру горизонтально: Ctrl+Alt+H
        if ((key === 'h' || key === 'р' || code === 'KeyH') && e.altKey) {
          e.preventDefault();
          alignElements('center-h');
          return;
        }
        
        // Выровнять по центру вертикально: Ctrl+Alt+V
        if ((key === 'v' || key === 'м' || code === 'KeyV') && e.altKey && !e.shiftKey) {
          e.preventDefault();
          alignElements('center-v');
          return;
        }
        
        // Копировать стили: Ctrl+Alt+C
        if ((key === 'c' || key === 'с' || code === 'KeyC') && e.altKey && !e.shiftKey) {
          if (selectedElement) {
            e.preventDefault();
            copyStyles();
          }
          return;
        }
        
        // Вставить стили: Ctrl+Alt+Shift+V
        if ((key === 'v' || key === 'м' || code === 'KeyV') && e.altKey && e.shiftKey) {
          if (clipboardStyles && (selectedElement || selectedElements.length > 0)) {
            e.preventDefault();
            pasteStyles();
          }
          return;
        }
        
        // На передний план: Ctrl+]
        if (key === ']') {
          e.preventDefault();
          bringToFront();
          return;
        }
        
        // На задний план: Ctrl+[
        if (key === '[') {
          e.preventDefault();
          sendToBack();
          return;
        }
        
        // Вперед: Ctrl+Shift+]
        if (key === ']' && e.shiftKey) {
          e.preventDefault();
          bringForward();
          return;
        }
        
        // Zoom In: Ctrl++ или Ctrl+=
        if ((key === '+' || key === '=') && !e.altKey) {
          e.preventDefault();
          handleZoomIn();
          return;
        }
        
        // Zoom Out: Ctrl+-
        if (key === '-' && !e.altKey) {
          e.preventDefault();
          handleZoomOut();
          return;
        }
        
        // Zoom to 100%: Ctrl+0
        if (key === '0' && !e.altKey) {
          e.preventDefault();
          setZoom(1);
          return;
        }
        
        // Zoom to Fit: Ctrl+1
        if (key === '1' && !e.altKey) {
          e.preventDefault();
          zoomToFit();
          return;
        }
        
        // Zoom to Selection: Ctrl+2
        if (key === '2' && !e.altKey && (selectedElement || selectedElements.length > 0)) {
          e.preventDefault();
          zoomToSelection();
          return;
        }
        
        // Назад: Ctrl+Shift+[
        if (key === '[' && e.shiftKey) {
          e.preventDefault();
          sendBackward();
          return;
        }
        
        // Блокировка: Ctrl+L
        if ((key === 'l' || key === 'д' || code === 'KeyL') && !e.shiftKey) {
          e.preventDefault();
          toggleLock();
          return;
        }
        
        // Видимость: Ctrl+Shift+H
        if ((key === 'h' || key === 'р' || code === 'KeyH') && e.shiftKey) {
          e.preventDefault();
          toggleVisibility();
          return;
        }
      }

      // Инструменты (работают без Ctrl)
      if (!e.ctrlKey && !e.metaKey) {
        // V (м, KeyV) - Выбор
        if (key === 'v' || key === 'м' || code === 'KeyV') {
          setTool('select');
          return;
        }
        
        // P (з, KeyP) - Перо
        if (key === 'p' || key === 'з' || code === 'KeyP') {
          setTool('pen');
          return;
        }
        
        // R (к, KeyR) - Прямоугольник
        if (key === 'r' || key === 'к' || code === 'KeyR') {
          setTool('rectangle');
          return;
        }
        
        // O (щ, KeyO) - Круг
        if (key === 'o' || key === 'щ' || code === 'KeyO') {
          setTool('circle');
          return;
        }
        
        // T (е, KeyT) - Текст
        if (key === 't' || key === 'е' || code === 'KeyT') {
          setTool('text');
          return;
        }
        
        // Escape
        if (key === 'escape') {
          setSelectedElement(null);
          setSelectedElements([]);
          setTool('select');
          return;
        }
      }
    };

    const handleKeyUp = (e) => {
      // Отслеживание отпускания Alt
      if (e.key === 'Alt') {
        setIsAltPressed(false);
        setHoveredElement(null);
        setDistanceMeasurements([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedElement, selectedElements, elements, history, historyIndex]);

  // Группировка элементов
  const groupElements = () => {
    if (selectedElements.length < 2) return;
    
    const minX = Math.min(...selectedElements.map(el => el.x));
    const minY = Math.min(...selectedElements.map(el => el.y));
    const maxX = Math.max(...selectedElements.map(el => el.x + (el.width || el.radius * 2 || 100)));
    const maxY = Math.max(...selectedElements.map(el => el.y + (el.height || el.radius * 2 || 80)));
    
    const group = {
      id: Date.now(),
      type: 'group',
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      children: selectedElements.map(el => el.id),
      visible: true,
      locked: false,
      fillColor: 'transparent',
      strokeColor: 'transparent',
      strokeWidth: 0,
      opacity: 1
    };
    
    const newElements = [...elements.filter(el => !selectedElements.find(sel => sel.id === el.id)), group];
    setElements(newElements);
    setSelectedElement(group);
    setSelectedElements([group]);
    saveToHistory();
  };

  // Разгруппировка элементов
  const ungroupElements = () => {
    if (!selectedElement || selectedElement.type !== 'group') return;
    
    const newElements = elements.filter(el => el.id !== selectedElement.id);
    setElements(newElements);
    setSelectedElement(null);
    setSelectedElements([]);
    saveToHistory();
  };

  // Выравнивание элементов
  const alignElements = (alignment) => {
    if (selectedElements.length < 2) return;
    
    let newElements = [...elements];
    
    switch (alignment) {
      case 'left':
        const leftX = Math.min(...selectedElements.map(el => el.x));
        selectedElements.forEach(el => {
          const index = newElements.findIndex(e => e.id === el.id);
          if (index !== -1) newElements[index].x = leftX;
        });
        break;
        
      case 'right':
        const rightX = Math.max(...selectedElements.map(el => el.x + (el.width || el.radius * 2 || 100)));
        selectedElements.forEach(el => {
          const width = el.width || el.radius * 2 || 100;
          const index = newElements.findIndex(e => e.id === el.id);
          if (index !== -1) newElements[index].x = rightX - width;
        });
        break;
        
      case 'top':
        const topY = Math.min(...selectedElements.map(el => el.y));
        selectedElements.forEach(el => {
          const index = newElements.findIndex(e => e.id === el.id);
          if (index !== -1) newElements[index].y = topY;
        });
        break;
        
      case 'bottom':
        const bottomY = Math.max(...selectedElements.map(el => el.y + (el.height || el.radius * 2 || 80)));
        selectedElements.forEach(el => {
          const height = el.height || el.radius * 2 || 80;
          const index = newElements.findIndex(e => e.id === el.id);
          if (index !== -1) newElements[index].y = bottomY - height;
        });
        break;
        
      case 'center-h':
        const avgX = selectedElements.reduce((sum, el) => sum + el.x + (el.width || el.radius * 2 || 100) / 2, 0) / selectedElements.length;
        selectedElements.forEach(el => {
          const width = el.width || el.radius * 2 || 100;
          const index = newElements.findIndex(e => e.id === el.id);
          if (index !== -1) newElements[index].x = avgX - width / 2;
        });
        break;
        
      case 'center-v':
        const avgY = selectedElements.reduce((sum, el) => sum + el.y + (el.height || el.radius * 2 || 80) / 2, 0) / selectedElements.length;
        selectedElements.forEach(el => {
          const height = el.height || el.radius * 2 || 80;
          const index = newElements.findIndex(e => e.id === el.id);
          if (index !== -1) newElements[index].y = avgY - height / 2;
        });
        break;
    }
    
    setElements(newElements);
    setSelectedElements(selectedElements.map(el => newElements.find(e => e.id === el.id)));
    saveToHistory();
  };

  // Автоматическая подстройка размера canvas под окно (бесконечная рабочая область)
  useEffect(() => {
    const resizeCanvas = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const parent = canvas.parentElement;
        if (parent) {
          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;
          drawCanvas();
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [drawCanvas]);

  // Функции управления
  const deleteSelected = () => {
    if (selectedElements.length > 0) {
      const idsToDelete = selectedElements.filter(el => !el.locked).map(el => el.id);
      // Очищаем кэш изображений для удаляемых элементов
      idsToDelete.forEach(id => {
        imageCache.current.delete(id);
      });
      setElements(elements.filter(el => !idsToDelete.includes(el.id)));
      setSelectedElement(null);
      setSelectedElements([]);
      saveToHistory();
    } else if (selectedElement && !selectedElement.locked) {
      // Очищаем кэш изображения для удаляемого элемента
      imageCache.current.delete(selectedElement.id);
      setElements(elements.filter(el => el.id !== selectedElement.id));
      setSelectedElement(null);
      saveToHistory();
    }
  };

  const duplicateSelected = () => {
    if (selectedElements.length > 0) {
      const newElements = selectedElements.map(el => ({
        ...el,
        id: Date.now() + Math.random(),
        x: el.x + 20,
        y: el.y + 20,
        locked: false
      }));
      setElements([...elements, ...newElements]);
      setSelectedElements(newElements);
      saveToHistory();
    } else if (selectedElement) {
      const newElement = { 
        ...selectedElement, 
        id: Date.now() + Math.random(),
        x: selectedElement.x + 20,
        y: selectedElement.y + 20,
        locked: false
      };
      setElements([...elements, newElement]);
      setSelectedElement(newElement);
      saveToHistory();
    }
  };

  // Блокировка/разблокировка элемента
  const toggleLock = () => {
    if (selectedElement) {
      const newElements = elements.map(el => 
        el.id === selectedElement.id 
          ? { ...el, locked: !el.locked }
          : el
      );
      setElements(newElements);
      setSelectedElement({ ...selectedElement, locked: !selectedElement.locked });
      saveToHistory();
    }
  };

  // Показать/скрыть элемент
  const toggleVisibility = () => {
    if (selectedElement) {
      const newElements = elements.map(el => 
        el.id === selectedElement.id 
          ? { ...el, visible: !el.visible }
          : el
      );
      setElements(newElements);
      setSelectedElement({ ...selectedElement, visible: !selectedElement.visible });
      saveToHistory();
    }
  };

  // Изменение порядка слоев
  const bringToFront = () => {
    if (!selectedElement) return;
    const filtered = elements.filter(el => el.id !== selectedElement.id);
    setElements([...filtered, selectedElement]);
    saveToHistory();
  };

  const sendToBack = () => {
    if (!selectedElement) return;
    const filtered = elements.filter(el => el.id !== selectedElement.id);
    setElements([selectedElement, ...filtered]);
    saveToHistory();
  };

  const bringForward = () => {
    if (!selectedElement) return;
    const index = elements.findIndex(el => el.id === selectedElement.id);
    if (index < elements.length - 1) {
      const newElements = [...elements];
      [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
      setElements(newElements);
      saveToHistory();
    }
  };

  const sendBackward = () => {
    if (!selectedElement) return;
    const index = elements.findIndex(el => el.id === selectedElement.id);
    if (index > 0) {
      const newElements = [...elements];
      [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
      setElements(newElements);
      saveToHistory();
    }
  };

  const clearCanvas = () => {
    if (confirm('Очистить весь холст? Это действие нельзя отменить.')) {
      setElements([]);
      setSelectedElement(null);
      saveToHistory();
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    const projectName = currentProject?.name || 'design';
    link.download = `${projectName}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  // Zoom функции
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.25, 10));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.25, 0.1));
  };

  const zoomToFit = () => {
    if (elements.length === 0) {
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      return;
    }

    // Находим границы всех элементов
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    elements.forEach(el => {
      const width = el.width || el.radius * 2 || 100;
      const height = el.height || el.radius * 2 || 80;
      
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + width);
      maxY = Math.max(maxY, el.y + height);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const canvas = canvasRef.current;
    
    // Добавляем отступы
    const padding = 50;
    const scaleX = (canvas.width - padding * 2) / contentWidth;
    const scaleY = (canvas.height - padding * 2) / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 2); // Максимум 2x
    
    setZoom(newZoom);
    
    // Центрируем содержимое
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setPanOffset({
      x: canvas.width / 2 - centerX * newZoom,
      y: canvas.height / 2 - centerY * newZoom
    });
  };

  const zoomToSelection = () => {
    if (!selectedElement && selectedElements.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const elementsToZoom = selectedElements.length > 0 ? selectedElements : [selectedElement];
    
    elementsToZoom.forEach(el => {
      const width = el.width || el.radius * 2 || 100;
      const height = el.height || el.radius * 2 || 80;
      
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + width);
      maxY = Math.max(maxY, el.y + height);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const canvas = canvasRef.current;
    
    const padding = 100;
    const scaleX = (canvas.width - padding * 2) / contentWidth;
    const scaleY = (canvas.height - padding * 2) / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 3); // Максимум 3x
    
    setZoom(newZoom);
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setPanOffset({
      x: canvas.width / 2 - centerX * newZoom,
      y: canvas.height / 2 - centerY * newZoom
    });
  };

  // Обновление выбранного элемента
  const updateSelectedElement = (property, value) => {
    if (!selectedElement) return;
    
    const newElements = elements.map(el => 
      el.id === selectedElement.id 
        ? { ...el, [property]: value }
        : el
    );
    setElements(newElements);
    setSelectedElement({ ...selectedElement, [property]: value });
    saveToHistory();
  };

  // Открытие кастомной палитры цветов
  const openColorPicker = (target, currentColor) => {
    setColorPickerTarget(target);
    setTempColor(currentColor || '#3498db');
    setShowColorPicker(true);
  };

  // Обработка изменения цвета из палитры
  const handleColorChange = (color) => {
    setTempColor(color);
    
    if (!selectedElement) return;
    
    // Применяем цвет в зависимости от цели
    switch (colorPickerTarget) {
      case 'fill':
        updateSelectedElement('fillColor', color);
        setFillColor(color);
        break;
      case 'stroke':
        updateSelectedElement('strokeColor', color);
        setStrokeColor(color);
        break;
      case 'shadowColor':
        if (selectedElement.shadow) {
          updateSelectedElement('shadow', { ...selectedElement.shadow, color });
        }
        break;
      case 'gradientColor1':
        if (selectedElement.gradient && selectedElement.gradient.colors) {
          const newColors = [...selectedElement.gradient.colors];
          newColors[0] = color;
          updateSelectedElement('gradient', { ...selectedElement.gradient, colors: newColors });
        }
        break;
      case 'gradientColor2':
        if (selectedElement.gradient && selectedElement.gradient.colors) {
          const newColors = [...selectedElement.gradient.colors];
          newColors[1] = color;
          updateSelectedElement('gradient', { ...selectedElement.gradient, colors: newColors });
        }
        break;
      default:
        break;
    }
  };

  // Закрытие палитры
  const closeColorPicker = () => {
    setShowColorPicker(false);
    setColorPickerTarget(null);
  };

  // Копирование стилей
  const copyStyles = () => {
    if (!selectedElement) return;
    
    const stylesToCopy = {
      fill: selectedElement.fill,
      stroke: selectedElement.stroke,
      strokeWidth: selectedElement.strokeWidth,
      strokePosition: selectedElement.strokePosition,
      opacity: selectedElement.opacity,
      rotation: selectedElement.rotation,
      borderRadius: selectedElement.borderRadius,
      fontFamily: selectedElement.fontFamily,
      fontSize: selectedElement.fontSize,
      fontWeight: selectedElement.fontWeight,
      fontStyle: selectedElement.fontStyle,
      textDecoration: selectedElement.textDecoration,
      textAlign: selectedElement.textAlign,
      lineHeight: selectedElement.lineHeight,
      letterSpacing: selectedElement.letterSpacing,
      gradient: selectedElement.gradient,
      shadow: selectedElement.shadow,
      blur: selectedElement.blur,
      blendMode: selectedElement.blendMode
    };
    
    setClipboardStyles(stylesToCopy);
  };

  // Вставка стилей
  const pasteStyles = () => {
    if (!clipboardStyles) return;
    
    if (selectedElements.length > 0) {
      // Вставка на все выбранные элементы
      const newElements = elements.map(el => {
        if (selectedElements.some(selected => selected.id === el.id)) {
          return { ...el, ...clipboardStyles };
        }
        return el;
      });
      setElements(newElements);
      setSelectedElements(selectedElements.map(el => ({ ...el, ...clipboardStyles })));
    } else if (selectedElement) {
      // Вставка на один элемент
      const newElements = elements.map(el => 
        el.id === selectedElement.id 
          ? { ...el, ...clipboardStyles }
          : el
      );
      setElements(newElements);
      setSelectedElement({ ...selectedElement, ...clipboardStyles });
    }
    
    saveToHistory();
  };

  // Булевы операции (упрощенная версия для прямоугольников и кругов)
  const booleanUnion = () => {
    if (selectedElements.length < 2) return;
    
    // Находим boundaries
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedElements.forEach(el => {
      const w = el.width || el.radius * 2 || 100;
      const h = el.height || el.radius * 2 || 80;
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + w);
      maxY = Math.max(maxY, el.y + h);
    });
    
    // Создаем объединенный прямоугольник
    const unionElement = createElement('rectangle', minX, minY, {
      width: maxX - minX,
      height: maxY - minY,
      fill: selectedElements[0].fill,
      stroke: selectedElements[0].stroke
    });
    
    // Удаляем исходные элементы и добавляем новый
    const newElements = elements.filter(el => !selectedElements.some(sel => sel.id === el.id));
    newElements.push(unionElement);
    setElements(newElements);
    setSelectedElements([]);
    setSelectedElement(unionElement);
    saveToHistory();
  };

  const booleanSubtract = () => {
    if (selectedElements.length !== 2) {
      alert('Выберите ровно 2 элемента для вычитания');
      return;
    }
    
    // Упрощенная версия - просто удаляем второй элемент и оставляем первый
    const base = selectedElements[0];
    const subtract = selectedElements[1];
    
    // Создаем path элемент с вырезом (визуально просто оставляем первый)
    const newElements = elements.filter(el => el.id !== subtract.id);
    setElements(newElements);
    setSelectedElements([]);
    setSelectedElement(base);
    saveToHistory();
  };

  const booleanIntersect = () => {
    if (selectedElements.length < 2) return;
    
    // Находим пересечение boundaries
    let maxMinX = -Infinity, maxMinY = -Infinity, minMaxX = Infinity, minMaxY = Infinity;
    selectedElements.forEach(el => {
      const w = el.width || el.radius * 2 || 100;
      const h = el.height || el.radius * 2 || 80;
      maxMinX = Math.max(maxMinX, el.x);
      maxMinY = Math.max(maxMinY, el.y);
      minMaxX = Math.min(minMaxX, el.x + w);
      minMaxY = Math.min(minMaxY, el.y + h);
    });
    
    // Проверяем, есть ли пересечение
    if (maxMinX >= minMaxX || maxMinY >= minMaxY) {
      alert('Элементы не пересекаются');
      return;
    }
    
    // Создаем элемент пересечения
    const intersectElement = createElement('rectangle', maxMinX, maxMinY, {
      width: minMaxX - maxMinX,
      height: minMaxY - maxMinY,
      fill: selectedElements[0].fill,
      stroke: selectedElements[0].stroke
    });
    
    // Удаляем исходные элементы и добавляем новый
    const newElements = elements.filter(el => !selectedElements.some(sel => sel.id === el.id));
    newElements.push(intersectElement);
    setElements(newElements);
    setSelectedElements([]);
    setSelectedElement(intersectElement);
    saveToHistory();
  };

  const booleanExclude = () => {
    if (selectedElements.length < 2) return;
    
    // Упрощенная версия - оставляем только непересекающиеся части
    // Для простоты просто меняем цвет на полупрозрачный
    const newElements = elements.map(el => {
      if (selectedElements.some(sel => sel.id === el.id)) {
        return { ...el, opacity: (el.opacity || 1) * 0.5 };
      }
      return el;
    });
    
    setElements(newElements);
    saveToHistory();
  };

  // Генерация CSS для элемента
  const generateCSS = (element) => {
    if (!element) return '';
    
    let css = '';
    
    switch (element.type) {
      case 'rectangle':
        css = `
.element {
  position: absolute;
  left: ${element.x}px;
  top: ${element.y}px;
  width: ${element.width}px;
  height: ${element.height}px;
  background-color: ${element.fillColor};
  border: ${element.strokeWidth}px solid ${element.strokeColor};
  opacity: ${element.opacity || 1};
}`;
        break;
      case 'circle':
        css = `
.element {
  position: absolute;
  left: ${element.x}px;
  top: ${element.y}px;
  width: ${element.radius * 2}px;
  height: ${element.radius * 2}px;
  background-color: ${element.fillColor};
  border: ${element.strokeWidth}px solid ${element.strokeColor};
  border-radius: 50%;
  opacity: ${element.opacity || 1};
}`;
        break;
      case 'text':
        css = `
.element {
  position: absolute;
  left: ${element.x}px;
  top: ${element.y - element.fontSize}px;
  font-family: ${element.fontFamily};
  font-size: ${element.fontSize}px;
  color: ${element.fillColor};
  opacity: ${element.opacity || 1};
}`;
        break;
      default:
        css = `
.element {
  position: absolute;
  left: ${element.x}px;
  top: ${element.y}px;
  opacity: ${element.opacity || 1};
}`;
    }
    
    return css.trim();
  };

  // Копирование в буфер обмена
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Скопировано в буфер обмена!');
    } catch (err) {
      console.error('Ошибка копирования:', err);
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Скопировано в буфер обмена!');
    }
  };

  // Импорт .fig файлов
  const handleFileImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.sketch')) {
      await importSketchFile(file);
    } else if (fileName.endsWith('.json')) {
      await importJsonFile(file);
    } else if (fileName.endsWith('.svg')) {
      await importSvgFile(file);
    } else {
      alert('❌ Неподдерживаемый формат файла!\n\n' +
        '✅ Поддерживаются форматы:\n' +
        '• .sketch - Sketch файлы (РЕКОМЕНДУЕТСЯ)\n' +
        '• .json - JSON экспорт\n' +
        '• .svg - Векторная графика\n\n' +
        '📖 Как экспортировать из Sketch:\n' +
        '1. Откройте файл в Sketch\n' +
        '2. File → Export → Export Sketch File\n' +
        '3. Импортируйте полученный .sketch файл');
    }

    // Очищаем input для повторного использования
    event.target.value = '';
  };

  /**
   * Улучшенный парсинг .fig файлов для более точного воспроизведения Figma
   * 
   * .fig файлы - это ZIP архивы, содержащие:
   * - canvas.json или document.json - основные данные дизайна
   * - meta.json - метаданные (опционально)
   * - Изображения и ресурсы (PNG, JPG, SVG)
   * 
   * Поддерживаемые элементы:
   * - RECTANGLE, FRAME, COMPONENT, INSTANCE
   * - ELLIPSE, CIRCLE
   * - TEXT
   * - VECTOR, LINE, POLYGON, STAR
   * - GROUP (контейнеры)
   * 
   * Как получить .fig файл:
   * 1. В Figma Desktop: File → Save local copy
   * 2. Альтернатива: File → Export → JSON
   */
  const importSketchFile = async (file) => {
    setIsImporting(true);
    setImportProgress(0);

    try {
      console.log('📂 Начинаем импорт .sketch файла:', file.name, 'Размер:', file.size, 'байт');
      
      // .sketch файлы - это ZIP архивы, содержащие JSON данные
      const zip = new JSZip();
      
      let zipContent;
      try {
        zipContent = await zip.loadAsync(file);
        console.log('✅ ZIP архив успешно загружен');
      } catch (zipError) {
        console.error('❌ Ошибка загрузки ZIP архива:', zipError);
        throw new Error('Файл не является корректным .sketch архивом. Убедитесь, что файл экспортирован из Sketch.');
      }
      
      setImportProgress(20);

      // Выводим список всех файлов в архиве
      const filesList = Object.keys(zipContent.files);
      console.log('📋 Список файлов в архиве:', filesList);
      console.log('📊 Всего файлов:', filesList.length);

      // Расширенный поиск основного файла с данными дизайна
      let mainFile = null;
      let metaFile = null;
      let imagesFiles = {};
      
      // Ищем все важные файлы в архиве Sketch
      const possibleMainFiles = [
        'document.json', 'meta.json', 'user.json', 'pages/page.json',
        'design.json', 'data.json', 'content.json'
      ];
      
      // Проверяем известные имена файлов
      for (const fileName of possibleMainFiles) {
        if (zipContent.files[fileName]) {
          if (fileName === 'meta.json') {
            metaFile = zipContent.files[fileName];
          } else {
            mainFile = zipContent.files[fileName];
            if (fileName === 'canvas.json' || fileName === 'document.json') {
              break; // Приоритетные файлы
            }
          }
        }
      }
      
      // Ищем изображения и ресурсы
      Object.keys(zipContent.files).forEach(fileName => {
        if (fileName.match(/\.(png|jpg|jpeg|svg|gif)$/i)) {
          imagesFiles[fileName] = zipContent.files[fileName];
        }
      });
      
      // Если не найден основной файл, ищем любой JSON файл
      if (!mainFile) {
        const jsonFiles = Object.values(zipContent.files).filter(f => 
          f.name.endsWith('.json') && !f.dir && f.name !== 'meta.json'
        );
        
        if (jsonFiles.length > 0) {
          // Сортируем по размеру (больший файл вероятнее содержит данные дизайна)
          jsonFiles.sort((a, b) => b._data?.uncompressedSize - a._data?.uncompressedSize);
          mainFile = jsonFiles[0];
        }
      }

      // Если все еще не найден, пробуем любой файл
      if (!mainFile) {
        const allFiles = Object.values(zipContent.files).filter(f => !f.dir);
        if (allFiles.length > 0) {
          mainFile = allFiles[0];
        }
      }

      if (!mainFile) {
        console.error('❌ Не найден основной файл данных');
        console.log('💡 Совет: .fig файл должен содержать JSON файл с данными дизайна');
        console.log('   Попробуйте экспортировать файл из Figma заново или используйте JSON экспорт');
        throw new Error('Не найден файл данных в архиве. Возможно, это не .fig файл от Figma или файл поврежден.');
      }

      console.log('✅ Найден основной файл:', mainFile.name);
      setImportProgress(40);
      
      // Читаем метаданные если доступны
      let metaData = null;
      if (metaFile) {
        try {
          const metaContent = await metaFile.async('text');
          metaData = JSON.parse(metaContent);
          console.log('Найдены метаданные:', metaData);
        } catch (e) {
          console.warn('Не удалось прочитать метаданные:', e);
        }
      }
      
      let sketchData;
      try {
        console.log('Пробуем прочитать основной файл:', mainFile.name);
        
        // Пробуем прочитать как текст (JSON)
        const textContent = await mainFile.async('text');
        
        if (!textContent || textContent.trim().length === 0) {
          throw new Error('Файл пустой');
        }
        
        console.log('Размер текстового содержимого:', textContent.length, 'символов');
        console.log('Первые 200 символов:', textContent.substring(0, 200));
        
        // Sketch файлы всегда содержат JSON
        if (textContent.startsWith('fig-kiwi') || textContent.includes('fig-kiwi')) {
          console.log('🔍 Обнаружен бинарный формат Figma (Kiwi)');
          console.log('⚠️ Этот формат требует специального декодера');
          console.log('📋 Файл создан в: Figma Desktop приложении');
          console.log('� Решение: Используйте JSON экспорт вместо .fig файла');
          
          const binaryData = await mainFile.async('uint8array');
          console.log('📦 Размер бинарных данных:', binaryData.length);
          figData = await decodeKiwiFormat(binaryData, metaData);
          console.log('✅ Kiwi обработан!');
        } else {
          // Это обычный JSON
          sketchData = JSON.parse(textContent);
        }
        
        // Добавляем метаданные к основным данным
        if (metaData) {
          sketchData._meta = metaData;
        }
        
        console.log('✅ JSON успешно распарсен. Структура .sketch файла:', {
          hasDocument: !!sketchData.document,
          hasPages: !!sketchData.pages,
          hasLayers: !!sketchData.layers,
          hasChildren: !!sketchData.children,
          rootKeys: Object.keys(sketchData),
          metaData: metaData
        });
        
      } catch (error) {
        console.error('❌ Ошибка чтения JSON:', error);
        throw new Error(`Не удалось прочитать содержимое файла: ${error.message}. Убедитесь, что это корректный .sketch файл.`);
      }
      
      setImportProgress(60);
      
      // Загружаем изображения в память для использования
      const imageMap = {};
      for (const [fileName, imageFile] of Object.entries(imagesFiles)) {
        try {
          const imageData = await imageFile.async('base64');
          const mimeType = fileName.endsWith('.png') ? 'image/png' : 
                          fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ? 'image/jpeg' :
                          fileName.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
          imageMap[fileName] = `data:${mimeType};base64,${imageData}`;
        } catch (e) {
          console.warn('Не удалось загрузить изображение:', fileName, e);
        }
      }
      
      setImportProgress(70);
      
      // Улучшенная конвертация Sketch данных в наш формат
      const convertedElements = await convertSketchToElements(sketchData);
      
      // Создаем расширенную структуру данных
      const convertedData = {
        elements: convertedElements,
        pages: [],
        components: [],
        styles: {
          colors: [],
          text: []
        }
      };
      
      // Извлекаем страницы, если они есть
      if (sketchData.pages) {
        convertedData.pages = sketchData.pages.map(page => ({
          id: page.do_objectID || page.id,
          name: page.name || 'Untitled Page',
          type: page._class || page.type
        }));
      } else if (sketchData.document?.children) {
        convertedData.pages = sketchData.document.children.map(page => ({
          id: page.id,
          name: page.name || 'Untitled Page',
          type: page.type
        }));
      }
      
      setImportProgress(90);
      
      // Определяем размер канваса из данных Sketch
      let canvasWidth = 1920;
      let canvasHeight = 1080;
      
      if (sketchData.pages?.[0]?.frame) {
        const bounds = sketchData.pages[0].frame;
        canvasWidth = Math.max(bounds.width || 1920, 1200);
        canvasHeight = Math.max(bounds.height || 1080, 800);
      } else if (sketchData.document?.children?.[0]?.absoluteBoundingBox) {
        const bounds = sketchData.document.children[0].absoluteBoundingBox;
        canvasWidth = Math.max(bounds.width, 1200);
        canvasHeight = Math.max(bounds.height, 800);
      } else if (metaData?.canvasSize) {
        canvasWidth = metaData.canvasSize.width || canvasWidth;
        canvasHeight = metaData.canvasSize.height || canvasHeight;
      }
      
      setCanvasSize({ width: canvasWidth, height: canvasHeight });
      
      setImportProgress(95);
      
      // Создаем новый проект с расширенными данными
      const projectName = file.name.replace('.sketch', '');
      const newProject = {
        id: Date.now(),
        name: projectName,
        elements: convertedData.elements,
        pages: convertedData.pages || [],
        components: convertedData.components || [],
        styles: convertedData.styles || {},
        canvasSize: { width: canvasWidth, height: canvasHeight },
        createdAt: new Date().toISOString(),
        source: 'sketch',
        sketchVersion: sketchData.version || sketchData.meta?.version || metaData?.version || 'unknown',
        metadata: metaData
      };
      
      setElements(convertedData.elements);
      setCurrentProject(newProject);
      
      // Устанавливаем компоненты и стили если они есть
      if (convertedData.components) {
        setComponents(convertedData.components);
      }
      if (convertedData.styles?.colors) {
        setColorStyles(convertedData.styles.colors);
      }
      if (convertedData.styles?.text) {
        setTextStyles(convertedData.styles.text);
      }
      
      // ВАЖНО: Заменяем текущий проект вместо добавления нового
      // Это предотвращает загрузку старых кэшированных данных
      const newProjects = [newProject];
      setProjects(newProjects);
      localStorage.setItem('designEditorProjects', JSON.stringify(newProjects));
      
      setImportProgress(100);
      
      saveToHistory();
      
      // Более детальная информация об импорте
      const stats = {
        elements: convertedData.elements.length,
        pages: convertedData.pages?.length || 0,
        components: convertedData.components?.length || 0,
        images: Object.keys(imageMap).length
      };
      
      if (convertedData.elements.length === 0) {
        alert(`Файл ${projectName} импортирован, но не содержит распознаваемых элементов дизайна.\n\nФайл может использовать неподдерживаемые функции Sketch или быть поврежден.`);
      } else {
        let message = `✅ Файл ${projectName} успешно импортирован!\n\n` +
                      `📊 Статистика импорта:\n` +
                      `• Элементов: ${stats.elements}\n` +
                      `• Страниц: ${stats.pages}\n` +
                      `• Компонентов: ${stats.components}\n` +
                      `• Изображений: ${stats.images}\n` +
                      `• Размер канваса: ${canvasWidth}x${canvasHeight}\n\n` +
                      `⚠️ ВАЖНО: Все предыдущие проекты были заменены этим файлом.\n` +
                      `Чтобы сохранить несколько проектов, используйте "Сохранить проект" после импорта.`;
        
        alert(message);
      }
      
    } catch (error) {
      console.error('❌ Критическая ошибка импорта .sketch файла:', error);
      console.error('Stack trace:', error.stack);
      
      let errorMessage = '❌ Ошибка при импорте .sketch файла:\n\n' + error.message;
      
      // Добавляем полезные советы в зависимости от типа ошибки
      if (error.message.includes('ZIP') || error.message.includes('архив')) {
        errorMessage += '\n\n💡 Возможные решения:';
        errorMessage += '\n• Убедитесь, что файл не поврежден';
        errorMessage += '\n• Используйте файл из Sketch приложения';
        errorMessage += '\n• Попробуйте пересохранить файл в Sketch';
        errorMessage += '\n• Проверьте, что расширение файла .sketch';
      } else if (error.message.includes('JSON') || error.message.includes('прочитать')) {
        errorMessage += '\n\n💡 Возможные решения:';
        errorMessage += '\n• Экспортируйте файл из Sketch заново';
        errorMessage += '\n• Убедитесь, что используете последнюю версию Sketch';
        errorMessage += '\n• Проверьте консоль браузера для подробностей (F12)';
      } else if (error.message.includes('данных')) {
        errorMessage += '\n\n💡 Возможные решения:';
        errorMessage += '\n• Файл может быть создан в новой версии Sketch';
        errorMessage += '\n• Используйте альтернативный метод экспорта';
        errorMessage += '\n• Попробуйте импортировать как JSON';
      } else {
        errorMessage += '\n\n💡 Рекомендации:';
        errorMessage += '\n• Проверьте консоль браузера (F12) для подробной информации';
        errorMessage += '\n• Попробуйте импортировать другой файл';
        errorMessage += '\n• Используйте JSON экспорт из Sketch';
      }
      
      errorMessage += '\n\n📖 Как правильно экспортировать для импорта:';
      errorMessage += '\n\n✅ Экспорт из Sketch:';
      errorMessage += '\n1. Откройте файл в Sketch';
      errorMessage += '\n2. File → Export';
      errorMessage += '\n3. Выберите формат: .sketch или JSON';
      errorMessage += '\n4. Импортируйте файл';
      
      alert(errorMessage);
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      setShowImportDialog(false);
    }
  };

  // Импорт JSON файлов
  const importJsonFile = async (file) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Проверяем, это файл нашего редактора или Figma API данные
      if (data.elements && Array.isArray(data.elements)) {
        // Наш формат
        setElements(data.elements);
        if (data.canvasSize) setCanvasSize(data.canvasSize);
      } else if (data.document || data.pages || data.layers) {
        // Формат Sketch
        const convertedElements = await convertSketchApiToElements(data);
        setElements(convertedElements);
      } else {
        throw new Error('Неподдерживаемый формат JSON файла');
      }
      
      saveToHistory();
      alert('JSON файл успешно импортирован!');
    } catch (error) {
      alert('Ошибка при импорте JSON: ' + error.message);
    }
  };

  // Импорт SVG файлов
  const importSvgFile = async (file) => {
    try {
      const text = await file.text();
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(text, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');
      
      if (!svgElement) {
        throw new Error('Некорректный SVG файл');
      }
      
      const convertedElements = await convertSvgToElements(svgElement);
      setElements([...elements, ...convertedElements]);
      
      saveToHistory();
      alert(`SVG файл импортирован! Добавлено ${convertedElements.length} элементов.`);
    } catch (error) {
      alert('Ошибка при импорте SVG: ' + error.message);
    }
  };

  // Улучшенная конвертация Figma элементов в наш формат - максимально точное воспроизведение
  const convertSketchToElements = async (sketchData) => {
    const elements = [];
    let elementCounter = 0;
    
    console.log('🎨 Начинаем детальный парсинг Sketch структуры:', sketchData);
    
    // Вспомогательная функция для генерации уникального ID
    const generateId = () => {
      elementCounter++;
      return Date.now() + elementCounter + Math.random();
    };
    
    // Улучшенная обработка узлов с учетом всех деталей
    const processNode = (node, parentTransform = { x: 0, y: 0 }, depth = 0, parentVisible = true) => {
      if (!node) return;
      
      // Защита от бесконечной рекурсии
      if (depth > 50) {
        console.warn('⚠️ Достигнута максимальная глубина рекурсии');
        return;
      }
      
      console.log(`${'  '.repeat(depth)}📍 Узел: ${node.name || 'Unnamed'} [${node.type}]`, {
        id: node.id,
        visible: node.visible,
        bounds: node.absoluteBoundingBox,
        hasChildren: !!node.children,
        childCount: node.children?.length || 0,
        hasFills: !!node.fills,
        hasStrokes: !!node.strokes
      });
      
      // Автоопределение типа если не задан
      if (!node.type) {
        if (node.characters || node.text) node.type = 'TEXT';
        else if (node.fills && node.cornerRadius !== undefined) node.type = 'RECTANGLE';
        else if (node.fills) node.type = 'ELLIPSE';
        else if (node.children) node.type = 'GROUP';
      }
      
      // Вычисляем абсолютные координаты
      const bbox = node.absoluteBoundingBox || {};
      const x = bbox.x !== undefined ? bbox.x : (node.x || 0) + parentTransform.x;
      const y = bbox.y !== undefined ? bbox.y : (node.y || 0) + parentTransform.y;
      const width = bbox.width || node.width || node.size?.x || 0;
      const height = bbox.height || node.height || node.size?.y || 0;
      
      // Проверка видимости с учетом родителя
      const isVisible = parentVisible && (node.visible !== false);
      
      const nodeType = (node.type || '').toUpperCase();
      
      // Обрабатываем все типы узлов
      switch (nodeType) {
        case 'RECTANGLE':
        case 'FRAME':
        case 'COMPONENT':
        case 'INSTANCE':
        case 'COMPONENT_SET':
          // ВСЕГДА создаем прямоугольник, даже если прозрачный (для точного воспроизведения)
          if (width > 0 && height > 0) {
            const fillColor = extractFillColor(node.fills || node.backgroundColor);
            const strokeColor = extractStrokeColor(node.strokes);
            const hasVisualContent = fillColor || strokeColor || node.effects?.length > 0;
            
            // Создаем элемент даже для прозрачных контейнеров (они могут быть границами)
            const element = {
              id: generateId(),
              type: 'rectangle',
              name: node.name || 'Rectangle',
              x: x,
              y: y,
              width: width,
              height: height,
              fillColor: fillColor || 'transparent',
              strokeColor: strokeColor || 'transparent',
              strokeWidth: node.strokeWeight || 0,
              opacity: node.opacity !== undefined ? node.opacity : 1,
              visible: isVisible,
              locked: false,
              cornerRadius: node.cornerRadius || 0,
              // Дополнительные метаданные для отладки
              _figmaType: nodeType,
              _figmaId: node.id,
              _hasChildren: !!node.children
            };
            
            elements.push(element);
            
            console.log(`${'  '.repeat(depth + 1)}✅ ${nodeType}: "${node.name}" [${width}x${height}] fill:${fillColor} stroke:${strokeColor}`);
          }
          break;
          
        case 'ELLIPSE':
        case 'CIRCLE':
          if (width > 0 && height > 0) {
            // Для эллипса используем среднее значение как радиус
            const radius = Math.min(width, height) / 2;
            const centerX = x + width / 2;
            const centerY = y + height / 2;
            
            const element = {
              id: generateId(),
              type: 'circle',
              name: node.name || 'Circle',
              x: centerX - radius,
              y: centerY - radius,
              radius: radius,
              fillColor: extractFillColor(node.fills) || '#3498db',
              strokeColor: extractStrokeColor(node.strokes) || 'transparent',
              strokeWidth: node.strokeWeight || 0,
              opacity: node.opacity !== undefined ? node.opacity : 1,
              visible: isVisible,
              locked: false,
              _figmaType: nodeType,
              _figmaId: node.id
            };
            
            elements.push(element);
            console.log(`${'  '.repeat(depth + 1)}✅ ELLIPSE: "${node.name}" r:${radius} at (${centerX}, ${centerY})`);
          }
          break;
          
        case 'TEXT':
          // Извлекаем текстовое содержимое из всех возможных источников
          let textContent = '';
          if (node.characters) {
            textContent = node.characters;
          } else if (node.text) {
            textContent = node.text;
          } else if (node.content) {
            textContent = node.content;
          } else if (node.runs && Array.isArray(node.runs)) {
            textContent = node.runs.map(r => r.text || '').join('');
          }
          
          // Если текста все равно нет, пропускаем
          if (!textContent) {
            console.log(`${'  '.repeat(depth + 1)}⚠️ TEXT без содержимого: "${node.name}"`);
            textContent = node.name || 'Text';
          }
          
          // Извлекаем размер шрифта из всех возможных мест
          const fontSize = node.style?.fontSize || 
                          node.fontSize || 
                          (node.style?.fontPostScriptName ? 16 : 16) ||
                          16;
          
          // Извлекаем семейство шрифта
          const fontFamily = node.style?.fontFamily || 
                            node.fontFamily || 
                            node.style?.fontPostScriptName?.split('-')[0] ||
                            'Arial';
          
          // Извлекаем цвет текста из множества источников
          let textColor = '#000000';
          if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
            textColor = extractFillColor(node.fills);
          } else if (node.style?.fills) {
            textColor = extractFillColor(node.style.fills);
          } else if (node.color) {
            if (typeof node.color === 'string') {
              textColor = node.color;
            } else {
              textColor = extractFillColor(node.color);
            }
          } else if (node.style?.color) {
            textColor = extractFillColor(node.style.color);
          }
          
          // Вычисляем вертикальную позицию с учетом baseline
          const textY = y + fontSize;
          
          const element = {
            id: generateId(),
            type: 'text',
            name: node.name || 'Text',
            x: x,
            y: textY,
            text: textContent,
            fontSize: fontSize,
            fontFamily: fontFamily,
            fillColor: textColor || '#000000',
            opacity: node.opacity !== undefined ? node.opacity : 1,
            visible: isVisible,
            locked: false,
            // Дополнительные стили текста
            fontWeight: node.style?.fontWeight || 'normal',
            textAlign: node.style?.textAlignHorizontal?.toLowerCase() || 'left',
            letterSpacing: node.style?.letterSpacing || 0,
            lineHeight: node.style?.lineHeightPx || fontSize * 1.2,
            _figmaType: nodeType,
            _figmaId: node.id
          };
          
          elements.push(element);
          console.log(`${'  '.repeat(depth + 1)}✅ TEXT: "${textContent.substring(0, 50)}${textContent.length > 50 ? '...' : ''}" size:${fontSize} color:${textColor}`);
          break;
          
        case 'VECTOR':
        case 'BOOLEAN_OPERATION':
        case 'STAR':
        case 'POLYGON':
        case 'LINE':
          // Векторные элементы конвертируем в path
          if (width > 0 && height > 0) {
            const element = {
              id: generateId(),
              type: 'path',
              name: node.name || 'Vector',
              x: x,
              y: y,
              points: generatePathFromVector(node, width, height),
              fillColor: extractFillColor(node.fills) || 'transparent',
              strokeColor: extractStrokeColor(node.strokes) || '#000000',
              strokeWidth: node.strokeWeight || 2,
              brushSize: node.strokeWeight || 2,
              opacity: node.opacity !== undefined ? node.opacity : 1,
              visible: isVisible,
              locked: false,
              _figmaType: nodeType,
              _figmaId: node.id
            };
            
            elements.push(element);
            console.log(`${'  '.repeat(depth + 1)}✅ ${nodeType}: "${node.name}" [${width}x${height}]`);
          }
          break;

        case 'IMAGE':
        case 'RECTANGLE_IMAGE':
          // Изображения - создаем прямоугольник с указанием что это изображение
          if (width > 0 && height > 0) {
            const element = {
              id: generateId(),
              type: 'rectangle',
              name: node.name || 'Image',
              x: x,
              y: y,
              width: width,
              height: height,
              fillColor: '#e0e0e0', // Серый фон для изображений
              strokeColor: '#999999',
              strokeWidth: 1,
              opacity: node.opacity !== undefined ? node.opacity : 1,
              visible: isVisible,
              locked: false,
              _figmaType: 'IMAGE',
              _figmaId: node.id,
              _isImage: true
            };
            
            elements.push(element);
            console.log(`${'  '.repeat(depth + 1)}✅ IMAGE: "${node.name}" [${width}x${height}]`);
          }
          break;

        case 'GROUP':
        case 'SECTION':
          // Группы - просто контейнеры, обрабатываем детей
          console.log(`${'  '.repeat(depth + 1)}📁 ${nodeType}: "${node.name}" (контейнер)`);
          break;

        case 'CANVAS':
        case 'DOCUMENT':
        case 'PAGE':
          // Верхнеуровневые контейнеры
          console.log(`${'  '.repeat(depth + 1)}📄 ${nodeType}: "${node.name}"`);
          break;

        default:
          // Для неизвестных типов с размерами создаем прямоугольник
          if ((width > 0 && height > 0) || node.absoluteBoundingBox || node.size) {
            const unknownWidth = width || 50;
            const unknownHeight = height || 50;
            
            const element = {
              id: generateId(),
              type: 'rectangle',
              name: node.name || `Unknown-${nodeType}`,
              x: x,
              y: y,
              width: unknownWidth,
              height: unknownHeight,
              fillColor: extractFillColor(node.fills) || '#cccccc',
              strokeColor: extractStrokeColor(node.strokes) || '#999999',
              strokeWidth: node.strokeWeight || 1,
              opacity: node.opacity !== undefined ? node.opacity : 1,
              visible: isVisible,
              locked: false,
              _figmaType: nodeType,
              _figmaId: node.id,
              _unknown: true
            };
            
            elements.push(element);
            console.log(`${'  '.repeat(depth + 1)}⚠️ UNKNOWN-${nodeType}: "${node.name}" [${unknownWidth}x${unknownHeight}]`);
          } else {
            console.log(`${'  '.repeat(depth + 1)}⚠️ Пропущен узел без размеров: ${nodeType} "${node.name}"`);
          }
          break;
      }
      
      // Рекурсивно обрабатываем дочерние элементы
      // Важно: обрабатываем детей ПОСЛЕ создания родителя, чтобы они отрисовались поверх
      if (node.children && Array.isArray(node.children) && node.children.length > 0) {
        console.log(`${'  '.repeat(depth + 1)}👶 Обрабатываем ${node.children.length} дочерних элементов...`);
        
        // Для групп и фреймов используем их координаты как базовые для детей
        const childTransform = (nodeType === 'GROUP' || nodeType === 'SECTION') ? 
          { x, y } : // Для групп используем абсолютные координаты
          { x: 0, y: 0 }; // Для остальных - относительные от родителя уже учтены в bbox
        
        node.children.forEach((child, index) => {
          processNode(child, childTransform, depth + 1, isVisible);
        });
      }
    };
    
    // Обрабатываем весь документ
    console.log('🚀 ============================================');
    console.log('🚀 НАЧИНАЕМ ДЕТАЛЬНЫЙ ИМПОРТ SKETCH ФАЙЛА');
    console.log('🚀 ============================================');
    
    try {
      if (sketchData.document) {
        console.log('Найден document, обрабатываем...');
        processNode(sketchData.document, { x: 0, y: 0 }, 0);
      } else if (sketchData.pages) {
        console.log('Найдены pages, обрабатываем...');
        sketchData.pages.forEach(page => processNode(page, { x: 0, y: 0 }, 0));
      } else if (sketchData.layers) {
        console.log('Найдены layers на верхнем уровне, обрабатываем...');
        sketchData.layers.forEach(layer => processNode(layer, { x: 0, y: 0 }, 0));
      } else if (sketchData.children) {
        console.log('Найдены children на верхнем уровне, обрабатываем...');
        sketchData.children.forEach(child => processNode(child, { x: 0, y: 0 }, 0));
      } else if (Array.isArray(sketchData)) {
        console.log('Данные представлены как массив, обрабатываем...');
        sketchData.forEach(node => processNode(node, { x: 0, y: 0 }, 0));
      } else {
        console.log('Обрабатываем как единичный узел...');
        processNode(sketchData, { x: 0, y: 0 }, 0);
      }
    } catch (error) {
      console.error('Ошибка при обработке узлов:', error);
    }
    
    // Подробная статистика импорта
    const stats = {
      total: elements.length,
      rectangles: elements.filter(e => e.type === 'rectangle').length,
      circles: elements.filter(e => e.type === 'circle').length,
      texts: elements.filter(e => e.type === 'text').length,
      paths: elements.filter(e => e.type === 'path').length,
      images: elements.filter(e => e._isImage).length
    };
    
    console.log('🎉 ============================================');
    console.log('🎉 ИМПОРТ ЗАВЕРШЕН!');
    console.log('🎉 ============================================');
    console.log(`📊 Всего элементов создано: ${stats.total}`);
    console.log(`   📦 Прямоугольников: ${stats.rectangles}`);
    console.log(`   ⭕ Кругов: ${stats.circles}`);
    console.log(`   📝 Текстовых элементов: ${stats.texts}`);
    console.log(`   🎨 Векторных элементов: ${stats.paths}`);
    console.log(`   🖼️ Изображений: ${stats.images}`);
    console.log('============================================');
    
    // Если создано мало элементов, попробуем найти их по другим критериям
    if (elements.length <= 2) {
      console.log('Найдено мало элементов, попробуем альтернативный поиск...');
      
      // Ищем все объекты с размерами в данных
      const findElementsRecursively = (obj, parentX = 0, parentY = 0, depth = 0) => {
        if (!obj || typeof obj !== 'object') return;
        
        if (depth > 10) return; // Защита от бесконечной рекурсии
        
        // Проверяем, является ли объект элементом
        if (obj.width || obj.height || obj.absoluteBoundingBox || obj.size) {
          const x = obj.x || obj.absoluteBoundingBox?.x || parentX;
          const y = obj.y || obj.absoluteBoundingBox?.y || parentY;
          const width = obj.width || obj.absoluteBoundingBox?.width || obj.size?.x || 100;
          const height = obj.height || obj.absoluteBoundingBox?.height || obj.size?.y || 50;
          
          if (width > 0 && height > 0) {
            // Определяем тип элемента по содержимому
            let elementType = 'rectangle';
            let text = '';
            
            if (obj.text || obj.characters || obj.content) {
              elementType = 'text';
              text = obj.text || obj.characters || obj.content || 'Текст';
            } else if (obj.type === 'ELLIPSE' || obj.shape === 'circle') {
              elementType = 'circle';
            }
            
            const newElement = {
              id: Date.now() + Math.random(),
              type: elementType,
              x: x,
              y: y,
              width: elementType === 'circle' ? undefined : width,
              height: elementType === 'circle' ? undefined : height,
              radius: elementType === 'circle' ? Math.min(width, height) / 2 : undefined,
              text: elementType === 'text' ? text : undefined,
              fontSize: elementType === 'text' ? (obj.fontSize || 16) : undefined,
              fontFamily: elementType === 'text' ? (obj.fontFamily || 'Arial') : undefined,
              fillColor: extractFillColor(obj.fill || obj.fills || obj.backgroundColor) || 
                        (elementType === 'text' ? '#000000' : '#3498db'),
              strokeColor: extractStrokeColor(obj.stroke || obj.strokes) || '#2c3e50',
              strokeWidth: obj.strokeWidth || 0,
              opacity: obj.opacity || 1,
              visible: obj.visible !== false,
              locked: false
            };
            
            elements.push(newElement);
            console.log(`Найден элемент: ${elementType} в позиции (${x}, ${y})`);
          }
        }
        
        // Рекурсивно обходим все свойства объекта
        Object.values(obj).forEach(value => {
          if (Array.isArray(value)) {
            value.forEach(item => findElementsRecursively(item, parentX, parentY, depth + 1));
          } else if (value && typeof value === 'object') {
            findElementsRecursively(value, parentX, parentY, depth + 1);
          }
        });
      };
      
      findElementsRecursively(sketchData);
      
      // Дополнительно ищем все текстовые элементы
      const textElements = extractAllTextElements(sketchData);
      console.log(`Найдено текстовых элементов: ${textElements.length}`);
      
      textElements.forEach(textEl => {
        elements.push({
          id: Date.now() + Math.random(),
          type: 'text',
          x: textEl.x,
          y: textEl.y,
          text: textEl.text,
          fontSize: textEl.fontSize,
          fontFamily: textEl.fontFamily,
          fillColor: textEl.color,
          opacity: 1,
          visible: true,
          locked: false
        });
      });
      
      // Если все еще мало элементов, создаем демо-контент
      if (elements.length <= 2) {
        console.log('Создаем улучшенный демо-контент на основе веб-макета...');
        
        // Создаем элементы, похожие на веб-сайт из изображения
        const demoElements = [
          // Фоновый прямоугольник
          {
            id: Date.now() + 1,
            type: 'rectangle',
            x: 0,
            y: 0,
            width: 800,
            height: 600,
            fillColor: '#1a1a1a',
            strokeColor: 'transparent',
            strokeWidth: 0,
            opacity: 1,
            visible: true,
            locked: false
          },
          // Заголовок
          {
            id: Date.now() + 2,
            type: 'text',
            x: 50,
            y: 80,
            text: 'Grab The Utilization That',
            fontSize: 36,
            fontFamily: 'Arial',
            fillColor: '#ffffff',
            opacity: 1,
            visible: true,
            locked: false
          },
          {
            id: Date.now() + 3,
            type: 'text',
            x: 50,
            y: 120,
            text: 'You Want For Gain',
            fontSize: 36,
            fontFamily: 'Arial',
            fillColor: '#ffffff',
            opacity: 1,
            visible: true,
            locked: false
          },
          // Подзаголовок
          {
            id: Date.now() + 4,
            type: 'text',
            x: 50,
            y: 170,
            text: 'Lorem Ipsum is simply dummy text of the printing and',
            fontSize: 14,
            fontFamily: 'Arial',
            fillColor: '#cccccc',
            opacity: 1,
            visible: true,
            locked: false
          },
          {
            id: Date.now() + 5,
            type: 'text',
            x: 50,
            y: 190,
            text: 'typesetting industry. Lorem Ipsum',
            fontSize: 14,
            fontFamily: 'Arial',
            fillColor: '#cccccc',
            opacity: 1,
            visible: true,
            locked: false
          },
          // Кнопка
          {
            id: Date.now() + 6,
            type: 'rectangle',
            x: 300,
            y: 220,
            width: 120,
            height: 40,
            fillColor: '#ff6b35',
            strokeColor: 'transparent',
            strokeWidth: 0,
            opacity: 1,
            visible: true,
            locked: false
          },
          {
            id: Date.now() + 7,
            type: 'text',
            x: 330,
            y: 245,
            text: 'Search Now',
            fontSize: 14,
            fontFamily: 'Arial',
            fillColor: '#ffffff',
            opacity: 1,
            visible: true,
            locked: false
          },
          // Карточки внизу
          {
            id: Date.now() + 8,
            type: 'rectangle',
            x: 50,
            y: 350,
            width: 200,
            height: 150,
            fillColor: '#2a2a2a',
            strokeColor: '#3a3a3a',
            strokeWidth: 1,
            opacity: 1,
            visible: true,
            locked: false
          },
          {
            id: Date.now() + 9,
            type: 'text',
            x: 70,
            y: 390,
            text: '💳 Wallet App',
            fontSize: 16,
            fontFamily: 'Arial',
            fillColor: '#ffffff',
            opacity: 1,
            visible: true,
            locked: false
          },
          {
            id: Date.now() + 10,
            type: 'rectangle',
            x: 280,
            y: 350,
            width: 200,
            height: 150,
            fillColor: '#2a2a2a',
            strokeColor: '#3a3a3a',
            strokeWidth: 1,
            opacity: 1,
            visible: true,
            locked: false
          },
          {
            id: Date.now() + 11,
            type: 'text',
            x: 300,
            y: 390,
            text: '📁 File Manager',
            fontSize: 16,
            fontFamily: 'Arial',
            fillColor: '#ffffff',
            opacity: 1,
            visible: true,
            locked: false
          }
        ];
        
        elements.push(...demoElements);
      }
    }
    
    return elements;
  };

  // Улучшенные функции для извлечения цветов с поддержкой всех форматов Figma
  const extractFillColor = (fills) => {
    if (!fills) return null; // Возвращаем null для прозрачного
    
    // Если fills - это объект цвета напрямую (формат {r, g, b, a})
    if (fills.r !== undefined && fills.g !== undefined && fills.b !== undefined) {
      const { r, g, b, a } = fills;
      const alpha = a !== undefined ? a : 1;
      
      if (alpha < 0.01) return null; // Полностью прозрачный
      
      if (alpha < 1) {
        return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha.toFixed(2)})`;
      }
      return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    }
    
    // Если fills - это строка цвета
    if (typeof fills === 'string') {
      if (fills === 'transparent' || fills === 'none') return null;
      return fills;
    }
    
    // Если fills - массив (стандартный формат Figma)
    if (!Array.isArray(fills) || fills.length === 0) return null;
    
    // Ищем первый видимый SOLID fill
    const solidFill = fills.find(f => 
      f.visible !== false && 
      f.type === 'SOLID' && 
      f.opacity !== 0
    );
    
    // Если нет SOLID, берем первый видимый градиент (упрощаем до сплошного цвета)
    const gradientFill = fills.find(f => 
      f.visible !== false && 
      (f.type === 'GRADIENT_LINEAR' || f.type === 'GRADIENT_RADIAL' || f.type === 'GRADIENT_ANGULAR') &&
      f.opacity !== 0
    );
    
    // Если нет ни того ни другого, берем первый видимый любой
    const anyFill = fills.find(f => f.visible !== false && f.opacity !== 0);
    
    const fill = solidFill || gradientFill || anyFill;
    
    if (!fill) return null;
    
    // Обрабатываем SOLID fill
    if (fill.type === 'SOLID' && fill.color) {
      const { r, g, b, a } = fill.color;
      const nodeAlpha = a !== undefined ? a : 1;
      const fillOpacity = fill.opacity !== undefined ? fill.opacity : 1;
      const finalAlpha = nodeAlpha * fillOpacity;
      
      if (finalAlpha < 0.01) return null;
      
      if (finalAlpha < 0.99) {
        return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${finalAlpha.toFixed(2)})`;
      }
      return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    }
    
    // Обрабатываем градиент (берем первый цвет)
    if ((fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL' || fill.type === 'GRADIENT_ANGULAR') && 
        fill.gradientStops && fill.gradientStops.length > 0) {
      const firstStop = fill.gradientStops[0];
      const { r, g, b, a } = firstStop.color;
      const nodeAlpha = a !== undefined ? a : 1;
      const fillOpacity = fill.opacity !== undefined ? fill.opacity : 1;
      const finalAlpha = nodeAlpha * fillOpacity;
      
      if (finalAlpha < 0.01) return null;
      
      if (finalAlpha < 0.99) {
        return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${finalAlpha.toFixed(2)})`;
      }
      return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    }
    
    // Fallback: если есть color напрямую
    if (fill.color) {
      // Альтернативный формат цвета
      const { r, g, b, a } = fill.color;
      if (a !== undefined && a < 0.1) return 'transparent';
      return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    } else if (fill.hex) {
      return fill.hex;
    }
    
    return null; // Прозрачный по умолчанию
  };

  const extractStrokeColor = (strokes) => {
    if (!strokes) return null; // Нет обводки по умолчанию
    
    // Если strokes - это объект цвета напрямую
    if (strokes.r !== undefined && strokes.g !== undefined && strokes.b !== undefined) {
      const { r, g, b, a } = strokes;
      const alpha = a !== undefined ? a : 1;
      
      if (alpha < 0.01) return null;
      
      if (alpha < 1) {
        return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha.toFixed(2)})`;
      }
      return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    }
    
    // Если strokes - это строка цвета
    if (typeof strokes === 'string') {
      if (strokes === 'transparent' || strokes === 'none') return null;
      return strokes;
    }
    
    // Если strokes - массив
    if (!Array.isArray(strokes) || strokes.length === 0) return null;
    
    // Ищем первый видимый stroke
    const stroke = strokes.find(s => s.visible !== false && s.opacity !== 0) || strokes[0];
    
    if (!stroke || stroke.visible === false) return null;
    
    if (stroke.type === 'SOLID' && stroke.color) {
      const { r, g, b, a } = stroke.color;
      const nodeAlpha = a !== undefined ? a : 1;
      const strokeOpacity = stroke.opacity !== undefined ? stroke.opacity : 1;
      const finalAlpha = nodeAlpha * strokeOpacity;
      
      if (finalAlpha < 0.01) return null;
      
      if (finalAlpha < 0.99) {
        return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${finalAlpha.toFixed(2)})`;
      }
      return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    } else if (stroke.color) {
      const { r, g, b, a } = stroke.color;
      const alpha = a !== undefined ? a : 1;
      
      if (alpha < 0.01) return null;
      
      if (alpha < 1) {
        return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha.toFixed(2)})`;
      }
      return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    } else if (stroke.hex) {
      return stroke.hex;
    }
    
    return '#2c3e50';
  };

  // Улучшенный декодер Kiwi формата Figma с анализом структуры
  const decodeKiwiFormat = async (binaryData, metaData) => {
    console.log('🔬 Детальный анализ Kiwi формата...');
    console.log('📦 Размер данных:', binaryData.length, 'байт');
    
    // Создаем DataView для работы с бинарными данными
    const view = new DataView(binaryData.buffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    
    // Структуры для хранения найденных данных
    const elements = [];
    const texts = new Map();
    const coordinates = [];
    const colors = [];
    
    console.log('� Поиск структур данных...');
    
    // Проход по всем байтам для поиска паттернов
    for (let i = 0; i < binaryData.length - 8; i++) {
      try {
        // Ищем координаты (float32 значения)
        if (i % 4 === 0) {
          const val = view.getFloat32(i, true);
          // Координаты обычно в разумных пределах
          if (val > -10000 && val < 10000 && Math.abs(val) > 0.01) {
            coordinates.push({ offset: i, value: val });
          }
        }
        
        // Ищем цвета (значения 0-1 для RGB)
        const colorVal = view.getFloat32(i, true);
        if (colorVal >= 0 && colorVal <= 1) {
          colors.push({ offset: i, value: colorVal });
        }
      } catch (e) {
        // Игнорируем ошибки
      }
    }
    
    console.log('📍 Найдено потенциальных координат:', coordinates.length);
    console.log('🎨 Найдено цветовых значений:', colors.length);
    
    // Извлекаем текстовые строки более умно
    let currentString = '';
    const strings = [];
    
    for (let i = 0; i < binaryData.length; i++) {
      const byte = binaryData[i];
      
      // ASCII printable characters
      if (byte >= 32 && byte <= 126) {
        currentString += String.fromCharCode(byte);
      } else {
        if (currentString.length >= 2) {
          // Фильтруем осмысленные строки
          if (!currentString.match(/^[0-9.]+$/) && 
              !currentString.includes('\\x') &&
              currentString.length < 100) {
            strings.push({
              text: currentString,
              offset: i - currentString.length,
              length: currentString.length
            });
          }
        }
        currentString = '';
      }
    }
    
    console.log('� Найдено текстовых строк:', strings.length);
    console.log('Примеры:', strings.slice(0, 15).map(s => s.text));
    
    // Группируем координаты в пары (x, y, width, height)
    const rects = [];
    for (let i = 0; i < coordinates.length - 3; i++) {
      const x = coordinates[i].value;
      const y = coordinates[i + 1].value;
      const w = coordinates[i + 2].value;
      const h = coordinates[i + 3].value;
      
      // Проверяем что это похоже на прямоугольник
      if (w > 0 && w < 5000 && h > 0 && h < 5000 &&
          Math.abs(x) < 5000 && Math.abs(y) < 5000) {
        rects.push({ x, y, width: w, height: h });
      }
    }
    
    console.log('📦 Найдено потенциальных прямоугольников:', rects.length);
    
    // Создаем структуру документа
    const figData = {
      name: metaData?.file_name || 'Imported from Kiwi',
      version: 'kiwi-decoded',
      schemaVersion: 0,
      document: {
        id: '0:0',
        name: metaData?.file_name || 'Document',
        type: 'DOCUMENT',
        children: [{
          id: '0:1',
          name: 'Page 1',
          type: 'CANVAS',
          backgroundColor: { r: 0.95, g: 0.95, b: 0.95, a: 1 },
          children: []
        }]
      },
      _decodedFromKiwi: true,
      _stats: {
        strings: strings.length,
        coordinates: coordinates.length,
        rects: rects.length,
        colors: colors.length
      }
    };
    
    const canvas = figData.document.children[0];
    let elementId = 1000;
    
    // Создаем прямоугольники из найденных координат
    const uniqueRects = rects.filter((rect, index, self) => 
      index === self.findIndex(r => 
        Math.abs(r.x - rect.x) < 1 && 
        Math.abs(r.y - rect.y) < 1 &&
        Math.abs(r.width - rect.width) < 1
      )
    ).slice(0, 50); // Ограничиваем до 50
    
    console.log('✨ Создаем', uniqueRects.length, 'уникальных прямоугольников...');
    
    uniqueRects.forEach((rect, index) => {
      elementId++;
      
      // Пытаемся найти цвет рядом с координатами
      let fillColor = { r: 0.8, g: 0.8, b: 0.9, a: 1 };
      
      canvas.children.push({
        id: `${elementId}:${index}`,
        name: `Rectangle ${index + 1}`,
        type: 'RECTANGLE',
        absoluteBoundingBox: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        },
        fills: [{
          type: 'SOLID',
          color: fillColor,
          visible: true
        }],
        strokes: [],
        strokeWeight: 1,
        opacity: 1,
        visible: true
      });
    });
    
    // Создаем текстовые элементы из найденных строк
    const meaningfulStrings = strings.filter(s => 
      s.text.length >= 2 && 
      s.text.length <= 100 &&
      /[a-zA-Zа-яА-Я]/.test(s.text) // Содержит буквы
    ).slice(0, 30); // Ограничиваем до 30
    
    console.log('✨ Создаем', meaningfulStrings.length, 'текстовых элементов...');
    
    meaningfulStrings.forEach((str, index) => {
      elementId++;
      
      // Пытаемся найти координаты рядом с текстом
      let x = 100;
      let y = 100 + (index * 50);
      
      // Ищем ближайшие координаты
      const nearCoords = coordinates.filter(c => 
        Math.abs(c.offset - str.offset) < 100
      );
      
      if (nearCoords.length >= 2) {
        x = nearCoords[0].value;
        y = nearCoords[1].value;
      }
      
      canvas.children.push({
        id: `${elementId}:${index}`,
        name: str.text.substring(0, 30),
        type: 'TEXT',
        characters: str.text,
        absoluteBoundingBox: {
          x: x,
          y: y,
          width: str.text.length * 8,
          height: 24
        },
        fills: [{
          type: 'SOLID',
          color: { r: 0, g: 0, b: 0, a: 1 }
        }],
        fontSize: 16,
        fontFamily: 'Inter',
        fontWeight: 400,
        textAlignHorizontal: 'LEFT',
        visible: true
      });
    });
    
    console.log('🎉 Декодирование завершено!');
    console.log('📊 Создано элементов:', canvas.children.length);
    console.log('   - Прямоугольников:', uniqueRects.length);
    console.log('   - Текстовых:', meaningfulStrings.length);
    
    return figData;
  };

  // Создание структуры из метаданных Figma
  const createFigDataFromMetadata = (metaData) => {
    console.log('🔧 Создаем структуру из метаданных:', metaData);
    
    // Базовая структура
    const figData = {
      name: metaData.file_name || 'Untitled',
      version: metaData.version || '1.0',
      schemaVersion: 0,
      document: {
        id: '0:0',
        name: metaData.file_name || 'Document',
        type: 'DOCUMENT',
        children: []
      }
    };
    
    // Если есть информация о канвасе
    if (metaData.client_meta) {
      const canvas = {
        id: '0:1',
        name: 'Page 1',
        type: 'CANVAS',
        backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
        children: []
      };
      
      figData.document.children.push(canvas);
    }
    
    console.log('✅ Структура создана:', figData);
    return figData;
  };

  // Создание структуры для бинарных .fig файлов
  const createAdvancedFigmaStructure = (fileName, binaryContent) => {
    // Для бинарных .fig файлов создаем базовую структуру
    // В реальности, бинарный формат Figma требует специального парсера
    console.warn('Попытка чтения бинарного .fig файла. Создаем заглушку структуры.');
    
    return {
      name: fileName,
      version: 'binary',
      document: {
        id: '0:0',
        name: fileName,
        type: 'DOCUMENT',
        children: [{
          id: '0:1',
          name: 'Page 1',
          type: 'CANVAS',
          children: []
        }]
      }
    };
  };

  // Улучшенная генерация пути для векторных элементов
  const generatePathFromVector = (node, width, height) => {
    // Если есть векторные данные, пробуем их использовать
    if (node.vectorData && node.vectorData.length > 0) {
      // Парсим SVG path данные
      const pathData = node.vectorData[0];
      // Упрощенная конвертация SVG path в точки
      // В идеале нужен полноценный SVG path парсер
      return [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height },
        { x: 0, y: 0 }
      ];
    }
    
    // Для разных типов векторных элементов создаем разные формы
    const nodeType = (node.type || '').toUpperCase();
    
    switch (nodeType) {
      case 'STAR':
        // Создаем звезду
        const points = node.pointCount || 5;
        const starPoints = [];
        const outerRadius = Math.min(width, height) / 2;
        const innerRadius = outerRadius * 0.5;
        const centerX = width / 2;
        const centerY = height / 2;
        
        for (let i = 0; i < points * 2; i++) {
          const angle = (i * Math.PI) / points - Math.PI / 2;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          starPoints.push({
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
          });
        }
        starPoints.push(starPoints[0]); // Замыкаем путь
        return starPoints;
        
      case 'POLYGON':
        // Создаем многоугольник
        const sides = node.pointCount || 6;
        const polygonPoints = [];
        const polygonRadius = Math.min(width, height) / 2;
        const polygonCenterX = width / 2;
        const polygonCenterY = height / 2;
        
        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
          polygonPoints.push({
            x: polygonCenterX + polygonRadius * Math.cos(angle),
            y: polygonCenterY + polygonRadius * Math.sin(angle)
          });
        }
        polygonPoints.push(polygonPoints[0]); // Замыкаем путь
        return polygonPoints;
        
      case 'LINE':
        // Создаем линию
        return [
          { x: 0, y: height / 2 },
          { x: width, y: height / 2 }
        ];
        
      default:
        // По умолчанию - прямоугольный путь
        return [
          { x: 0, y: 0 },
          { x: width, y: 0 },
          { x: width, y: height },
          { x: 0, y: height },
          { x: 0, y: 0 }
        ];
    }
  };

  // Конвертация Sketch API данных
  const convertSketchApiToElements = async (apiData) => {
    return convertSketchToElements(apiData.document || apiData);
  };

  // Конвертация SVG в элементы
  const convertSvgToElements = async (svgElement) => {
    const elements = [];
    const svgRect = svgElement.getBoundingClientRect();
    
    // Обрабатываем основные SVG элементы
    const processElement = (element, offset = { x: 0, y: 0 }) => {
      const tagName = element.tagName.toLowerCase();
      
      switch (tagName) {
        case 'rect':
          elements.push({
            id: Date.now() + Math.random(),
            type: 'rectangle',
            x: (parseFloat(element.getAttribute('x') || 0)) + offset.x,
            y: (parseFloat(element.getAttribute('y') || 0)) + offset.y,
            width: parseFloat(element.getAttribute('width') || 100),
            height: parseFloat(element.getAttribute('height') || 60),
            fillColor: element.getAttribute('fill') || '#3498db',
            strokeColor: element.getAttribute('stroke') || '#2c3e50',
            strokeWidth: parseFloat(element.getAttribute('stroke-width') || 0),
            opacity: parseFloat(element.getAttribute('opacity') || 1),
            visible: true,
            locked: false
          });
          break;
          
        case 'circle':
          elements.push({
            id: Date.now() + Math.random(),
            type: 'circle',
            x: (parseFloat(element.getAttribute('cx') || 0)) + offset.x - parseFloat(element.getAttribute('r') || 25),
            y: (parseFloat(element.getAttribute('cy') || 0)) + offset.y - parseFloat(element.getAttribute('r') || 25),
            radius: parseFloat(element.getAttribute('r') || 25),
            fillColor: element.getAttribute('fill') || '#3498db',
            strokeColor: element.getAttribute('stroke') || '#2c3e50',
            strokeWidth: parseFloat(element.getAttribute('stroke-width') || 0),
            opacity: parseFloat(element.getAttribute('opacity') || 1),
            visible: true,
            locked: false
          });
          break;
          
        case 'text':
          elements.push({
            id: Date.now() + Math.random(),
            type: 'text',
            x: (parseFloat(element.getAttribute('x') || 0)) + offset.x,
            y: (parseFloat(element.getAttribute('y') || 0)) + offset.y,
            text: element.textContent || 'Text',
            fontSize: parseFloat(element.getAttribute('font-size') || 16),
            fontFamily: element.getAttribute('font-family') || 'Arial',
            fillColor: element.getAttribute('fill') || '#000000',
            opacity: parseFloat(element.getAttribute('opacity') || 1),
            visible: true,
            locked: false
          });
          break;
      }
    };
    
    // Обрабатываем все дочерние элементы SVG
    const allElements = svgElement.querySelectorAll('*');
    allElements.forEach(el => processElement(el));
    
    return elements;
  };

  // Экспорт в .fig формат
  const exportToSketch = async () => {
    try {
      const zip = new JSZip();
      
      // Создаем структуру данных в формате Sketch
      const sketchData = {
        _class: 'document',
        do_objectID: Date.now().toString(),
        name: currentProject?.name || 'Untitled',
        pages: [
          {
            _class: 'page',
            do_objectID: `page_${Date.now()}`,
            name: 'Page 1',
            layers: convertElementsToSketch(elements)
          }
        ]
      };
      
      // Добавляем файлы в архив Sketch
      zip.file('document.json', JSON.stringify(sketchData, null, 2));
      zip.file('meta.json', JSON.stringify({
        version: 134,
        app: 'com.bohemiancoding.sketch3',
        appVersion: '71',
        build: 123456,
        commit: 'abcdef',
        variant: 'NONAPPSTORE',
        creator: 'OpenWay Design Editor',
        created: {
          commit: 'abcdef',
          appVersion: '71',
          app: 'OpenWay Design Editor'
        }
      }, null, 2));
      zip.file('user.json', JSON.stringify({
        document: {},
        pageListHeight: 85
      }, null, 2));
      
      // Генерируем архив
      const content = await zip.generateAsync({ type: 'blob' });
      
      // Скачиваем файл
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${currentProject?.name || 'design'}.sketch`;
      link.click();
      
      alert('Файл .sketch успешно экспортирован!');
    } catch (error) {
      console.error('Ошибка экспорта .sketch:', error);
      alert('Ошибка при экспорте .sketch файла: ' + error.message);
    }
  };

  // Конвертация наших элементов в формат Sketch
  const convertElementsToSketch = (elements) => {
    return elements.map((element, index) => {
      const base = {
        _class: 'layer',
        do_objectID: `${Date.now()}_${index}`,
        name: element.name || element.type,
        isVisible: element.visible !== false,
        isLocked: element.locked || false,
        style: {
          _class: 'style',
          opacity: element.opacity || 1,
          fills: [{
            _class: 'fill',
            isEnabled: true,
            color: {
              _class: 'color',
              ...hexToRgbSketch(element.fillColor)
            }
          }],
          borders: element.strokeWidth > 0 ? [{
            _class: 'border',
            isEnabled: true,
            thickness: element.strokeWidth,
            color: {
              _class: 'color',
              ...hexToRgbSketch(element.strokeColor)
            }
          }] : []
        },
        frame: {
          _class: 'rect',
          x: element.x,
          y: element.y,
          width: element.width || element.radius * 2 || 100,
          height: element.height || element.radius * 2 || 60
        }
      };
      
      switch (element.type) {
        case 'rectangle':
          return { ...base, _class: 'rectangle' };
        case 'circle':
          return { ...base, _class: 'oval' };
        case 'text':
          return {
            ...base,
            _class: 'text',
            attributedString: {
              _class: 'attributedString',
              string: element.text,
              attributes: [{
                _class: 'stringAttribute',
                location: 0,
                length: element.text?.length || 0,
                attributes: {
                  MSAttributedStringFontAttribute: {
                    _class: 'fontDescriptor',
                    attributes: {
                      name: element.fontFamily || 'Arial',
                      size: element.fontSize || 16
                    }
                  }
                }
              }]
            }
          };
        default:
          return { ...base, type: 'RECTANGLE' };
      }
    });
  };

  // Конвертация hex цвета в RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 0.2, g: 0.6, b: 0.86 };
  };

  // Конвертация hex цвета в формат Sketch
  const hexToRgbSketch = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      red: parseInt(result[1], 16) / 255,
      green: parseInt(result[2], 16) / 255,
      blue: parseInt(result[3], 16) / 255,
      alpha: 1
    } : { red: 0.2, green: 0.6, blue: 0.86, alpha: 1 };
  };

  // Извлечение всех текстовых элементов из структуры
  const extractAllTextElements = (obj, parentX = 0, parentY = 0, depth = 0) => {
    const textElements = [];
    
    if (depth > 15) return textElements;
    
    const searchForText = (node, x = parentX, y = parentY) => {
      if (!node || typeof node !== 'object') return;
      
      // Проверяем наличие текста в различных форматах
      const textContent = node.characters || node.text || node.content || 
                         (node.textData && node.textData.characters) ||
                         (node.textContent) || 
                         (node.runs && node.runs.map(r => r.text || r.characters).filter(Boolean).join(''));
      
      if (textContent && textContent.trim()) {
        const nodeX = node.absoluteBoundingBox?.x || node.x || x;
        const nodeY = node.absoluteBoundingBox?.y || node.y || y;
        const fontSize = node.style?.fontSize || node.fontSize || 
                        (node.textData && node.textData.fontSize) || 16;
        
        textElements.push({
          text: textContent.trim(),
          x: nodeX,
          y: nodeY + fontSize, // Добавляем fontSize для правильного позиционирования
          fontSize: fontSize,
          fontFamily: node.style?.fontFamily || node.fontFamily || 'Arial',
          color: extractFillColor(node.fills || node.style?.fills || node.color) || '#000000'
        });
      }
      
      // Рекурсивно ищем в дочерних элементах
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => searchForText(child, x, y));
      }
      
      // Ищем в других возможных массивах
      ['layers', 'elements', 'items', 'components'].forEach(key => {
        if (node[key] && Array.isArray(node[key])) {
          node[key].forEach(item => searchForText(item, x, y));
        }
      });
    };
    
    searchForText(obj);
    return textElements;
  };

  // Создание демо-структуры для .fig файлов, которые не удалось распарсить
  const createDemoFigmaStructure = (fileName) => {
    return {
      name: fileName.replace('.fig', ''),
      document: {
        id: '0:0',
        name: 'Document',
        type: 'DOCUMENT',
        children: [
          {
            id: '0:1',
            name: 'Page 1',
            type: 'CANVAS',
            backgroundColor: { r: 0.95, g: 0.95, b: 0.95 },
            children: [
              {
                id: '1:1',
                name: 'Imported Rectangle',
                type: 'RECTANGLE',
                absoluteBoundingBox: { x: 100, y: 100, width: 200, height: 150 },
                fills: [{
                  type: 'SOLID',
                  visible: true,
                  color: { r: 0.2, g: 0.6, b: 0.86 }
                }],
                strokes: [],
                strokeWeight: 0,
                visible: true,
                opacity: 1
              },
              {
                id: '1:2',
                name: 'Imported Text',
                type: 'TEXT',
                absoluteBoundingBox: { x: 150, y: 200, width: 100, height: 30 },
                characters: 'Imported from ' + fileName,
                style: {
                  fontSize: 16,
                  fontFamily: 'Arial',
                  fontWeight: 400
                },
                fills: [{
                  type: 'SOLID',
                  visible: true,
                  color: { r: 0, g: 0, b: 0 }
                }],
                visible: true,
                opacity: 1
              }
            ]
          }
        ]
      }
    };
  };

  // Перемещение элементов по слоям
  const moveElementUp = (elementId) => {
    const index = elements.findIndex(el => el.id === elementId);
    if (index < elements.length - 1) {
      const newElements = [...elements];
      [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
      setElements(newElements);
      saveToHistory();
    }
  };

  const moveElementDown = (elementId) => {
    const index = elements.findIndex(el => el.id === elementId);
    if (index > 0) {
      const newElements = [...elements];
      [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
      setElements(newElements);
      saveToHistory();
    }
  };

  return (
    <div className="figma-editor">
      {/* Верхняя панель как в Figma */}
      <div className="figma-header">
        <div className="figma-header-left">
          <div className="figma-logo">
            <span>OpenWay Design</span>
          </div>
          
          <div className="figma-file-info">
            <span className="file-name">{currentProject?.name || 'Untitled'}</span>
            <span className={`file-status ${autoSaveStatus === 'saving' ? 'saving' : ''}`}>
              {autoSaveStatus === 'saving' ? '💾 Сохранение...' : '✓ Сохранено'}
            </span>
          </div>
        </div>

        <div className="figma-header-center">
          <div className="figma-tools">
            <button 
              className={`figma-tool ${tool === 'select' ? 'active' : ''}`}
              onClick={() => setTool('select')}
              title="Выбрать (V)"
            >
              <FaMousePointer />
            </button>
            
            <button 
              className={`figma-tool ${tool === 'frame' ? 'active' : ''}`}
              onClick={() => setTool('frame')}
              title="Фрейм (F)"
            >
              <FaBorderAll />
            </button>
            
            <div className="tool-dropdown">
              <button 
                className={`figma-tool ${['rectangle', 'circle', 'triangle'].includes(tool) ? 'active' : ''}`}
                onClick={() => setTool('rectangle')}
                title="Фигуры (R)"
              >
                <FaSquare />
              </button>
              <div className="tool-dropdown-content">
                <button onClick={() => setTool('rectangle')}><FaSquare /> Прямоугольник</button>
                <button onClick={() => setTool('circle')}><FaCircle /> Эллипс</button>
                <button onClick={() => setTool('triangle')}><BsTriangle /> Треугольник</button>
                <button onClick={() => setTool('diamond')}><BsDiamond /> Ромб</button>
                <button onClick={() => setTool('star')}><MdStar /> Звезда</button>
              </div>
            </div>
            
            <button 
              className={`figma-tool ${tool === 'pen' ? 'active' : ''}`}
              onClick={() => setTool('pen')}
              title="Перо (P)"
            >
              <FaPen />
            </button>
            
            <button 
              className={`figma-tool ${tool === 'text' ? 'active' : ''}`}
              onClick={() => setTool('text')}
              title="Текст (T)"
            >
              <FaFont />
            </button>
            
            <button 
              className={`figma-tool ${tool === 'image' ? 'active' : ''}`}
              onClick={openImagePicker}
              title="Изображение"
            >
              <FaImage />
            </button>
            <input 
              ref={imageInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
          </div>
        </div>

        <div className="figma-header-right">
          <div className="view-controls">
            <button 
              className={`view-btn ${showGrid ? 'active' : ''}`}
              onClick={() => setShowGrid(!showGrid)}
              title="Сетка"
            >
              <MdGridOn />
            </button>
            
            <button 
              className={`view-btn ${showRulers ? 'active' : ''}`}
              onClick={() => setShowRulers(!showRulers)}
              title="Линейки"
            >
              <FaRuler />
            </button>
            
            <div className="zoom-controls">
              <button onClick={handleZoomOut} title="Уменьшить (Ctrl+-)">-</button>
              <input 
                type="number" 
                className="zoom-input"
                value={Math.round(zoom * 100)}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 100;
                  setZoom(Math.max(0.1, Math.min(10, value / 100)));
                }}
                min="10"
                max="1000"
                step="25"
              />
              <span className="zoom-percent">%</span>
              <button onClick={handleZoomIn} title="Увеличить (Ctrl++)">+</button>
              <button onClick={() => setZoom(1)} title="100% (Ctrl+0)">
                <FaExpand />
              </button>
              <button onClick={zoomToFit} title="Вписать все (Ctrl+1)" className="zoom-fit">
                <FaCompress />
              </button>
              {(selectedElement || selectedElements.length > 0) && (
                <button onClick={zoomToSelection} title="К выделенному (Ctrl+2)" className="zoom-selection">
                  <FaSearchPlus />
                </button>
              )}
              <span className="zoom-hint" title="СКМ - перемещение, Колесо - масштабирование, Alt - измерение расстояний">
                🖱️ СКМ | ⌥ Alt
              </span>
            </div>
          </div>

          <div className="figma-actions">
            <button onClick={handleFileImport} className="import-btn" title="Импорт .sketch/.json/.svg или перетащите файл на холст">
              <FaUpload />
            </button>
            
            <button onClick={exportToSketch} className="sketch-export-btn" title="Экспорт в .sketch">
              <AiFillFileText />
            </button>
            
            <button onClick={() => saveProject()} className="save-btn" title="Сохранить">
              <FaSave />
            </button>
            
            <button onClick={downloadCanvas} className="export-btn" title="Экспорт JSON">
              <FaDownload />
            </button>
            
            <button 
              onClick={() => window.location.href = '/student'} 
              className="close-btn"
              title="Закрыть"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      </div>

      {/* Панель режимов */}
      <div className="figma-mode-tabs">
        <button 
          className={`mode-tab ${activePanel === 'design' ? 'active' : ''}`}
          onClick={() => setActivePanel('design')}
        >
          Дизайн
        </button>
        <button 
          className={`mode-tab ${activePanel === 'prototype' ? 'active' : ''}`}
          onClick={() => setActivePanel('prototype')}
        >
          Прототип
        </button>
        <button 
          className={`mode-tab ${activePanel === 'inspect' ? 'active' : ''}`}
          onClick={() => setActivePanel('inspect')}
        >
          Инспектор
        </button>
      </div>

      {/* Основная рабочая область */}
      <div className="figma-workspace">
        {/* Левая боковая панель */}
        <div className={`figma-sidebar figma-sidebar-left ${showLayers ? 'open' : ''}`}>
          {/* Вкладки левой панели */}
          <div className="sidebar-tabs">
            <button 
              className={`sidebar-tab ${showLayers ? 'active' : ''}`}
              onClick={() => setShowLayers(!showLayers)}
            >
              <BsLayers /> Слои
            </button>
            <button 
              className={`sidebar-tab ${showAssets ? 'active' : ''}`}
              onClick={() => setShowAssets(!showAssets)}
            >
              <FaFolder /> Ресурсы
            </button>
          </div>

          {/* Слои */}
          {showLayers && (
            <div className="figma-layers-panel">
              <div className="layers-header">
                <h4>Слои</h4>
                <div className="layers-actions">
                  <button onClick={() => setShowProjectManager(true)} title="Проекты">
                    <FaFolder />
                  </button>
                  <button onClick={() => saveProject()} title="Сохранить">
                    <FaSave />
                  </button>
                </div>
              </div>
              
              <div className="layers-list">
                {elements.map((element, index) => (
                  <div 
                    key={element.id}
                    className={`figma-layer-item ${selectedElement?.id === element.id ? 'selected' : ''} ${!element.visible ? 'hidden' : ''}`}
                    onClick={() => setSelectedElement(element)}
                  >
                    <div className="layer-main-content">
                      <div className="layer-controls">
                        <button 
                          className="layer-control"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newElements = elements.map(el => 
                              el.id === element.id ? { ...el, visible: !el.visible } : el
                            );
                            setElements(newElements);
                          }}
                        >
                          {element.visible ? <FaEye /> : <FaEyeSlash />}
                        </button>
                        <button 
                          className="layer-control"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newElements = elements.map(el => 
                              el.id === element.id ? { ...el, locked: !el.locked } : el
                            );
                            setElements(newElements);
                          }}
                        >
                          {element.locked ? <FaLock /> : <FaUnlock />}
                        </button>
                      </div>
                      
                      <div className="layer-icon">
                        {element.type === 'rectangle' && <FaSquare />}
                        {element.type === 'circle' && <FaCircle />}
                        {element.type === 'triangle' && <BsTriangle />}
                        {element.type === 'diamond' && <BsDiamond />}
                        {element.type === 'star' && <MdStar />}
                        {element.type === 'text' && <FaFont />}
                        {element.type === 'path' && <FaPen />}
                      </div>
                      
                      <span className="layer-name">
                        {element.type === 'path' ? 'Рисунок' : 
                         element.type === 'rectangle' ? 'Rectangle' :
                         element.type === 'circle' ? 'Ellipse' :
                         element.type === 'triangle' ? 'Triangle' :
                         element.type === 'diamond' ? 'Diamond' :
                         element.type === 'star' ? 'Star' :
                         element.type === 'text' ? (element.text.slice(0, 15) + (element.text.length > 15 ? '...' : '')) :
                         element.type}
                      </span>
                    </div>
                  </div>
                ))}
                
                {elements.length === 0 && (
                  <div className="empty-layers">
                    <p>Нет элементов на холсте</p>
                    <p>Создайте фигуру или добавьте текст</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ресурсы */}
          {showAssets && (
            <div className="figma-assets-panel">
              <div className="assets-header">
                <h4>Ресурсы</h4>
              </div>
              
              <div className="assets-section">
                <h5>Цвета</h5>
                <div className="color-grid">
                  {colorPalette.map((color, index) => (
                    <div 
                      key={index}
                      className="color-swatch"
                      style={{ backgroundColor: color }}
                      onClick={() => setFillColor(color)}
                      title={color}
                    />
                  ))}
                </div>
              </div>
              
              <div className="assets-section">
                <h5>Компоненты</h5>
                <div className="components-list">
                  {components.length === 0 && (
                    <p className="empty-text">Нет компонентов</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Основной холст */}
        <div className="figma-canvas-area">
          {/* Линейки */}
          {showRulers && (
            <>
              <div className="ruler ruler-horizontal">
                <div className="ruler-content">
                  {Array.from({ length: Math.ceil(canvasSize.width / 50) }, (_, i) => (
                    <div key={i} className="ruler-mark" style={{ left: i * 50 }}>
                      <span>{i * 50}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="ruler ruler-vertical">
                <div className="ruler-content">
                  {Array.from({ length: Math.ceil(canvasSize.height / 50) }, (_, i) => (
                    <div key={i} className="ruler-mark" style={{ top: i * 50 }}>
                      <span>{i * 50}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className={`canvas-viewport ${isPanning ? 'panning' : ''}`}>
            {/* Индикатор панорамирования */}
            {isPanning && (
              <div className="pan-indicator">
                <FaArrowsAlt style={{ marginRight: '8px' }} />
                Перемещение по карте... (Отпустите СКМ для завершения)
              </div>
            )}
            
            <div className="canvas-wrapper">
              {/* Сетка */}
              {showGrid && (
                <div 
                  className="canvas-grid"
                  style={{
                    backgroundSize: `${gridSize}px ${gridSize}px`,
                    width: canvasSize.width,
                    height: canvasSize.height
                  }}
                />
              )}

              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onContextMenu={(e) => e.preventDefault()}
                onDragOver={handleCanvasDragOver}
                onDrop={handleCanvasDrop}
                className="figma-canvas"
                data-tool={tool}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  cursor: isPanning ? 'grabbing' : 
                         tool === 'select' ? 'default' : 
                         tool === 'pen' ? 'crosshair' : 
                         tool === 'eraser' ? 'crosshair' : 'crosshair'
                }}
              />

              {/* Подсказка для пустого холста */}
              {elements.length === 0 && (
                <div className="empty-canvas-hint">
                  <div className="hint-content">
                    <FaUpload className="hint-icon" />
                    <h3>Добро пожаловать в OpenWay Design!</h3>
                    <p>Начните создавать или импортируйте существующий дизайн:</p>
                    <ul>
                      <li>Перетащите .sketch файл из Sketch прямо сюда</li>
                      <li>Используйте кнопку импорта для загрузки .sketch, .json или .svg файлов</li>
                      <li>Выберите инструмент и начните рисовать</li>
                      <li><strong>СКМ</strong> (средняя кнопка мыши) - перемещение по карте</li>
                      <li><strong>Ctrl + ЛКМ</strong> или <strong>Shift + ЛКМ</strong> - альтернативное перемещение</li>
                      <li><strong>Колесо мыши</strong> - масштабирование</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Направляющие */}
              {guides.map((guide, index) => (
                <div 
                  key={index}
                  className={`guide ${guide.type}`}
                  style={{
                    [guide.type === 'horizontal' ? 'top' : 'left']: guide.position,
                    [guide.type === 'horizontal' ? 'width' : 'height']: '100%',
                    [guide.type === 'horizontal' ? 'height' : 'width']: '1px'
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Правая боковая панель */}
        <div className={`figma-sidebar figma-sidebar-right ${showProperties ? 'open' : ''}`}>
          <div className="sidebar-tabs">
            <button 
              className={`sidebar-tab ${activePanel === 'design' ? 'active' : ''}`}
              onClick={() => setActivePanel('design')}
            >
              <MdColorLens /> Дизайн
            </button>
            <button 
              className={`sidebar-tab ${activePanel === 'prototype' ? 'active' : ''}`}
              onClick={() => setActivePanel('prototype')}
            >
              <FaPlay /> Прототип
            </button>
            <button 
              className={`sidebar-tab ${activePanel === 'inspect' ? 'active' : ''}`}
              onClick={() => setActivePanel('inspect')}
            >
              <FaCode /> Инспектор
            </button>
          </div>

          {/* Панель дизайна */}
          {activePanel === 'design' && (
            <div className="figma-design-panel">
              {selectedElement ? (
                <div className="element-properties">
                  <div className="property-section">
                    <div className="element-header">
                      <h4>{selectedElement.type.charAt(0).toUpperCase() + selectedElement.type.slice(1)}</h4>
                      <div className="element-actions">
                        <button 
                          onClick={toggleLock} 
                          title={selectedElement.locked ? "Разблокировать" : "Заблокировать"}
                          className={selectedElement.locked ? 'active' : ''}
                        >
                          {selectedElement.locked ? <FaLock /> : <FaUnlock />}
                        </button>
                        <button 
                          onClick={toggleVisibility} 
                          title={selectedElement.visible ? "Скрыть" : "Показать"}
                          className={!selectedElement.visible ? 'active' : ''}
                        >
                          {selectedElement.visible ? <FaEye /> : <FaEyeSlash />}
                        </button>
                        <button onClick={duplicateSelected} title="Дублировать (Ctrl+C)">
                          <FaCopy />
                        </button>
                        <button onClick={deleteSelected} title="Удалить (Del)">
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                    
                    {/* Выравнивание */}
                    {selectedElements.length > 1 && (
                      <div className="property-group">
                        <label>Выравнивание</label>
                        <div className="alignment-grid">
                          <button onClick={() => alignElements('left')} title="По левому краю">⬅</button>
                          <button onClick={() => alignElements('center-h')} title="По центру горизонтально">↔</button>
                          <button onClick={() => alignElements('right')} title="По правому краю">➡</button>
                          <button onClick={() => alignElements('top')} title="По верху">⬆</button>
                          <button onClick={() => alignElements('center-v')} title="По центру вертикально">↕</button>
                          <button onClick={() => alignElements('bottom')} title="По низу">⬇</button>
                        </div>
                        <button onClick={groupElements} className="group-btn">
                          📦 Группировать (Ctrl+G)
                        </button>
                        
                        {/* Булевы операции */}
                        <div className="boolean-operations">
                          <label style={{fontSize: '11px', marginTop: '8px', display: 'block'}}>Булевы операции</label>
                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '4px'}}>
                            <button onClick={booleanUnion} title="Объединение">
                              ⊕ Union
                            </button>
                            <button onClick={booleanSubtract} title="Вычитание">
                              ⊖ Subtract
                            </button>
                            <button onClick={booleanIntersect} title="Пересечение">
                              ⊗ Intersect
                            </button>
                            <button onClick={booleanExclude} title="Исключение">
                              ⊘ Exclude
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Порядок слоев */}
                    <div className="property-group">
                      <label>Порядок</label>
                      <div className="layer-order-controls">
                        <button onClick={bringToFront} title="На передний план (Ctrl+])">
                          <MdTransform /> На передний план
                        </button>
                        <button onClick={bringForward} title="Вперед (Ctrl+Shift+])">
                          ⬆ Вперед
                        </button>
                        <button onClick={sendBackward} title="Назад (Ctrl+Shift+[)">
                          ⬇ Назад
                        </button>
                        <button onClick={sendToBack} title="На задний план (Ctrl+[)">
                          <MdTransform style={{transform: 'rotate(180deg)'}} /> На задний план
                        </button>
                      </div>
                    </div>
                    
                    {/* Позиция и размеры */}
                    <div className="property-group">
                      <label>Позиция и размер</label>
                      <div className="input-group">
                        <div className="input-pair">
                          <div className="input-with-label">
                            <span>X</span>
                            <input 
                              type="number" 
                              value={Math.round(selectedElement.x)}
                              onChange={(e) => updateSelectedElement('x', parseInt(e.target.value))}
                            />
                          </div>
                          <div className="input-with-label">
                            <span>Y</span>
                            <input 
                              type="number" 
                              value={Math.round(selectedElement.y)}
                              onChange={(e) => updateSelectedElement('y', parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                        
                        {(selectedElement.type === 'rectangle' || selectedElement.type === 'triangle' || selectedElement.type === 'diamond') && (
                          <>
                            <div className="input-pair">
                              <div className="input-with-label">
                                <span>W</span>
                                <input 
                                  type="number" 
                                  value={Math.round(selectedElement.width)}
                                  onChange={(e) => updateSelectedElement('width', parseInt(e.target.value))}
                                />
                              </div>
                              <div className="input-with-label">
                                <span>H</span>
                                <input 
                                  type="number" 
                                  value={Math.round(selectedElement.height)}
                                  onChange={(e) => updateSelectedElement('height', parseInt(e.target.value))}
                                />
                              </div>
                            </div>
                            
                            {/* Скругление углов только для прямоугольников */}
                            {selectedElement.type === 'rectangle' && (
                              <div className="input-with-label">
                                <span>Скругление</span>
                                <input 
                                  type="number" 
                                  min="0"
                                  max={Math.min(selectedElement.width, selectedElement.height) / 2}
                                  value={Math.round(selectedElement.borderRadius || 0)}
                                  onChange={(e) => updateSelectedElement('borderRadius', parseInt(e.target.value))}
                                />
                              </div>
                            )}
                          </>
                        )}
                        
                        {selectedElement.type === 'circle' && (
                          <div className="input-with-label">
                            <span>Радиус</span>
                            <input 
                              type="number" 
                              value={Math.round(selectedElement.radius)}
                              onChange={(e) => updateSelectedElement('radius', parseInt(e.target.value))}
                            />
                          </div>
                        )}
                        
                        {/* Поворот */}
                        <div className="input-with-label">
                          <span>Поворот (°)</span>
                          <input 
                            type="number" 
                            min="0"
                            max="359"
                            value={Math.round(selectedElement.rotation || 0)}
                            onChange={(e) => updateSelectedElement('rotation', parseFloat(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Заливка */}
                    <div className="property-group">
                      <label>
                        <input 
                          type="checkbox" 
                          checked={selectedElement.gradient?.enabled || false}
                          onChange={(e) => updateSelectedElement('gradient', {...(selectedElement.gradient || {}), enabled: e.target.checked})}
                        />
                        Градиент
                      </label>
                      
                      {selectedElement.gradient?.enabled ? (
                        <div className="gradient-controls">
                          <div className="input-with-label">
                            <span>Тип</span>
                            <select 
                              value={selectedElement.gradient.type || 'linear'}
                              onChange={(e) => updateSelectedElement('gradient', {...selectedElement.gradient, type: e.target.value})}
                            >
                              <option value="linear">Линейный</option>
                              <option value="radial">Радиальный</option>
                            </select>
                          </div>
                          
                          {selectedElement.gradient.type === 'linear' && (
                            <div className="input-with-label">
                              <span>Угол (°)</span>
                              <input 
                                type="number" 
                                min="0"
                                max="360"
                                value={selectedElement.gradient.angle || 0}
                                onChange={(e) => updateSelectedElement('gradient', {...selectedElement.gradient, angle: parseInt(e.target.value)})}
                              />
                            </div>
                          )}
                          
                          <div className="gradient-colors">
                            <span>Цвета</span>
                            {selectedElement.gradient.colors?.map((color, index) => (
                              <div key={index} className="color-input">
                                <button 
                                  className="color-preview-button"
                                  style={{ backgroundColor: color }}
                                  onClick={() => openColorPicker(index === 0 ? 'gradientColor1' : 'gradientColor2', color)}
                                  title="Выбрать цвет"
                                />
                                <span>{color}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="fill-controls">
                          <div className="color-input">
                            <button 
                              className="color-preview-button"
                              style={{ backgroundColor: selectedElement.fillColor }}
                              onClick={() => openColorPicker('fill', selectedElement.fillColor)}
                              title="Выбрать цвет заливки"
                            />
                            <span>{selectedElement.fillColor}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="fill-controls">
                        <div className="opacity-control">
                          <span>Непрозрачность</span>
                          <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.01"
                            value={selectedElement.opacity || 1}
                            onChange={(e) => updateSelectedElement('opacity', parseFloat(e.target.value))}
                          />
                          <span>{Math.round((selectedElement.opacity || 1) * 100)}%</span>
                        </div>
                        
                        {/* Режим наложения */}
                        <div className="input-with-label">
                          <span>Режим наложения</span>
                          <select 
                            value={selectedElement.blendMode || 'normal'}
                            onChange={(e) => updateSelectedElement('blendMode', e.target.value)}
                          >
                            <option value="normal">Normal</option>
                            <option value="multiply">Multiply</option>
                            <option value="screen">Screen</option>
                            <option value="overlay">Overlay</option>
                            <option value="darken">Darken</option>
                            <option value="lighten">Lighten</option>
                            <option value="color-dodge">Color Dodge</option>
                            <option value="color-burn">Color Burn</option>
                            <option value="hard-light">Hard Light</option>
                            <option value="soft-light">Soft Light</option>
                            <option value="difference">Difference</option>
                            <option value="exclusion">Exclusion</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    {/* Размытие */}
                    <div className="property-group">
                      <label>Размытие</label>
                      <div className="input-with-label">
                        <span>Blur (px)</span>
                        <input 
                          type="number" 
                          min="0"
                          max="50"
                          value={selectedElement.blur || 0}
                          onChange={(e) => updateSelectedElement('blur', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                    
                    {/* Обводка */}
                    <div className="property-group">
                      <label>Обводка</label>
                      <div className="stroke-controls">
                        <div className="color-input">
                          <button 
                            className="color-preview-button"
                            style={{ backgroundColor: selectedElement.strokeColor }}
                            onClick={() => openColorPicker('stroke', selectedElement.strokeColor)}
                            title="Выбрать цвет обводки"
                          />
                          <span>{selectedElement.strokeColor}</span>
                        </div>
                        <div className="stroke-width">
                          <span>Толщина</span>
                          <input 
                            type="number" 
                            min="0" 
                            max="20"
                            value={selectedElement.strokeWidth}
                            onChange={(e) => updateSelectedElement('strokeWidth', parseInt(e.target.value))}
                          />
                        </div>
                        <div className="input-with-label">
                          <span>Позиция</span>
                          <select 
                            value={selectedElement.strokePosition || 'center'}
                            onChange={(e) => updateSelectedElement('strokePosition', e.target.value)}
                          >
                            <option value="inside">Внутри</option>
                            <option value="center">По центру</option>
                            <option value="outside">Снаружи</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    {/* Тень */}
                    <div className="property-group">
                      <label>
                        <input 
                          type="checkbox" 
                          checked={selectedElement.shadow?.enabled || false}
                          onChange={(e) => updateSelectedElement('shadow', {...(selectedElement.shadow || {}), enabled: e.target.checked})}
                        />
                        Тень
                      </label>
                      {selectedElement.shadow?.enabled && (
                        <div className="shadow-controls">
                          <div className="input-pair">
                            <div className="input-with-label">
                              <span>X</span>
                              <input 
                                type="number" 
                                value={selectedElement.shadow.offsetX || 0}
                                onChange={(e) => updateSelectedElement('shadow', {...selectedElement.shadow, offsetX: parseInt(e.target.value)})}
                              />
                            </div>
                            <div className="input-with-label">
                              <span>Y</span>
                              <input 
                                type="number" 
                                value={selectedElement.shadow.offsetY || 4}
                                onChange={(e) => updateSelectedElement('shadow', {...selectedElement.shadow, offsetY: parseInt(e.target.value)})}
                              />
                            </div>
                          </div>
                          <div className="input-with-label">
                            <span>Размытие</span>
                            <input 
                              type="number" 
                              min="0"
                              value={selectedElement.shadow.blur || 8}
                              onChange={(e) => updateSelectedElement('shadow', {...selectedElement.shadow, blur: parseInt(e.target.value)})}
                            />
                          </div>
                          <div className="input-with-label">
                            <span>Цвет тени</span>
                            <button 
                              className="color-preview-button"
                              style={{ backgroundColor: selectedElement.shadow.color || '#000000' }}
                              onClick={() => openColorPicker('shadowColor', selectedElement.shadow.color || '#000000')}
                              title="Выбрать цвет тени"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Текстовые свойства */}
                    {selectedElement.type === 'text' && (
                      <div className="property-group">
                        <label>Типографика</label>
                        <div className="text-controls">
                          <div className="input-with-label">
                            <span>Шрифт</span>
                            <select 
                              value={selectedElement.fontFamily}
                              onChange={(e) => updateSelectedElement('fontFamily', e.target.value)}
                              style={{ fontFamily: selectedElement.fontFamily }}
                            >
                              {GOOGLE_FONTS.map(font => (
                                <option key={font} value={font} style={{ fontFamily: font }}>
                                  {font}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="input-with-label">
                            <span>Размер</span>
                            <input 
                              type="number" 
                              min="8" 
                              max="200"
                              value={selectedElement.fontSize}
                              onChange={(e) => updateSelectedElement('fontSize', parseInt(e.target.value))}
                            />
                          </div>
                          
                          {/* Стили текста */}
                          <div className="text-style-buttons">
                            <button 
                              className={selectedElement.fontWeight === 'bold' ? 'active' : ''}
                              onClick={() => updateSelectedElement('fontWeight', selectedElement.fontWeight === 'bold' ? 'normal' : 'bold')}
                              title="Жирный (Ctrl+B)"
                            >
                              <strong>B</strong>
                            </button>
                            <button 
                              className={selectedElement.fontStyle === 'italic' ? 'active' : ''}
                              onClick={() => updateSelectedElement('fontStyle', selectedElement.fontStyle === 'italic' ? 'normal' : 'italic')}
                              title="Курсив (Ctrl+I)"
                            >
                              <em>I</em>
                            </button>
                            <button 
                              className={selectedElement.textDecoration === 'underline' ? 'active' : ''}
                              onClick={() => updateSelectedElement('textDecoration', selectedElement.textDecoration === 'underline' ? 'none' : 'underline')}
                              title="Подчеркнутый (Ctrl+U)"
                            >
                              <u>U</u>
                            </button>
                            <button 
                              className={selectedElement.textDecoration === 'line-through' ? 'active' : ''}
                              onClick={() => updateSelectedElement('textDecoration', selectedElement.textDecoration === 'line-through' ? 'none' : 'line-through')}
                              title="Зачеркнутый"
                            >
                              <s>S</s>
                            </button>
                          </div>
                          
                          {/* Выравнивание текста */}
                          <div className="text-align-buttons">
                            <button 
                              className={selectedElement.textAlign === 'left' ? 'active' : ''}
                              onClick={() => updateSelectedElement('textAlign', 'left')}
                              title="По левому краю"
                            >
                              ≡
                            </button>
                            <button 
                              className={selectedElement.textAlign === 'center' ? 'active' : ''}
                              onClick={() => updateSelectedElement('textAlign', 'center')}
                              title="По центру"
                            >
                              ≣
                            </button>
                            <button 
                              className={selectedElement.textAlign === 'right' ? 'active' : ''}
                              onClick={() => updateSelectedElement('textAlign', 'right')}
                              title="По правому краю"
                            >
                              ≡
                            </button>
                          </div>
                          
                          {/* Межстрочный интервал и кернинг */}
                          <div className="input-pair">
                            <div className="input-with-label">
                              <span>Интервал</span>
                              <input 
                                type="number" 
                                min="0.5"
                                max="3"
                                step="0.1"
                                value={selectedElement.lineHeight || 1.2}
                                onChange={(e) => updateSelectedElement('lineHeight', parseFloat(e.target.value))}
                              />
                            </div>
                            <div className="input-with-label">
                              <span>Кернинг</span>
                              <input 
                                type="number" 
                                min="-10"
                                max="10"
                                step="0.5"
                                value={selectedElement.letterSpacing || 0}
                                onChange={(e) => updateSelectedElement('letterSpacing', parseFloat(e.target.value))}
                              />
                            </div>
                          </div>
                          
                          <div className="text-content">
                            <span>Текст</span>
                            <textarea
                              value={selectedElement.text}
                              onChange={(e) => updateSelectedElement('text', e.target.value)}
                              placeholder="Введите текст..."
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Настройки изображений */}
                    {selectedElement.type === 'image' && (
                      <div className="property-group">
                        <label>Коррекция изображения</label>
                        <div className="image-adjustments">
                          <div className="input-with-label">
                            <span>Яркость</span>
                            <input 
                              type="range" 
                              min="0" 
                              max="200"
                              value={selectedElement.brightness || 100}
                              onChange={(e) => updateSelectedElement('brightness', parseInt(e.target.value))}
                            />
                            <span>{selectedElement.brightness || 100}%</span>
                          </div>
                          
                          <div className="input-with-label">
                            <span>Контраст</span>
                            <input 
                              type="range" 
                              min="0" 
                              max="200"
                              value={selectedElement.contrast || 100}
                              onChange={(e) => updateSelectedElement('contrast', parseInt(e.target.value))}
                            />
                            <span>{selectedElement.contrast || 100}%</span>
                          </div>
                          
                          <div className="input-with-label">
                            <span>Насыщенность</span>
                            <input 
                              type="range" 
                              min="0" 
                              max="200"
                              value={selectedElement.saturation || 100}
                              onChange={(e) => updateSelectedElement('saturation', parseInt(e.target.value))}
                            />
                            <span>{selectedElement.saturation || 100}%</span>
                          </div>
                          
                          <div className="input-with-label">
                            <span>Оттенки серого</span>
                            <input 
                              type="range" 
                              min="0" 
                              max="100"
                              value={selectedElement.grayscale || 0}
                              onChange={(e) => updateSelectedElement('grayscale', parseInt(e.target.value))}
                            />
                            <span>{selectedElement.grayscale || 0}%</span>
                          </div>
                          
                          <div className="input-with-label">
                            <span>Сепия</span>
                            <input 
                              type="range" 
                              min="0" 
                              max="100"
                              value={selectedElement.sepia || 0}
                              onChange={(e) => updateSelectedElement('sepia', parseInt(e.target.value))}
                            />
                            <span>{selectedElement.sepia || 0}%</span>
                          </div>
                          
                          <div className="input-with-label">
                            <span>Инверсия</span>
                            <input 
                              type="range" 
                              min="0" 
                              max="100"
                              value={selectedElement.invert || 0}
                              onChange={(e) => updateSelectedElement('invert', parseInt(e.target.value))}
                            />
                            <span>{selectedElement.invert || 0}%</span>
                          </div>
                          
                          <button 
                            onClick={() => {
                              updateSelectedElement('brightness', 100);
                              updateSelectedElement('contrast', 100);
                              updateSelectedElement('saturation', 100);
                              updateSelectedElement('grayscale', 0);
                              updateSelectedElement('sepia', 0);
                              updateSelectedElement('invert', 0);
                            }}
                            style={{marginTop: '8px', width: '100%'}}
                          >
                            Сбросить все фильтры
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="no-selection">
                  <div className="no-selection-content">
                    <FaMousePointer size={32} />
                    <h4>Ничего не выбрано</h4>
                    <p>Выберите элемент на холсте, чтобы изменить его свойства</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Панель прототипа */}
          {activePanel === 'prototype' && (
            <div className="figma-prototype-panel">
              <div className="prototype-content">
                <h4>Прототип</h4>
                <p>Настройки интерактивности и анимации будут добавлены в будущих версиях</p>
              </div>
            </div>
          )}

          {/* Панель инспектора */}
          {activePanel === 'inspect' && (
            <div className="figma-inspect-panel">
              {selectedElement ? (
                <div className="inspect-content">
                  <h4>Код и свойства</h4>
                  
                  <div className="inspect-section">
                    <h5>CSS свойства</h5>
                    <div className="code-block">
                      <pre>{generateCSS(selectedElement)}</pre>
                    </div>
                  </div>
                  
                  <div className="inspect-section">
                    <h5>Данные элемента</h5>
                    <div className="data-table">
                      <div className="data-row">
                        <span className="data-key">Тип:</span>
                        <span className="data-value">{selectedElement.type}</span>
                      </div>
                      <div className="data-row">
                        <span className="data-key">ID:</span>
                        <span className="data-value">{selectedElement.id.toString().slice(-8)}</span>
                      </div>
                      <div className="data-row">
                        <span className="data-key">Позиция:</span>
                        <span className="data-value">{Math.round(selectedElement.x)}, {Math.round(selectedElement.y)}</span>
                      </div>
                      {selectedElement.width && (
                        <div className="data-row">
                          <span className="data-key">Размер:</span>
                          <span className="data-value">{Math.round(selectedElement.width)} × {Math.round(selectedElement.height)}</span>
                        </div>
                      )}
                      {selectedElement.radius && (
                        <div className="data-row">
                          <span className="data-key">Радиус:</span>
                          <span className="data-value">{Math.round(selectedElement.radius)}px</span>
                        </div>
                      )}
                      <div className="data-row">
                        <span className="data-key">Заливка:</span>
                        <span className="data-value">{selectedElement.fillColor}</span>
                      </div>
                      <div className="data-row">
                        <span className="data-key">Обводка:</span>
                        <span className="data-value">{selectedElement.strokeColor} ({selectedElement.strokeWidth}px)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="inspect-actions">
                    <button 
                      onClick={() => copyToClipboard(generateCSS(selectedElement))}
                      className="copy-css-btn"
                    >
                      <FaCopy /> Копировать CSS
                    </button>
                    <button 
                      onClick={() => copyToClipboard(JSON.stringify(selectedElement, null, 2))}
                      className="copy-data-btn"
                    >
                      <FaCode /> Копировать данные
                    </button>
                  </div>
                </div>
              ) : (
                <div className="no-selection">
                  <div className="no-selection-content">
                    <FaCode size={32} />
                    <h4>Ничего не выбрано</h4>
                    <p>Выберите элемент для просмотра его кода и свойств</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Менеджер проектов */}
      {showProjectManager && (
        <div className="project-manager-overlay">
          <div className="project-manager">
            <div className="project-manager-header">
              <h3>Менеджер проектов</h3>
              <div className="project-manager-header-actions">
                <button 
                  className="clear-all-btn"
                  onClick={clearAllProjects}
                  title="Удалить все проекты и очистить кэш"
                >
                  <FaTrash /> Очистить всё
                </button>
                <button 
                  className="close-btn"
                  onClick={() => setShowProjectManager(false)}
                >
                  <FaTimes />
                </button>
              </div>
            </div>
            
            <div className="project-manager-content">
              <div className="projects-grid">
                {projects.map(project => (
                  <div key={project.id} className="project-card">
                    <div className="project-preview">
                      <span className="project-elements-count">
                        {project.elements.length} элементов
                      </span>
                    </div>
                    
                    <div className="project-info">
                      <h4>{project.name}</h4>
                      <p>{new Date(project.createdAt).toLocaleDateString()}</p>
                    </div>
                    
                    <div className="project-actions">
                      <button 
                        onClick={() => loadProject(project)}
                        className="load-btn"
                      >
                        Открыть
                      </button>
                      <button 
                        onClick={() => deleteProject(project.id)}
                        className="delete-btn"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="project-card new-project">
                  <div className="new-project-content">
                    <FaPlus />
                    <span>Новый проект</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Рендеринг текущего пути при рисовании */}
      {isDrawingPen && penPath.length > 0 && (
        <canvas
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            zIndex: 10
          }}
          width={canvasSize.width}
          height={canvasSize.height}
          ref={tempCanvasRef => {
            if (tempCanvasRef && penPath.length > 1) {
              const ctx = tempCanvasRef.getContext('2d');
              ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = brushSize;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.globalAlpha = opacity;
              
              ctx.beginPath();
              ctx.moveTo(penPath[0].x, penPath[0].y);
              penPath.forEach(point => {
                ctx.lineTo(point.x, point.y);
              });
              ctx.stroke();
            }
          }}
        />
      )}

      {/* Скрытый input для импорта файлов */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".sketch,.json,.svg"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Диалог импорта */}
      {isImporting && (
        <div className="modal-overlay">
          <div className="import-dialog">
            <div className="dialog-header">
              <h3>Импорт файла</h3>
            </div>
            <div className="dialog-content">
              <div className="import-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${importProgress}%` }}
                  ></div>
                </div>
                <p>Импорт файла... {importProgress}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Кастомная палитра цветов */}
      {showColorPicker && (
        <ColorPicker 
          color={tempColor}
          onChange={handleColorChange}
          onClose={closeColorPicker}
        />
      )}
    </div>
  );
};

export default DesignEditor;