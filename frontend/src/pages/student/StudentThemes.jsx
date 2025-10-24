import { useState, useEffect } from 'react';
import './StudentThemes.css';
import { FaPlus, FaTrash, FaCheck, FaPalette, FaEye } from 'react-icons/fa';

function StudentThemes() {
  const [themes, setThemes] = useState([]);
  const [activeTheme, setActiveTheme] = useState('vs-dark');
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  const createTheme = () => {
    if (!newTheme.name) {
      alert('Введите название темы');
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

  const deleteTheme = (id) => {
    if (confirm('Удалить тему?')) {
      saveThemes(themes.filter(t => t.id !== id));
      if (activeTheme === id) {
        applyTheme('vs-dark');
      }
    }
  };

  const applyTheme = (themeId) => {
    setActiveTheme(themeId);
    localStorage.setItem('studentIDE_activeTheme', themeId);
    
    // Уведомляем редактор о смене темы
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { themeId } }));
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
    { id: 'vs-dark', name: 'Dark (VS Code)', preview: '#1e1e1e' },
    { id: 'vs-light', name: 'Light (VS Code)', preview: '#ffffff' },
    { id: 'hc-black', name: 'High Contrast', preview: '#000000' },
  ];

  return (
    <div className="student-themes">
      <div className="student-themes-header">
        <div>
          <h1>🎨 Темы редактора</h1>
          <p>Создайте свою уникальную цветовую схему для IDE</p>
        </div>
        <button className="btn-create-theme" onClick={() => setShowCreateModal(true)}>
          <FaPlus /> Создать тему
        </button>
      </div>

      <div className="themes-section">
        <h2>Встроенные темы</h2>
        <div className="themes-grid">
          {predefinedThemes.map(theme => (
            <div 
              key={theme.id} 
              className={`theme-card ${activeTheme === theme.id ? 'active' : ''}`}
              onClick={() => applyTheme(theme.id)}
            >
              <div className="theme-preview" style={{ background: theme.preview }}>
                {activeTheme === theme.id && <FaCheck className="check-icon" />}
              </div>
              <h3>{theme.name}</h3>
            </div>
          ))}
        </div>
      </div>

      {themes.length > 0 && (
        <div className="themes-section">
          <h2>Мои темы</h2>
          <div className="themes-grid">
            {themes.map(theme => (
              <div 
                key={theme.id} 
                className={`theme-card custom ${activeTheme === theme.id ? 'active' : ''}`}
              >
                <div 
                  className="theme-preview" 
                  style={{ background: theme.colors['editor.background'] }}
                  onClick={() => applyTheme(theme.id)}
                >
                  {activeTheme === theme.id && <FaCheck className="check-icon" />}
                </div>
                <h3>{theme.name}</h3>
                <div className="theme-actions">
                  <button onClick={() => deleteTheme(theme.id)} className="btn-delete">
                    <FaTrash />
                  </button>
                </div>
                <div className="theme-meta">
                  {new Date(theme.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="theme-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="theme-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Создать тему</h2>
              <button onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="theme-editor">
                <div className="theme-settings">
                  <div className="form-group">
                    <label>Название темы</label>
                    <input
                      type="text"
                      value={newTheme.name}
                      onChange={e => setNewTheme({ ...newTheme, name: e.target.value })}
                      placeholder="Моя крутая тема"
                    />
                  </div>

                  <div className="form-group">
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
                  <div className="color-grid">
                    {Object.entries(newTheme.colors).map(([key, value]) => (
                      <div key={key} className="color-item">
                        <label>{key.replace('editor.', '').replace(/([A-Z])/g, ' $1')}</label>
                        <div className="color-input-group">
                          <input
                            type="color"
                            value={value}
                            onChange={e => updateColor(key, e.target.value)}
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={e => updateColor(key, e.target.value)}
                            className="color-text"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <h3>Подсветка синтаксиса</h3>
                  <div className="token-colors">
                    {newTheme.tokenColors.map((token, index) => (
                      <div key={index} className="token-item">
                        <input
                          type="text"
                          value={token.scope}
                          onChange={e => updateTokenColor(index, 'scope', e.target.value)}
                          placeholder="comment, string, keyword..."
                          className="scope-input"
                        />
                        <div className="color-input-group">
                          <input
                            type="color"
                            value={token.foreground}
                            onChange={e => updateTokenColor(index, 'foreground', e.target.value)}
                          />
                          <input
                            type="text"
                            value={token.foreground}
                            onChange={e => updateTokenColor(index, 'foreground', e.target.value)}
                            className="color-text"
                          />
                        </div>
                        <button onClick={() => removeTokenColor(index)} className="btn-remove">
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                    <button onClick={addTokenColor} className="btn-add-token">
                      <FaPlus /> Добавить правило
                    </button>
                  </div>
                </div>

                <div className="theme-preview-panel">
                  <h3><FaEye /> Предпросмотр</h3>
                  <div 
                    className="code-preview"
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

            <div className="modal-footer">
              <button onClick={() => setShowCreateModal(false)} className="btn-cancel">
                Отмена
              </button>
              <button onClick={createTheme} className="btn-save">
                Создать тему
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="themes-help">
        <h3>📖 Справка по созданию тем</h3>
        <div className="help-content">
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
    </div>
  );
}

export default StudentThemes;
