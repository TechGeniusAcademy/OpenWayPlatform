import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import FileTree from '../../components/FileTree';
import './StudentIDE.css';
import { FaPlay, FaPlus, FaFolderPlus, FaSave, FaArrowLeft, FaBars, FaTimes } from 'react-icons/fa';
import { AiOutlineClose } from 'react-icons/ai';
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
  const [currentTheme, setCurrentTheme] = useState('vs-dark');
  const [unsavedFiles, setUnsavedFiles] = useState(new Set()); // Отслеживание несохранённых файлов
  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const resizerRef = useRef(null);
  const monacoRef = useRef(null);

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

  // Применение пользовательской темы
  const applyCustomTheme = (themeId) => {
    if (!monacoRef.current || !editorRef.current) return;

    // Проверяем, это встроенная тема или пользовательская
    const builtInThemes = ['vs-dark', 'vs-light', 'hc-black'];
    
    if (builtInThemes.includes(themeId)) {
      editorRef.current.updateOptions({ theme: themeId });
      return;
    }

    // Загружаем пользовательскую тему
    const themes = JSON.parse(localStorage.getItem('studentIDE_themes') || '[]');
    const customTheme = themes.find(t => t.id === themeId);
    
    if (customTheme) {
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
    } catch (error) {
      console.error('⚠ Ошибка автосохранения:', error);
    }
  };

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

  // Горячая клавиша Ctrl+B для сворачивания/разворачивания боковой панели
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Проверяем код клавиши вместо символа (работает с любой раскладкой)
      if (e.ctrlKey && e.code === 'KeyB') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Автообновление предпросмотра при изменении HTML/CSS/JS
  useEffect(() => {
    // Обновляем превью только если оно уже показано И есть изменения в файловой системе
    if (showPreview && fileSystem.length > 0) {
      const timer = setTimeout(() => {
        updatePreview();
      }, 1500); // Увеличена задержка до 1.5 секунд
      return () => clearTimeout(timer);
    }
  }, [fileSystem]); // Убрали showPreview и openTabs из зависимостей

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
  };

  // Закрыть вкладку
  const closeTab = (path, e) => {
    e.stopPropagation();
    const newTabs = openTabs.filter(tab => tab.path !== path);
    setOpenTabs(newTabs);
    if (activeTab === path) {
      setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].path : null);
    }
  };

  // Сохранить текущий файл
  const saveFile = async () => {
    if (activeTab && editorRef.current) {
      const content = editorRef.current.getValue();
      
      // Обновить содержимое в файловой системе
      const updatedFS = updateFileContent(fileSystem, activeTab, content);
      setFileSystem(updatedFS);
      
      // Обновить содержимое ТОЛЬКО в активной вкладке
      setOpenTabs(openTabs.map(tab => 
        tab.path === activeTab ? { ...tab, content } : tab
      ));
      
      // Убираем файл из списка несохранённых
      setUnsavedFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(activeTab);
        return newSet;
      });
      
      // Сохраняем на сервер немедленно
      try {
        await updateProject(projectId, { fileSystem: updatedFS });
      } catch (error) {
        console.error('Ошибка синхронизации с сервером:', error);
      }
    }
  };

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
    
    // Вставляем стили и скрипты в HTML
    if (htmlContent.includes('</head>')) {
      htmlContent = htmlContent.replace('</head>', `${styles}</head>`);
    } else if (htmlContent.includes('<html>')) {
      htmlContent = htmlContent.replace('<html>', `<html><head>${styles}</head>`);
    } else {
      // Если нет тегов html/head, добавляем их
      htmlContent = `<!DOCTYPE html><html><head>${styles}</head><body>${htmlContent}${scripts}</body></html>`;
      setPreviewHtml(htmlContent);
      return;
    }
    
    if (htmlContent.includes('</body>')) {
      htmlContent = htmlContent.replace('</body>', `${scripts}</body>`);
    } else {
      htmlContent += scripts;
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

  const activeFile = activeTab ? findFile(fileSystem, activeTab) : null;

  return (
    <div className="student-ide-wrapper">
      <div className="student-ide-header">
        <div className="student-ide-header-left">
          <button 
            className="student-ide-btn-back" 
            onClick={() => navigate('/student/projects')}
            title="Вернуться к проектам"
          >
            <FaArrowLeft />
          </button>
          <h1>{project?.name || 'Онлайн IDE'}</h1>
          {project?.description && <span className="project-description-header">• {project.description}</span>}
        </div>
        <div className="student-ide-header-actions">
          <button 
            className="student-ide-btn-secondary" 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Показать проводник" : "Скрыть проводник"}
          >
            {sidebarCollapsed ? <FaBars /> : <FaTimes />}
          </button>
          <button className="student-ide-btn-secondary" onClick={saveFile} disabled={!activeTab}>
            <FaSave /> Сохранить (Ctrl+S)
          </button>
          <button className="student-ide-btn-primary" onClick={runCode} disabled={!activeTab}>
            <FaPlay /> Запустить
          </button>
        </div>
      </div>

      <div className="student-ide-container">
        {/* Боковая панель с файлами */}
        {!sidebarCollapsed && (
          <div className="student-ide-sidebar">
          <div className="student-ide-sidebar-header">
            <h3>Проводник</h3>
            <div className="student-ide-sidebar-actions">
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
            </div>
          </div>
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
        </div>
        )}

        {/* Редактор кода */}
        <div className="student-ide-main">
          {/* Вкладки открытых файлов */}
          {openTabs.length > 0 && (
            <div className="student-ide-tabs-container">
              {openTabs.map(tab => {
                const isUnsaved = unsavedFiles.has(tab.path);
                return (
                  <div
                    key={tab.path}
                    className={`student-ide-tab ${activeTab === tab.path ? 'active' : ''} ${isUnsaved ? 'unsaved' : ''}`}
                    onClick={() => setActiveTab(tab.path)}
                  >
                    <span>{tab.name}</span>
                    {isUnsaved ? (
                      <div className="unsaved-indicator" onClick={(e) => closeTab(tab.path, e)}>●</div>
                    ) : (
                      <AiOutlineClose 
                        className="close-icon"
                        onClick={(e) => closeTab(tab.path, e)} 
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Редактор */}
          <div className="student-ide-editor-wrapper">
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
                  
                  // Ctrl+S для сохранения
                  editor.addCommand(
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
                    saveFile
                  );
                  
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
              <div className="student-ide-no-file">
                <h3>📁 Файл не выбран</h3>
                <p>Выберите файл из проводника или создайте новый</p>
              </div>
            )}
          </div>

          {/* Предпросмотр HTML */}
          {showPreview && (
            <div className="student-ide-preview" style={{ height: `${previewHeight}px` }}>
              <div 
                className="student-ide-preview-resizer" 
                onMouseDown={startResize}
                style={{ 
                  cursor: isResizing ? 'ns-resize' : 'ns-resize',
                  userSelect: 'none'
                }}
              >
                <div className="resizer-handle"></div>
              </div>
              <div className="student-ide-preview-header">
                <h3>Предпросмотр</h3>
                <button onClick={() => setShowPreview(false)}>Закрыть</button>
              </div>
              <iframe
                ref={previewRef}
                className="student-ide-preview-iframe"
                title="HTML Preview"
                sandbox="allow-scripts allow-forms allow-same-origin"
                srcDoc={previewHtml}
              />
            </div>
          )}

          {/* Консоль вывода */}
          {output && (
            <div className="student-ide-output" style={{ height: `${previewHeight}px` }}>
              <div 
                className="student-ide-output-resizer" 
                onMouseDown={startResize}
                style={{ 
                  cursor: isResizing ? 'ns-resize' : 'ns-resize',
                  userSelect: 'none'
                }}
              >
                <div className="resizer-handle"></div>
              </div>
              <div className="student-ide-output-header">
                <h3>Консоль</h3>
                <button onClick={() => setOutput('')}>Очистить</button>
              </div>
              <pre>{output}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentIDE;
