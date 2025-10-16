import { useAuth } from '../../context/AuthContext';

function StudentHome() {
  const { user } = useAuth();

  return (
    <div className="student-page">
      <div className="page-header">
        <h1>Главная</h1>
        <p>Добро пожаловать в систему обучения</p>
      </div>

      <div className="stats-banner">
        <div className="stat-item">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-value">{user?.points || 0}</div>
            <div className="stat-label">Мои баллы</div>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{user?.group_id ? 'В группе' : 'Нет группы'}</div>
            <div className="stat-label">Статус группы</div>
          </div>
        </div>
      </div>

      <div className="cards-grid">
        <div className="info-card">
          <div className="card-icon">📚</div>
          <h3>Курсы</h3>
          <p>Доступ к учебным материалам</p>
          <span className="coming-soon-badge">Скоро</span>
        </div>

        <div className="info-card">
          <div className="card-icon">📝</div>
          <h3>Задания</h3>
          <p>Выполнение домашних работ</p>
          <span className="coming-soon-badge">Скоро</span>
        </div>

        <div className="info-card">
          <div className="card-icon">📊</div>
          <h3>Прогресс</h3>
          <p>Статистика обучения</p>
          <span className="coming-soon-badge">Скоро</span>
        </div>

        <div className="info-card">
          <div className="card-icon">🎓</div>
          <h3>Достижения</h3>
          <p>Награды и сертификаты</p>
          <span className="coming-soon-badge">Скоро</span>
        </div>
      </div>
    </div>
  );
}

export default StudentHome;
