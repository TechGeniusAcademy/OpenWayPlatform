import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

function StudentGroup() {
  const { user } = useAuth();
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroupInfo();
  }, [user]);

  const loadGroupInfo = async () => {
    if (!user?.group_id) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(`/groups/${user.group_id}`);
      setGroupInfo(response.data.group);
    } catch (error) {
      console.error('Ошибка загрузки информации о группе:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="student-page">
        <div className="page-header">
          <h1>Моя группа</h1>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!groupInfo) {
    return (
      <div className="student-page">
        <div className="page-header">
          <h1>Моя группа</h1>
          <p>Информация о вашей группе</p>
        </div>

        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3>Вы не состоите в группе</h3>
          <p>Обратитесь к администратору для добавления в группу</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-page">
      <div className="page-header">
        <h1>Моя группа: {groupInfo.name}</h1>
        <p>Информация о вашей группе</p>
      </div>

      <div className="group-info-card">
        <div className="group-info-section">
          <h3>Информация о группе</h3>
          <div className="profile-info-grid">
            <div className="info-row">
              <span className="info-label">Название:</span>
              <span className="info-value">{groupInfo.name}</span>
            </div>
            {groupInfo.description && (
              <div className="info-row">
                <span className="info-label">Описание:</span>
                <span className="info-value">{groupInfo.description}</span>
              </div>
            )}
            <div className="info-row">
              <span className="info-label">Количество студентов:</span>
              <span className="info-value">{groupInfo.students?.length || 0} человек</span>
            </div>
            <div className="info-row">
              <span className="info-label">Дата создания:</span>
              <span className="info-value">
                {new Date(groupInfo.created_at).toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>
        </div>

        {groupInfo.students && groupInfo.students.length > 0 && (
          <div className="group-info-section">
            <h3>Студенты группы</h3>
            <div className="students-list">
              {groupInfo.students.map((student) => (
                <div key={student.id} className="student-list-item">
                  <div className="student-avatar">
                    {(student.full_name || student.username).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong>{student.full_name || student.username}</strong>
                    <small>{student.email}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentGroup;
