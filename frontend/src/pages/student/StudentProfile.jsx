import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../utils/api';
import axios from 'axios';
import './StudentProfile.css';

function StudentProfile() {
  const { user, login } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

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

      const response = await axios.post(
        `${BASE_URL}/users/me/avatar`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Обновляем данные пользователя в контексте
      const updatedUser = { ...user, avatar_url: response.data.avatar_url };
      login(updatedUser, localStorage.getItem('token'));
      
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
        <p>Информация о вашем аккаунте</p>
      </div>

      <div className="profile-card">
        <div className="profile-avatar-section">
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
