import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../utils/api';
import styles from './Leaderboard.module.css';

const Leaderboard = () => {
  const [topStudents, setTopStudents] = useState([]);
  const [topGroups, setTopGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students'); // 'students' или 'groups'

  useEffect(() => {
    loadLeaderboards();
  }, []);

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
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `${position}.`;
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка рейтингов...</div>;
  }

  return (
    <div className={styles.leaderboard-container}>
      <h2>🏆 Рейтинги и Топы</h2>

      <div className={styles.tabs}>
        <button 
          className={`tab ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          👨‍🎓 Топ Учеников
        </button>
        <button 
          className={`tab ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          👥 Топ Групп
        </button>
      </div>

      {activeTab === 'students' && (
        <div className={styles.leaderboard-section}>
          <div className={styles.section-header}>
            <h3>Топ 20 учеников по баллам</h3>
          </div>
          
          {topStudents.length === 0 ? (
            <p className={styles.no-data}>Нет данных о студентах</p>
          ) : (
            <div className={styles.leaderboard-list}>
              {topStudents.map((student, index) => (
                <div 
                  key={student.id} 
                  className={`leaderboard-item ${index < 3 ? 'top-three' : ''}`}
                >
                  <div className={styles.rank}>
                    <span className={styles.rank-number}>{getMedalIcon(index + 1)}</span>
                  </div>
                  <div className={styles.student-avatar}>
                    {student.avatar_url ? (
                      <img src={`${BASE_URL}${student.avatar_url}`} alt="" className={styles.avatar-img} />
                    ) : (
                      <span className={styles.avatar-icon}>{(student.full_name || student.username)?.[0]}</span>
                    )}
                  </div>
                  <div className={styles.student-info}>
                    <div className={styles.student-name}>{student.full_name || student.username}</div>
                    <div className={styles.student-details}>
                      {student.group_name ? (
                        <span className={styles.group-badge}>{student.group_name}</span>
                      ) : (
                        <span className={styles.no-group}>Без группы</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.points}>
                    <span className={styles.points-value}>{student.points}</span>
                    <span className={styles.points-label}>баллов</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'groups' && (
        <div className={styles.leaderboard-section}>
          <div className={styles.section-header}>
            <h3>Топ 10 групп по суммарным баллам</h3>
          </div>
          
          {topGroups.length === 0 ? (
            <p className={styles.no-data}>Нет данных о группах</p>
          ) : (
            <div className={styles.leaderboard-list}>
              {topGroups.map((group, index) => (
                <div 
                  key={group.id} 
                  className={`leaderboard-item group-item ${index < 3 ? 'top-three' : ''}`}
                >
                  <div className={styles.rank}>
                    <span className={styles.rank-number}>{getMedalIcon(index + 1)}</span>
                  </div>
                  <div className={styles.group-info}>
                    <div className={styles.group-name}>{group.name}</div>
                    <div className={styles.group-stats}>
                      <span className={styles.stat}>
                        👨‍🎓 {group.student_count} {group.student_count === 1 ? 'студент' : 'студентов'}
                      </span>
                      <span className={styles.stat}>
                        📊 Средний балл: {group.average_points}
                      </span>
                    </div>
                  </div>
                  <div className={styles.points}>
                    <span className={styles.points-value}>{group.total_points}</span>
                    <span className={styles.points-label}>всего баллов</span>
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
