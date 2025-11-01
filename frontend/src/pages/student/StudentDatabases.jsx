import { useState, useEffect } from 'react';
import { AiOutlinePlus, AiOutlineDatabase, AiOutlineDelete, AiOutlineCopy } from 'react-icons/ai';
import { BiData } from 'react-icons/bi';
import styles from './StudentDatabases.module.css';

function StudentDatabases() {
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const createNewDatabase = () => {
    const name = prompt('Введите название базы данных:');
    if (!name || !name.trim()) return;
    
    const description = prompt('Введите описание (необязательно):');
    
    const newDb = {
      id: Date.now(),
      name: name.trim(),
      description: description?.trim() || 'База данных для проекта',
      type: 'PostgreSQL',
      host: 'localhost',
      port: 5432,
      username: `user_${Math.random().toString(36).substr(2, 9)}`,
      password: Math.random().toString(36).substr(2, 12),
      database: name.trim().toLowerCase().replace(/\s+/g, '_'),
      createdAt: new Date().toISOString(),
      size: '0 MB',
      tables: 0
    };
    
    setDatabases(prev => [newDb, ...prev]);
  };

  const deleteDatabase = (dbId, e) => {
    e.stopPropagation();
    if (!confirm('Вы уверены, что хотите удалить эту базу данных? Все данные будут безвозвратно утеряны.')) {
      return;
    }
    setDatabases(prev => prev.filter(db => db.id !== dbId));
  };

  const copyConnectionString = (db, e) => {
    e.stopPropagation();
    const connectionString = `postgresql://${db.username}:${db.password}@${db.host}:${db.port}/${db.database}`;
    navigator.clipboard.writeText(connectionString);
    alert('Connection string скопирован в буфер обмена!');
  };

  return (
    <div className={styles.student-databases}>
      <div className={styles.page-header}>
        <div className={styles.header-content}>
          <h1>Мои базы данных</h1>
          <p>Создавайте и управляйте базами данных для ваших проектов</p>
        </div>
        <button className={styles.create-db-btn} onClick={createNewDatabase}>
          <AiOutlinePlus />
          Создать БД
        </button>
      </div>

      {loading && (
        <div className={styles.loading-message}>Загрузка баз данных...</div>
      )}

      {!loading && databases.length === 0 && (
        <div className={styles.empty-message}>
          <BiData className={styles.empty-icon} />
          <h2>У вас пока нет баз данных</h2>
          <p>Создайте свою первую базу данных для использования в проектах</p>
        </div>
      )}

      {!loading && databases.length > 0 && (
        <div className={styles.databases-grid}>
          {databases.map(db => (
            <div key={db.id} className={styles.database-card}>
              <div className={styles.database-header}>
                <div className={styles.database-icon}>
                  <AiOutlineDatabase />
                </div>
                <div className={styles.database-info}>
                  <h3 className={styles.database-name}>{db.name}</h3>
                  <p className={styles.database-description}>{db.description}</p>
                  <span className={styles.database-type}>{db.type}</span>
                </div>
                <button 
                  className={styles.delete-btn} 
                  onClick={(e) => deleteDatabase(db.id, e)}
                  title="Удалить базу данных"
                >
                  <AiOutlineDelete />
                </button>
              </div>

              <div className={styles.database-stats}>
                <div className={styles.stat-item}>
                  <span className={styles.stat-label}>Таблицы:</span>
                  <span className={styles.stat-value}>{db.tables}</span>
                </div>
                <div className={styles.stat-item}>
                  <span className={styles.stat-label}>Размер:</span>
                  <span className={styles.stat-value}>{db.size}</span>
                </div>
              </div>

              <div className={styles.database-connection}>
                <div className={styles.connection-info}>
                  <div className={styles.connection-row}>
                    <span className={styles.connection-label}>Host:</span>
                    <code className={styles.connection-value}>{db.host}:{db.port}</code>
                  </div>
                  <div className={styles.connection-row}>
                    <span className={styles.connection-label}>Database:</span>
                    <code className={styles.connection-value}>{db.database}</code>
                  </div>
                  <div className={styles.connection-row}>
                    <span className={styles.connection-label}>Username:</span>
                    <code className={styles.connection-value}>{db.username}</code>
                  </div>
                  <div className={styles.connection-row}>
                    <span className={styles.connection-label}>Password:</span>
                    <code className={styles.connection-value}>{'•'.repeat(12)}</code>
                  </div>
                </div>
                <button 
                  className={styles.copy-connection-btn}
                  onClick={(e) => copyConnectionString(db, e)}
                  title="Копировать connection string"
                >
                  <AiOutlineCopy />
                  Копировать строку подключения
                </button>
              </div>

              <div className={styles.database-footer}>
                <span className={styles.created-date}>
                  Создано: {new Date(db.createdAt).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentDatabases;
