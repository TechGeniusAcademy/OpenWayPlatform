import { useState, useEffect } from 'react';
import QuillEditor from '../../components/QuillEditor';
import api from '../../utils/api';
import './StudentHomeworks.css';

function StudentHomeworks() {
  const [homeworks, setHomeworks] = useState([]);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [userSubmission, setUserSubmission] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['clean']
    ]
  };

  useEffect(() => {
    fetchHomeworks();
  }, []);

  const fetchHomeworks = async () => {
    try {
      const response = await api.get('/homeworks/student/assigned');
      setHomeworks(response.data.homeworks || []);
    } catch (error) {
      console.error('Ошибка загрузки домашних заданий:', error);
    }
  };

  const openSubmitModal = async (homework) => {
    setSelectedHomework(homework);
    setShowSubmitModal(true);
    setSubmissionText('');
    setUserSubmission(null);

    // Проверяем, есть ли уже отправленная работа
    try {
      const response = await api.get(`/homeworks/${homework.id}/submission`);
      if (response.data) {
        setUserSubmission(response.data);
        setSubmissionText(response.data.submission_text);
      }
    } catch (error) {
      // Нет отправленной работы - это нормально
      console.log('Работа еще не отправлена');
    }
  };

  const closeModal = () => {
    setShowSubmitModal(false);
    setSelectedHomework(null);
    setSubmissionText('');
    setUserSubmission(null);
  };

  const handleSubmit = async () => {
    if (!submissionText.trim()) {
      alert('Пожалуйста, введите ответ');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/homeworks/${selectedHomework.id}/submit`, {
        submissionText
      });
      
      alert('Работа успешно отправлена!');
      closeModal();
      fetchHomeworks();
    } catch (error) {
      console.error('Ошибка отправки работы:', error);
      alert(error.response?.data?.error || 'Ошибка отправки работы');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { text: 'Активно', class: 'badge-active' },
      closed: { text: 'Закрыто', class: 'badge-closed' },
      expired: { text: 'Просрочено', class: 'badge-expired' }
    };
    const badge = badges[status] || badges.active;
    return <span className={`badge ${badge.class}`}>{badge.text}</span>;
  };

  const getSubmissionStatusBadge = (status) => {
    if (!status) return <span className="status-badge status-not-submitted">Не сдано</span>;
    
    const badges = {
      pending: { text: 'На проверке', class: 'status-pending' },
      accepted: { text: 'Принято', class: 'status-accepted' },
      rejected: { text: 'Отклонено', class: 'status-rejected' }
    };
    const badge = badges[status] || badges.pending;
    return <span className={`status-badge ${badge.class}`}>{badge.text}</span>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="student-homeworks">
      <div className="header">
        <h2>📚 Домашние задания</h2>
      </div>

      <div className="homeworks-grid">
        {homeworks.map((homework) => (
          <div key={homework.id} className="homework-card">
            <div className="card-header">
              <h3>{homework.title}</h3>
              <div className="badges">
                {getStatusBadge(homework.status)}
                {getSubmissionStatusBadge(homework.submission_status)}
              </div>
            </div>

            <div className="card-body">
              <div 
                className="homework-description" 
                dangerouslySetInnerHTML={{ __html: homework.description }}
              />
              
              <div className="homework-info">
                <div className="info-item">
                  <span className="label">📅 Дедлайн:</span>
                  <span className="value">{formatDate(homework.deadline)}</span>
                </div>
                <div className="info-item">
                  <span className="label">⭐ Баллы:</span>
                  <span className="value">{homework.points}</span>
                </div>
                {homework.submission_status === 'accepted' && homework.points_earned !== null && (
                  <div className="info-item earned">
                    <span className="label">🏆 Получено баллов:</span>
                    <span className="value">{homework.points_earned}</span>
                  </div>
                )}
              </div>

              {homework.submission_status === 'rejected' && homework.reason && (
                <div className="rejection-reason">
                  <strong>❌ Причина отклонения:</strong>
                  <p>{homework.reason}</p>
                </div>
              )}
            </div>

            <div className="card-footer">
              {homework.status === 'active' && (
                <button 
                  className="btn-submit"
                  onClick={() => openSubmitModal(homework)}
                >
                  {homework.submission_status ? '📝 Изменить ответ' : '✍️ Сдать работу'}
                </button>
              )}
              {homework.status !== 'active' && !homework.submission_status && (
                <span className="text-muted">Время сдачи истекло</span>
              )}
              {homework.submission_status && (
                <button 
                  className="btn-view"
                  onClick={() => openSubmitModal(homework)}
                >
                  👁️ Посмотреть ответ
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {homeworks.length === 0 && (
        <div className="empty-state">
          <p>📭 Пока нет домашних заданий</p>
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>{selectedHomework?.title}</h3>
            
            <div className="homework-description-modal">
              <h4>Задание:</h4>
              <div dangerouslySetInnerHTML={{ __html: selectedHomework?.description }} />
            </div>

            {userSubmission && (
              <div className="submission-info">
                <h4>Статус: {getSubmissionStatusBadge(userSubmission.status)}</h4>
                {userSubmission.status === 'accepted' && (
                  <p className="points-info">🏆 Получено баллов: <strong>{userSubmission.points_earned}</strong></p>
                )}
                {userSubmission.status === 'rejected' && userSubmission.reason && (
                  <div className="rejection-info">
                    <strong>❌ Причина отклонения:</strong>
                    <p>{userSubmission.reason}</p>
                  </div>
                )}
                <p className="submitted-at">
                  Отправлено: {formatDate(userSubmission.submitted_at)}
                </p>
                {userSubmission.checked_at && (
                  <p className="checked-at">
                    Проверено: {formatDate(userSubmission.checked_at)}
                  </p>
                )}
              </div>
            )}

            {selectedHomework?.status === 'active' ? (
              <>
                <div className="form-group">
                  <label>Ваш ответ:</label>
                  <QuillEditor
                    value={submissionText}
                    onChange={setSubmissionText}
                    modules={quillModules}
                    placeholder="Напишите ваш ответ здесь..."
                  />
                </div>

                <div className="form-actions">
                  <button type="button" onClick={closeModal}>Отмена</button>
                  <button 
                    className="btn-primary" 
                    onClick={handleSubmit}
                    disabled={loading || !submissionText.trim()}
                  >
                    {loading ? 'Отправка...' : (userSubmission ? 'Обновить ответ' : 'Отправить')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="submitted-answer">
                  <h4>Ваш ответ:</h4>
                  <div dangerouslySetInnerHTML={{ __html: submissionText }} />
                </div>
                <div className="form-actions">
                  <button type="button" onClick={closeModal}>Закрыть</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentHomeworks;
