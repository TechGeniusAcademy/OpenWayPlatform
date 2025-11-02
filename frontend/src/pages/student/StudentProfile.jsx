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
  AiOutlineLineChart
} from 'react-icons/ai';
import { FaMedal, FaCrown, FaGem } from 'react-icons/fa';
import '../../styles/UsernameStyles.css';
import PointsHistory from '../../components/PointsHistory';

function StudentProfile() {
  const { user, updateUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [appliedFrame, setAppliedFrame] = useState(null);
  const [appliedBanner, setAppliedBanner] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
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

  const recentActivity = [
    { type: 'project', title: 'Создал проект "ToDo App"', date: '2 часа назад', icon: <AiOutlineCode /> },
    { type: 'achievement', title: 'Получил достижение "Мастер кода"', date: '5 часов назад', icon: <AiOutlineTrophy /> },
    { type: 'points', title: 'Заработал 50 баллов', date: '1 день назад', icon: <AiOutlineWallet /> },
    { type: 'task', title: 'Выполнил задание по JavaScript', date: '2 дня назад', icon: <AiOutlineCheckCircle /> },
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
          {recentActivity.map((activity, index) => (
            <div key={index} className={styles['activity-item']}>
              <div className={styles['activity-icon-wrapper']}>
                <div className={styles['activity-type-icon']}>{activity.icon}</div>
              </div>
              <div className={styles['activity-details']}>
                <div className={styles['activity-title']}>{activity.title}</div>
                <div className={styles['activity-date']}>{activity.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <PointsHistory 
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </div>
  );
}

export default StudentProfile;
