import React, { useState, useEffect } from 'react';
import { 
  FiUsers, FiActivity, FiTrendingUp, FiTarget, 
  FiEdit2, FiX, FiRefreshCw, FiBarChart2, FiClock 
} from 'react-icons/fi';
import api from '../utils/api';
import styles from './TypingManagement.module.css';

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
      <div className={styles['page-container']}>
        <div className={styles['loading-state']}>
          <FiRefreshCw className={styles['loading-icon']} />
          <p>Загрузка статистики...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles['page-container']}>
        <div className={styles['error-state']}>
          <h3>Ошибка загрузки</h3>
          <p>{error}</p>
          <button className={styles['btn-primary']} onClick={fetchAllStatistics}>
            <FiRefreshCw />
            <span>Повторить</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['page-container']}>
      <div className={styles['page-header']}>
        <div className={styles['header-content']}>
          <div className={styles['header-left']}>
            <div className={styles['header-icon']}>
              <FiEdit2 />
            </div>
            <div>
              <h1>Клавиатурный тренажёр</h1>
              <p>Статистика и мониторинг прогресса учеников</p>
            </div>
          </div>
          <div className={styles['header-filters']}>
            <select 
              className={styles['filter-select']}
              value={filters.period} 
              onChange={(e) => setFilters({...filters, period: e.target.value})}
            >
              <option value="week">За неделю</option>
              <option value="month">За месяц</option>
              <option value="all">За все время</option>
            </select>
            <select 
              className={styles['filter-select']}
              value={filters.sortBy} 
              onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
            >
              <option value="wpm">По скорости</option>
              <option value="accuracy">По точности</option>
              <option value="testsCount">По количеству тестов</option>
            </select>
            <select 
              className={styles['filter-select']}
              value={filters.order} 
              onChange={(e) => setFilters({...filters, order: e.target.value})}
            >
              <option value="desc">По убыванию</option>
              <option value="asc">По возрастанию</option>
            </select>
          </div>
        </div>
      </div>

      {/* Общая статистика */}
      {statistics && (
        <div className={styles['stats-grid']}>
          <div className={styles['stat-card']}>
            <div className={styles['stat-icon-wrapper']}>
              <FiUsers className={styles['stat-icon']} />
            </div>
            <div className={styles['stat-info']}>
              <div className={styles['stat-value']}>{statistics.totalUsers || 0}</div>
              <div className={styles['stat-label']}>Активных пользователей</div>
            </div>
          </div>
          <div className={styles['stat-card']}>
            <div className={styles['stat-icon-wrapper']}>
              <FiBarChart2 className={styles['stat-icon']} />
            </div>
            <div className={styles['stat-info']}>
              <div className={styles['stat-value']}>{statistics.totalTests || 0}</div>
              <div className={styles['stat-label']}>Всего тестов пройдено</div>
            </div>
          </div>
          <div className={styles['stat-card']}>
            <div className={styles['stat-icon-wrapper']}>
              <FiActivity className={styles['stat-icon']} />
            </div>
            <div className={styles['stat-info']}>
              <div className={styles['stat-value']}>{statistics.averageWpm ? parseFloat(statistics.averageWpm).toFixed(1) : '0.0'}</div>
              <div className={styles['stat-label']}>Средняя скорость (зн/мин)</div>
            </div>
          </div>
          <div className={styles['stat-card']}>
            <div className={styles['stat-icon-wrapper']}>
              <FiTarget className={styles['stat-icon']} />
            </div>
            <div className={styles['stat-info']}>
              <div className={styles['stat-value']}>{statistics.averageAccuracy ? parseFloat(statistics.averageAccuracy).toFixed(1) : '0.0'}%</div>
              <div className={styles['stat-label']}>Средняя точность</div>
            </div>
          </div>
        </div>
      )}

      <div className={styles['content-wrapper']}>
        {/* Статистика по пользователям */}
        <div className={styles['section-card']}>
          <div className={styles['section-header']}>
            <h3>Статистика пользователей</h3>
          </div>
          {userStats.length === 0 ? (
            <div className={styles['empty-state']}>
              <FiUsers className={styles['empty-icon']} />
              <p>Нет данных о пользователях</p>
            </div>
          ) : (
            <div className={styles['table-container']}>
              <table className={styles['users-table']}>
                <thead>
                  <tr>
                    <th>Пользователь</th>
                    <th>Скорость</th>
                    <th>Точность</th>
                    <th>Тестов</th>
                    <th>Уровень</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {userStats.map(user => {
                    const proficiency = getProficiencyLevel(user.averageWpm || 0);
                    return (
                      <tr key={user.id}>
                        <td>
                          <div className={styles['user-cell']}>
                            <strong>{user.fullName || user.username || 'Пользователь'}</strong>
                            {user.email && <small>{user.email}</small>}
                          </div>
                        </td>
                        <td>
                          <span className={styles['wpm-value']}>
                            {user.averageWpm ? parseFloat(user.averageWpm).toFixed(1) : '0.0'} зн/мин
                          </span>
                        </td>
                        <td>
                          <span className={styles['accuracy-value']}>
                            {user.averageAccuracy ? parseFloat(user.averageAccuracy).toFixed(1) : '0.0'}%
                          </span>
                        </td>
                        <td>{user.testsCount || 0}</td>
                        <td>
                          <span 
                            className={styles['level-badge']}
                            style={{ 
                              backgroundColor: proficiency.color + '20',
                              color: proficiency.color 
                            }}
                          >
                            {proficiency.level}
                          </span>
                        </td>
                        <td>
                          <button 
                            onClick={() => fetchUserHistory(user.id)}
                            className={styles['btn-view-history']}
                          >
                            <FiBarChart2 />
                            <span>История</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Статистика по группам */}
        <div className={styles['section-card']}>
          <div className={styles['section-header']}>
            <h3>Статистика по группам</h3>
          </div>
          {groupStats.length === 0 ? (
            <div className={styles['empty-state']}>
              <FiUsers className={styles['empty-icon']} />
              <p>Нет данных о группах</p>
            </div>
          ) : (
            <div className={styles['groups-grid']}>
              {groupStats.map(group => (
                <div key={group.id} className={styles['group-card']}>
                  <div className={styles['group-header']}>
                    <h4>{group.name}</h4>
                  </div>
                  <div className={styles['group-metrics']}>
                    <div className={styles['metric-item']}>
                      <span className={styles['metric-label']}>Участники</span>
                      <span className={styles['metric-value']}>{group.membersCount || 0}</span>
                    </div>
                    <div className={styles['metric-item']}>
                      <span className={styles['metric-label']}>Средняя скорость</span>
                      <span className={styles['metric-value']}>{group.averageWpm ? parseFloat(group.averageWpm).toFixed(1) : '0.0'} зн/мин</span>
                    </div>
                    <div className={styles['metric-item']}>
                      <span className={styles['metric-label']}>Средняя точность</span>
                      <span className={styles['metric-value']}>{group.averageAccuracy ? parseFloat(group.averageAccuracy).toFixed(1) : '0.0'}%</span>
                    </div>
                    <div className={styles['metric-item']}>
                      <span className={styles['metric-label']}>Всего тестов</span>
                      <span className={styles['metric-value']}>{group.totalTests || 0}</span>
                    </div>
                  </div>
                  <div className={styles['group-progress']}>
                    <div className={styles['progress-label']}>
                      <span>Прогресс к экспертному уровню</span>
                      <span>{Math.min(Math.round((group.averageWpm || 0) / 60 * 100), 100)}%</span>
                    </div>
                    <div className={styles['progress-bar']}>
                      <div 
                        className={styles['progress-fill']}
                        style={{ width: `${Math.min((group.averageWpm || 0) / 60 * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно с историей пользователя */}
      {selectedUser && (
        <div className={styles['modal-overlay']} onClick={() => setSelectedUser(null)}>
          <div className={styles['modal']} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>История тестирования</h2>
              <button 
                className={styles['close-btn']}
                onClick={() => setSelectedUser(null)}
              >
                <FiX />
              </button>
            </div>
            <div className={styles['modal-body']}>
              <div className={styles['chart-section']}>
                <h4>Прогресс скорости печати (последние 10 тестов)</h4>
                {userHistory.length > 0 ? (
                  <div className={styles['chart-container']}>
                    {userHistory.slice(-10).map((result, index) => (
                      <div key={index} className={styles['chart-bar-wrapper']}>
                        <div 
                          className={styles['chart-bar']}
                          style={{ 
                            height: `${Math.min((result.wpm || 0) / 100 * 100, 100)}%`,
                            backgroundColor: result.accuracy >= 95 ? '#10b981' : result.accuracy >= 90 ? '#3b82f6' : '#f59e0b'
                          }}
                        >
                          <span className={styles['bar-value']}>{result.wpm ? parseFloat(result.wpm).toFixed(0) : '0'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles['empty-state']}>
                    <FiBarChart2 className={styles['empty-icon']} />
                    <p>Нет данных для отображения</p>
                  </div>
                )}
              </div>
              <div className={styles['history-section']}>
                <h4>Последние результаты</h4>
                {userHistory.length > 0 ? (
                  <div className={styles['history-table-container']}>
                    <table className={styles['history-table']}>
                      <thead>
                        <tr>
                          <th>Дата</th>
                          <th>Скорость</th>
                          <th>Точность</th>
                          <th>Время</th>
                          <th>Ошибки</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userHistory.slice(0, 10).map((result, index) => (
                          <tr key={index}>
                            <td>{new Date(result.created_at).toLocaleDateString('ru-RU')}</td>
                            <td>{result.wpm ? parseFloat(result.wpm).toFixed(1) : '0.0'} зн/мин</td>
                            <td>{result.accuracy ? parseFloat(result.accuracy).toFixed(1) : '0.0'}%</td>
                            <td>
                              <span className={styles['time-cell']}>
                                <FiClock />
                                {formatDuration(result.time_seconds || 0)}
                              </span>
                            </td>
                            <td>{result.errors || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={styles['empty-state']}>
                    <p>Нет результатов</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TypingManagement;