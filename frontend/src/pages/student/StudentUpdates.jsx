import { useState, useEffect } from 'react';
import api from '../../utils/api';
import './StudentUpdates.css';
import { AiOutlineLeft, AiOutlineCalendar } from 'react-icons/ai';

function StudentUpdates() {
  const [updates, setUpdates] = useState([]);
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      const response = await api.get('/updates');
      setUpdates(response.data.updates);
    } catch (error) {
      console.error('Ошибка загрузки обновлений:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="student-page">
        <div className="page-header">
          <h1>Обновления</h1>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (selectedUpdate) {
    return (
      <div className="student-page update-view-page">
        <button className="back-button" onClick={() => setSelectedUpdate(null)}>
          <AiOutlineLeft /> Назад к списку
        </button>

        <div className="update-view-container">
          <div className="update-view-header">
            <div className="update-view-version">{selectedUpdate.version}</div>
            <h1>{selectedUpdate.title}</h1>
            {selectedUpdate.description && (
              <p className="update-view-description">{selectedUpdate.description}</p>
            )}
            <div className="update-view-meta">
              <AiOutlineCalendar />
              <span>{new Date(selectedUpdate.created_at).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
          </div>

          <div 
            className="update-view-content"
            dangerouslySetInnerHTML={{ __html: selectedUpdate.content }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="student-page">
      <div className="page-header">
        <h1>Обновления платформы</h1>
        <p>История обновлений и новых функций</p>
      </div>

      {updates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📢</div>
          <h3>Нет обновлений</h3>
          <p>Обновления ещё не опубликованы</p>
        </div>
      ) : (
        <div className="updates-grid">
          {updates.map(update => (
            <div 
              key={update.id} 
              className="update-card"
              onClick={() => setSelectedUpdate(update)}
            >
              <div className="update-card-header">
                <div className="update-card-version">{update.version}</div>
                <div className="update-card-date">
                  {new Date(update.created_at).toLocaleDateString('ru-RU')}
                </div>
              </div>
              <h3>{update.title}</h3>
              {update.description && (
                <p className="update-card-description">{update.description}</p>
              )}
              <div className="update-card-footer">
                <span className="read-more">Читать подробнее →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentUpdates;
