import { useState, useEffect } from 'react';
import styles from './StudentPlugins.module.css';
import { FaPlus, FaTrash, FaToggleOn, FaToggleOff, FaCode, FaPlug, FaBook, FaCog, FaCheckCircle } from 'react-icons/fa';
import { AiOutlineCheckCircle, AiOutlineCloseCircle, AiOutlineWarning } from 'react-icons/ai';

function StudentPlugins() {
  const [plugins, setPlugins] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlugin, setNewPlugin] = useState({ name: '', description: '', code: '', enabled: true });
  
  // Модальные окна
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pluginToDelete, setPluginToDelete] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationContent, setNotificationContent] = useState({ type: '', message: '' });

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
      showNotification('error', 'Введите название и код плагина');
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
    showNotification('success', `Плагин "${plugin.name}" успешно создан!`);
  };

  // Открыть модальное окно удаления
  const openDeleteModal = (plugin) => {
    setPluginToDelete(plugin);
    setShowDeleteModal(true);
  };

  // Подтвердить удаление
  const confirmDeletePlugin = () => {
    if (pluginToDelete) {
      savePlugins(plugins.filter(p => p.id !== pluginToDelete.id));
      setShowDeleteModal(false);
      showNotification('success', `Плагин "${pluginToDelete.name}" удален`);
      setPluginToDelete(null);
    }
  };

  const togglePlugin = (id) => {
    const plugin = plugins.find(p => p.id === id);
    savePlugins(plugins.map(p => 
      p.id === id ? { ...p, enabled: !p.enabled } : p
    ));
    
    if (plugin) {
      showNotification('success', plugin.enabled ? 'Плагин отключен' : 'Плагин включен');
    }
  };

  // Показать уведомление
  const showNotification = (type, message) => {
    setNotificationContent({ type, message });
    setShowNotificationModal(true);
    setTimeout(() => setShowNotificationModal(false), 3000);
  };

  // Рассчитать статистику
  const getStats = () => {
    const totalPlugins = plugins.length;
    const enabledPlugins = plugins.filter(p => p.enabled).length;
    const disabledPlugins = totalPlugins - enabledPlugins;
    
    return { totalPlugins, enabledPlugins, disabledPlugins };
  };

  const stats = getStats();

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
    <div className={styles['student-plugins']}>
      <div className={styles['student-plugins-header']}>
        <div className={styles['header-content']}>
          <h1><FaPlug /> Плагины редактора</h1>
          <p>Расширьте возможности IDE с помощью собственных плагинов</p>
        </div>
        <button className={styles['btn-add-plugin']} onClick={() => setShowAddModal(true)}>
          <FaPlus /> Добавить плагин
        </button>
      </div>

      {/* Статистика */}
      {plugins.length > 0 && (
        <div className={styles['plugins-stats']}>
          <div className={styles['stat-card']}>
            <div className={styles['stat-icon']}>
              <FaPlug />
            </div>
            <div className={styles['stat-info']}>
              <div className={styles['stat-value']}>{stats.totalPlugins}</div>
              <div className={styles['stat-label']}>Всего плагинов</div>
            </div>
          </div>
          
          <div className={styles['stat-card']}>
            <div className={styles['stat-icon']} style={{ background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)' }}>
              <FaCheckCircle />
            </div>
            <div className={styles['stat-info']}>
              <div className={styles['stat-value']}>{stats.enabledPlugins}</div>
              <div className={styles['stat-label']}>Активных</div>
            </div>
          </div>
          
          <div className={styles['stat-card']}>
            <div className={styles['stat-icon']} style={{ background: 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)' }}>
              <FaCog />
            </div>
            <div className={styles['stat-info']}>
              <div className={styles['stat-value']}>{stats.disabledPlugins}</div>
              <div className={styles['stat-label']}>Отключено</div>
            </div>
          </div>
        </div>
      )}

      <div className={styles['plugins-grid']}>
        {plugins.length === 0 ? (
          <div className={styles['plugins-empty']}>
            <FaCode size={64} />
            <h3>Нет установленных плагинов</h3>
            <p>Создайте свой первый плагин для расширения редактора</p>
            <button onClick={() => setShowAddModal(true)}>Создать плагин</button>
          </div>
        ) : (
          plugins.map(plugin => (
            <div key={plugin.id} className={`${styles['plugin-card']} ${plugin.enabled ? styles['enabled'] : styles['disabled']}`}>
              <div className={styles['plugin-header']}>
                <h3>{plugin.name}</h3>
                <div className={styles['plugin-actions']}>
                  <button 
                    onClick={() => togglePlugin(plugin.id)}
                    className={`${styles['toggle-btn']} ${plugin.enabled ? styles['toggle-on'] : styles['toggle-off']}`}
                    title={plugin.enabled ? 'Отключить' : 'Включить'}
                  >
                    {plugin.enabled ? <FaToggleOn /> : <FaToggleOff />}
                  </button>
                  <button onClick={() => openDeleteModal(plugin)} className={styles['btn-delete']} title="Удалить">
                    <FaTrash />
                  </button>
                </div>
              </div>
              <p className={styles['plugin-description']}>{plugin.description || 'Без описания'}</p>
              <div className={styles['plugin-code']}>
                <pre>{plugin.code.substring(0, 200)}{plugin.code.length > 200 ? '...' : ''}</pre>
              </div>
              <div className={styles['plugin-meta']}>
                Создан: {new Date(plugin.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className={styles['plugin-modal-overlay']} onClick={() => setShowAddModal(false)}>
          <div className={styles['plugin-modal']} onClick={e => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>Создать плагин</h2>
              <button onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className={styles['modal-body']}>
              <div className={styles['form-group']}>
                <label>Название плагина</label>
                <input
                  type="text"
                  value={newPlugin.name}
                  onChange={e => setNewPlugin({ ...newPlugin, name: e.target.value })}
                  placeholder="Автосохранение"
                />
              </div>
              <div className={styles['form-group']}>
                <label>Описание</label>
                <input
                  type="text"
                  value={newPlugin.description}
                  onChange={e => setNewPlugin({ ...newPlugin, description: e.target.value })}
                  placeholder="Автоматически сохраняет файл каждые 5 секунд"
                />
              </div>
              <div className={styles['form-group']}>
                <label>Код плагина (JavaScript)</label>
                <textarea
                  value={newPlugin.code}
                  onChange={e => setNewPlugin({ ...newPlugin, code: e.target.value })}
                  placeholder={examplePlugin}
                  rows={15}
                />
              </div>
              <div className={styles['form-group-checkbox']}>
                <input
                  type="checkbox"
                  id="enabled"
                  checked={newPlugin.enabled}
                  onChange={e => setNewPlugin({ ...newPlugin, enabled: e.target.checked })}
                />
                <label htmlFor="enabled">Включить сразу после создания</label>
              </div>
            </div>
            <div className={styles['modal-footer']}>
              <button onClick={() => setShowAddModal(false)} className={styles['btn-cancel']}>
                Отмена
              </button>
              <button onClick={addPlugin} className={styles['btn-save']}>
                Создать плагин
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles['plugins-help']}>
        <h3><FaBook /> Справка по созданию плагинов</h3>
        <div className={styles['help-content']}>
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

      {/* Модальное окно подтверждения удаления */}
      {showDeleteModal && pluginToDelete && (
        <div className={styles['modal-overlay']} onClick={() => setShowDeleteModal(false)}>
          <div className={styles['modal-content-delete']} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>Удалить плагин?</h2>
              <button className={styles['modal-close']} onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div className={styles['modal-body']}>
              <div className={styles['delete-warning']}>
                <AiOutlineWarning className={styles['warning-icon']} />
                <p>Вы уверены, что хотите удалить плагин <strong>"{pluginToDelete.name}"</strong>?</p>
                <p className={styles['warning-text']}>Это действие нельзя отменить!</p>
              </div>
            </div>
            <div className={styles['modal-footer']}>
              <button className={styles['btn-cancel']} onClick={() => setShowDeleteModal(false)}>
                Отмена
              </button>
              <button className={styles['btn-danger']} onClick={confirmDeletePlugin}>
                <FaTrash />
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно уведомлений */}
      {showNotificationModal && (
        <div className={styles['notification-modal']}>
          <div className={`${styles['notification-content']} ${styles[notificationContent.type]}`}>
            {notificationContent.type === 'success' ? (
              <AiOutlineCheckCircle className={styles['notification-icon']} />
            ) : (
              <AiOutlineCloseCircle className={styles['notification-icon']} />
            )}
            <span>{notificationContent.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentPlugins;
