import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { BASE_URL } from '../../utils/api';
import './StudentProfile.css';

function StudentProfile() {
  const { user, updateUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [userPoints, setUserPoints] = useState(0);

  useEffect(() => {
    fetchUserPoints();
    refreshUserData();
  }, []);

  const fetchUserPoints = async () => {
    try {
      const response = await api.get('/points/my');
      setUserPoints(response.data.totalPoints || 0);
    } catch (error) {
      console.error('Ошибка получения баллов:', error);
    }
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

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
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

  return (
    <div className="student-page">
      <div className="page-header">
        <h1>Мой профиль</h1>
        <div className="header-actions">
          <div className="user-points">
            <span className="points-icon">⭐</span>
            <span className="points-value">{userPoints}</span>
            <span className="points-label">баллов</span>
          </div>
        </div>
      </div>

      <div className="profile-card">
        <div className={`profile-avatar-section banner-${user?.profile_banner || 'default'}`}>
          <div className={`avatar-wrapper frame-${user?.avatar_frame || 'none'}`}>
            {preview || user?.avatar_url ? (
            <img 
              src={preview || `${BASE_URL}${user.avatar_url}`} 
              alt={user.username}
              className="profile-avatar"
            />
          ) : (
            <div className="profile-avatar-placeholder">
              {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          </div>
          
          <div className="avatar-upload">
            <label className="avatar-upload-btn">
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
                className="avatar-upload-confirm" 
                onClick={handleAvatarUpload}
                disabled={uploading}
              >
                Сохранить
              </button>
            )}
          </div>
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
