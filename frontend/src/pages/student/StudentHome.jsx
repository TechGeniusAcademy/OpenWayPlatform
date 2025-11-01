import { useAuth } from '../../context/AuthContext';
import { AiOutlineWallet, AiOutlineUsergroupAdd, AiOutlineBook, AiOutlineFileText, AiOutlineBarChart, AiOutlineStar } from 'react-icons/ai';
import styles from '../StudentDashboard.module.css';

function StudentHome() {
  const { user } = useAuth();

  return (
    <div className={styles['student-page']}>
      <div className={styles['dashboard-page-header']}>
        <h1>Главная</h1>
        <p>Добро пожаловать в систему обучения</p>
      </div>

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
      </div>

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
  );
}

export default StudentHome;
