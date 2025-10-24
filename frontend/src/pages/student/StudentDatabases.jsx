import { useState, useEffect } from 'react';
import { AiOutlinePlus, AiOutlineDatabase, AiOutlineDelete, AiOutlineCopy } from 'react-icons/ai';
import { BiData } from 'react-icons/bi';
import './StudentDatabases.css';

function StudentDatabases() {
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Симуляция загрузки
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

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
    <div className="student-databases">
      <div className="page-header">
        <div className="header-content">
          <h1>Мои базы данных</h1>
          <p>Создавайте и управляйте базами данных для ваших проектов</p>
        </div>
        <button className="create-db-btn" onClick={createNewDatabase}>
          <AiOutlinePlus />
          Создать БД
        </button>
      </div>

      {loading && (
        <div className="loading-message">Загрузка баз данных...</div>
      )}

      {!loading && databases.length === 0 && (
        <div className="empty-message">
          <BiData className="empty-icon" />
          <h2>У вас пока нет баз данных</h2>
          <p>Создайте свою первую базу данных для использования в проектах</p>
        </div>
      )}

      {!loading && databases.length > 0 && (
        <div className="databases-grid">
          {databases.map(db => (
            <div key={db.id} className="database-card">
              <div className="database-header">
                <div className="database-icon">
                  <AiOutlineDatabase />
                </div>
                <div className="database-info">
                  <h3 className="database-name">{db.name}</h3>
                  <p className="database-description">{db.description}</p>
                  <span className="database-type">{db.type}</span>
                </div>
                <button 
                  className="delete-btn" 
                  onClick={(e) => deleteDatabase(db.id, e)}
                  title="Удалить базу данных"
                >
                  <AiOutlineDelete />
                </button>
              </div>

              <div className="database-stats">
                <div className="stat-item">
                  <span className="stat-label">Таблицы:</span>
                  <span className="stat-value">{db.tables}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Размер:</span>
                  <span className="stat-value">{db.size}</span>
                </div>
              </div>

              <div className="database-connection">
                <div className="connection-info">
                  <div className="connection-row">
                    <span className="connection-label">Host:</span>
                    <code className="connection-value">{db.host}:{db.port}</code>
                  </div>
                  <div className="connection-row">
                    <span className="connection-label">Database:</span>
                    <code className="connection-value">{db.database}</code>
                  </div>
                  <div className="connection-row">
                    <span className="connection-label">Username:</span>
                    <code className="connection-value">{db.username}</code>
                  </div>
                  <div className="connection-row">
                    <span className="connection-label">Password:</span>
                    <code className="connection-value">{'•'.repeat(12)}</code>
                  </div>
                </div>
                <button 
                  className="copy-connection-btn"
                  onClick={(e) => copyConnectionString(db, e)}
                  title="Копировать connection string"
                >
                  <AiOutlineCopy />
                  Копировать строку подключения
                </button>
              </div>

              <div className="database-footer">
                <span className="created-date">
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
