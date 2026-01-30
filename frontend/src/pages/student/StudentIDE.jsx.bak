import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import FileTree from '../../components/FileTree';
import AIAssistant from '../../components/AIAssistant';
import styles from './StudentIDE.module.css';
import { FaPlay, FaPlus, FaFolderPlus, FaArrowLeft, FaBars, FaTimes, FaKeyboard, FaSearch, FaTerminal } from 'react-icons/fa';
import { AiOutlineClose, AiOutlineRobot } from 'react-icons/ai';
import { MdComputer, MdTablet, MdPhoneIphone, MdRefresh, MdPause } from 'react-icons/md';
import { BiRefresh } from 'react-icons/bi';
import { VscChevronUp, VscChevronDown, VscClose } from 'react-icons/vsc';
import { emmetHTML, emmetCSS, emmetJSX } from 'emmet-monaco-es';
import { getProject, updateProject } from '../../services/projectService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function StudentIDE() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  
  // Получаем projectId из URL параметра или из state
  const projectId = params.projectId || location.state?.project?._id || location.state?.project?.id;
  
  if (!projectId) {
    // Если нет проекта, перенаправляем на страницу проектов
    navigate('/student/projects');
    return null;
  }
  
  // Загрузка файловой системы с сервера или localStorage
  const [project, setProject] = useState(location.state?.project || null);
  const [fileSystem, setFileSystem] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [output, setOutput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewHeight, setPreviewHeight] = useState(window.innerHeight / 2);
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('studentIDE_activeTheme') || 'vs-dark';
  });
  const [unsavedFiles, setUnsavedFiles] = useState(new Set()); // Отслеживание несохранённых файлов
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [selectedCode, setSelectedCode] = useState('');
  const [lastSaveTime, setLastSaveTime] = useState(null); // Время последнего сохранения
  const [showHotkeys, setShowHotkeys] = useState(false); // Показать панель горячих клавиш
  const [contextMenu, setContextMenu] = useState(null); // {x, y, tabPath}
  const [splitMode, setSplitMode] = useState(null); // null | 'vertical' | 'horizontal'
  const [splitTabs, setSplitTabs] = useState([]); // Вкладки для второго редактора
  const [activeSplitTab, setActiveSplitTab] = useState(null); // Активная вкладка во втором редакторе
  const [liveReload, setLiveReload] = useState(true); // Автоматическое обновление предпросмотра
  const [deviceMode, setDeviceMode] = useState('desktop'); // desktop | tablet | mobile | custom
  const [customSize, setCustomSize] = useState({ width: 1920, height: 1080 });
  const [showGlobalSearch, setShowGlobalSearch] = useState(false); // Показать панель глобального поиска
  const [searchQuery, setSearchQuery] = useState(''); // Поисковый запрос
  const [searchResults, setSearchResults] = useState([]); // Результаты поиска [{file, line, lineNumber, column, match}]
  const [isSearching, setIsSearching] = useState(false); // Индикатор поиска
  const [showTerminal, setShowTerminal] = useState(false); // Показать терминал
  const [terminalCommand, setTerminalCommand] = useState(''); // Текущая команда в терминале
  const [terminalOutput, setTerminalOutput] = useState([]); // Вывод терминала [{type: 'input'|'output'|'error', text}]
  const [terminalHeight, setTerminalHeight] = useState(250); // Высота терминала
  const [isResizingTerminal, setIsResizingTerminal] = useState(false); // Изменение размера терминала
  const editorRef = useRef(null);
  const splitEditorRef = useRef(null); // Второй редактор для сплит-режима
  const previewRef = useRef(null);
  const resizerRef = useRef(null);
  const monacoRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  // Загрузка проекта с сервера при монтировании
  useEffect(() => {
    loadProject();
    loadTheme();
  }, [projectId]);

  // Загрузка активной темы
  const loadTheme = () => {
    const savedTheme = localStorage.getItem('studentIDE_activeTheme');
    if (savedTheme) {
      setCurrentTheme(savedTheme);
    }
  };

  // Слушаем событие смены темы
  useEffect(() => {
    const handleThemeChange = (event) => {
      const { themeId } = event.detail;
      setCurrentTheme(themeId);
      applyCustomTheme(themeId);
    };

    window.addEventListener('themeChanged', handleThemeChange);
    return () => window.removeEventListener('themeChanged', handleThemeChange);
  }, []);

  // Применяем тему когда редактор готов или тема меняется
  useEffect(() => {
    if (monacoRef.current && editorRef.current && currentTheme) {
      applyCustomTheme(currentTheme);
    }
  }, [currentTheme, monacoRef.current, editorRef.current]);

  // Применение пользовательской темы
  const applyCustomTheme = (themeId) => {
    if (!monacoRef.current || !editorRef.current) {
      return;
    }

    // Базовые встроенные темы Monaco
    const monacoBuiltInThemes = ['vs-dark', 'vs-light', 'hc-black'];
    
    if (monacoBuiltInThemes.includes(themeId)) {
      editorRef.current.updateOptions({ theme: themeId });
      return;
    }

    // Определения предустановленных тем
    const predefinedThemeDefinitions = {
      'monokai': {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '75715e' },
          { token: 'string', foreground: 'e6db74' },
          { token: 'keyword', foreground: 'f92672' },
          { token: 'number', foreground: 'ae81ff' },
          { token: 'function', foreground: 'a6e22e' },
          { token: 'variable', foreground: 'f8f8f2' },
        ],
        colors: {
          'editor.background': '#272822',
          'editor.foreground': '#f8f8f2',
          'editor.lineHighlightBackground': '#3e3d32',
          'editor.selectionBackground': '#49483e',
        }
      },
      'dracula': {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6272a4' },
          { token: 'string', foreground: 'f1fa8c' },
          { token: 'keyword', foreground: 'ff79c6' },
          { token: 'number', foreground: 'bd93f9' },
          { token: 'function', foreground: '50fa7b' },
          { token: 'variable', foreground: 'f8f8f2' },
        ],
        colors: {
          'editor.background': '#282a36',
          'editor.foreground': '#f8f8f2',
          'editor.lineHighlightBackground': '#44475a',
          'editor.selectionBackground': '#44475a',
        }
      },
      'github-dark': {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '8b949e' },
          { token: 'string', foreground: 'a5d6ff' },
          { token: 'keyword', foreground: 'ff7b72' },
          { token: 'number', foreground: '79c0ff' },
          { token: 'function', foreground: 'd2a8ff' },
          { token: 'variable', foreground: 'c9d1d9' },
        ],
        colors: {
          'editor.background': '#0d1117',
          'editor.foreground': '#c9d1d9',
          'editor.lineHighlightBackground': '#161b22',
          'editor.selectionBackground': '#264f78',
        }
      },
      'github-light': {
        base: 'vs-light',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6e7781' },
          { token: 'string', foreground: '0a3069' },
          { token: 'keyword', foreground: 'cf222e' },
          { token: 'number', foreground: '0550ae' },
          { token: 'function', foreground: '8250df' },
          { token: 'variable', foreground: '24292f' },
        ],
        colors: {
          'editor.background': '#ffffff',
          'editor.foreground': '#24292f',
          'editor.lineHighlightBackground': '#f6f8fa',
          'editor.selectionBackground': '#add6ff',
        }
      },
      'one-dark': {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '5c6370' },
          { token: 'string', foreground: '98c379' },
          { token: 'keyword', foreground: 'c678dd' },
          { token: 'number', foreground: 'd19a66' },
          { token: 'function', foreground: '61afef' },
          { token: 'variable', foreground: 'abb2bf' },
        ],
        colors: {
          'editor.background': '#282c34',
          'editor.foreground': '#abb2bf',
          'editor.lineHighlightBackground': '#2c313c',
          'editor.selectionBackground': '#3e4451',
        }
      },
      'nord': {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '616e88' },
          { token: 'string', foreground: 'a3be8c' },
          { token: 'keyword', foreground: '81a1c1' },
          { token: 'number', foreground: 'b48ead' },
          { token: 'function', foreground: '88c0d0' },
          { token: 'variable', foreground: 'd8dee9' },
        ],
        colors: {
          'editor.background': '#2e3440',
          'editor.foreground': '#d8dee9',
          'editor.lineHighlightBackground': '#3b4252',
          'editor.selectionBackground': '#434c5e',
        }
      },
      'solarized-dark': {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '586e75' },
          { token: 'string', foreground: '2aa198' },
          { token: 'keyword', foreground: '859900' },
          { token: 'number', foreground: 'd33682' },
          { token: 'function', foreground: '268bd2' },
          { token: 'variable', foreground: '839496' },
        ],
        colors: {
          'editor.background': '#002b36',
          'editor.foreground': '#839496',
          'editor.lineHighlightBackground': '#073642',
          'editor.selectionBackground': '#073642',
        }
      },
      'solarized-light': {
        base: 'vs-light',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '93a1a1' },
          { token: 'string', foreground: '2aa198' },
          { token: 'keyword', foreground: '859900' },
          { token: 'number', foreground: 'd33682' },
          { token: 'function', foreground: '268bd2' },
          { token: 'variable', foreground: '657b83' },
        ],
        colors: {
          'editor.background': '#fdf6e3',
          'editor.foreground': '#657b83',
          'editor.lineHighlightBackground': '#eee8d5',
          'editor.selectionBackground': '#eee8d5',
        }
      },
      'night-owl': {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '637777' },
          { token: 'string', foreground: 'ecc48d' },
          { token: 'keyword', foreground: 'c792ea' },
          { token: 'number', foreground: 'f78c6c' },
          { token: 'function', foreground: '82aaff' },
          { token: 'variable', foreground: 'd6deeb' },
        ],
        colors: {
          'editor.background': '#011627',
          'editor.foreground': '#d6deeb',
          'editor.lineHighlightBackground': '#010e1a',
          'editor.selectionBackground': '#1d3b53',
        }
      },
      'ayu-dark': {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '5c6773' },
          { token: 'string', foreground: 'aad94c' },
          { token: 'keyword', foreground: 'ff8f40' },
          { token: 'number', foreground: 'ffcc66' },
          { token: 'function', foreground: 'ffb454' },
          { token: 'variable', foreground: 'b3b1ad' },
        ],
        colors: {
          'editor.background': '#0a0e14',
          'editor.foreground': '#b3b1ad',
          'editor.lineHighlightBackground': '#131721',
          'editor.selectionBackground': '#253340',
        }
      },
      'cobalt2': {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '0088ff' },
          { token: 'string', foreground: '3ad900' },
          { token: 'keyword', foreground: 'ff9d00' },
          { token: 'number', foreground: 'ff628c' },
          { token: 'function', foreground: 'ffc600' },
          { token: 'variable', foreground: 'ffffff' },
        ],
        colors: {
          'editor.background': '#193549',
          'editor.foreground': '#ffffff',
          'editor.lineHighlightBackground': '#1f4662',
          'editor.selectionBackground': '#0050a4',
        }
      },
      'synthwave': {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '848bbd' },
          { token: 'string', foreground: '72f1b8' },
          { token: 'keyword', foreground: 'ff7edb' },
          { token: 'number', foreground: 'f97e72' },
          { token: 'function', foreground: 'fede5d' },
          { token: 'variable', foreground: 'f0eff1' },
        ],
        colors: {
          'editor.background': '#262335',
          'editor.foreground': '#f0eff1',
          'editor.lineHighlightBackground': '#2a2139',
          'editor.selectionBackground': '#463465',
        }
      },
      'tokyo-night': {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '565f89' },
          { token: 'string', foreground: '9ece6a' },
          { token: 'keyword', foreground: 'bb9af7' },
          { token: 'number', foreground: 'ff9e64' },
          { token: 'function', foreground: '7aa2f7' },
          { token: 'variable', foreground: 'c0caf5' },
        ],
        colors: {
          'editor.background': '#1a1b26',
          'editor.foreground': '#c0caf5',
          'editor.lineHighlightBackground': '#24283b',
          'editor.selectionBackground': '#364a82',
        }
      },
      'material': {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '546e7a' },
          { token: 'string', foreground: 'c3e88d' },
          { token: 'keyword', foreground: 'c792ea' },
          { token: 'number', foreground: 'f78c6c' },
          { token: 'function', foreground: '82aaff' },
          { token: 'variable', foreground: 'eeffff' },
        ],
        colors: {
          'editor.background': '#263238',
          'editor.foreground': '#eeffff',
          'editor.lineHighlightBackground': '#2c3b41',
          'editor.selectionBackground': '#546e7a',
        }
      },
      'gruvbox-dark': {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '928374' },
          { token: 'string', foreground: 'fabd2f' },
          { token: 'keyword', foreground: 'fb4934' },
          { token: 'number', foreground: 'd3869b' },
          { token: 'function', foreground: 'b8bb26' },
          { token: 'variable', foreground: 'ebdbb2' },
        ],
        colors: {
          'editor.background': '#282828',
          'editor.foreground': '#ebdbb2',
          'editor.lineHighlightBackground': '#3c3836',
          'editor.selectionBackground': '#504945',
        }
      },
      'palenight': {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '676e95' },
          { token: 'string', foreground: 'c3e88d' },
          { token: 'keyword', foreground: 'c792ea' },
          { token: 'number', foreground: 'f78c6c' },
          { token: 'function', foreground: '82aaff' },
          { token: 'variable', foreground: 'bfc7d5' },
        ],
        colors: {
          'editor.background': '#292d3e',
          'editor.foreground': '#bfc7d5',
          'editor.lineHighlightBackground': '#32374d',
          'editor.selectionBackground': '#717cb4',
        }
      },
      'oceanic': {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '65737e' },
          { token: 'string', foreground: '99c794' },
          { token: 'keyword', foreground: 'c594c5' },
          { token: 'number', foreground: 'f99157' },
          { token: 'function', foreground: '6699cc' },
          { token: 'variable', foreground: 'cdd3de' },
        ],
        colors: {
          'editor.background': '#1b2b34',
          'editor.foreground': '#cdd3de',
          'editor.lineHighlightBackground': '#233645',
          'editor.selectionBackground': '#4f5b66',
        }
      },
    };

    // Проверяем предустановленные темы
    if (predefinedThemeDefinitions[themeId]) {
      try {
        // Проверяем, не была ли тема уже определена
        try {
          monacoRef.current.editor.setTheme(themeId);
        } catch {
          // Если тема не найдена, определяем её
          monacoRef.current.editor.defineTheme(themeId, predefinedThemeDefinitions[themeId]);
        }
        editorRef.current.updateOptions({ theme: themeId });
        return;
      } catch (error) {
        console.error('Error applying predefined theme:', error);
      }
    }

    // Загружаем пользовательскую тему
    const themes = JSON.parse(localStorage.getItem('studentIDE_themes') || '[]');
    const customTheme = themes.find(t => t.id === themeId);
    
    if (customTheme) {
      try {
        // Определяем тему в Monaco
        monacoRef.current.editor.defineTheme(themeId, {
          base: customTheme.base,
          inherit: true,
          rules: customTheme.tokenColors.map(token => ({
            token: token.scope,
            foreground: token.foreground.replace('#', '')
          })),
          colors: customTheme.colors
        });

        // Применяем тему
        editorRef.current.updateOptions({ theme: themeId });
      } catch (error) {
        console.error('Error applying custom theme:', error);
        // Если не получилось, возвращаемся к базовой теме
        editorRef.current.updateOptions({ theme: customTheme.base || 'vs-dark' });
      }
    }
  };

  const loadProject = async () => {
    try {
      setLoading(true);
      const projectData = await getProject(projectId);
      
      // Сохраняем данные проекта
      setProject(projectData);
      
      if (projectData.file_system && projectData.file_system.length > 0) {
        setFileSystem(projectData.file_system);
      } else {
        // Если нет файловой системы, создаем дефолтную
        const defaultFS = createDefaultFileSystem(projectData.name || 'Мой проект');
        setFileSystem(defaultFS);
        // Сразу сохраняем на сервер
        await updateProject(projectId, { fileSystem: defaultFS });
      }
    } catch (error) {
      console.error('Error loading project:', error);
      // Если ошибка загрузки, пробуем localStorage
      const saved = localStorage.getItem(`studentIDE_project_${projectId}`);
      if (saved) {
        setFileSystem(JSON.parse(saved));
      } else {
        const defaultFS = createDefaultFileSystem('Мой проект');
        setFileSystem(defaultFS);
      }
    } finally {
      setLoading(false);
    }
  };

  const createDefaultFileSystem = (projectName) => {
    return [
      {
        type: 'folder',
        name: projectName,
        path: `/${projectName}`,
        children: [
          {
            type: 'file',
            name: 'index.html',
            path: `/${projectName}/index.html`,
            content: `<!DOCTYPE html>\n<html>\n<head>\n  <title>${projectName}</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Привет, мир!</h1>\n  <script src="script.js"></script>\n</body>\n</html>`
          },
          {
            type: 'file',
            name: 'script.js',
            path: `/${projectName}/script.js`,
            content: `// ${projectName}\nconsole.log("Hello, World!");`
          },
          {
            type: 'file',
            name: 'style.css',
            path: `/${projectName}/style.css`,
            content: `/* Стили для ${projectName} */\nbody {\n  margin: 0;\n  padding: 20px;\n  font-family: Arial, sans-serif;\n}`
          }
        ]
      }
    ];
  };

  // Сохранение файловой системы на сервер и в localStorage
  useEffect(() => {
    if (fileSystem.length === 0 || loading) return;
    
    // Сохраняем в localStorage как резервную копию немедленно
    localStorage.setItem(`studentIDE_project_${projectId}`, JSON.stringify(fileSystem));
    
    // Дебаунс для сохранения на сервер
    const timer = setTimeout(() => {
      saveToServer();
    }, 1000); // Сохраняем через 1 секунду после последнего изменения
    
    return () => clearTimeout(timer);
  }, [fileSystem, projectId, loading]);

  const saveToServer = async () => {
    try {
      await updateProject(projectId, { fileSystem });
      console.log('✓ Автосохранение на сервер');
      setLastSaveTime(new Date());
    } catch (error) {
      console.error('⚠ Ошибка автосохранения:', error);
    }
  };

  // Моментальное автосохранение при изменении файлов
  useEffect(() => {
    if (unsavedFiles.size === 0) return;

    // Дебаунс для автосохранения - сохраняем через 0.5 секунды после последнего изменения
    autoSaveTimerRef.current = setTimeout(() => {
      if (activeTab && editorRef.current && unsavedFiles.has(activeTab)) {
        const content = editorRef.current.getValue();
        
        // Обновляем содержимое в файловой системе
        const updatedFS = updateFileContent(fileSystem, activeTab, content);
        setFileSystem(updatedFS);
        
        // Обновляем содержимое в активной вкладке
        setOpenTabs(openTabs.map(tab => 
          tab.path === activeTab ? { ...tab, content } : tab
        ));
        
        // Синхронизируем с splitTabs если файл открыт там
        setSplitTabs(prevSplitTabs => 
          prevSplitTabs.map(tab => 
            tab.path === activeTab ? { ...tab, content } : tab
          )
        );
        
        // Убираем файл из списка несохранённых
        setUnsavedFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(activeTab);
          return newSet;
        });
        
        console.log('💾 Автосохранение:', activeTab);
        setLastSaveTime(new Date());
      }
    }, 500); // 0.5 секунды после последнего изменения

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [unsavedFiles, activeTab, fileSystem, openTabs]);

  // Обработка изменения размера панели предпросмотра
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      // Вычисляем новую высоту от нижней части экрана
      const containerBottom = window.innerHeight - 50; // Учитываем header
      const newHeight = containerBottom - e.clientY;
      
      // Ограничиваем минимум и максимум
      const minHeight = 150;
      const maxHeight = containerBottom - 200; // Оставляем место для редактора
      
      if (newHeight >= minHeight && newHeight <= maxHeight) {
        setPreviewHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isResizing) {
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const startResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Горячие клавиши для IDE
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+B - сворачивание/разворачивание боковой панели
      if (e.ctrlKey && e.code === 'KeyB') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      }
      
      // Ctrl+S - ручное сохранение
      if (e.ctrlKey && e.code === 'KeyS') {
        e.preventDefault();
        if (activeTab && editorRef.current) {
          const content = editorRef.current.getValue();
          const updatedFS = updateFileContent(fileSystem, activeTab, content);
          setFileSystem(updatedFS);
          
          // Убираем файл из списка несохранённых
          setUnsavedFiles(prev => {
            const newSet = new Set(prev);
            newSet.delete(activeTab);
            return newSet;
          });
          
          console.log('💾 Сохранено вручную:', activeTab);
          setLastSaveTime(new Date());
        }
      }
      
      // Ctrl+R или F5 - запуск кода
      if ((e.ctrlKey && e.code === 'KeyR') || e.code === 'F5') {
        e.preventDefault();
        runCode();
      }
      
      // Ctrl+W - закрыть активную вкладку
      if (e.ctrlKey && e.code === 'KeyW') {
        e.preventDefault();
        if (activeTab) {
          const newTabs = openTabs.filter(tab => tab.path !== activeTab);
          setOpenTabs(newTabs);
          setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].path : null);
        }
      }
      
      // Ctrl+Tab - переключение между вкладками
      if (e.ctrlKey && e.code === 'Tab') {
        e.preventDefault();
        if (openTabs.length > 1) {
          const currentIndex = openTabs.findIndex(tab => tab.path === activeTab);
          const nextIndex = (currentIndex + 1) % openTabs.length;
          setActiveTab(openTabs[nextIndex].path);
        }
      }
      
      // Ctrl+Shift+Tab - переключение между вкладками назад
      if (e.ctrlKey && e.shiftKey && e.code === 'Tab') {
        e.preventDefault();
        if (openTabs.length > 1) {
          const currentIndex = openTabs.findIndex(tab => tab.path === activeTab);
          const prevIndex = currentIndex === 0 ? openTabs.length - 1 : currentIndex - 1;
          setActiveTab(openTabs[prevIndex].path);
        }
      }
      
      // Ctrl+N - новый файл
      if (e.ctrlKey && e.code === 'KeyN') {
        e.preventDefault();
        const name = prompt('Имя файла (с расширением):');
        if (name && fileSystem.length > 0) {
          const rootPath = fileSystem[0]?.path || '/Мой проект';
          handleCreateFile(rootPath, name);
        }
      }
      
      // Ctrl+Shift+N - новая папка
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyN') {
        e.preventDefault();
        const name = prompt('Имя папки:');
        if (name && fileSystem.length > 0) {
          const rootPath = fileSystem[0]?.path || '/Мой проект';
          handleCreateFolder(rootPath, name);
        }
      }

      // Ctrl+\ - открыть/закрыть сплит-режим
      if (e.ctrlKey && e.code === 'Backslash') {
        e.preventDefault();
        if (splitMode) {
          closeSplitMode();
        } else if (activeTab) {
          const file = findFile(fileSystem, activeTab);
          if (file) openInSplit(file);
        }
      }

      // Ctrl+K Ctrl+\ - переключить ориентацию сплита
      if (e.ctrlKey && e.code === 'Backslash' && splitMode) {
        e.preventDefault();
        toggleSplitOrientation();
      }

      // Ctrl+Shift+F - глобальный поиск
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyF') {
        e.preventDefault();
        setShowGlobalSearch(prev => !prev);
      }

      // Ctrl+` - открыть/закрыть терминал
      if (e.ctrlKey && e.code === 'Backquote') {
        e.preventDefault();
        setShowTerminal(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, openTabs, fileSystem, sidebarCollapsed, splitMode, showGlobalSearch, showTerminal]);

  // Автообновление предпросмотра при изменении HTML/CSS/JS (Live Reload)
  useEffect(() => {
    // Обновляем превью только если включен live reload И превью показано
    if (liveReload && showPreview && fileSystem.length > 0) {
      const timer = setTimeout(() => {
        updatePreview();
      }, 800); // Уменьшена задержка для более быстрого обновления
      return () => clearTimeout(timer);
    }
  }, [fileSystem, liveReload, showPreview]);

  // Найти файл по пути в дереве
  const findFile = (fs, path) => {
    for (const item of fs) {
      if (item.path === path) return item;
      if (item.type === 'folder' && item.children) {
        const found = findFile(item.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  // Обновить содержимое файла в дереве
  const updateFileContent = (fs, path, content) => {
    return fs.map(item => {
      if (item.path === path) {
        return { ...item, content };
      }
      if (item.type === 'folder' && item.children) {
        return { ...item, children: updateFileContent(item.children, path, content) };
      }
      return item;
    });
  };

  // Открыть файл
  const handleFileSelect = (file) => {
    if (!openTabs.find(tab => tab.path === file.path)) {
      setOpenTabs([...openTabs, file]);
    }
    setActiveTab(file.path);
    
    // Обновляем предпросмотр если он уже открыт
    if (showPreview) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'html' || ext === 'css') {
        setTimeout(() => {
          updatePreview();
        }, 300);
      }
    }
  };

  // Закрыть вкладку
  const closeTab = (path, e) => {
    if (e) e.stopPropagation();
    const newTabs = openTabs.filter(tab => tab.path !== path);
    setOpenTabs(newTabs);
    if (activeTab === path) {
      setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].path : null);
    }
  };

  // Контекстное меню вкладок
  const handleTabContextMenu = (e, tabPath) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      tabPath
    });
  };

  const closeAllTabs = () => {
    setOpenTabs([]);
    setActiveTab(null);
    setContextMenu(null);
  };

  const closeOtherTabs = (currentPath) => {
    const newTabs = openTabs.filter(tab => tab.path === currentPath);
    setOpenTabs(newTabs);
    setActiveTab(currentPath);
    setContextMenu(null);
  };

  const closeTabsToRight = (currentPath) => {
    const currentIndex = openTabs.findIndex(tab => tab.path === currentPath);
    const newTabs = openTabs.slice(0, currentIndex + 1);
    setOpenTabs(newTabs);
    if (!newTabs.find(tab => tab.path === activeTab)) {
      setActiveTab(currentPath);
    }
    setContextMenu(null);
  };

  // Функции для сплит-режима
  const openInSplit = (file) => {
    if (!splitMode) {
      setSplitMode('vertical'); // По умолчанию вертикальный сплит
    }
    if (!splitTabs.find(tab => tab.path === file.path)) {
      setSplitTabs([...splitTabs, file]);
    }
    setActiveSplitTab(file.path);
    setContextMenu(null);
  };

  const closeSplitMode = () => {
    setSplitMode(null);
    setSplitTabs([]);
    setActiveSplitTab(null);
  };

  const toggleSplitOrientation = () => {
    setSplitMode(prev => prev === 'vertical' ? 'horizontal' : 'vertical');
  };

  // Глобальный поиск по всем файлам
  const performGlobalSearch = (query) => {
    if (!query || query.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const results = [];
    const searchTerm = query.toLowerCase();

    // Рекурсивная функция для поиска в файлах
    const searchInFiles = (items, parentPath = '') => {
      items.forEach(item => {
        if (item.type === 'file' && item.content) {
          const lines = item.content.split('\n');
          lines.forEach((line, index) => {
            const lowerLine = line.toLowerCase();
            const position = lowerLine.indexOf(searchTerm);
            
            if (position !== -1) {
              results.push({
                file: item.path,
                fileName: item.name,
                line: line,
                lineNumber: index + 1,
                column: position + 1,
                match: query
              });
            }
          });
        } else if (item.type === 'folder' && item.children) {
          searchInFiles(item.children, item.path);
        }
      });
    };

    searchInFiles(fileSystem);
    setSearchResults(results);
    setIsSearching(false);
  };

  // Обработчик изменения поискового запроса
  useEffect(() => {
    if (searchQuery && showGlobalSearch) {
      const timer = setTimeout(() => {
        performGlobalSearch(searchQuery);
      }, 300); // Debounce для производительности
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, showGlobalSearch, fileSystem]);

  // Перейти к результату поиска
  const jumpToSearchResult = (result) => {
    const file = findFile(fileSystem, result.file);
    if (file) {
      handleFileSelect(file);
      
      // Подождем, пока редактор обновится
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.revealLineInCenter(result.lineNumber);
          editorRef.current.setPosition({ lineNumber: result.lineNumber, column: result.column });
          editorRef.current.focus();
        }
      }, 100);
    }
  };

  // Функции терминала
  const executeTerminalCommand = (cmd) => {
    if (!cmd.trim()) return;

    // Добавляем команду в вывод
    setTerminalOutput(prev => [...prev, { type: 'input', text: `$ ${cmd}` }]);
    
    // Простая симуляция команд (в реальном приложении это был бы API запрос)
    setTimeout(() => {
      let output = '';
      const lowerCmd = cmd.toLowerCase().trim();
      
      // Базовые команды
      if (lowerCmd === 'help' || lowerCmd === 'помощь') {
        output = `Доступные команды:
  help - показать эту справку
  clear - очистить терминал
  ls - показать файлы проекта
  pwd - показать текущую директорию
  
Примечание: Это учебная среда. Реальные команды npm/git выполняются на сервере.`;
      } else if (lowerCmd === 'clear' || lowerCmd === 'cls') {
        setTerminalOutput([]);
        setTerminalCommand('');
        return;
      } else if (lowerCmd === 'ls' || lowerCmd === 'dir') {
        const files = fileSystem[0]?.children || [];
        output = files.map(f => f.type === 'folder' ? `📁 ${f.name}` : `📄 ${f.name}`).join('\n');
      } else if (lowerCmd === 'pwd') {
        output = fileSystem[0]?.path || '/Мой проект';
      } else if (lowerCmd.startsWith('echo ')) {
        output = cmd.slice(5);
      } else {
        output = `Команда "${cmd}" не поддерживается в учебной среде.\nВведите "help" для списка доступных команд.`;
      }
      
      setTerminalOutput(prev => [...prev, { type: 'output', text: output }]);
    }, 100);
    
    setTerminalCommand('');
  };

  const handleTerminalKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeTerminalCommand(terminalCommand);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Можно добавить историю команд
    }
  };

  // Изменение размера терминала
  const handleTerminalResize = (e) => {
    if (!isResizingTerminal) return;
    const newHeight = window.innerHeight - e.clientY;
    if (newHeight > 100 && newHeight < window.innerHeight - 200) {
      setTerminalHeight(newHeight);
    }
  };

  useEffect(() => {
    if (isResizingTerminal) {
      const handleMouseMove = (e) => handleTerminalResize(e);
      const handleMouseUp = () => setIsResizingTerminal(false);
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizingTerminal]);

  // Закрыть контекстное меню при клике вне его
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // Обработка навигации между HTML страницами в preview
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'navigate' && event.data.href) {
        const href = event.data.href;
        console.log('🔗 Навигация к:', href);
        
        // Ищем HTML файл по относительному пути
        const findHtmlByPath = (fs, path) => {
          // Убираем ./ и ../
          const cleanPath = path.replace(/^\.\//, '').replace(/^\.\.\//, '');
          
          for (const item of fs) {
            if (item.type === 'file' && (item.name === cleanPath || item.path.endsWith('/' + cleanPath))) {
              return item;
            }
            if (item.type === 'folder' && item.children) {
              const found = findHtmlByPath(item.children, cleanPath);
              if (found) return found;
            }
          }
          return null;
        };
        
        const targetFile = findHtmlByPath(fileSystem, href);
        if (targetFile && previewRef.current && previewRef.current.contentWindow) {
          console.log('📄 Найден файл:', targetFile.name);
          
          // Получаем CSS и JS файлы
          const cssFiles = [];
          const jsFiles = [];
          
          const findAllFiles = (fs) => {
            fs.forEach(item => {
              if (item.type === 'file') {
                if (item.name.endsWith('.css')) cssFiles.push(item);
                if (item.name.endsWith('.js')) jsFiles.push(item);
              }
              if (item.type === 'folder' && item.children) {
                findAllFiles(item.children);
              }
            });
          };
          
          findAllFiles(fileSystem);
          
          // Формируем новый HTML
          let newHtml = targetFile.content || '';
          
          // Внедряем CSS
          let styles = '';
          cssFiles.forEach(file => {
            styles += `<style>/* ${file.name} */\n${file.content}\n</style>\n`;
          });
          
          // Внедряем JS
          let scripts = '';
          jsFiles.forEach(file => {
            scripts += `<script>// ${file.name}\n${file.content}\n</script>\n`;
          });
          
          // Добавляем навигационный скрипт
          const navigationScript = `
            <script>
              document.addEventListener('click', function(e) {
                const link = e.target.closest('a');
                if (link && link.href) {
                  const href = link.getAttribute('href');
                  if (href && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('#')) {
                    e.preventDefault();
                    window.parent.postMessage({ type: 'navigate', href: href }, '*');
                  }
                }
              });
            </script>
          `;
          
          const baseTag = '<base target="_self">';
          
          // Вставляем стили и скрипты
          if (newHtml.includes('</head>')) {
            newHtml = newHtml.replace('</head>', `${baseTag}${styles}</head>`);
          } else if (newHtml.includes('<html>')) {
            newHtml = newHtml.replace('<html>', `<html><head>${baseTag}${styles}</head>`);
          } else {
            newHtml = `<!DOCTYPE html><html><head>${baseTag}${styles}</head><body>${newHtml}${scripts}${navigationScript}</body></html>`;
          }
          
          if (newHtml.includes('</body>')) {
            newHtml = newHtml.replace('</body>', `${scripts}${navigationScript}</body>`);
          } else {
            newHtml += scripts + navigationScript;
          }
          
          // Обновляем iframe
          setPreviewHtml(newHtml);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fileSystem]);

  // Создать файл
  const handleCreateFile = (parentPath, fileName) => {
    const createFileInFolder = (fs, parentPath, fileName) => {
      return fs.map(item => {
        if (item.path === parentPath && item.type === 'folder') {
          const newFile = {
            type: 'file',
            name: fileName,
            path: `${parentPath}/${fileName}`,
            content: ''
          };
          return { ...item, children: [...(item.children || []), newFile] };
        }
        if (item.type === 'folder' && item.children) {
          return { ...item, children: createFileInFolder(item.children, parentPath, fileName) };
        }
        return item;
      });
    };
    setFileSystem(createFileInFolder(fileSystem, parentPath, fileName));
  };

  // Создать папку
  const handleCreateFolder = (parentPath, folderName) => {
    const createFolderInFolder = (fs, parentPath, folderName) => {
      return fs.map(item => {
        if (item.path === parentPath && item.type === 'folder') {
          const newFolder = {
            type: 'folder',
            name: folderName,
            path: `${parentPath}/${folderName}`,
            children: []
          };
          return { ...item, children: [...(item.children || []), newFolder] };
        }
        if (item.type === 'folder' && item.children) {
          return { ...item, children: createFolderInFolder(item.children, parentPath, folderName) };
        }
        return item;
      });
    };
    setFileSystem(createFolderInFolder(fileSystem, parentPath, folderName));
  };

  // Удалить файл/папку
  const handleDelete = (path) => {
    const deleteItem = (fs, path) => {
      return fs.filter(item => {
        if (item.path === path) return false;
        if (item.type === 'folder' && item.children) {
          item.children = deleteItem(item.children, path);
        }
        return true;
      });
    };
    setFileSystem(deleteItem(fileSystem, path));
    setOpenTabs(openTabs.filter(tab => tab.path !== path));
    if (activeTab === path) {
      const newTabs = openTabs.filter(tab => tab.path !== path);
      setActiveTab(newTabs.length > 0 ? newTabs[0].path : null);
    }
  };

  // Переименовать файл/папку
  const handleRename = (oldPath, newName) => {
    const renameItem = (fs, oldPath, newName) => {
      return fs.map(item => {
        if (item.path === oldPath) {
          const pathParts = oldPath.split('/');
          pathParts[pathParts.length - 1] = newName;
          const newPath = pathParts.join('/');
          return { ...item, name: newName, path: newPath };
        }
        if (item.type === 'folder' && item.children) {
          return { ...item, children: renameItem(item.children, oldPath, newName) };
        }
        return item;
      });
    };
    setFileSystem(renameItem(fileSystem, oldPath, newName));
  };

  // Переместить файл/папку
  const handleMove = (sourcePath, targetFolderPath) => {
    // Сначала находим элемент, который нужно переместить
    let itemToMove = null;
    
    const findAndRemoveItem = (fs, path) => {
      const result = [];
      for (const item of fs) {
        if (item.path === path) {
          itemToMove = { ...item };
        } else {
          if (item.type === 'folder' && item.children) {
            const filtered = findAndRemoveItem(item.children, path);
            result.push({ ...item, children: filtered });
          } else {
            result.push(item);
          }
        }
      }
      return result;
    };

    // Удаляем элемент из старого места
    let newFileSystem = findAndRemoveItem(fileSystem, sourcePath);

    if (!itemToMove) return;

    // Обновляем путь перемещаемого элемента
    const itemName = itemToMove.name;
    const newPath = `${targetFolderPath}/${itemName}`;
    
    const updatePaths = (item, newBasePath) => {
      const updatedItem = { ...item, path: newBasePath };
      if (item.type === 'folder' && item.children) {
        updatedItem.children = item.children.map(child => 
          updatePaths(child, `${newBasePath}/${child.name}`)
        );
      }
      return updatedItem;
    };

    itemToMove = updatePaths(itemToMove, newPath);

    // Добавляем элемент в новое место
    const addItemToFolder = (fs, targetPath, item) => {
      return fs.map(folder => {
        if (folder.path === targetPath && folder.type === 'folder') {
          return {
            ...folder,
            children: [...(folder.children || []), item]
          };
        }
        if (folder.type === 'folder' && folder.children) {
          return {
            ...folder,
            children: addItemToFolder(folder.children, targetPath, item)
          };
        }
        return folder;
      });
    };

    newFileSystem = addItemToFolder(newFileSystem, targetFolderPath, itemToMove);
    setFileSystem(newFileSystem);

    // Если перемещенный файл был открыт, обновляем activeTab
    if (activeTab === sourcePath) {
      setActiveTab(newPath);
    }

    // Обновляем открытые вкладки
    setOpenTabs(prevTabs => 
      prevTabs.map(tab => tab === sourcePath ? newPath : tab)
    );
  };

  // Выполнить код
  const runCode = async () => {
    console.log('🚀 Запуск кода, activeTab:', activeTab);
    
    if (!activeTab) {
      setOutput('⚠️ Выберите файл для выполнения');
      return;
    }
    
    const file = findFile(fileSystem, activeTab);
    console.log('📄 Найденный файл:', file);
    
    if (!file) {
      setOutput('❌ Файл не найден');
      return;
    }

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      console.log('📝 Расширение файла:', ext);
      
      if (ext === 'js' || ext === 'jsx') {
        const logs = [];
        const originalLog = console.log;
        console.log = (...args) => {
          logs.push(args.join(' '));
          originalLog(...args);
        };

        if (editorRef.current) {
          const code = editorRef.current.getValue();
          eval(code);
          setOutput(logs.join('\n') || '✓ Код выполнен успешно');
        }
        
        console.log = originalLog;
        setShowPreview(false);
      } else if (ext === 'html' || ext === 'css') {
        console.log('🌐 Запуск HTML предпросмотра');
        // Показываем предпросмотр HTML (с применёнными CSS стилями)
        updatePreview();
        setShowPreview(true);
        console.log('✅ showPreview установлен в true');
        setOutput('');
      } else if (ext === 'php') {
        console.log('🐘 Выполнение PHP кода');
        
        // Для PHP открываем в новом окне
        const realProjectId = project?.id || projectId;
        const fileName = file.name;
        const url = `${API_URL}/projects/${realProjectId}/php-preview/${fileName}`;
        
        window.open(url, '_blank', 'width=1200,height=800');
        setOutput('✓ PHP файл открыт в новом окне');
        setShowPreview(false);
      } else {
        setOutput('⚠️ Выполнение поддерживается только для JavaScript, HTML и PHP файлов');
        setShowPreview(false);
      }
    } catch (error) {
      console.error('❌ Ошибка выполнения:', error);
      setOutput('❌ Ошибка: ' + error.message);
      setShowPreview(false);
    }
  };

  // Обновить предпросмотр HTML
  const updatePreview = () => {
    console.log('🖼️ Обновление предпросмотра HTML');
    
    // Ищем index.html в файловой системе
    const findHtmlFile = (fs) => {
      for (const item of fs) {
        if (item.type === 'file' && item.name === 'index.html') {
          return item;
        }
        if (item.type === 'folder' && item.children) {
          const found = findHtmlFile(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    const htmlFile = findHtmlFile(fileSystem);
    if (!htmlFile) {
      setPreviewHtml('<html><body><p style="padding: 20px; color: #999;">Не найден файл index.html</p></body></html>');
      return;
    }
    
    // Собираем все файлы проекта для подключения CSS и JS
    let htmlContent = htmlFile.content || '';
    
    const cssFiles = [];
    const jsFiles = [];
    
    const findAllFiles = (fs) => {
      fs.forEach(item => {
        if (item.type === 'file') {
          if (item.name.endsWith('.css')) cssFiles.push(item);
          if (item.name.endsWith('.js')) jsFiles.push(item);
        }
        if (item.type === 'folder' && item.children) {
          findAllFiles(item.children);
        }
      });
    };
    
    findAllFiles(fileSystem);
    console.log('📁 Найдено CSS файлов:', cssFiles.length, 'JS файлов:', jsFiles.length);
    
    // Удаляем внешние ссылки на CSS и JS файлы из HTML
    htmlContent = htmlContent.replace(/<link[^>]*href=["'][^"']*\.css["'][^>]*>/gi, '');
    htmlContent = htmlContent.replace(/<script[^>]*src=["'][^"']*\.js["'][^>]*><\/script>/gi, '');
    
    // Внедряем CSS стили
    let styles = '';
    cssFiles.forEach(file => {
      styles += `<style>/* ${file.name} */\n${file.content}\n</style>\n`;
    });
    
    // Внедряем JS скрипты  
    let scripts = '';
    jsFiles.forEach(file => {
      scripts += `<script>// ${file.name}\n${file.content}\n</script>\n`;
    });
    
    // Добавляем скрипт для обработки навигации между страницами
    const navigationScript = `
      <script>
        // Перехватываем клики по ссылкам для SPA-подобной навигации
        document.addEventListener('click', function(e) {
          const link = e.target.closest('a');
          if (link && link.href) {
            const href = link.getAttribute('href');
            // Проверяем, что это относительная ссылка на HTML файл
            if (href && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('#')) {
              e.preventDefault();
              // Отправляем сообщение родительскому окну для загрузки новой страницы
              window.parent.postMessage({ type: 'navigate', href: href }, '*');
            }
          }
        });
      </script>
    `;
    
    // Добавляем base target для корректной работы навигации внутри iframe
    const baseTag = '<base target="_self">';
    
    // Вставляем стили и скрипты в HTML
    if (htmlContent.includes('</head>')) {
      htmlContent = htmlContent.replace('</head>', `${baseTag}${styles}</head>`);
    } else if (htmlContent.includes('<html>')) {
      htmlContent = htmlContent.replace('<html>', `<html><head>${baseTag}${styles}</head>`);
    } else {
      // Если нет тегов html/head, добавляем их
      htmlContent = `<!DOCTYPE html><html><head>${baseTag}${styles}</head><body>${htmlContent}${scripts}</body></html>`;
      setPreviewHtml(htmlContent);
      return;
    }
    
    if (htmlContent.includes('</body>')) {
      htmlContent = htmlContent.replace('</body>', `${scripts}${navigationScript}</body>`);
    } else {
      htmlContent += scripts + navigationScript;
    }
    
    console.log('✅ HTML предпросмотр готов');
    // Используем srcdoc вместо contentDocument для избежания CORS
    setPreviewHtml(htmlContent);
  };

  // Получить язык по расширению файла
  const getLanguage = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    const langMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'php': 'php',
      'sql': 'sql',
      'json': 'json',
      'md': 'markdown',
      'txt': 'plaintext'
    };
    return langMap[ext] || 'plaintext';
  };

  // Вставить код из AI Assistant
  const handleInsertCode = (code) => {
    if (!activeTab || !editorRef.current) return;

    const selection = editorRef.current.getSelection();
    const id = { major: 1, minor: 1 };
    const op = {
      identifier: id,
      range: selection,
      text: code,
      forceMoveMarkers: true
    };
    
    editorRef.current.executeEdits('ai-assistant', [op]);
    
    // Отмечаем файл как несохраненный
    setUnsavedFiles(prev => new Set([...prev, activeTab]));
    
    // Обновляем содержимое файла
    const updatedContent = editorRef.current.getValue();
    const updatedFileSystem = updateFileContent([...fileSystem], activeTab, updatedContent);
    setFileSystem(updatedFileSystem);
  };

  const activeFile = activeTab ? findFile(fileSystem, activeTab) : null;
  const currentLanguage = activeFile ? getLanguage(activeFile.name) : 'javascript';

  return (
    <div className={styles['student-ide-wrapper']}>
      <div className={styles['student-ide-header']}>
        <div className={styles['student-ide-header-left']}>
          <button 
            className={styles['student-ide-btn-back']} 
            onClick={() => navigate('/student/projects')}
            title="Вернуться к проектам"
          >
            <FaArrowLeft />
          </button>
          <h1>
            {project?.name || 'Онлайн IDE'}
            {unsavedFiles.size > 0 && (
              <span className={styles['unsaved-count']} title={`Несохранённых файлов: ${unsavedFiles.size}`}>
                ● {unsavedFiles.size}
              </span>
            )}
          </h1>
          {project?.description && <span className={styles['project-description-header']}>• {project.description}</span>}
        </div>
        <div className={styles['student-ide-header-actions']}>
          <button 
            className={styles['student-ide-btn-secondary']} 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title="Показать/Скрыть проводник (Ctrl+B)"
          >
            {sidebarCollapsed ? <FaBars /> : <FaTimes />}
          </button>
          {lastSaveTime && (
            <span className={styles['autosave-indicator']} title="Все изменения сохраняются автоматически">
              ✓ Сохранено {lastSaveTime.toLocaleTimeString()}
            </span>
          )}
          {unsavedFiles.size > 0 && !lastSaveTime && (
            <span className={styles['saving-indicator']} title="Сохранение изменений...">
              ⏳ Сохранение...
            </span>
          )}
          <button 
            className={styles['student-ide-btn-ai']} 
            onClick={() => {
              const selection = editorRef.current?.getModel()?.getValueInRange(editorRef.current?.getSelection());
              setSelectedCode(selection || '');
              setShowAIAssistant(true);
            }} 
            disabled={!activeTab}
            title="AI Ассистент (помощь с кодом)"
          >
            <AiOutlineRobot /> AI Ассистент
          </button>
          <button 
            className={styles['student-ide-btn-primary']} 
            onClick={runCode} 
            disabled={!activeTab}
            title="Запустить код (Ctrl+R или F5)"
          >
            <FaPlay /> Запустить
          </button>
        </div>
      </div>

      <div className={styles['student-ide-container']}>
        {/* Боковая панель с файлами */}
        {!sidebarCollapsed && (
          <div className={styles['student-ide-sidebar']}>
          <div className={styles['student-ide-sidebar-header']}>
            <h3>{showGlobalSearch ? 'Поиск' : 'Проводник'}</h3>
            <div className={styles['student-ide-sidebar-actions']}>
              {!showGlobalSearch && (
                <>
                  <button 
                    title="Новый файл"
                    onClick={() => {
                      const name = prompt('Имя файла (с расширением):');
                      if (name && fileSystem.length > 0) {
                        // Используем путь первой папки (корневая)
                        const rootPath = fileSystem[0]?.path || '/Мой проект';
                        handleCreateFile(rootPath, name);
                      }
                    }}
                  >
                    <FaPlus />
                  </button>
                  <button 
                    title="Новая папка"
                    onClick={() => {
                      const name = prompt('Имя папки:');
                      if (name && fileSystem.length > 0) {
                        // Используем путь первой папки (корневая)
                        const rootPath = fileSystem[0]?.path || '/Мой проект';
                        handleCreateFolder(rootPath, name);
                      }
                    }}
                  >
                    <FaFolderPlus />
                  </button>
                </>
              )}
              <button 
                title={showGlobalSearch ? "Показать проводник" : "Глобальный поиск (Ctrl+Shift+F)"}
                onClick={() => setShowGlobalSearch(!showGlobalSearch)}
                className={showGlobalSearch ? styles['active'] : ''}
              >
                <FaSearch />
              </button>
            </div>
          </div>

          {showGlobalSearch ? (
            <div className={styles['global-search-panel']}>
              <div className={styles['search-input-wrapper']}>
                <input
                  type="text"
                  placeholder="Поиск по всем файлам..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className={styles['search-input']}
                />
                {searchQuery && (
                  <button 
                    className={styles['clear-search']}
                    onClick={() => setSearchQuery('')}
                    title="Очистить"
                  >
                    <AiOutlineClose />
                  </button>
                )}
              </div>

              <div className={styles['search-results']}>
                {isSearching && <div className={styles['search-loading']}>Поиск...</div>}
                
                {!isSearching && searchQuery && searchResults.length === 0 && (
                  <div className={styles['no-results']}>Совпадений не найдено</div>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <>
                    <div className={styles['results-count']}>
                      {searchResults.length} {searchResults.length === 1 ? 'совпадение' : 
                       searchResults.length < 5 ? 'совпадения' : 'совпадений'}
                    </div>
                    {searchResults.map((result, index) => (
                      <div 
                        key={`${result.file}-${result.lineNumber}-${index}`}
                        className={styles['search-result-item']}
                        onClick={() => jumpToSearchResult(result)}
                      >
                        <div className={styles['result-file']}>
                          {result.fileName}
                          <span className={styles['result-location']}>
                            :{result.lineNumber}:{result.column}
                          </span>
                        </div>
                        <div className={styles['result-line']}>
                          {result.line.trim()}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          ) : (
            <FileTree
              files={fileSystem}
              onFileSelect={handleFileSelect}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onDelete={handleDelete}
              onRename={handleRename}
              onMove={handleMove}
              selectedFile={activeTab}
            />
          )}
        </div>
        )}

        {/* Редактор кода */}
        <div className={styles['student-ide-main']}>
          {/* Вкладки открытых файлов */}
          {openTabs.length > 0 && (
            <div className={styles['student-ide-tabs-container']}>
              {openTabs.map(tab => {
                const isUnsaved = unsavedFiles.has(tab.path);
                return (
                  <div
                    key={tab.path}
                    className={`${styles['student-ide-tab']} ${activeTab === tab.path ? styles['active'] : ''} ${isUnsaved ? styles['unsaved'] : ''}`}
                    onClick={() => setActiveTab(tab.path)}
                    onContextMenu={(e) => handleTabContextMenu(e, tab.path)}
                  >
                    <span>{tab.name}</span>
                    {isUnsaved ? (
                      <div className={styles['unsaved-indicator']} onClick={(e) => closeTab(tab.path, e)}>●</div>
                    ) : (
                      <AiOutlineClose 
                        className={styles['close-icon']}
                        onClick={(e) => closeTab(tab.path, e)} 
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Контекстное меню вкладок */}
          {contextMenu && (
            <div 
              className={styles['tab-context-menu']}
              style={{ 
                left: `${contextMenu.x}px`, 
                top: `${contextMenu.y}px` 
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div onClick={() => { 
                const file = findFile(fileSystem, contextMenu.tabPath);
                if (file) openInSplit(file);
              }}>
                ↔ Открыть справа
              </div>
              <div style={{ height: '1px', background: 'rgba(102, 126, 234, 0.2)', margin: '4px 0' }}></div>
              <div onClick={() => { closeTab(contextMenu.tabPath); setContextMenu(null); }}>
                Закрыть
              </div>
              <div onClick={() => closeOtherTabs(contextMenu.tabPath)}>
                Закрыть другие
              </div>
              <div onClick={() => closeTabsToRight(contextMenu.tabPath)}>
                Закрыть справа
              </div>
              <div onClick={closeAllTabs}>
                Закрыть все
              </div>
            </div>
          )}

          {/* Редактор(ы) */}
          <div className={`${styles['student-ide-editors-container']} ${splitMode ? styles[`split-${splitMode}`] : ''}`}>
            {/* Основной редактор */}
            <div className={styles['student-ide-editor-wrapper']}>
              {splitMode && (
                <div className={styles['split-header']}>
                  <span>Редактор 1</span>
                  <div className={styles['split-controls']}>
                    <button onClick={toggleSplitOrientation} title="Изменить ориентацию">
                      {splitMode === 'vertical' ? '⇄' : '⇅'}
                    </button>
                    <button onClick={closeSplitMode} title="Закрыть сплит (Ctrl+\)">✕</button>
                  </div>
                </div>
              )}
            {activeFile ? (
              <Editor
                key={activeFile.path}
                height="100%"
                language={getLanguage(activeFile.name)}
                value={activeFile.content}
                theme={currentTheme}
                onChange={(value) => {
                  // Автоматическое обновление содержимого только для активной вкладки
                  setOpenTabs(openTabs.map(tab =>
                    tab.path === activeFile.path ? { ...tab, content: value } : tab
                  ));
                }}
                onMount={(editor, monaco) => {
                  editorRef.current = editor;
                  monacoRef.current = monaco;
                  
                  // Включаем Emmet для HTML, CSS и JSX
                  emmetHTML(monaco);
                  emmetCSS(monaco);
                  emmetJSX(monaco);
                  
                  // Применяем сохраненную тему
                  applyCustomTheme(currentTheme);
                  
                  // Отслеживаем изменения в редакторе
                  editor.onDidChangeModelContent(() => {
                    if (activeTab) {
                      setUnsavedFiles(prev => new Set(prev).add(activeTab));
                    }
                  });
                  
                  // Полная русификация контекстного меню
                  const russianActions = [
                    // Основные действия редактирования
                    { id: 'editor.action.clipboardCutAction', label: 'Вырезать', group: '9_cutcopypaste', order: 1 },
                    { id: 'editor.action.clipboardCopyAction', label: 'Копировать', group: '9_cutcopypaste', order: 2 },
                    { id: 'editor.action.clipboardPasteAction', label: 'Вставить', group: '9_cutcopypaste', order: 3 },
                    
                    // Форматирование
                    { id: 'editor.action.formatDocument', label: 'Форматировать документ', keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF], group: '1_modification', order: 1.3 },
                    { id: 'editor.action.formatSelection', label: 'Форматировать выделение', group: '1_modification', order: 1.4 },
                    
                    // Переименование и изменение
                    { id: 'editor.action.rename', label: 'Переименовать символ', keybindings: [monaco.KeyCode.F2], group: '1_modification', order: 1.1 },
                    { id: 'editor.action.changeAll', label: 'Изменить все вхождения', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.F2], group: '1_modification', order: 1.2 },
                    
                    // Команды
                    { id: 'editor.action.quickCommand', label: 'Палитра команд', keybindings: [monaco.KeyCode.F1], group: 'navigation', order: 1.5 },
                    { id: 'editor.action.gotoLine', label: 'Перейти к строке', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG], group: 'navigation', order: 1.4 },
                    
                    // Навигация
                    { id: 'editor.action.revealDefinition', label: 'Перейти к определению', keybindings: [monaco.KeyCode.F12], group: 'navigation', order: 1.1 },
                    { id: 'editor.action.goToReferences', label: 'Перейти к ссылкам', keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.F12], group: 'navigation', order: 1.2 },
                    { id: 'editor.action.quickOutline', label: 'Перейти к символу', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyO], group: 'navigation', order: 1.3 },
                    
                    // Поиск
                    { id: 'actions.find', label: 'Найти', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF], group: '4_search', order: 1.1 },
                    { id: 'editor.action.startFindReplaceAction', label: 'Заменить', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH], group: '4_search', order: 1.2 },
                    { id: 'editor.action.nextMatchFindAction', label: 'Найти далее', keybindings: [monaco.KeyCode.F3], group: '4_search', order: 1.3 },
                    
                    // Комментарии
                    { id: 'editor.action.commentLine', label: 'Переключить комментарий строки', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash], group: '1_modification', order: 2.1 },
                    { id: 'editor.action.blockComment', label: 'Переключить блочный комментарий', keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyA], group: '1_modification', order: 2.2 },
                    
                    // Отступы
                    { id: 'editor.action.indentLines', label: 'Увеличить отступ', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.BracketRight], group: '1_modification', order: 3.1 },
                    { id: 'editor.action.outdentLines', label: 'Уменьшить отступ', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.BracketLeft], group: '1_modification', order: 3.2 },
                    
                    // Строки
                    { id: 'editor.action.moveLinesUpAction', label: 'Переместить строку вверх', keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.UpArrow], group: '1_modification', order: 4.1 },
                    { id: 'editor.action.moveLinesDownAction', label: 'Переместить строку вниз', keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.DownArrow], group: '1_modification', order: 4.2 },
                    { id: 'editor.action.copyLinesUpAction', label: 'Скопировать строку вверх', keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.UpArrow], group: '1_modification', order: 4.3 },
                    { id: 'editor.action.copyLinesDownAction', label: 'Скопировать строку вниз', keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.DownArrow], group: '1_modification', order: 4.4 },
                    { id: 'editor.action.deleteLines', label: 'Удалить строку', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyK], group: '1_modification', order: 4.5 },
                    
                    // Выделение
                    { id: 'editor.action.selectAll', label: 'Выделить всё', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA], group: '9_cutcopypaste', order: 0 },
                    { id: 'editor.action.smartSelect.expand', label: 'Расширить выделение', keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.RightArrow], group: '1_modification', order: 5.1 },
                    { id: 'editor.action.smartSelect.shrink', label: 'Сузить выделение', keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.LeftArrow], group: '1_modification', order: 5.2 },
                    
                    // Складывание кода
                    { id: 'editor.fold', label: 'Свернуть', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.BracketLeft], group: '2_folding', order: 1 },
                    { id: 'editor.unfold', label: 'Развернуть', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.BracketRight], group: '2_folding', order: 2 },
                    { id: 'editor.foldAll', label: 'Свернуть всё', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit0], group: '2_folding', order: 3 },
                    { id: 'editor.unfoldAll', label: 'Развернуть всё', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ], group: '2_folding', order: 4 },
                  ];
                  
                  // Применяем русские названия
                  russianActions.forEach(action => {
                    try {
                      const originalAction = editor.getAction(action.id);
                      if (originalAction) {
                        editor.addAction({
                          id: `${action.id}.ru`,
                          label: action.label,
                          keybindings: action.keybindings,
                          contextMenuGroupId: action.group,
                          contextMenuOrder: action.order,
                          run: () => originalAction.run()
                        });
                      }
                    } catch (e) {
                      console.warn(`Не удалось переопределить команду: ${action.id}`);
                    }
                  });
                  
                  // Поддержка плагинов через глобальный объект
                  window.monacoEditor = editor;
                  window.monaco = monaco;
                  
                  // Загрузка плагинов из localStorage
                  const loadPlugins = () => {
                    try {
                      const plugins = JSON.parse(localStorage.getItem('studentIDE_plugins') || '[]');
                      plugins.forEach(plugin => {
                        if (plugin.enabled && plugin.code) {
                          try {
                            // Выполняем код плагина в безопасном контексте
                            const pluginFunction = new Function('editor', 'monaco', plugin.code);
                            pluginFunction(editor, monaco);
                            console.log(`✓ Плагин загружен: ${plugin.name}`);
                          } catch (error) {
                            console.error(`✗ Ошибка загрузки плагина ${plugin.name}:`, error);
                          }
                        }
                      });
                    } catch (error) {
                      console.error('Ошибка загрузки плагинов:', error);
                    }
                  };
                  
                  loadPlugins();
                }}
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  wordWrap: 'on',
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  formatOnPaste: true,
                  formatOnType: true,
                  quickSuggestions: {
                    other: true,
                    comments: false,
                    strings: true
                  },
                  suggestOnTriggerCharacters: true,
                  acceptSuggestionOnEnter: 'on',
                  tabCompletion: 'on',
                  wordBasedSuggestions: true,
                  // Emmet
                  suggest: {
                    snippetsPreventQuickSuggestions: false
                  }
                }}
              />
            ) : (
              <div className={styles['student-ide-no-file']}>
                <h3>📁 Файл не выбран</h3>
                <p>Выберите файл из проводника или создайте новый</p>
              </div>
            )}
            </div>

            {/* Второй редактор (сплит-режим) */}
            {splitMode && splitTabs.length > 0 && (
              <div className={styles['student-ide-editor-wrapper']}>
                <div className={styles['split-header']}>
                  <span>Редактор 2</span>
                </div>
                <div className={styles['student-ide-tabs-container']}>
                  {splitTabs.map(tab => {
                    const isUnsaved = unsavedFiles.has(tab.path);
                    return (
                      <div
                        key={tab.path}
                        className={`${styles['student-ide-tab']} ${activeSplitTab === tab.path ? styles['active'] : ''} ${isUnsaved ? styles['unsaved'] : ''}`}
                        onClick={() => setActiveSplitTab(tab.path)}
                      >
                        <span>{tab.name}</span>
                        {isUnsaved ? (
                          <div className={styles['unsaved-indicator']} onClick={(e) => {
                            e.stopPropagation();
                            const newTabs = splitTabs.filter(t => t.path !== tab.path);
                            setSplitTabs(newTabs);
                            if (activeSplitTab === tab.path) {
                              setActiveSplitTab(newTabs.length > 0 ? newTabs[0].path : null);
                            }
                          }}>●</div>
                        ) : (
                          <AiOutlineClose 
                            className={styles['close-icon']}
                            onClick={(e) => {
                              e.stopPropagation();
                              const newTabs = splitTabs.filter(t => t.path !== tab.path);
                              setSplitTabs(newTabs);
                              if (activeSplitTab === tab.path) {
                                setActiveSplitTab(newTabs.length > 0 ? newTabs[0].path : null);
                              }
                              if (newTabs.length === 0) {
                                closeSplitMode();
                              }
                            }} 
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                {activeSplitTab && (() => {
                  const splitFile = findFile(fileSystem, activeSplitTab);
                  return splitFile ? (
                    <Editor
                      key={splitFile.path}
                      height="100%"
                      language={getLanguage(splitFile.name)}
                      value={splitFile.content}
                      theme={currentTheme}
                      onChange={(value) => {
                        // Обновляем splitTabs
                        setSplitTabs(splitTabs.map(tab =>
                          tab.path === splitFile.path ? { ...tab, content: value } : tab
                        ));
                        // Синхронизируем с openTabs если файл открыт там
                        setOpenTabs(prevOpenTabs => 
                          prevOpenTabs.map(tab => 
                            tab.path === splitFile.path ? { ...tab, content: value } : tab
                          )
                        );
                      }}
                      onMount={(editor, monaco) => {
                        splitEditorRef.current = editor;
                        
                        editor.onDidChangeModelContent(() => {
                          if (activeSplitTab) {
                            setUnsavedFiles(prev => new Set(prev).add(activeSplitTab));
                          }
                        });
                      }}
                      options={{
                        minimap: { enabled: true },
                        fontSize: 14,
                        wordWrap: 'on',
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        lineNumbers: 'on',
                        formatOnPaste: true,
                        formatOnType: true,
                        quickSuggestions: {
                          other: true,
                          comments: false,
                          strings: true
                        },
                        suggestOnTriggerCharacters: true,
                        acceptSuggestionOnEnter: 'on',
                        tabCompletion: 'on',
                        wordBasedSuggestions: true,
                        suggest: {
                          snippetsPreventQuickSuggestions: false
                        }
                      }}
                    />
                  ) : (
                    <div className={styles['student-ide-no-file']}>
                      <h3>📁 Файл не найден</h3>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Предпросмотр HTML */}
          {showPreview && (
            <div className={styles['student-ide-preview']} style={{ height: `${previewHeight}px` }}>
              <div 
                className={styles['student-ide-preview-resizer']} 
                onMouseDown={startResize}
                style={{ 
                  cursor: isResizing ? 'ns-resize' : 'ns-resize',
                  userSelect: 'none'
                }}
              >
                <div className={styles['resizer-handle']}></div>
              </div>
              <div className={styles['student-ide-preview-header']}>
                <div className={styles['preview-header-left']}>
                  <h3>Предпросмотр</h3>
                  <div className={styles['preview-controls']}>
                    <button 
                      className={`${styles['device-btn']} ${deviceMode === 'desktop' ? styles['active'] : ''}`}
                      onClick={() => setDeviceMode('desktop')}
                      title="Desktop - Полная ширина"
                    >
                      <MdComputer />
                    </button>
                    <button 
                      className={`${styles['device-btn']} ${deviceMode === 'tablet' ? styles['active'] : ''}`}
                      onClick={() => setDeviceMode('tablet')}
                      title="Tablet - 768x1024px (iPad)"
                    >
                      <MdTablet />
                    </button>
                    <button 
                      className={`${styles['device-btn']} ${deviceMode === 'mobile' ? styles['active'] : ''}`}
                      onClick={() => setDeviceMode('mobile')}
                      title="Mobile - 375x667px (iPhone)"
                    >
                      <MdPhoneIphone />
                    </button>
                    <div className={styles['preview-divider']}></div>
                    <button 
                      className={`${styles['reload-btn']} ${liveReload ? styles['active'] : ''}`}
                      onClick={() => setLiveReload(!liveReload)}
                      title={liveReload ? "Live Reload: Вкл" : "Live Reload: Выкл"}
                    >
                      {liveReload ? <MdRefresh /> : <MdPause />}
                    </button>
                    <button 
                      className={styles['refresh-btn']}
                      onClick={updatePreview}
                      title="Обновить вручную"
                    >
                      <BiRefresh />
                    </button>
                  </div>
                </div>
                <button onClick={() => setShowPreview(false)}>Закрыть</button>
              </div>
              <div className={styles['preview-viewport']}>
                <iframe
                  ref={previewRef}
                  className={styles['student-ide-preview-iframe']}
                  style={
                    deviceMode === 'desktop' ? { width: '100%', height: '100%' } :
                    deviceMode === 'tablet' ? { width: '768px', height: '1024px', margin: '0 auto', border: '1px solid #444' } :
                    deviceMode === 'mobile' ? { width: '375px', height: '667px', margin: '0 auto', border: '1px solid #444' } :
                    { width: `${customSize.width}px`, height: `${customSize.height}px`, margin: '0 auto' }
                  }
                  title="HTML Preview"
                  sandbox="allow-scripts allow-forms allow-same-origin"
                  srcDoc={previewHtml}
                />
              </div>
            </div>
          )}

          {/* Консоль вывода */}
          {output && (
            <div className={styles['student-ide-output']} style={{ height: `${previewHeight}px` }}>
              <div 
                className={styles['student-ide-output-resizer']} 
                onMouseDown={startResize}
                style={{ 
                  cursor: isResizing ? 'ns-resize' : 'ns-resize',
                  userSelect: 'none'
                }}
              >
                <div className={styles['resizer-handle']}></div>
              </div>
              <div className={styles['student-ide-output-header']}>
                <h3>Консоль</h3>
                <button onClick={() => setOutput('')}>Очистить</button>
              </div>
              <pre>{output}</pre>
            </div>
          )}
        </div>
      </div>

      {/* Встроенный терминал */}
      {showTerminal && (
        <div 
          className={styles['terminal-container']}
          style={{ height: `${terminalHeight}px` }}
        >
          <div 
            className={styles['terminal-resizer']}
            onMouseDown={() => setIsResizingTerminal(true)}
          ></div>
          <div className={styles['terminal-header']}>
            <div className={styles['terminal-header-left']}>
              <FaTerminal />
              <span>Терминал</span>
            </div>
            <div className={styles['terminal-header-actions']}>
              <button 
                onClick={() => setTerminalOutput([])}
                title="Очистить терминал"
              >
                <VscClose />
              </button>
              <button 
                onClick={() => setShowTerminal(false)}
                title="Закрыть терминал (Ctrl+`)"
              >
                <VscChevronDown />
              </button>
            </div>
          </div>
          <div className={styles['terminal-content']}>
            {terminalOutput.map((item, index) => (
              <div 
                key={index} 
                className={`${styles['terminal-line']} ${styles[`terminal-${item.type}`]}`}
              >
                {item.text}
              </div>
            ))}
            <div className={styles['terminal-input-line']}>
              <span className={styles['terminal-prompt']}>$</span>
              <input
                type="text"
                value={terminalCommand}
                onChange={(e) => setTerminalCommand(e.target.value)}
                onKeyDown={handleTerminalKeyDown}
                placeholder="Введите команду (help для справки)..."
                className={styles['terminal-input']}
                autoFocus
              />
            </div>
          </div>
        </div>
      )}

      {/* Кнопка открытия терминала */}
      {!showTerminal && (
        <button 
          className={styles['terminal-toggle-button']}
          onClick={() => setShowTerminal(true)}
          title="Открыть терминал (Ctrl+`)"
        >
          <FaTerminal />
        </button>
      )}

      {/* AI Assistant */}
      <AIAssistant
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        selectedCode={selectedCode}
        language={currentLanguage}
        onInsertCode={handleInsertCode}
      />

      {/* Кнопка горячих клавиш */}
      <button 
        className={styles['hotkeys-button']}
        onClick={() => setShowHotkeys(true)}
        title="Горячие клавиши (?)"
      >
        <FaKeyboard />
      </button>

      {/* Модальное окно с горячими клавишами */}
      {showHotkeys && (
        <div className={styles['hotkeys-modal']} onClick={() => setShowHotkeys(false)}>
          <div className={styles['hotkeys-content']} onClick={(e) => e.stopPropagation()}>
            <div className={styles['hotkeys-header']}>
              <h2><FaKeyboard /> Горячие клавиши</h2>
              <button onClick={() => setShowHotkeys(false)}>✕</button>
            </div>
            <div className={styles['hotkeys-list']}>
              <div className={styles['hotkeys-section']}>
                <h3>Основные</h3>
                <div className={styles['hotkey-item']}>
                  <kbd>Ctrl</kbd> + <kbd>S</kbd>
                  <span>Сохранить файл</span>
                </div>
                <div className={styles['hotkey-item']}>
                  <kbd>Ctrl</kbd> + <kbd>R</kbd> или <kbd>F5</kbd>
                  <span>Запустить код</span>
                </div>
                <div className={styles['hotkey-item']}>
                  <kbd>Ctrl</kbd> + <kbd>B</kbd>
                  <span>Показать/Скрыть проводник</span>
                </div>
              </div>
              
              <div className={styles['hotkeys-section']}>
                <h3>Файлы и вкладки</h3>
                <div className={styles['hotkey-item']}>
                  <kbd>Ctrl</kbd> + <kbd>N</kbd>
                  <span>Новый файл</span>
                </div>
                <div className={styles['hotkey-item']}>
                  <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>N</kbd>
                  <span>Новая папка</span>
                </div>
                <div className={styles['hotkey-item']}>
                  <kbd>Ctrl</kbd> + <kbd>W</kbd>
                  <span>Закрыть вкладку</span>
                </div>
                <div className={styles['hotkey-item']}>
                  <kbd>Ctrl</kbd> + <kbd>Tab</kbd>
                  <span>Следующая вкладка</span>
                </div>
                <div className={styles['hotkey-item']}>
                  <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Tab</kbd>
                  <span>Предыдущая вкладка</span>
                </div>
              </div>

              <div className={styles['hotkeys-section']}>
                <h3>Сплит-режим</h3>
                <div className={styles['hotkey-item']}>
                  <kbd>Ctrl</kbd> + <kbd>\</kbd>
                  <span>Открыть/Закрыть сплит</span>
                </div>
                <div className={styles['hotkey-item']}>
                  <span style={{ fontSize: '12px', color: '#999' }}>ПКМ на вкладке</span>
                  <span>Открыть справа</span>
                </div>
              </div>

              <div className={styles['hotkeys-section']}>
                <h3>Поиск</h3>
                <div className={styles['hotkey-item']}>
                  <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd>
                  <span>Глобальный поиск по файлам</span>
                </div>
                <div className={styles['hotkey-item']}>
                  <kbd>Ctrl</kbd> + <kbd>F</kbd>
                  <span>Поиск в текущем файле</span>
                </div>
              </div>

              <div className={styles['hotkeys-section']}>
                <h3>Терминал</h3>
                <div className={styles['hotkey-item']}>
                  <kbd>Ctrl</kbd> + <kbd>`</kbd>
                  <span>Открыть/Закрыть терминал</span>
                </div>
                <div className={styles['hotkey-item']}>
                  <span style={{ fontSize: '12px', color: '#999' }}>help</span>
                  <span>Список доступных команд</span>
                </div>
                <div className={styles['hotkey-item']}>
                  <span style={{ fontSize: '12px', color: '#999' }}>clear</span>
                  <span>Очистить терминал</span>
                </div>
              </div>

              <div className={styles['hotkeys-section']}>
                <h3>Предпросмотр</h3>
                <div className={styles['hotkey-item']}>
                  <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center' }}><MdRefresh /></span>
                  <span>Live Reload - автообновление</span>
                </div>
                <div className={styles['hotkey-item']}>
                  <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MdComputer /> <MdTablet /> <MdPhoneIphone />
                  </span>
                  <span>Режимы устройств</span>
                </div>
                <div className={styles['hotkey-item']}>
                  <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center' }}><BiRefresh /></span>
                  <span>Обновить вручную</span>
                </div>
              </div>
              
              <div className={styles['hotkeys-section']}>
                <h3>Редактирование (встроенные Monaco)</h3>
                <div className={styles['hotkey-item']}>
                  <kbd>Ctrl</kbd> + <kbd>F</kbd>
                  <span>Найти</span>
                </div>
                <div className={styles['hotkey-item']}>
                  <kbd>Ctrl</kbd> + <kbd>H</kbd>
                  <span>Заменить</span>
                </div>
                <div className={styles['hotkey-item']}>
                  <kbd>Ctrl</kbd> + <kbd>/</kbd>
                  <span>Комментарий строки</span>
                </div>
                <div className={styles['hotkey-item']}>
                  <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>F</kbd>
                  <span>Форматировать документ</span>
                </div>
                <div className={styles['hotkey-item']}>
                  <kbd>Alt</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd>
                  <span>Переместить строку</span>
                </div>
                <div className={styles['hotkey-item']}>
                  <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd>
                  <span>Дублировать строку</span>
                </div>
                <div className={styles['hotkey-item']}>
                  <kbd>Ctrl</kbd> + <kbd>D</kbd>
                  <span>Выделить следующее вхождение</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentIDE;
