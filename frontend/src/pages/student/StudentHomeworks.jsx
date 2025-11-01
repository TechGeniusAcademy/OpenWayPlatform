import { useState, useEffect } from 'react';
import QuillEditor from '../../components/QuillEditor';
import api from '../../utils/api';
import { FaBook, FaCalendar, FaTrophy, FaTimes, FaEdit, FaPen, FaEye, FaInbox } from 'react-icons/fa';
import styles from './StudentHomeworks.module.css';

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
    <div className={styles.student-homeworks}>
      <div className={styles.header}>
        <h2><FaBook /> Домашние задания</h2>
      </div>

      <div className={styles.homeworks-grid}>
        {homeworks.map((homework) => (
          <div key={homework.id} className={styles.homework-card}>
            <div className={styles.card-header}>
              <h3>{homework.title}</h3>
              <div className={styles.badges}>
                {getStatusBadge(homework.status)}
                {getSubmissionStatusBadge(homework.submission_status)}
              </div>
            </div>

            <div className={styles.card-body}>
              <div 
                className={styles.homework-description} 
                dangerouslySetInnerHTML={{ __html: homework.description }}
              />
              
              <div className={styles.homework-info}>
                <div className={styles.info-item}>
                  <span className={styles.label}><FaCalendar /> Дедлайн:</span>
                  <span className={styles.value}>{formatDate(homework.deadline)}</span>
                </div>
                <div className={styles.info-item}>
                  <span className={styles.label}>🪙 Баллы:</span>
                  <span className={styles.value}>{homework.points}</span>
                </div>
                {homework.submission_status === 'accepted' && homework.points_earned !== null && (
                  <div className="info-item earned">
                    <span className={styles.label}><FaTrophy /> Получено баллов:</span>
                    <span className={styles.value}>{homework.points_earned}</span>
                  </div>
                )}
              </div>

              {homework.submission_status === 'rejected' && homework.reason && (
                <div className={styles.rejection-reason}>
                  <strong><FaTimes /> Причина отклонения:</strong>
                  <p>{homework.reason}</p>
                </div>
              )}
            </div>

            <div className={styles.card-footer}>
              {homework.status === 'active' && (
                <button 
                  className={styles.btn-submit}
                  onClick={() => openSubmitModal(homework)}
                >
                  {homework.submission_status ? <><FaEdit /> Изменить ответ</> : <><FaPen /> Сдать работу</>}
                </button>
              )}
              {homework.status !== 'active' && !homework.submission_status && (
                <span className={styles.text-muted}>Время сдачи истекло</span>
              )}
              {homework.submission_status && (
                <button 
                  className={styles.btn-view}
                  onClick={() => openSubmitModal(homework)}
                >
                  <FaEye /> Посмотреть ответ
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {homeworks.length === 0 && (
        <div className={styles.empty-state}>
          <p><FaInbox /> Пока нет домашних заданий</p>
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className={styles.modal-overlay} onClick={closeModal}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>{selectedHomework?.title}</h3>
            
            <div className={styles.homework-description-modal}>
              <h4>Задание:</h4>
              <div dangerouslySetInnerHTML={{ __html: selectedHomework?.description }} />
            </div>

            {userSubmission && (
              <div className={styles.submission-info}>
                <h4>Статус: {getSubmissionStatusBadge(userSubmission.status)}</h4>
                {userSubmission.status === 'accepted' && (
                  <p className={styles.points-info}><FaTrophy /> Получено баллов: <strong>{userSubmission.points_earned}</strong></p>
                )}
                {userSubmission.status === 'rejected' && userSubmission.reason && (
                  <div className={styles.rejection-info}>
                    <strong><FaTimes /> Причина отклонения:</strong>
                    <p>{userSubmission.reason}</p>
                  </div>
                )}
                <p className={styles.submitted-at}>
                  Отправлено: {formatDate(userSubmission.submitted_at)}
                </p>
                {userSubmission.checked_at && (
                  <p className={styles.checked-at}>
                    Проверено: {formatDate(userSubmission.checked_at)}
                  </p>
                )}
              </div>
            )}

            {selectedHomework?.status === 'active' ? (
              <>
                <div className={styles.form-group}>
                  <label>Ваш ответ:</label>
                  <QuillEditor
                    value={submissionText}
                    onChange={setSubmissionText}
                    modules={quillModules}
                    placeholder="Напишите ваш ответ здесь..."
                  />
                </div>

                <div className={styles.form-actions}>
                  <button type="button" onClick={closeModal}>Отмена</button>
                  <button 
                    className={styles.btn-primary} 
                    onClick={handleSubmit}
                    disabled={loading || !submissionText.trim()}
                  >
                    {loading ? 'Отправка...' : (userSubmission ? 'Обновить ответ' : 'Отправить')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.submitted-answer}>
                  <h4>Ваш ответ:</h4>
                  <div dangerouslySetInnerHTML={{ __html: submissionText }} />
                </div>
                <div className={styles.form-actions}>
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
