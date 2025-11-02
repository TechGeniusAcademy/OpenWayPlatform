import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  AiOutlineWallet, 
  AiOutlineUsergroupAdd, 
  AiOutlineBook, 
  AiOutlineFileText, 
  AiOutlineBarChart, 
  AiOutlineStar,
  AiOutlineCode,
  AiOutlineMessage,
  AiOutlineShoppingCart,
  AiOutlineThunderbolt,
  AiOutlineCalendar,
  AiOutlineTrophy,
  AiOutlineFire,
  AiOutlineClockCircle,
  AiOutlineCheckCircle
} from 'react-icons/ai';
import { FaChess, FaGamepad, FaKeyboard } from 'react-icons/fa';
import styles from '../StudentDashboard.module.css';

function StudentHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const quickActions = [
    { icon: <AiOutlineCode />, label: 'Проекты', path: '/student/projects', color: '#667eea' },
    { icon: <AiOutlineMessage />, label: 'Чат', path: '/student/chat', color: '#764ba2' },
    { icon: <AiOutlineShoppingCart />, label: 'Магазин', path: '/student/shop', color: '#f093fb' },
    { icon: <FaGamepad />, label: 'Игры', path: '/student/games', color: '#4facfe' },
    { icon: <AiOutlineBook />, label: 'База знаний', path: '/student/knowledge', color: '#43e97b' },
    { icon: <FaKeyboard />, label: 'Тренажёр', path: '/student/typing', color: '#fa709a' },
  ];

  const recentActivity = [
    { icon: <AiOutlineCheckCircle />, text: 'Выполнено заданий', count: 5, color: '#43e97b' },
    { icon: <AiOutlineTrophy />, text: 'Получено наград', count: 3, color: '#feca57' },
    { icon: <AiOutlineFire />, text: 'Дней подряд', count: 7, color: '#ff6b6b' },
  ];

  const upcomingEvents = [
    { time: '10:00', title: 'Лекция по JavaScript', type: 'lecture' },
    { time: '14:30', title: 'Дедлайн проекта', type: 'deadline' },
    { time: '16:00', title: 'Тестирование', type: 'test' },
  ];

  return (
    <div className={styles['student-page']}>
      <div className={styles['dashboard-page-header']}>
        <div>
          <h1>Привет, {user?.full_name || user?.username}! 👋</h1>
          <p>Добро пожаловать в систему обучения OpenWay</p>
        </div>
        <div className={styles['header-time']}>
          <AiOutlineClockCircle />
          <span>{currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Статистика */}
      <div className={styles['stats-banner']}>
        <div className={styles['dashboard-stat-item']}>
          <div className={styles['stat-icon']}><AiOutlineWallet /></div>
          <div className={styles['dashboard-stat-content']}>
            <div className={styles['dashboard-stat-value']}>{user?.points || 0}</div>
            <div className={styles['dashboard-stat-label']}>Мои баллы</div>
          </div>
        </div>
        <div className={styles['dashboard-stat-item']}>
          <div className={styles['stat-icon']}><AiOutlineUsergroupAdd /></div>
          <div className={styles['dashboard-stat-content']}>
            <div className={styles['dashboard-stat-value']}>{user?.group_id ? 'В группе' : 'Нет группы'}</div>
            <div className={styles['dashboard-stat-label']}>Статус группы</div>
          </div>
        </div>
        <div className={styles['dashboard-stat-item']}>
          <div className={styles['stat-icon']}><AiOutlineThunderbolt /></div>
          <div className={styles['dashboard-stat-content']}>
            <div className={styles['dashboard-stat-value']}>42</div>
            <div className={styles['dashboard-stat-label']}>Уровень</div>
          </div>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className={styles['section-card']}>
        <h2 className={styles['section-title']}>
          <AiOutlineThunderbolt /> Быстрые действия
        </h2>
        <div className={styles['quick-actions-grid']}>
          {quickActions.map((action, index) => (
            <div 
              key={index} 
              className={styles['quick-action-btn']}
              onClick={() => navigate(action.path)}
              style={{ '--action-color': action.color }}
            >
              <div className={styles['quick-action-icon']}>{action.icon}</div>
              <span>{action.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles['two-column-layout']}>
        {/* Последняя активность */}
        <div className={styles['section-card']}>
          <h2 className={styles['section-title']}>
            <AiOutlineFire /> Твоя активность
          </h2>
          <div className={styles['activity-list']}>
            {recentActivity.map((activity, index) => (
              <div key={index} className={styles['activity-item']}>
                <div className={styles['activity-icon']} style={{ color: activity.color }}>
                  {activity.icon}
                </div>
                <div className={styles['activity-content']}>
                  <span className={styles['activity-text']}>{activity.text}</span>
                  <span className={styles['activity-count']}>{activity.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* События */}
        <div className={styles['section-card']}>
          <h2 className={styles['section-title']}>
            <AiOutlineCalendar /> Сегодня
          </h2>
          <div className={styles['events-list']}>
            {upcomingEvents.map((event, index) => (
              <div key={index} className={styles['event-item']}>
                <div className={styles['event-time']}>{event.time}</div>
                <div className={styles['event-details']}>
                  <span className={styles['event-title']}>{event.title}</span>
                  <span className={`${styles['event-type']} ${styles[event.type]}`}>
                    {event.type === 'lecture' && 'Лекция'}
                    {event.type === 'deadline' && 'Дедлайн'}
                    {event.type === 'test' && 'Тест'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Основные карточки */}
      <div className={styles['section-card']}>
        <h2 className={styles['section-title']}>
          <AiOutlineStar /> Возможности платформы
        </h2>
        <div className={styles['cards-grid']}>
          <div className={styles['info-card']}>
            <div className={styles['card-icon']}><AiOutlineBook /></div>
            <h3>Курсы</h3>
            <p>Доступ к учебным материалам</p>
            <span className={styles['coming-soon-badge']}>Скоро</span>
          </div>

          <div className={styles['info-card']}>
            <div className={styles['card-icon']}><AiOutlineFileText /></div>
            <h3>Задания</h3>
            <p>Выполнение домашних работ</p>
            <span className={styles['coming-soon-badge']}>Скоро</span>
          </div>

          <div className={styles['info-card']}>
            <div className={styles['card-icon']}><AiOutlineBarChart /></div>
            <h3>Прогресс</h3>
            <p>Статистика обучения</p>
            <span className={styles['coming-soon-badge']}>Скоро</span>
          </div>

          <div className={styles['info-card']}>
            <div className={styles['card-icon']}><AiOutlineStar /></div>
            <h3>Достижения</h3>
            <p>Награды и сертификаты</p>
            <span className={styles['coming-soon-badge']}>Скоро</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentHome;
