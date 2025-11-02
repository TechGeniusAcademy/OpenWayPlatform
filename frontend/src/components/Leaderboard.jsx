import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../utils/api';
import { 
  FaTrophy, FaMedal, FaUsers, FaUser, FaStar, FaChartLine, 
  FaCrown, FaAward, FaFire, FaBolt, FaGraduationCap, FaSearch,
  FaFilter, FaCalendarAlt, FaArrowUp, FaArrowDown
} from 'react-icons/fa';
import { GiPodiumWinner, GiLaurelCrown, GiRibbonMedal } from 'react-icons/gi';
import { IoTrendingUp, IoTrendingDown } from 'react-icons/io5';
import styles from './Leaderboard.module.css';

const Leaderboard = () => {
  const [topStudents, setTopStudents] = useState([]);
  const [topGroups, setTopGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students'); // 'students' или 'groups'
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'week', 'month'
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadLeaderboards();
  }, [timeFilter]);

  const loadLeaderboards = async () => {
    try {
      setLoading(true);
      const [studentsRes, groupsRes] = await Promise.all([
        api.get('/points/top-students?limit=20'),
        api.get('/points/top-groups?limit=10')
      ]);
      
      setTopStudents(studentsRes.data.students);
      setTopGroups(groupsRes.data.groups);
    } catch (error) {
      console.error('Ошибка загрузки рейтингов:', error);
      alert('Не удалось загрузить рейтинги');
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (position) => {
    if (position === 1) return <GiLaurelCrown style={{ color: '#FFD700', fontSize: '32px' }} />;
    if (position === 2) return <GiRibbonMedal style={{ color: '#C0C0C0', fontSize: '28px' }} />;
    if (position === 3) return <FaMedal style={{ color: '#CD7F32', fontSize: '24px' }} />;
    return <span className={styles['rank-number']}>{position}</span>;
  };

  // Фильтрация студентов
  const filteredStudents = topStudents.filter(student => {
    const name = (student.full_name || student.username || '').toLowerCase();
    const group = (student.group_name || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || group.includes(query);
  });

  // Фильтрация групп
  const filteredGroups = topGroups.filter(group => {
    const name = (group.name || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className={styles.loading}>
        <FaTrophy size={48} style={{ opacity: 0.5 }} />
        <p>Загрузка рейтингов...</p>
      </div>
    );
  }

  return (
    <div className={styles['leaderboard-container']}>
      {/* Шапка с анимацией */}
      <div className={styles['page-header']}>
        <div className={styles['header-content']}>
          <FaTrophy className={styles['header-icon']} />
          <div>
            <h2>Рейтинги и Топы</h2>
            <p>Лучшие студенты и группы платформы</p>
          </div>
        </div>
        <div className={styles['header-stats']}>
          <div className={styles['stat-card']}>
            <FaUsers />
            <div>
              <span className={styles['stat-value']}>{topStudents.length}</span>
              <span className={styles['stat-label']}>Участников</span>
            </div>
          </div>
          <div className={styles['stat-card']}>
            <FaFire />
            <div>
              <span className={styles['stat-value']}>{topGroups.length}</span>
              <span className={styles['stat-label']}>Групп</span>
            </div>
          </div>
        </div>
      </div>

      {/* Поиск и фильтры */}
      <div className={styles['controls-bar']}>
        <div className={styles['search-box']}>
          <FaSearch />
          <input
            type="text"
            placeholder="Поиск по имени или группе..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button 
          className={styles['filter-btn']}
          onClick={() => setShowFilters(!showFilters)}
        >
          <FaFilter /> Фильтры
        </button>
      </div>

      {/* Фильтры */}
      {showFilters && (
        <div className={styles['filters-panel']}>
          <div className={styles['filter-group']}>
            <FaCalendarAlt />
            <span>Период:</span>
            <div className={styles['filter-buttons']}>
              <button
                className={timeFilter === 'all' ? styles['active'] : ''}
                onClick={() => setTimeFilter('all')}
              >
                Все время
              </button>
              <button
                className={timeFilter === 'month' ? styles['active'] : ''}
                onClick={() => setTimeFilter('month')}
              >
                Месяц
              </button>
              <button
                className={timeFilter === 'week' ? styles['active'] : ''}
                onClick={() => setTimeFilter('week')}
              >
                Неделя
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Табы */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'students' ? styles['active'] : ''}`}
          onClick={() => setActiveTab('students')}
        >
          <FaGraduationCap /> Топ Учеников
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'groups' ? styles['active'] : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          <FaUsers /> Топ Групп
        </button>
      </div>

      {activeTab === 'students' && (
        <div className={styles['leaderboard-section']}>
          {/* Топ 3 подиум */}
          {filteredStudents.length >= 3 && (
            <div className={styles['podium-container']}>
              <div className={styles['podium-wrapper']}>
                {/* 2 место */}
                <div className={`${styles['podium-place']} ${styles['second']}`}>
                  <div className={styles['podium-student']}>
                    <div className={styles['podium-avatar']}>
                      {filteredStudents[1].avatar_url ? (
                        <img src={`${BASE_URL}${filteredStudents[1].avatar_url}`} alt="" />
                      ) : (
                        <FaUser />
                      )}
                      <div className={styles['podium-medal']}>
                        <GiRibbonMedal style={{ color: '#C0C0C0' }} />
                      </div>
                    </div>
                    <div className={styles['podium-name']}>
                      {filteredStudents[1].full_name || filteredStudents[1].username}
                    </div>
                    <div className={styles['podium-points']}>
                      <FaStar /> {filteredStudents[1].points}
                    </div>
                  </div>
                  <div className={styles['podium-base']}>
                    <span>2</span>
                  </div>
                </div>

                {/* 1 место */}
                <div className={`${styles['podium-place']} ${styles['first']}`}>
                  <div className={styles['podium-student']}>
                    <div className={styles['podium-avatar']}>
                      {filteredStudents[0].avatar_url ? (
                        <img src={`${BASE_URL}${filteredStudents[0].avatar_url}`} alt="" />
                      ) : (
                        <FaUser />
                      )}
                      <div className={styles['podium-medal']}>
                        <FaCrown style={{ color: '#FFD700' }} />
                      </div>
                      <div className={styles['winner-glow']}></div>
                    </div>
                    <div className={styles['podium-name']}>
                      {filteredStudents[0].full_name || filteredStudents[0].username}
                    </div>
                    <div className={styles['podium-points']}>
                      <FaStar /> {filteredStudents[0].points}
                    </div>
                  </div>
                  <div className={styles['podium-base']}>
                    <span>1</span>
                  </div>
                </div>

                {/* 3 место */}
                <div className={`${styles['podium-place']} ${styles['third']}`}>
                  <div className={styles['podium-student']}>
                    <div className={styles['podium-avatar']}>
                      {filteredStudents[2].avatar_url ? (
                        <img src={`${BASE_URL}${filteredStudents[2].avatar_url}`} alt="" />
                      ) : (
                        <FaUser />
                      )}
                      <div className={styles['podium-medal']}>
                        <FaMedal style={{ color: '#CD7F32' }} />
                      </div>
                    </div>
                    <div className={styles['podium-name']}>
                      {filteredStudents[2].full_name || filteredStudents[2].username}
                    </div>
                    <div className={styles['podium-points']}>
                      <FaStar /> {filteredStudents[2].points}
                    </div>
                  </div>
                  <div className={styles['podium-base']}>
                    <span>3</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles['section-header']}>
            <h3><FaChartLine /> Полный рейтинг ({filteredStudents.length})</h3>
          </div>
          
          {filteredStudents.length === 0 ? (
            <div className={styles['no-data']}>
              <FaSearch size={48} style={{ opacity: 0.3 }} />
              <p>Студенты не найдены</p>
            </div>
          ) : (
            <div className={styles['leaderboard-list']}>
              {filteredStudents.map((student, index) => (
                <div 
                  key={student.id} 
                  className={`${styles['leaderboard-item']} ${index < 3 ? styles['top-three'] : ''}`}
                >
                  <div className={styles.rank}>
                    {getMedalIcon(index + 1)}
                  </div>
                  <div className={styles['student-avatar']}>
                    {student.avatar_url ? (
                      <img src={`${BASE_URL}${student.avatar_url}`} alt="" className={styles['avatar-img']} />
                    ) : (
                      <div className={styles['avatar-placeholder']}>
                        {(student.full_name || student.username)?.[0]}
                      </div>
                    )}
                  </div>
                  <div className={styles['student-info']}>
                    <div className={styles['student-name']}>
                      {student.full_name || student.username}
                      {index < 10 && <FaBolt className={styles['hot-icon']} />}
                    </div>
                    <div className={styles['student-details']}>
                      {student.group_name ? (
                        <span className={styles['group-badge']}>
                          <FaUsers /> {student.group_name}
                        </span>
                      ) : (
                        <span className={styles['no-group']}>Без группы</span>
                      )}
                    </div>
                  </div>
                  <div className={styles['progress-info']}>
                    <div className={styles['points-with-trend']}>
                      <span className={styles['points-value']}>{student.points}</span>
                      {index < filteredStudents.length - 1 && (
                        <span className={styles['points-diff']}>
                          <FaArrowUp style={{ color: '#10b981' }} />
                          {student.points - (filteredStudents[index + 1]?.points || 0)}
                        </span>
                      )}
                    </div>
                    <span className={styles['points-label']}>баллов</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'groups' && (
        <div className={styles['leaderboard-section']}>
          <div className={styles['section-header']}>
            <h3><FaUsers /> Топ групп по суммарным баллам ({filteredGroups.length})</h3>
          </div>
          
          {filteredGroups.length === 0 ? (
            <div className={styles['no-data']}>
              <FaSearch size={48} style={{ opacity: 0.3 }} />
              <p>Группы не найдены</p>
            </div>
          ) : (
            <div className={styles['leaderboard-list']}>
              {filteredGroups.map((group, index) => (
                <div 
                  key={group.id} 
                  className={`${styles['leaderboard-item']} ${styles['group-item']} ${index < 3 ? styles['top-three'] : ''}`}
                >
                  <div className={styles.rank}>
                    {getMedalIcon(index + 1)}
                  </div>
                  <div className={styles['group-icon']}>
                    <FaUsers />
                  </div>
                  <div className={styles['group-info']}>
                    <div className={styles['group-name']}>
                      {group.name}
                      {index === 0 && <FaCrown className={styles['crown-icon']} />}
                    </div>
                    <div className={styles['group-stats']}>
                      <span className={styles.stat}>
                        <FaGraduationCap /> {group.student_count} {group.student_count === 1 ? 'студент' : 'студентов'}
                      </span>
                      <span className={styles.stat}>
                        <FaChartLine /> Средний: {group.average_points}
                      </span>
                    </div>
                  </div>
                  <div className={styles['points-info']}>
                    <div className={styles['points-with-icon']}>
                      <FaAward className={styles['award-icon']} />
                      <span className={styles['points-value']}>{group.total_points}</span>
                    </div>
                    <span className={styles['points-label']}>всего баллов</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
