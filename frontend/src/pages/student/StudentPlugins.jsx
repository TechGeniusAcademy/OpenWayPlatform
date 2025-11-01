import { useState, useEffect } from 'react';
import './StudentPlugins.css';
import { FaPlus, FaTrash, FaToggleOn, FaToggleOff, FaCode, FaPlug, FaBook } from 'react-icons/fa';

function StudentPlugins() {
  const [plugins, setPlugins] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlugin, setNewPlugin] = useState({ name: '', description: '', code: '', enabled: true });

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = () => {
    const saved = localStorage.getItem('studentIDE_plugins');
    if (saved) {
      setPlugins(JSON.parse(saved));
    }
  };

  const savePlugins = (updatedPlugins) => {
    localStorage.setItem('studentIDE_plugins', JSON.stringify(updatedPlugins));
    setPlugins(updatedPlugins);
  };

  const addPlugin = () => {
    if (!newPlugin.name || !newPlugin.code) {
      alert('Введите название и код плагина');
      return;
    }

    const plugin = {
      id: Date.now(),
      ...newPlugin,
      createdAt: new Date().toISOString()
    };

    savePlugins([...plugins, plugin]);
    setNewPlugin({ name: '', description: '', code: '', enabled: true });
    setShowAddModal(false);
  };

  const deletePlugin = (id) => {
    if (confirm('Удалить плагин?')) {
      savePlugins(plugins.filter(p => p.id !== id));
    }
  };

  const togglePlugin = (id) => {
    savePlugins(plugins.map(p => 
      p.id === id ? { ...p, enabled: !p.enabled } : p
    ));
  };

  const examplePlugin = `// Пример плагина: автосохранение каждые 5 секунд
let autoSaveInterval = setInterval(() => {
  console.log('Автосохранение...');
  // Здесь можно добавить логику сохранения
}, 5000);

// Очистка при закрытии
window.addEventListener('beforeunload', () => {
  clearInterval(autoSaveInterval);
});`;

  return (
    <div className="student-plugins">
      <div className="student-plugins-header">
        <div>
          <h1><FaPlug /> Плагины редактора</h1>
          <p>Расширьте возможности IDE с помощью собственных плагинов</p>
        </div>
        <button className="btn-add-plugin" onClick={() => setShowAddModal(true)}>
          <FaPlus /> Добавить плагин
        </button>
      </div>

      <div className="plugins-grid">
        {plugins.length === 0 ? (
          <div className="plugins-empty">
            <FaCode size={64} />
            <h3>Нет установленных плагинов</h3>
            <p>Создайте свой первый плагин для расширения редактора</p>
            <button onClick={() => setShowAddModal(true)}>Создать плагин</button>
          </div>
        ) : (
          plugins.map(plugin => (
            <div key={plugin.id} className={`plugin-card ${plugin.enabled ? 'enabled' : 'disabled'}`}>
              <div className="plugin-header">
                <h3>{plugin.name}</h3>
                <div className="plugin-actions">
                  <button 
                    onClick={() => togglePlugin(plugin.id)}
                    className={plugin.enabled ? 'toggle-on' : 'toggle-off'}
                    title={plugin.enabled ? 'Отключить' : 'Включить'}
                  >
                    {plugin.enabled ? <FaToggleOn /> : <FaToggleOff />}
                  </button>
                  <button onClick={() => deletePlugin(plugin.id)} className="btn-delete" title="Удалить">
                    <FaTrash />
                  </button>
                </div>
              </div>
              <p className="plugin-description">{plugin.description || 'Без описания'}</p>
              <div className="plugin-code">
                <pre>{plugin.code.substring(0, 200)}{plugin.code.length > 200 ? '...' : ''}</pre>
              </div>
              <div className="plugin-meta">
                Создан: {new Date(plugin.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="plugin-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="plugin-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Создать плагин</h2>
              <button onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Название плагина</label>
                <input
                  type="text"
                  value={newPlugin.name}
                  onChange={e => setNewPlugin({ ...newPlugin, name: e.target.value })}
                  placeholder="Автосохранение"
                />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <input
                  type="text"
                  value={newPlugin.description}
                  onChange={e => setNewPlugin({ ...newPlugin, description: e.target.value })}
                  placeholder="Автоматически сохраняет файл каждые 5 секунд"
                />
              </div>
              <div className="form-group">
                <label>Код плагина (JavaScript)</label>
                <textarea
                  value={newPlugin.code}
                  onChange={e => setNewPlugin({ ...newPlugin, code: e.target.value })}
                  placeholder={examplePlugin}
                  rows={15}
                />
              </div>
              <div className="form-group-checkbox">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={newPlugin.enabled}
                  onChange={e => setNewPlugin({ ...newPlugin, enabled: e.target.checked })}
                />
                <label htmlFor="enabled">Включить сразу после создания</label>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowAddModal(false)} className="btn-cancel">
                Отмена
              </button>
              <button onClick={addPlugin} className="btn-save">
                Создать плагин
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="plugins-help">
        <h3><FaBook /> Справка по созданию плагинов</h3>
        <div className="help-content">
          <p>Плагины имеют доступ к объектам <code>editor</code> и <code>monaco</code> (Monaco API).</p>
          <h4>Примеры:</h4>
          <pre>{examplePlugin}</pre>
          <p>Доступные API:</p>
          <ul>
            <li><code>editor.getValue()</code> - получить содержимое редактора</li>
            <li><code>editor.setValue(text)</code> - установить содержимое</li>
            <li><code>editor.getSelection()</code> - получить выделенный текст</li>
            <li><code>editor.addAction()</code> - добавить команду</li>
            <li><code>editor.onDidChangeModelContent()</code> - событие изменения</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default StudentPlugins;
