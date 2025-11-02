import { useState, useEffect } from 'react';
import QuillEditor from '../../components/QuillEditor';
import api from '../../utils/api';
import { FaBook, FaCalendar, FaTrophy, FaTimes, FaEdit, FaPen, FaEye, FaInbox, FaCoins, FaCheckCircle, FaHourglass, FaClock } from 'react-icons/fa';
import styles from './StudentHomeworks.module.css';

function StudentHomeworks() {
  const [homeworks, setHomeworks] = useState([]);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [userSubmission, setUserSubmission] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, active, submitted, accepted, rejected

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
      active: { text: 'Активно', class: styles['badge-active'] },
      closed: { text: 'Закрыто', class: styles['badge-closed'] },
      expired: { text: 'Просрочено', class: styles['badge-expired'] }
    };
    const badge = badges[status] || badges.active;
    return <span className={`${styles['badge']} ${badge.class}`}>{badge.text}</span>;
  };

  const getSubmissionStatusBadge = (status) => {
    if (!status) return <span className={`${styles['status-badge']} ${styles['status-not-submitted']}`}>Не сдано</span>;
    
    const badges = {
      pending: { text: 'На проверке', class: styles['status-pending'] },
      accepted: { text: 'Принято', class: styles['status-accepted'] },
      rejected: { text: 'Отклонено', class: styles['status-rejected'] }
    };
    const badge = badges[status] || badges.pending;
    return <span className={`${styles['status-badge']} ${badge.class}`}>{badge.text}</span>;
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

  // Фильтрация домашних заданий
  const filteredHomeworks = homeworks.filter(hw => {
    if (filter === 'all') return true;
    if (filter === 'active') return hw.status === 'active' && !hw.submission_status;
    if (filter === 'submitted') return hw.submission_status === 'pending';
    if (filter === 'accepted') return hw.submission_status === 'accepted';
    if (filter === 'rejected') return hw.submission_status === 'rejected';
    return true;
  });

  // Статистика
  const stats = {
    total: homeworks.length,
    active: homeworks.filter(hw => hw.status === 'active' && !hw.submission_status).length,
    submitted: homeworks.filter(hw => hw.submission_status === 'pending').length,
    accepted: homeworks.filter(hw => hw.submission_status === 'accepted').length,
    rejected: homeworks.filter(hw => hw.submission_status === 'rejected').length,
    totalPoints: homeworks.filter(hw => hw.submission_status === 'accepted').reduce((sum, hw) => sum + (hw.points_earned || 0), 0)
  };

  return (
    <div className={styles['student-homeworks']}>
      <div className={styles.header}>
        <h2><FaBook /> Домашние задания</h2>
      </div>

      {/* Статистика */}
      <div className={styles['stats-section']}>
        <div className={styles['stat-card']}>
          <div className={styles['stat-icon']} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
            <FaBook />
          </div>
          <div className={styles['stat-content']}>
            <div className={styles['stat-value']}>{stats.total}</div>
            <div className={styles['stat-label']}>Всего заданий</div>
          </div>
        </div>

        <div className={styles['stat-card']}>
          <div className={styles['stat-icon']} style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)' }}>
            <FaClock />
          </div>
          <div className={styles['stat-content']}>
            <div className={styles['stat-value']}>{stats.active}</div>
            <div className={styles['stat-label']}>Активные</div>
          </div>
        </div>

        <div className={styles['stat-card']}>
          <div className={styles['stat-icon']} style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }}>
            <FaHourglass />
          </div>
          <div className={styles['stat-content']}>
            <div className={styles['stat-value']}>{stats.submitted}</div>
            <div className={styles['stat-label']}>На проверке</div>
          </div>
        </div>

        <div className={styles['stat-card']}>
          <div className={styles['stat-icon']} style={{ background: 'linear-gradient(135deg, #43e97b, #38f9d7)' }}>
            <FaCheckCircle />
          </div>
          <div className={styles['stat-content']}>
            <div className={styles['stat-value']}>{stats.accepted}</div>
            <div className={styles['stat-label']}>Принято</div>
          </div>
        </div>

        <div className={styles['stat-card']}>
          <div className={styles['stat-icon']} style={{ background: 'linear-gradient(135deg, #fa709a, #fee140)' }}>
            <FaTrophy />
          </div>
          <div className={styles['stat-content']}>
            <div className={styles['stat-value']}>{stats.totalPoints}</div>
            <div className={styles['stat-label']}>Получено баллов</div>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className={styles['filters-section']}>
        <button 
          className={filter === 'all' ? styles['filter-active'] : styles['filter-btn']}
          onClick={() => setFilter('all')}
        >
          Все ({stats.total})
        </button>
        <button 
          className={filter === 'active' ? styles['filter-active'] : styles['filter-btn']}
          onClick={() => setFilter('active')}
        >
          Активные ({stats.active})
        </button>
        <button 
          className={filter === 'submitted' ? styles['filter-active'] : styles['filter-btn']}
          onClick={() => setFilter('submitted')}
        >
          На проверке ({stats.submitted})
        </button>
        <button 
          className={filter === 'accepted' ? styles['filter-active'] : styles['filter-btn']}
          onClick={() => setFilter('accepted')}
        >
          Принято ({stats.accepted})
        </button>
        <button 
          className={filter === 'rejected' ? styles['filter-active'] : styles['filter-btn']}
          onClick={() => setFilter('rejected')}
        >
          Отклонено ({stats.rejected})
        </button>
      </div>

      <div className={styles['homeworks-grid']}>
        {filteredHomeworks.map((homework) => (
          <div key={homework.id} className={styles['homework-card']}>
            <div className={styles['card-header']}>
              <h3>{homework.title}</h3>
              <div className={styles.badges}>
                {getStatusBadge(homework.status)}
                {getSubmissionStatusBadge(homework.submission_status)}
              </div>
            </div>

            <div className={styles['card-body']}>
              <div 
                className={styles['homework-description']} 
                dangerouslySetInnerHTML={{ __html: homework.description }}
              />
              
              <div className={styles['homework-info']}>
                <div className={styles['info-item']}>
                  <span className={styles.label}><FaCalendar /> Дедлайн:</span>
                  <span className={styles.value}>{formatDate(homework.deadline)}</span>
                </div>
                <div className={styles['info-item']}>
                  <span className={styles.label}><FaCoins /> Баллы:</span>
                  <span className={styles.value}>{homework.points}</span>
                </div>
                {homework.submission_status === 'accepted' && homework.points_earned !== null && (
                  <div className={`${styles['info-item']} ${styles['info-item-earned']}`}>
                    <span className={styles.label}><FaTrophy /> Получено баллов:</span>
                    <span className={styles.value}>{homework.points_earned}</span>
                  </div>
                )}
              </div>

              {homework.submission_status === 'rejected' && homework.reason && (
                <div className={styles['rejection-reason']}>
                  <strong><FaTimes /> Причина отклонения:</strong>
                  <p>{homework.reason}</p>
                </div>
              )}
            </div>

            <div className={styles['card-footer']}>
              {homework.status === 'active' && (
                <button 
                  className={styles['btn-submit']}
                  onClick={() => openSubmitModal(homework)}
                >
                  {homework.submission_status ? <><FaEdit /> Изменить ответ</> : <><FaPen /> Сдать работу</>}
                </button>
              )}
              {homework.status !== 'active' && !homework.submission_status && (
                <span className={styles['text-muted']}>Время сдачи истекло</span>
              )}
              {homework.submission_status && (
                <button 
                  className={styles['btn-view']}
                  onClick={() => openSubmitModal(homework)}
                >
                  <FaEye /> Посмотреть ответ
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredHomeworks.length === 0 && homeworks.length > 0 && (
        <div className={styles['empty-state']}>
          <p><FaInbox /> Нет заданий с выбранным фильтром</p>
        </div>
      )}

      {homeworks.length === 0 && (
        <div className={styles['empty-state']}>
          <p><FaInbox /> Пока нет домашних заданий</p>
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className={styles['modal-overlay']} onClick={closeModal}>
          <div className={`${styles['modal-content']} ${styles['modal-large']}`} onClick={(e) => e.stopPropagation()}>
            <h3>{selectedHomework?.title}</h3>
            
            <div className={styles['homework-description-modal']}>
              <h4>Задание:</h4>
              <div dangerouslySetInnerHTML={{ __html: selectedHomework?.description }} />
            </div>

            {userSubmission && (
              <div className={styles['submission-info']}>
                <h4>Статус: {getSubmissionStatusBadge(userSubmission.status)}</h4>
                {userSubmission.status === 'accepted' && (
                  <p className={styles['points-info']}><FaTrophy /> Получено баллов: <strong>{userSubmission.points_earned}</strong></p>
                )}
                {userSubmission.status === 'rejected' && userSubmission.reason && (
                  <div className={styles['rejection-info']}>
                    <strong><FaTimes /> Причина отклонения:</strong>
                    <p>{userSubmission.reason}</p>
                  </div>
                )}
                <p className={styles['submitted-at']}>
                  Отправлено: {formatDate(userSubmission.submitted_at)}
                </p>
                {userSubmission.checked_at && (
                  <p className={styles['checked-at']}>
                    Проверено: {formatDate(userSubmission.checked_at)}
                  </p>
                )}
              </div>
            )}

            {selectedHomework?.status === 'active' ? (
              <>
                <div className={styles['form-group']}>
                  <label>Ваш ответ:</label>
                  <QuillEditor
                    value={submissionText}
                    onChange={setSubmissionText}
                    modules={quillModules}
                    placeholder="Напишите ваш ответ здесь..."
                  />
                </div>

                <div className={styles['form-actions']}>
                  <button type="button" onClick={closeModal}>Отмена</button>
                  <button 
                    className={styles['btn-primary']} 
                    onClick={handleSubmit}
                    disabled={loading || !submissionText.trim()}
                  >
                    {loading ? 'Отправка...' : (userSubmission ? 'Обновить ответ' : 'Отправить')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={styles['submitted-answer']}>
                  <h4>Ваш ответ:</h4>
                  <div dangerouslySetInnerHTML={{ __html: submissionText }} />
                </div>
                <div className={styles['form-actions']}>
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
