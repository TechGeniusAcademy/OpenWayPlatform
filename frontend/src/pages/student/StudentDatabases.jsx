import { useState, useEffect } from 'react';
import { AiOutlinePlus, AiOutlineDatabase, AiOutlineDelete, AiOutlineCopy, AiOutlineCheckCircle, AiOutlineCloseCircle, AiOutlineWarning, AiOutlineBarChart } from 'react-icons/ai';
import { BiData } from 'react-icons/bi';
import { FaServer, FaTable, FaHdd } from 'react-icons/fa';
import styles from './StudentDatabases.module.css';

function StudentDatabases() {
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Модальные окна
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dbToDelete, setDbToDelete] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationContent, setNotificationContent] = useState({ type: '', message: '' });
  
  // Данные новой БД
  const [newDbData, setNewDbData] = useState({
    name: '',
    description: '',
    type: 'PostgreSQL'
  });

  useEffect(() => {
    // Загружаем базы данных из localStorage
    const loadDatabases = () => {
      try {
        const savedDatabases = localStorage.getItem('studentDatabases');
        if (savedDatabases) {
          setDatabases(JSON.parse(savedDatabases));
        }
      } catch (error) {
        console.error('Ошибка загрузки баз данных:', error);
      } finally {
        setLoading(false);
      }
    };

    // Симуляция загрузки
    setTimeout(() => {
      loadDatabases();
    }, 500);
  }, []);

  // Сохраняем базы данных в localStorage при каждом изменении
  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem('studentDatabases', JSON.stringify(databases));
      } catch (error) {
        console.error('Ошибка сохранения баз данных:', error);
      }
    }
  }, [databases, loading]);

  // Открыть модальное окно создания БД
  const openCreateModal = () => {
    setNewDbData({ name: '', description: '', type: 'PostgreSQL' });
    setShowCreateModal(true);
  };

  // Создать новую БД
  const createNewDatabase = () => {
    if (!newDbData.name.trim()) {
      showNotification('error', 'Введите название базы данных');
      return;
    }
    
    const newDb = {
      id: Date.now(),
      name: newDbData.name.trim(),
      description: newDbData.description?.trim() || 'База данных для проекта',
      type: newDbData.type,
      host: 'localhost',
      port: newDbData.type === 'PostgreSQL' ? 5432 : newDbData.type === 'MySQL' ? 3306 : 27017,
      username: `user_${Math.random().toString(36).substr(2, 9)}`,
      password: Math.random().toString(36).substr(2, 12),
      database: newDbData.name.trim().toLowerCase().replace(/\s+/g, '_'),
      createdAt: new Date().toISOString(),
      size: '0 MB',
      tables: 0,
      status: 'active'
    };
    
    setDatabases(prev => [newDb, ...prev]);
    setShowCreateModal(false);
    showNotification('success', `База данных "${newDb.name}" успешно создана!`);
  };

  // Открыть модальное окно удаления
  const openDeleteModal = (db, e) => {
    e.stopPropagation();
    setDbToDelete(db);
    setShowDeleteModal(true);
  };

  // Подтвердить удаление БД
  const confirmDeleteDatabase = () => {
    if (dbToDelete) {
      setDatabases(prev => prev.filter(db => db.id !== dbToDelete.id));
      setShowDeleteModal(false);
      showNotification('success', `База данных "${dbToDelete.name}" удалена`);
      setDbToDelete(null);
    }
  };

  // Копировать строку подключения
  const copyConnectionString = (db, e) => {
    e.stopPropagation();
    const connectionString = `${db.type.toLowerCase()}://${db.username}:${db.password}@${db.host}:${db.port}/${db.database}`;
    navigator.clipboard.writeText(connectionString);
    showNotification('success', 'Connection string скопирован!');
  };

  // Показать уведомление
  const showNotification = (type, message) => {
    setNotificationContent({ type, message });
    setShowNotificationModal(true);
    setTimeout(() => setShowNotificationModal(false), 3000);
  };

  // Рассчитать статистику
  const getStats = () => {
    const totalDatabases = databases.length;
    const totalTables = databases.reduce((sum, db) => sum + db.tables, 0);
    const totalSize = databases.reduce((sum, db) => {
      const size = parseFloat(db.size) || 0;
      return sum + size;
    }, 0);
    const activeDatabases = databases.filter(db => db.status === 'active').length;

    return { totalDatabases, totalTables, totalSize: totalSize.toFixed(2), activeDatabases };
  };

  const stats = getStats();

  return (
    <div className={styles['student-databases']}>
      <div className={styles['page-header']}>
        <div className={styles['header-content']}>
          <h1>Мои базы данных</h1>
          <p>Создавайте и управляйте базами данных для ваших проектов</p>
        </div>
        <button className={styles['create-db-btn']} onClick={openCreateModal}>
          <AiOutlinePlus />
          Создать БД
        </button>
      </div>

      {/* Статистика */}
      {!loading && databases.length > 0 && (
        <div className={styles['db-stats']}>
          <div className={styles['stat-card']}>
            <div className={styles['stat-icon']}>
              <AiOutlineDatabase />
            </div>
            <div className={styles['stat-info']}>
              <div className={styles['stat-value']}>{stats.totalDatabases}</div>
              <div className={styles['stat-label']}>Всего БД</div>
            </div>
          </div>
          
          <div className={styles['stat-card']}>
            <div className={styles['stat-icon']}>
              <FaServer />
            </div>
            <div className={styles['stat-info']}>
              <div className={styles['stat-value']}>{stats.activeDatabases}</div>
              <div className={styles['stat-label']}>Активных</div>
            </div>
          </div>
          
          <div className={styles['stat-card']}>
            <div className={styles['stat-icon']}>
              <FaTable />
            </div>
            <div className={styles['stat-info']}>
              <div className={styles['stat-value']}>{stats.totalTables}</div>
              <div className={styles['stat-label']}>Таблиц</div>
            </div>
          </div>
          
          <div className={styles['stat-card']}>
            <div className={styles['stat-icon']}>
              <FaHdd />
            </div>
            <div className={styles['stat-info']}>
              <div className={styles['stat-value']}>{stats.totalSize} MB</div>
              <div className={styles['stat-label']}>Общий размер</div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className={styles['loading-message']}>Загрузка баз данных...</div>
      )}

      {!loading && databases.length === 0 && (
        <div className={styles['empty-message']}>
          <BiData className={styles['empty-icon']} />
          <h2>У вас пока нет баз данных</h2>
          <p>Создайте свою первую базу данных для использования в проектах</p>
        </div>
      )}

      {!loading && databases.length > 0 && (
        <div className={styles['databases-grid']}>
          {databases.map(db => (
            <div key={db.id} className={styles['database-card']}>
              <div className={styles['database-header']}>
                <div className={styles['database-icon']}>
                  <AiOutlineDatabase />
                </div>
                <div className={styles['database-info']}>
                  <h3 className={styles['database-name']}>{db.name}</h3>
                  <p className={styles['database-description']}>{db.description}</p>
                  <span className={styles['database-type']}>{db.type}</span>
                </div>
                <button 
                  className={styles['delete-btn']} 
                  onClick={(e) => openDeleteModal(db, e)}
                  title="Удалить базу данных"
                >
                  <AiOutlineDelete />
                </button>
              </div>

              <div className={styles['database-stats']}>
                <div className={styles['stat-item']}>
                  <span className={styles['stat-label']}>Таблицы:</span>
                  <span className={styles['stat-value']}>{db.tables}</span>
                </div>
                <div className={styles['stat-item']}>
                  <span className={styles['stat-label']}>Размер:</span>
                  <span className={styles['stat-value']}>{db.size}</span>
                </div>
              </div>

              <div className={styles['database-connection']}>
                <div className={styles['connection-info']}>
                  <div className={styles['connection-row']}>
                    <span className={styles['connection-label']}>Host:</span>
                    <code className={styles['connection-value']}>{db.host}:{db.port}</code>
                  </div>
                  <div className={styles['connection-row']}>
                    <span className={styles['connection-label']}>Database:</span>
                    <code className={styles['connection-value']}>{db.database}</code>
                  </div>
                  <div className={styles['connection-row']}>
                    <span className={styles['connection-label']}>Username:</span>
                    <code className={styles['connection-value']}>{db.username}</code>
                  </div>
                  <div className={styles['connection-row']}>
                    <span className={styles['connection-label']}>Password:</span>
                    <code className={styles['connection-value']}>{'•'.repeat(12)}</code>
                  </div>
                </div>
                <button 
                  className={styles['copy-connection-btn']}
                  onClick={(e) => copyConnectionString(db, e)}
                  title="Копировать connection string"
                >
                  <AiOutlineCopy />
                  Копировать строку подключения
                </button>
              </div>

              <div className={styles['database-footer']}>
                <span className={styles['created-date']}>
                  Создано: {new Date(db.createdAt).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно создания БД */}
      {showCreateModal && (
        <div className={styles['modal-overlay']} onClick={() => setShowCreateModal(false)}>
          <div className={styles['modal-content']} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>Создать новую базу данных</h2>
              <button className={styles['modal-close']} onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className={styles['modal-body']}>
              <div className={styles['form-group']}>
                <label>Название БД *</label>
                <input
                  type="text"
                  placeholder="Моя база данных"
                  value={newDbData.name}
                  onChange={(e) => setNewDbData({ ...newDbData, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div className={styles['form-group']}>
                <label>Описание</label>
                <textarea
                  placeholder="Описание базы данных (необязательно)"
                  value={newDbData.description}
                  onChange={(e) => setNewDbData({ ...newDbData, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className={styles['form-group']}>
                <label>Тип СУБД</label>
                <select
                  value={newDbData.type}
                  onChange={(e) => setNewDbData({ ...newDbData, type: e.target.value })}
                >
                  <option value="PostgreSQL">PostgreSQL</option>
                  <option value="MySQL">MySQL</option>
                  <option value="MongoDB">MongoDB</option>
                </select>
              </div>
            </div>
            <div className={styles['modal-footer']}>
              <button className={styles['btn-secondary']} onClick={() => setShowCreateModal(false)}>
                Отмена
              </button>
              <button className={styles['btn-primary']} onClick={createNewDatabase}>
                <AiOutlinePlus />
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления */}
      {showDeleteModal && dbToDelete && (
        <div className={styles['modal-overlay']} onClick={() => setShowDeleteModal(false)}>
          <div className={styles['modal-content']} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>Удалить базу данных?</h2>
              <button className={styles['modal-close']} onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div className={styles['modal-body']}>
              <div className={styles['delete-warning']}>
                <AiOutlineWarning className={styles['warning-icon']} />
                <p>Вы уверены, что хотите удалить базу данных <strong>"{dbToDelete.name}"</strong>?</p>
                <p className={styles['warning-text']}>Все данные будут безвозвратно утеряны!</p>
              </div>
            </div>
            <div className={styles['modal-footer']}>
              <button className={styles['btn-secondary']} onClick={() => setShowDeleteModal(false)}>
                Отмена
              </button>
              <button className={styles['btn-danger']} onClick={confirmDeleteDatabase}>
                <AiOutlineDelete />
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

export default StudentDatabases;
