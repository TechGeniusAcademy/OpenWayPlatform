import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { 
  BsPeople, 
  BsCollection, 
  BsFileText, 
  BsBug,
  BsPlay,
  BsTrash,
  BsArrowRepeat
} from 'react-icons/bs';
import styles from './TesterHome.module.css';

function TesterHome() {
  const [stats, setStats] = useState({
    users: 0,
    groups: 0,
    tests: 0,
    bugs: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [usersRes, groupsRes, testsRes] = await Promise.all([
        api.get('/users'),
        api.get('/groups'),
        api.get('/tests')
      ]);

      setStats({
        users: usersRes.data.users?.length || 0,
        groups: groupsRes.data.groups?.length || 0,
        tests: testsRes.data.tests?.length || 0,
        bugs: 0 // Будет из backend
      });
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    } finally {
      setLoading(false);
    }
  };

  const runStressTest = async (type) => {
    try {
      await api.post('/testing/stress-test', { type });
      alert(`Стресс-тест "${type}" запущен!`);
    } catch (error) {
      console.error('Ошибка запуска стресс-теста:', error);
      alert('Ошибка запуска теста');
    }
  };

  const generateTestData = async () => {
    try {
      await api.post('/testing/generate-data');
      alert('Тестовые данные созданы!');
      loadStats();
    } catch (error) {
      console.error('Ошибка создания данных:', error);
      alert('Ошибка создания данных');
    }
  };

  const clearTestData = async () => {
    if (!window.confirm('Удалить все тестовые данные?')) return;
    
    try {
      await api.delete('/testing/clear-data');
      alert('Тестовые данные удалены!');
      loadStats();
    } catch (error) {
      console.error('Ошибка удаления данных:', error);
      alert('Ошибка удаления данных');
    }
  };

  if (loading) {
    return <div className={styles['tester-loading']}>Загрузка...</div>;
  }

  return (
    <div className={styles['tester-home']}>
      <div className={styles['tester-header']}>
        <h1>🧪 Testing Dashboard</h1>
        <p>Полный контроль и тестирование системы</p>
      </div>

      <div className={styles['stats-grid']}>
        <div className="stat-card users">
          <div className={styles['stat-icon']}>
            <BsPeople />
          </div>
          <div className={styles['stat-info']}>
            <h3>Пользователи</h3>
            <p className={styles['stat-value']}>{stats.users}</p>
          </div>
        </div>

        <div className="stat-card groups">
          <div className={styles['stat-icon']}>
            <BsCollection />
          </div>
          <div className={styles['stat-info']}>
            <h3>Группы</h3>
            <p className={styles['stat-value']}>{stats.groups}</p>
          </div>
        </div>

        <div className="stat-card tests">
          <div className={styles['stat-icon']}>
            <BsFileText />
          </div>
          <div className={styles['stat-info']}>
            <h3>Тесты</h3>
            <p className={styles['stat-value']}>{stats.tests}</p>
          </div>
        </div>

        <div className="stat-card bugs">
          <div className={styles['stat-icon']}>
            <BsBug />
          </div>
          <div className={styles['stat-info']}>
            <h3>Баги</h3>
            <p className={styles['stat-value']}>{stats.bugs}</p>
          </div>
        </div>
      </div>

      <div className={styles['quick-actions']}>
        <h2>Быстрые действия</h2>
        <div className={styles['actions-grid']}>
          <button 
            className="action-btn stress"
            onClick={() => runStressTest('users')}
          >
            <BsPlay />
            <span>Стресс-тест пользователей</span>
          </button>

          <button 
            className="action-btn stress"
            onClick={() => runStressTest('chat')}
          >
            <BsPlay />
            <span>Стресс-тест чата</span>
          </button>

          <button 
            className="action-btn generate"
            onClick={generateTestData}
          >
            <BsArrowRepeat />
            <span>Создать тестовые данные</span>
          </button>

          <button 
            className="action-btn danger"
            onClick={clearTestData}
          >
            <BsTrash />
            <span>Удалить тестовые данные</span>
          </button>
        </div>
      </div>

      <div className={styles['testing-tips']}>
        <h3>💡 Инструменты тестирования</h3>
        <ul>
          <li><strong>Users Testing:</strong> Просмотр и тестирование пользователей</li>
          <li><strong>Groups Testing:</strong> Тестирование функционала групп</li>
          <li><strong>Tests Testing:</strong> Проверка работы тестов и заданий</li>
          <li><strong>Chat Testing:</strong> Стресс-тесты чата и WebSocket</li>
          <li><strong>System Logs:</strong> Просмотр логов системы в реальном времени</li>
          <li><strong>Bug Reports:</strong> Создание и отслеживание багов</li>
          <li><strong>Performance:</strong> Мониторинг производительности API</li>
        </ul>
      </div>
    </div>
  );
}

export default TesterHome;
