import { useState, useEffect } from 'react';
import styles from './StudentThemes.module.css';
import { FaPlus, FaTrash, FaCheck, FaPalette, FaEye, FaBook, FaTimes, FaDownload } from 'react-icons/fa';
import { AiOutlineCheckCircle, AiOutlineCloseCircle, AiOutlineWarning } from 'react-icons/ai';

function StudentThemes() {
  const [themes, setThemes] = useState([]);
  const [activeTheme, setActiveTheme] = useState('vs-dark');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationContent, setNotificationContent] = useState({ type: '', message: '' });
  const [previewCode, setPreviewCode] = useState(`function hello() {\n  const message = "Hello, World!";\n  console.log(message);\n  return true;\n}`);
  const [newTheme, setNewTheme] = useState({
    name: '',
    base: 'vs-dark',
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#2a2a2a',
      'editor.selectionBackground': '#264f78',
      'editorCursor.foreground': '#aeafad',
      'editorLineNumber.foreground': '#858585',
    },
    tokenColors: [
      { scope: 'comment', foreground: '#6A9955' },
      { scope: 'string', foreground: '#ce9178' },
      { scope: 'keyword', foreground: '#569cd6' },
      { scope: 'number', foreground: '#b5cea8' },
      { scope: 'function', foreground: '#dcdcaa' },
      { scope: 'variable', foreground: '#9cdcfe' },
      { scope: 'type', foreground: '#4ec9b0' },
      { scope: 'class', foreground: '#4ec9b0' },
    ]
  });

  useEffect(() => {
    loadThemes();
    loadActiveTheme();
  }, []);

  const loadThemes = () => {
    const saved = localStorage.getItem('studentIDE_themes');
    if (saved) {
      setThemes(JSON.parse(saved));
    }
  };

  const loadActiveTheme = () => {
    const saved = localStorage.getItem('studentIDE_activeTheme');
    if (saved) {
      setActiveTheme(saved);
    }
  };

  const saveThemes = (updatedThemes) => {
    localStorage.setItem('studentIDE_themes', JSON.stringify(updatedThemes));
    setThemes(updatedThemes);
  };

  const showNotification = (type, message) => {
    setNotificationContent({ type, message });
    setShowNotificationModal(true);
    setTimeout(() => setShowNotificationModal(false), 3000);
  };

  const createTheme = () => {
    if (!newTheme.name.trim()) {
      showNotification('error', 'Введите название темы');
      return;
    }

    const theme = {
      id: `custom-${Date.now()}`,
      name: newTheme.name,
      base: newTheme.base,
      colors: newTheme.colors,
      tokenColors: newTheme.tokenColors,
      createdAt: new Date().toISOString()
    };

    saveThemes([...themes, theme]);
    setShowCreateModal(false);
    resetNewTheme();
    showNotification('success', 'Тема успешно создана!');
  };

  const resetNewTheme = () => {
    setNewTheme({
      name: '',
      base: 'vs-dark',
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#2a2a2a',
        'editor.selectionBackground': '#264f78',
        'editorCursor.foreground': '#aeafad',
        'editorLineNumber.foreground': '#858585',
      },
      tokenColors: [
        { scope: 'comment', foreground: '#6A9955' },
        { scope: 'string', foreground: '#ce9178' },
        { scope: 'keyword', foreground: '#569cd6' },
        { scope: 'number', foreground: '#b5cea8' },
        { scope: 'function', foreground: '#dcdcaa' },
        { scope: 'variable', foreground: '#9cdcfe' },
        { scope: 'type', foreground: '#4ec9b0' },
        { scope: 'class', foreground: '#4ec9b0' },
      ]
    });
  };

  const openDeleteModal = (theme) => {
    setThemeToDelete(theme);
    setShowDeleteModal(true);
  };

  const confirmDeleteTheme = () => {
    if (themeToDelete) {
      saveThemes(themes.filter(t => t.id !== themeToDelete.id));
      if (activeTheme === themeToDelete.id) {
        applyTheme('vs-dark');
      }
      showNotification('success', `Тема "${themeToDelete.name}" удалена`);
    }
    setShowDeleteModal(false);
    setThemeToDelete(null);
  };

  const applyTheme = (themeId) => {
    setActiveTheme(themeId);
    localStorage.setItem('studentIDE_activeTheme', themeId);
    
    // Уведомляем редактор о смене темы
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { themeId } }));
    
    // Показываем уведомление
    const themeName = predefinedThemes.find(t => t.id === themeId)?.name || 
                     themes.find(t => t.id === themeId)?.name || 
                     themeId;
    showNotification('success', `Тема "${themeName}" применена`);
  };

  const updateColor = (key, value) => {
    setNewTheme({
      ...newTheme,
      colors: {
        ...newTheme.colors,
        [key]: value
      }
    });
  };

  const updateTokenColor = (index, field, value) => {
    const updated = [...newTheme.tokenColors];
    updated[index] = { ...updated[index], [field]: value };
    setNewTheme({ ...newTheme, tokenColors: updated });
  };

  const addTokenColor = () => {
    setNewTheme({
      ...newTheme,
      tokenColors: [...newTheme.tokenColors, { scope: '', foreground: '#ffffff' }]
    });
  };

  const removeTokenColor = (index) => {
    setNewTheme({
      ...newTheme,
      tokenColors: newTheme.tokenColors.filter((_, i) => i !== index)
    });
  };

  const predefinedThemes = [
    { 
      id: 'vs-dark', 
      name: 'Dark (VS Code)', 
      preview: 'linear-gradient(135deg, #1e1e1e, #252526)', 
      description: 'Классическая тёмная тема',
      colors: { bg: '#1e1e1e', fg: '#d4d4d4', keyword: '#569cd6', function: '#dcdcaa', string: '#ce9178', bracket: '#d4d4d4' }
    },
    { 
      id: 'vs-light', 
      name: 'Light (VS Code)', 
      preview: 'linear-gradient(135deg, #ffffff, #f3f3f3)', 
      description: 'Светлая тема',
      colors: { bg: '#ffffff', fg: '#000000', keyword: '#0000ff', function: '#795e26', string: '#a31515', bracket: '#000000' }
    },
    { 
      id: 'hc-black', 
      name: 'High Contrast', 
      preview: 'linear-gradient(135deg, #000000, #1a1a1a)', 
      description: 'Высокий контраст',
      colors: { bg: '#000000', fg: '#ffffff', keyword: '#00ffff', function: '#ffff00', string: '#00ff00', bracket: '#ffffff' }
    },
    { 
      id: 'monokai', 
      name: 'Monokai Pro', 
      preview: 'linear-gradient(135deg, #272822, #1e1f1c)', 
      description: 'Популярная тема Monokai',
      colors: { bg: '#272822', fg: '#f8f8f2', keyword: '#f92672', function: '#a6e22e', string: '#e6db74', bracket: '#f8f8f2' }
    },
    { 
      id: 'dracula', 
      name: 'Dracula', 
      preview: 'linear-gradient(135deg, #282a36, #1e1f29)', 
      description: 'Тёмная тема с фиолетовым',
      colors: { bg: '#282a36', fg: '#f8f8f2', keyword: '#ff79c6', function: '#50fa7b', string: '#f1fa8c', bracket: '#f8f8f2' }
    },
    { 
      id: 'github-dark', 
      name: 'GitHub Dark', 
      preview: 'linear-gradient(135deg, #0d1117, #161b22)', 
      description: 'GitHub тёмная',
      colors: { bg: '#0d1117', fg: '#c9d1d9', keyword: '#ff7b72', function: '#d2a8ff', string: '#a5d6ff', bracket: '#c9d1d9' }
    },
    { 
      id: 'github-light', 
      name: 'GitHub Light', 
      preview: 'linear-gradient(135deg, #ffffff, #f6f8fa)', 
      description: 'GitHub светлая',
      colors: { bg: '#ffffff', fg: '#24292f', keyword: '#cf222e', function: '#8250df', string: '#0a3069', bracket: '#24292f' }
    },
    { 
      id: 'one-dark', 
      name: 'One Dark Pro', 
      preview: 'linear-gradient(135deg, #282c34, #21252b)', 
      description: 'Atom One Dark',
      colors: { bg: '#282c34', fg: '#abb2bf', keyword: '#c678dd', function: '#61afef', string: '#98c379', bracket: '#abb2bf' }
    },
    { 
      id: 'nord', 
      name: 'Nord', 
      preview: 'linear-gradient(135deg, #2e3440, #3b4252)', 
      description: 'Холодная нордическая тема',
      colors: { bg: '#2e3440', fg: '#d8dee9', keyword: '#81a1c1', function: '#88c0d0', string: '#a3be8c', bracket: '#d8dee9' }
    },
    { 
      id: 'solarized-dark', 
      name: 'Solarized Dark', 
      preview: 'linear-gradient(135deg, #002b36, #073642)', 
      description: 'Solarized тёмная',
      colors: { bg: '#002b36', fg: '#839496', keyword: '#859900', function: '#268bd2', string: '#2aa198', bracket: '#839496' }
    },
    { 
      id: 'solarized-light', 
      name: 'Solarized Light', 
      preview: 'linear-gradient(135deg, #fdf6e3, #eee8d5)', 
      description: 'Solarized светлая',
      colors: { bg: '#fdf6e3', fg: '#657b83', keyword: '#859900', function: '#268bd2', string: '#2aa198', bracket: '#657b83' }
    },
    { 
      id: 'night-owl', 
      name: 'Night Owl', 
      preview: 'linear-gradient(135deg, #011627, #001424)', 
      description: 'Ночная тема для сов',
      colors: { bg: '#011627', fg: '#d6deeb', keyword: '#c792ea', function: '#82aaff', string: '#ecc48d', bracket: '#d6deeb' }
    },
    { 
      id: 'ayu-dark', 
      name: 'Ayu Dark', 
      preview: 'linear-gradient(135deg, #0a0e14, #0d1016)', 
      description: 'Минималистичная тёмная',
      colors: { bg: '#0a0e14', fg: '#b3b1ad', keyword: '#ff8f40', function: '#ffb454', string: '#aad94c', bracket: '#b3b1ad' }
    },
    { 
      id: 'cobalt2', 
      name: 'Cobalt2', 
      preview: 'linear-gradient(135deg, #193549, #122738)', 
      description: 'Синяя кобальтовая',
      colors: { bg: '#193549', fg: '#ffffff', keyword: '#ff9d00', function: '#ffc600', string: '#3ad900', bracket: '#ffffff' }
    },
    { 
      id: 'synthwave', 
      name: 'SynthWave 84', 
      preview: 'linear-gradient(135deg, #262335, #1a1720)', 
      description: 'Ретро 80-х',
      colors: { bg: '#262335', fg: '#f0eff1', keyword: '#ff7edb', function: '#fede5d', string: '#72f1b8', bracket: '#f0eff1' }
    },
    { 
      id: 'tokyo-night', 
      name: 'Tokyo Night', 
      preview: 'linear-gradient(135deg, #1a1b26, #16161e)', 
      description: 'Ночной Токио',
      colors: { bg: '#1a1b26', fg: '#c0caf5', keyword: '#bb9af7', function: '#7aa2f7', string: '#9ece6a', bracket: '#c0caf5' }
    },
    { 
      id: 'material', 
      name: 'Material Theme', 
      preview: 'linear-gradient(135deg, #263238, #1e272c)', 
      description: 'Material Design',
      colors: { bg: '#263238', fg: '#eeffff', keyword: '#c792ea', function: '#82aaff', string: '#c3e88d', bracket: '#eeffff' }
    },
    { 
      id: 'gruvbox-dark', 
      name: 'Gruvbox Dark', 
      preview: 'linear-gradient(135deg, #282828, #1d2021)', 
      description: 'Ретро Gruvbox',
      colors: { bg: '#282828', fg: '#ebdbb2', keyword: '#fb4934', function: '#b8bb26', string: '#fabd2f', bracket: '#ebdbb2' }
    },
    { 
      id: 'palenight', 
      name: 'Palenight', 
      preview: 'linear-gradient(135deg, #292d3e, #1f2233)', 
      description: 'Мягкая ночная',
      colors: { bg: '#292d3e', fg: '#bfc7d5', keyword: '#c792ea', function: '#82aaff', string: '#c3e88d', bracket: '#bfc7d5' }
    },
    { 
      id: 'oceanic', 
      name: 'Oceanic Next', 
      preview: 'linear-gradient(135deg, #1b2b34, #14191f)', 
      description: 'Океаническая синяя',
      colors: { bg: '#1b2b34', fg: '#cdd3de', keyword: '#c594c5', function: '#6699cc', string: '#99c794', bracket: '#cdd3de' }
    },
  ];

  return (
    <div className={styles['student-themes']}>
      <div className={styles['student-themes-header']}>
        <div>
          <h1><FaPalette /> Темы редактора</h1>
          <p>Создайте свою уникальную цветовую схему для IDE</p>
        </div>
        <button className={styles['btn-create-theme']} onClick={() => setShowCreateModal(true)}>
          <FaPlus /> Создать тему
        </button>
      </div>

      <div className={styles['themes-section']}>
        <h2>Встроенные темы</h2>
        <div className={styles['themes-grid']}>
          {predefinedThemes.map(theme => (
            <div 
              key={theme.id} 
              className={`${styles['theme-card']} ${activeTheme === theme.id ? styles['active'] : ''}`}
              onClick={() => applyTheme(theme.id)}
            >
              <div className={styles['theme-preview']} style={{ background: theme.preview }}>
                {activeTheme === theme.id ? (
                  <FaCheck className={styles['check-icon']} />
                ) : (
                  <div className={styles['code-sample']}>
                    <div className={styles['code-line']}>
                      <span style={{ color: theme.colors.keyword }}>function</span>{' '}
                      <span style={{ color: theme.colors.function }}>hello</span>
                      <span style={{ color: theme.colors.bracket }}>()</span>{' '}
                      <span style={{ color: theme.colors.bracket }}>{'{'}</span>
                    </div>
                    <div className={styles['code-line']}>
                      {'  '}<span style={{ color: theme.colors.keyword }}>return</span>{' '}
                      <span style={{ color: theme.colors.string }}>"World"</span>
                      <span style={{ color: theme.colors.bracket }}>;</span>
                    </div>
                    <div className={styles['code-line']}>
                      <span style={{ color: theme.colors.bracket }}>{'}'}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className={styles['theme-info']}>
                <h3>{theme.name}</h3>
                <p className={styles['theme-description']}>{theme.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {themes.length > 0 && (
        <div className={styles['themes-section']}>
          <h2>Мои темы</h2>
          <div className={styles['themes-grid']}>
            {themes.map(theme => (
              <div 
                key={theme.id} 
                className={`${styles['theme-card']} ${styles['custom']} ${activeTheme === theme.id ? styles['active'] : ''}`}
              >
                <div 
                  className={styles['theme-preview']} 
                  style={{ 
                    background: theme.colors['editor.background'],
                    color: theme.colors['editor.foreground']
                  }}
                  onClick={() => applyTheme(theme.id)}
                >
                  {activeTheme === theme.id ? (
                    <FaCheck className={styles['check-icon']} />
                  ) : (
                    <div className={styles['code-sample']}>
                      <div className={styles['code-line']}>
                        <span style={{ color: theme.tokenColors.find(t => t.scope === 'keyword')?.foreground || '#569cd6' }}>
                          function
                        </span>{' '}
                        <span style={{ color: theme.tokenColors.find(t => t.scope === 'function')?.foreground || '#dcdcaa' }}>
                          hello
                        </span>
                        <span style={{ color: theme.colors['editor.foreground'] }}>
                          ()
                        </span>{' '}
                        <span style={{ color: theme.colors['editor.foreground'] }}>
                          {'{'}
                        </span>
                      </div>
                      <div className={styles['code-line']}>
                        {'  '}
                        <span style={{ color: theme.tokenColors.find(t => t.scope === 'keyword')?.foreground || '#569cd6' }}>
                          return
                        </span>{' '}
                        <span style={{ color: theme.tokenColors.find(t => t.scope === 'string')?.foreground || '#ce9178' }}>
                          "World"
                        </span>
                        <span style={{ color: theme.colors['editor.foreground'] }}>
                          ;
                        </span>
                      </div>
                      <div className={styles['code-line']}>
                        <span style={{ color: theme.colors['editor.foreground'] }}>
                          {'}'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className={styles['theme-info']}>
                  <h3>{theme.name}</h3>
                  <div className={styles['theme-meta']}>
                    Создана {new Date(theme.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className={styles['theme-actions']}>
                  <button onClick={() => openDeleteModal(theme)} className={styles['btn-delete']}>
                    <FaTrash /> Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className={styles['theme-modal-overlay']} onClick={() => setShowCreateModal(false)}>
          <div className={styles['theme-modal']} onClick={e => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>Создать тему</h2>
              <button onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            
            <div className={styles['modal-body']}>
              <div className={styles['theme-editor']}>
                <div className={styles['theme-settings']}>
                  <div className={styles['form-group']}>
                    <label>Название темы</label>
                    <input
                      type="text"
                      value={newTheme.name}
                      onChange={e => setNewTheme({ ...newTheme, name: e.target.value })}
                      placeholder="Моя крутая тема"
                    />
                  </div>

                  <div className={styles['form-group']}>
                    <label>Базовая тема</label>
                    <select 
                      value={newTheme.base}
                      onChange={e => setNewTheme({ ...newTheme, base: e.target.value })}
                    >
                      <option value="vs-dark">Темная</option>
                      <option value="vs-light">Светлая</option>
                      <option value="hc-black">Высокий контраст</option>
                    </select>
                  </div>

                  <h3>Цвета редактора</h3>
                  <div className={styles['color-grid']}>
                    {Object.entries(newTheme.colors).map(([key, value]) => (
                      <div key={key} className={styles['color-item']}>
                        <label>{key.replace('editor.', '').replace(/([A-Z])/g, ' $1')}</label>
                        <div className={styles['color-input-group']}>
                          <input
                            type="color"
                            value={value}
                            onChange={e => updateColor(key, e.target.value)}
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={e => updateColor(key, e.target.value)}
                            className={styles['color-text']}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <h3>Подсветка синтаксиса</h3>
                  <div className={styles['token-colors']}>
                    {newTheme.tokenColors.map((token, index) => (
                      <div key={index} className={styles['token-item']}>
                        <input
                          type="text"
                          value={token.scope}
                          onChange={e => updateTokenColor(index, 'scope', e.target.value)}
                          placeholder="comment, string, keyword..."
                          className={styles['scope-input']}
                        />
                        <div className={styles['color-input-group']}>
                          <input
                            type="color"
                            value={token.foreground}
                            onChange={e => updateTokenColor(index, 'foreground', e.target.value)}
                          />
                          <input
                            type="text"
                            value={token.foreground}
                            onChange={e => updateTokenColor(index, 'foreground', e.target.value)}
                            className={styles['color-text']}
                          />
                        </div>
                        <button onClick={() => removeTokenColor(index)} className={styles['btn-remove']}>
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                    <button onClick={addTokenColor} className={styles['btn-add-token']}>
                      <FaPlus /> Добавить правило
                    </button>
                  </div>
                </div>

                <div className={styles['theme-preview-panel']}>
                  <h3><FaEye /> Предпросмотр</h3>
                  <div 
                    className={styles['code-preview']}
                    style={{
                      background: newTheme.colors['editor.background'],
                      color: newTheme.colors['editor.foreground']
                    }}
                  >
                    <pre>{previewCode}</pre>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles['modal-footer']}>
              <button onClick={() => setShowCreateModal(false)} className={styles['btn-cancel']}>
                Отмена
              </button>
              <button onClick={createTheme} className={styles['btn-save']}>
                Создать тему
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles['themes-help']}>
        <h3><FaBook /> Справка по созданию тем</h3>
        <div className={styles['help-content']}>
          <h4>Основные цвета редактора:</h4>
          <ul>
            <li><code>editor.background</code> - фон редактора</li>
            <li><code>editor.foreground</code> - цвет текста</li>
            <li><code>editor.lineHighlightBackground</code> - подсветка текущей строки</li>
            <li><code>editor.selectionBackground</code> - фон выделенного текста</li>
            <li><code>editorCursor.foreground</code> - цвет курсора</li>
            <li><code>editorLineNumber.foreground</code> - цвет номеров строк</li>
          </ul>
          
          <h4>Области подсветки синтаксиса:</h4>
          <ul>
            <li><code>comment</code> - комментарии</li>
            <li><code>string</code> - строки</li>
            <li><code>keyword</code> - ключевые слова (if, for, function...)</li>
            <li><code>number</code> - числа</li>
            <li><code>function</code> - имена функций</li>
            <li><code>variable</code> - переменные</li>
            <li><code>type</code> - типы данных</li>
            <li><code>class</code> - имена классов</li>
          </ul>
        </div>
      </div>

      {/* Модальное окно удаления */}
      {showDeleteModal && (
        <div className={styles['modal-overlay']} onClick={() => setShowDeleteModal(false)}>
          <div className={styles['modal-delete']} onClick={e => e.stopPropagation()}>
            <div className={styles['modal-icon-warning']}>
              <AiOutlineWarning />
            </div>
            <h3>Удалить тему?</h3>
            <p>Вы уверены, что хотите удалить тему "<strong>{themeToDelete?.name}</strong>"?</p>
            <p className={styles['modal-warning-text']}>Это действие нельзя отменить.</p>
            <div className={styles['modal-actions']}>
              <button onClick={() => setShowDeleteModal(false)} className={styles['btn-cancel']}>
                Отмена
              </button>
              <button onClick={confirmDeleteTheme} className={styles['btn-confirm-delete']}>
                <FaTrash /> Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно уведомлений */}
      {showNotificationModal && (
        <div className={styles['notification-modal']}>
          <div className={`${styles['notification-content']} ${styles[notificationContent.type]}`}>
            <div className={styles['notification-icon']}>
              {notificationContent.type === 'success' && <AiOutlineCheckCircle />}
              {notificationContent.type === 'error' && <AiOutlineCloseCircle />}
              {notificationContent.type === 'warning' && <AiOutlineWarning />}
            </div>
            <p>{notificationContent.message}</p>
            <button onClick={() => setShowNotificationModal(false)} className={styles['notification-close']}>
              <FaTimes />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentThemes;
