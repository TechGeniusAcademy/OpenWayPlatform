import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { BASE_URL } from '../../utils/api';
import styles from './StudentProfile.module.css';
import { 
  AiOutlineWallet, 
  AiOutlineHistory,
  AiOutlineTrophy,
  AiOutlineFire,
  AiOutlineRise,
  AiOutlineCalendar,
  AiOutlineCode,
  AiOutlineCheckCircle,
  AiOutlineStar,
  AiOutlineThunderbolt,
  AiOutlineLineChart,
  AiOutlineClockCircle,
  AiOutlineExclamationCircle,
  AiOutlineArrowUp,
  AiOutlineArrowDown,
  AiOutlineClose
} from 'react-icons/ai';
import { FaMedal, FaCrown, FaGem } from 'react-icons/fa';
import { SiJavascript } from 'react-icons/si';
import { MdOutlineViewModule } from 'react-icons/md';
import '../../styles/UsernameStyles.css';
import PointsHistory from '../../components/PointsHistory';

function StudentProfile() {
  const { user, updateUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [userExperience, setUserExperience] = useState(0);
  const [appliedFrame, setAppliedFrame] = useState(null);
  const [appliedBanner, setAppliedBanner] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [userLevel, setUserLevel] = useState(null);
  const [nextLevel, setNextLevel] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [allActivity, setAllActivity] = useState([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [userStats, setUserStats] = useState({
    completedTasks: 0,
    totalProjects: 0,
    streak: 0,
    rank: 0
  });

  useEffect(() => {
    fetchUserPoints();
    refreshUserData();
    fetchAppliedCosmetics();
    fetchUserStats();
    fetchUserLevel();
    fetchRecentActivity();
  }, []);

  useEffect(() => {
    fetchAppliedCosmetics();
  }, [user?.avatar_frame, user?.profile_banner]);

  const fetchUserPoints = async () => {
    try {
      const response = await api.get('/points/my');
      setUserPoints(response.data.totalPoints || 0);
    } catch (error) {
      console.error('Ошибка получения баллов:', error);
    }
  };

  const fetchUserLevel = async () => {
    try {
      if (!user?.id) return;
      const response = await api.get(`/user-levels/current/${user.id}`);
      setUserLevel(response.data.current_level);
      setNextLevel(response.data.next_level);
      setUserExperience(response.data.current_xp || 0);
    } catch (error) {
      console.error('Ошибка получения уровня:', error);
    }
  };

  const fetchUserStats = async () => {
    // В будущем это будет реальный API запрос
    // Пока используем моковые данные
    setUserStats({
      completedTasks: 42,
      totalProjects: 15,
      streak: 7,
      rank: 5
    });
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await api.get('/points/activity?limit=5');
      setRecentActivity(response.data.activities || []);
    } catch (error) {
      console.error('Ошибка получения активности:', error);
    }
  };

  const fetchAllActivity = async (page = 1) => {
    try {
      setLoadingActivity(true);
      const response = await api.get(`/points/activity?page=${page}&limit=10`);
      setAllActivity(response.data.activities || []);
      setActivityTotalPages(response.data.pagination?.totalPages || 1);
      setActivityPage(page);
    } catch (error) {
      console.error('Ошибка получения активности:', error);
    } finally {
      setLoadingActivity(false);
    }
  };

  const openActivityModal = () => {
    setShowActivityModal(true);
    fetchAllActivity(1);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'test':
        return <AiOutlineCheckCircle />;
      case 'homework_done':
        return <AiOutlineCode />;
      case 'homework_late':
        return <AiOutlineExclamationCircle />;
      case 'flexchan':
        return <MdOutlineViewModule />;
      case 'jsgame':
        return <SiJavascript />;
      case 'rank_up':
        return <AiOutlineArrowUp />;
      case 'rank_down':
        return <AiOutlineArrowDown />;
      default:
        return <AiOutlineCalendar />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'test':
        return '#4CAF50';
      case 'homework_done':
        return '#2196F3';
      case 'homework_late':
        return '#f44336';
      case 'flexchan':
        return '#9C27B0';
      case 'jsgame':
        return '#F7DF1E';
      case 'rank_up':
        return '#4CAF50';
      case 'rank_down':
        return '#f44336';
      default:
        return '#667eea';
    }
  };

  const formatActivityDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    if (hours < 24) return `${hours} ч. назад`;
    if (days < 7) return `${days} дн. назад`;
    
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const refreshUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.user) {
        updateUser(response.data.user);
      }
    } catch (error) {
      console.error('Ошибка обновления данных пользователя:', error);
    }
  };

  const fetchAppliedCosmetics = async () => {
    try {
      const response = await api.get('/shop/items');
      const items = response.data.items;
      
      if (user?.avatar_frame && user.avatar_frame !== 'none') {
        const frame = items.find(item => item.item_key === user.avatar_frame);
        setAppliedFrame(frame);
      } else {
        setAppliedFrame(null);
      }
      
      if (user?.profile_banner && user.profile_banner !== 'default') {
        const banner = items.find(item => item.item_key === user.profile_banner);
        setAppliedBanner(banner);
      } else {
        setAppliedBanner(null);
      }
    } catch (error) {
      console.error('Ошибка загрузки косметики:', error);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Проверка типа файла
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Неверный формат файла. Разрешены только изображения (JPEG, PNG, GIF, WebP)');
        e.target.value = '';
        return;
      }

      // Проверка размера файла (5MB = 5 * 1024 * 1024 байт)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('Размер файла слишком большой. Максимальный размер: 5 МБ');
        e.target.value = ''; // Сброс input
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('avatar', selectedFile);

      const response = await api.post(
        '/users/me/avatar',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Обновляем данные пользователя в контексте
      const updatedUser = { ...user, avatar_url: response.data.avatar_url };
      updateUser(updatedUser);
      
      setPreview(null);
      setSelectedFile(null);
      alert('Аватар успешно обновлен!');
    } catch (error) {
      console.error('Ошибка загрузки аватара:', error);
      alert(error.response?.data?.error || 'Ошибка загрузки аватара');
    } finally {
      setUploading(false);
    }
  };

  const achievements = [
    { icon: <FaCrown />, title: 'Первый проект', description: 'Создал первый проект', color: '#ffd700', earned: true },
    { icon: <FaMedal />, title: 'Мастер кода', description: 'Написал 1000 строк кода', color: '#c0c0c0', earned: true },
    { icon: <FaGem />, title: 'Неделя подряд', description: 'Учился 7 дней подряд', color: '#00bcd4', earned: true },
    { icon: <AiOutlineStar />, title: 'Звезда группы', description: 'Стал первым в группе', color: '#ff6b6b', earned: false },
    { icon: <AiOutlineTrophy />, title: 'Покоритель вершин', description: 'Завершил 50 заданий', color: '#4caf50', earned: false },
    { icon: <AiOutlineThunderbolt />, title: 'Скоростник', description: 'Выполнил задание за 5 минут', color: '#ffeb3b', earned: false },
  ];

  return (
    <div className={styles['student-page']}>
      <div className={styles['page-header']}>
        <h1>Мой профиль</h1>
        <div className={styles['header-actions']}>
          <button 
            className={styles['history-btn']}
            onClick={() => setShowHistory(true)}
            title="История транзакций"
          >
            <AiOutlineHistory />
            <span>История баллов</span>
          </button>
          <div className={styles['user-points']}>
            <span className={styles['points-icon']}><AiOutlineWallet /></span>
            <span className={styles['dashboard-points-value']}>{userPoints}</span>
            <span className={styles['points-label']}>баллов</span>
          </div>
        </div>
      </div>

      <div className={styles['profile-card']}>
        <div className={styles['profile-avatar-section']} style={{
          backgroundImage: appliedBanner?.image_url 
            ? `url(${BASE_URL}${appliedBanner.image_url})`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}>
          <div className={styles['avatar-wrapper']}>
            {preview || user?.avatar_url ? (
              <img 
                src={preview || `${BASE_URL}${user.avatar_url}`} 
                alt={user.username}
                className={styles['profile-avatar']}
              />
            ) : (
              <div className={styles['profile-avatar-placeholder']}>
                {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            {appliedFrame?.image_url && (
              <img 
                src={`${BASE_URL}${appliedFrame.image_url}`}
                alt="Frame"
                className={styles['avatar-frame-overlay']}
              />
            )}
          </div>
          
          <div className={styles['avatar-upload']}>
            <label className={styles['avatar-upload-btn']}>
              {uploading ? 'Загрузка...' : 'Выбрать фото'}
              <input 
                type="file" 
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
            {preview && (
              <button 
                className={styles['avatar-upload-confirm']} 
                onClick={handleAvatarUpload}
                disabled={uploading}
              >
                Сохранить
              </button>
            )}
          </div>
        </div>

        <div className={styles['profile-info-grid']}>
          <div className={styles['info-row']}>
            <span className={styles['info-label']}>Имя пользователя:</span>
            <span className={`${styles['info-value']} styled-username ${user?.username_style || 'username-none'}`}>
              {user?.username}
            </span>
          </div>
          <div className={styles['info-row']}>
            <span className={styles['info-label']}>Email:</span>
            <span className={styles['info-value']}>{user?.email}</span>
          </div>
          <div className={styles['info-row']}>
            <span className={styles['info-label']}>ФИО:</span>
            <span className={styles['info-value']}>{user?.full_name || 'Не указано'}</span>
          </div>
          <div className={styles['info-row']}>
            <span className={styles['info-label']}>Роль:</span>
            <span className={styles['info-value']}>Ученик</span>
          </div>
          <div className={styles['info-row']}>
            <span className={styles['info-label']}>Дата регистрации:</span>
            <span className={styles['info-value']}>
              {new Date(user?.created_at).toLocaleDateString('ru-RU')}
            </span>
          </div>
        </div>
      </div>

      {/* Уровень и опыт */}
      <div className={styles['level-section']}>
        <h2 className={styles['section-title']}>
          <AiOutlineStar /> Уровень и опыт
        </h2>
        <div className={styles['level-card']}>
          <div className={styles['level-info']}>
            {userLevel?.image_url ? (
              <img 
                src={userLevel.image_url.startsWith('http') ? userLevel.image_url : `${BASE_URL}${userLevel.image_url}`}
                alt={`Уровень ${userLevel.level_number}`}
                className={styles['level-image']}
              />
            ) : (
              <div className={styles['level-number']}>
                <span className={styles['level-label']}>Уровень</span>
                <span className={styles['level-value']}>{userLevel?.level_number || 1}</span>
              </div>
            )}
            {userLevel?.rank_name && (
              <div className={styles['rank-name']}>{userLevel.rank_name}</div>
            )}
          </div>
          
          <div className={styles['xp-section']}>
            <div className={styles['xp-header']}>
              <span className={styles['xp-current']}>{userExperience.toLocaleString()} XP</span>
              {nextLevel && (
                <span className={styles['xp-next']}>/ {nextLevel.experience_required.toLocaleString()} XP</span>
              )}
            </div>
            
            {nextLevel && (
              <>
                <div className={styles['xp-bar']}>
                  <div 
                    className={styles['xp-fill']}
                    style={{
                      width: `${Math.min(100, (userExperience / nextLevel.experience_required) * 100)}%`
                    }}
                  />
                </div>
                <div className={styles['xp-remaining']}>
                  До следующего уровня: {(nextLevel.experience_required - userExperience).toLocaleString()} XP
                </div>
              </>
            )}
            
            {!nextLevel && userLevel && (
              <div className={styles['max-level']}>Максимальный уровень достигнут! 🎉</div>
            )}
          </div>
        </div>
      </div>

      {/* Статистика профиля */}
      <div className={styles['stats-section']}>
        <h2 className={styles['section-title']}>
          <AiOutlineLineChart /> Моя статистика
        </h2>
        <div className={styles['stats-grid']}>
          <div className={styles['stat-card']}>
            <div className={styles['stat-icon']} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <AiOutlineCheckCircle />
            </div>
            <div className={styles['stat-content']}>
              <div className={styles['stat-value']}>{userStats.completedTasks}</div>
              <div className={styles['stat-label']}>Выполнено заданий</div>
            </div>
          </div>

          <div className={styles['stat-card']}>
            <div className={styles['stat-icon']} style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
              <AiOutlineCode />
            </div>
            <div className={styles['stat-content']}>
              <div className={styles['stat-value']}>{userStats.totalProjects}</div>
              <div className={styles['stat-label']}>Создано проектов</div>
            </div>
          </div>

          <div className={styles['stat-card']}>
            <div className={styles['stat-icon']} style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
              <AiOutlineFire />
            </div>
            <div className={styles['stat-content']}>
              <div className={styles['stat-value']}>{userStats.streak}</div>
              <div className={styles['stat-label']}>Дней подряд</div>
            </div>
          </div>

          <div className={styles['stat-card']}>
            <div className={styles['stat-icon']} style={{ background: 'linear-gradient(135deg, #ffd89b 0%, #19547b 100%)' }}>
              <AiOutlineRise />
            </div>
            <div className={styles['stat-content']}>
              <div className={styles['stat-value']}>#{userStats.rank}</div>
              <div className={styles['stat-label']}>Место в рейтинге</div>
            </div>
          </div>
        </div>
      </div>

      {/* Достижения */}
      <div className={styles['achievements-section']}>
        <h2 className={styles['section-title']}>
          <AiOutlineTrophy /> Достижения
        </h2>
        <div className={styles['achievements-grid']}>
          {achievements.map((achievement, index) => (
            <div 
              key={index} 
              className={`${styles['achievement-card']} ${achievement.earned ? styles['earned'] : styles['locked']}`}
            >
              <div 
                className={styles['achievement-icon']} 
                style={{ color: achievement.earned ? achievement.color : '#ccc' }}
              >
                {achievement.icon}
              </div>
              <div className={styles['achievement-content']}>
                <h3 className={styles['achievement-title']}>{achievement.title}</h3>
                <p className={styles['achievement-description']}>{achievement.description}</p>
              </div>
              {achievement.earned && (
                <div className={styles['achievement-badge']}>✓</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Последняя активность */}
      <div className={styles['activity-section']}>
        <h2 className={styles['section-title']}>
          <AiOutlineCalendar /> Последняя активность
        </h2>
        <div className={styles['activity-timeline']}>
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className={styles['activity-item']}>
                <div className={styles['activity-icon-wrapper']}>
                  <div 
                    className={styles['activity-type-icon']}
                    style={{ background: getActivityColor(activity.type) }}
                  >
                    {getActivityIcon(activity.type)}
                  </div>
                </div>
                <div className={styles['activity-details']}>
                  <div className={styles['activity-title']}>{activity.message}</div>
                  <div className={styles['activity-meta']}>
                    <span className={styles['activity-date']}>
                      <AiOutlineClockCircle /> {formatActivityDate(activity.created_at)}
                    </span>
                    {(activity.points > 0 || activity.experience > 0) && (
                      <div className={styles['activity-rewards']}>
                        {activity.points > 0 && (
                          <span className={styles['activity-points']}>+{activity.points} баллов</span>
                        )}
                        {activity.experience > 0 && (
                          <span className={styles['activity-xp']}>+{activity.experience} XP</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className={styles['no-activity']}>
              <AiOutlineCalendar />
              <p>Пока нет активности</p>
            </div>
          )}
        </div>
        
        <button 
          className={styles['view-all-activity-btn']}
          onClick={openActivityModal}
        >
          Посмотреть всю активность
        </button>
      </div>

      {/* Модальное окно всей активности */}
      {showActivityModal && (
        <div className={styles['activity-modal-overlay']} onClick={() => setShowActivityModal(false)}>
          <div className={styles['activity-modal']} onClick={(e) => e.stopPropagation()}>
            <div className={styles['activity-modal-header']}>
              <h2>
                <AiOutlineHistory /> История активности
              </h2>
              <button 
                className={styles['modal-close-btn']}
                onClick={() => setShowActivityModal(false)}
              >
                <AiOutlineClose />
              </button>
            </div>
            
            <div className={styles['activity-modal-content']}>
              {loadingActivity ? (
                <div className={styles['activity-loading']}>
                  <div className={styles['activity-spinner']}></div>
                  <p>Загрузка...</p>
                </div>
              ) : allActivity.length > 0 ? (
                <>
                  <div className={styles['activity-list']}>
                    {allActivity.map((activity, index) => (
                      <div key={index} className={styles['activity-modal-item']}>
                        <div 
                          className={styles['activity-modal-icon']}
                          style={{ background: getActivityColor(activity.type) }}
                        >
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className={styles['activity-modal-info']}>
                          <div className={styles['activity-modal-message']}>{activity.message}</div>
                          <div className={styles['activity-modal-meta']}>
                            <span className={styles['activity-modal-date']}>
                              {formatActivityDate(activity.created_at)}
                            </span>
                            {(activity.points > 0 || activity.experience > 0) && (
                              <div className={styles['activity-modal-rewards']}>
                                {activity.points > 0 && (
                                  <span className={styles['reward-badge-points']}>+{activity.points}</span>
                                )}
                                {activity.experience > 0 && (
                                  <span className={styles['reward-badge-xp']}>+{activity.experience} XP</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Пагинация */}
                  {activityTotalPages > 1 && (
                    <div className={styles['activity-pagination']}>
                      <button
                        className={styles['pagination-btn']}
                        onClick={() => fetchAllActivity(activityPage - 1)}
                        disabled={activityPage <= 1}
                      >
                        ← Назад
                      </button>
                      <span className={styles['pagination-info']}>
                        Страница {activityPage} из {activityTotalPages}
                      </span>
                      <button
                        className={styles['pagination-btn']}
                        onClick={() => fetchAllActivity(activityPage + 1)}
                        disabled={activityPage >= activityTotalPages}
                      >
                        Вперед →
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles['no-activity-modal']}>
                  <AiOutlineCalendar />
                  <p>История активности пуста</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <PointsHistory 
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </div>
  );
}

export default StudentProfile;
