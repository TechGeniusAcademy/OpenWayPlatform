import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './TypingManagement.css';

const TypingManagement = () => {
  const [statistics, setStatistics] = useState(null);
  const [userStats, setUserStats] = useState([]);
  const [groupStats, setGroupStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userHistory, setUserHistory] = useState([]);
  const [filters, setFilters] = useState({
    period: 'week', // week, month, all
    sortBy: 'wpm', // wpm, accuracy, testsCount
    order: 'desc'
  });

  useEffect(() => {
    fetchAllStatistics();
  }, [filters]);

  const fetchAllStatistics = async () => {
    try {
      setLoading(true);
      const [statsResponse, usersResponse, groupsResponse] = await Promise.all([
        api.get('/typing/admin/statistics'),
        api.get(`/typing/admin/users?period=${filters.period}&sortBy=${filters.sortBy}&order=${filters.order}`),
        api.get('/typing/admin/groups')
      ]);
      
      setStatistics(statsResponse.data);
      setUserStats(usersResponse.data);
      setGroupStats(groupsResponse.data);
    } catch (err) {
      setError('Ошибка загрузки статистики');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserHistory = async (userId) => {
    try {
      const response = await api.get(`/typing/admin/user/${userId}/history`);
      setUserHistory(response.data);
      setSelectedUser(userId);
    } catch (err) {
      console.error('Ошибка загрузки истории пользователя:', err);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProficiencyLevel = (wpm) => {
    if (wpm >= 60) return { level: 'Эксперт', color: '#4CAF50' };
    if (wpm >= 40) return { level: 'Продвинутый', color: '#2196F3' };
    if (wpm >= 25) return { level: 'Средний', color: '#FF9800' };
    return { level: 'Начинающий', color: '#F44336' };
  };

  if (loading) {
    return (
      <div className="typing-management">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Загрузка статистики...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="typing-management">
        <div className="error-message">
          <h3>Ошибка</h3>
          <p>{error}</p>
          <button onClick={fetchAllStatistics}>Повторить</button>
        </div>
      </div>
    );
  }

  return (
    <div className="typing-management">
      <div className="typing-header">
        <h2>⌨️ Управление клавиатурным тренажером</h2>
        <div className="filters">
          <select 
            value={filters.period} 
            onChange={(e) => setFilters({...filters, period: e.target.value})}
          >
            <option value="week">За неделю</option>
            <option value="month">За месяц</option>
            <option value="all">За все время</option>
          </select>
          <select 
            value={filters.sortBy} 
            onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
          >
            <option value="wpm">По скорости</option>
            <option value="accuracy">По точности</option>
            <option value="testsCount">По количеству тестов</option>
          </select>
          <select 
            value={filters.order} 
            onChange={(e) => setFilters({...filters, order: e.target.value})}
          >
            <option value="desc">По убыванию</option>
            <option value="asc">По возрастанию</option>
          </select>
        </div>
      </div>

      {/* Общая статистика */}
      {statistics && (
        <div className="overview-stats">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>{statistics.totalUsers}</h3>
              <p>Активных пользователей</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>{statistics.totalTests}</h3>
              <p>Всего тестов пройдено</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div className="stat-content">
              <h3>{statistics.averageWpm}</h3>
              <p>Средняя скорость (зн/мин)</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <h3>{statistics.averageAccuracy}%</h3>
              <p>Средняя точность</p>
            </div>
          </div>
        </div>
      )}

      <div className="stats-container">
        {/* Статистика по пользователям */}
        <div className="users-stats">
          <h3>Статистика пользователей</h3>
          <div className="users-table">
            <div className="table-header">
              <span>Пользователь</span>
              <span>Скорость</span>
              <span>Точность</span>
              <span>Тестов</span>
              <span>Уровень</span>
              <span>Действия</span>
            </div>
            {userStats.map(user => {
              const proficiency = getProficiencyLevel(user.averageWpm);
              return (
                <div key={user.id} className="table-row">
                  <span className="user-info">
                    <strong>{user.fullName || user.username || 'Пользователь'}</strong>
                    <small>{user.email || ''}</small>
                  </span>
                  <span className="wpm">{user.averageWpm} зн/мин</span>
                  <span className="accuracy">{user.averageAccuracy}%</span>
                  <span className="tests-count">{user.testsCount}</span>
                  <span 
                    className="proficiency-level"
                    style={{ color: proficiency.color }}
                  >
                    {proficiency.level}
                  </span>
                  <span className="actions">
                    <button 
                      onClick={() => fetchUserHistory(user.id)}
                      className="view-history-btn"
                    >
                      История
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Статистика по группам */}
        <div className="groups-stats">
          <h3>Статистика по группам</h3>
          <div className="groups-grid">
            {groupStats.map(group => (
              <div key={group.id} className="group-card">
                <h4>{group.name}</h4>
                <div className="group-metrics">
                  <div className="metric">
                    <span className="metric-label">Участники:</span>
                    <span className="metric-value">{group.membersCount}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Средняя скорость:</span>
                    <span className="metric-value">{group.averageWpm} зн/мин</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Средняя точность:</span>
                    <span className="metric-value">{group.averageAccuracy}%</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Всего тестов:</span>
                    <span className="metric-value">{group.totalTests}</span>
                  </div>
                </div>
                <div className="group-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${Math.min(group.averageWpm / 60 * 100, 100)}%` }}
                    ></div>
                  </div>
                  <small>Прогресс к экспертному уровню (60 зн/мин)</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Модальное окно с историей пользователя */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>История тестирования</h3>
              <button 
                className="close-btn"
                onClick={() => setSelectedUser(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="history-chart">
                <h4>Прогресс скорости печати</h4>
                <div className="chart-container">
                  {userHistory.length > 0 ? (
                    <div className="simple-chart">
                      {userHistory.slice(-10).map((result, index) => (
                        <div key={index} className="chart-bar">
                          <div 
                            className="bar"
                            style={{ 
                              height: `${(result.wpm / 80) * 100}%`,
                              backgroundColor: result.accuracy >= 95 ? '#4CAF50' : result.accuracy >= 90 ? '#2196F3' : '#FF9800'
                            }}
                          ></div>
                          <span className="bar-label">{result.wpm}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>Нет данных для отображения</p>
                  )}
                </div>
              </div>
              <div className="history-table">
                <h4>Последние результаты</h4>
                <div className="table-header">
                  <span>Дата</span>
                  <span>Скорость</span>
                  <span>Точность</span>
                  <span>Время</span>
                  <span>Ошибки</span>
                </div>
                {userHistory.slice(0, 10).map((result, index) => (
                  <div key={index} className="table-row">
                    <span>{new Date(result.created_at).toLocaleDateString()}</span>
                    <span>{result.wpm} зн/мин</span>
                    <span>{parseFloat(result.accuracy).toFixed(2)}%</span>
                    <span>{formatDuration(result.time_seconds)}</span>
                    <span>{result.errors || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TypingManagement;