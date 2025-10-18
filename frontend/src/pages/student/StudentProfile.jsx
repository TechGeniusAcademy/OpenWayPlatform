import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../utils/api';
import './StudentProfile.css';

function StudentProfile() {
  const { user } = useAuth();

  return (
    <div className="student-page">
      <div className="page-header">
        <h1>Мой профиль</h1>
        <p>Информация о вашем аккаунте</p>
      </div>

      <div className="profile-card">
        <div className="profile-avatar-section">
          {user?.avatar_url ? (
            <img 
              src={`${BASE_URL}${user.avatar_url}`} 
              alt={user.username}
              className="profile-avatar"
            />
          ) : (
            <div className="profile-avatar-placeholder">
              {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <p className="avatar-hint">Аватар может изменить только администратор</p>
        </div>

        <div className="profile-info-grid">
          <div className="info-row">
            <span className="info-label">Имя пользователя:</span>
            <span className="info-value">{user?.username}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Email:</span>
            <span className="info-value">{user?.email}</span>
          </div>
          <div className="info-row">
            <span className="info-label">ФИО:</span>
            <span className="info-value">{user?.full_name || 'Не указано'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Роль:</span>
            <span className="info-value">Ученик</span>
          </div>
          <div className="info-row">
            <span className="info-label">Дата регистрации:</span>
            <span className="info-value">
              {new Date(user?.created_at).toLocaleDateString('ru-RU')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentProfile;
