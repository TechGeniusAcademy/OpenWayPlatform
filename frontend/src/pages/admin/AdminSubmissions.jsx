import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import styles from './AdminSubmissions.module.css';

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [grade, setGrade] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, reviewed

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/submissions/all');
      setSubmissions(response.data);
    } catch (error) {
      console.error('Ошибка загрузки submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewSubmission = (submission) => {
    setSelectedSubmission(submission);
    setFeedback(submission.feedback || '');
    setGrade(submission.grade || '');
  };

  const closeViewer = () => {
    setSelectedSubmission(null);
    setFeedback('');
    setGrade('');
  };

  const updateStatus = async (status) => {
    if (!selectedSubmission) return;

    try {
      await api.patch(`/submissions/${selectedSubmission.id}/status`, {
        status,
        feedback,
        grade: grade ? parseInt(grade) : null
      });

      alert('Статус обновлен успешно');
      loadSubmissions();
      closeViewer();
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
      alert('Не удалось обновить статус');
    }
  };

  const getPreviewHTML = (projectData) => {
    if (!projectData) return '';

    const fileSystem = typeof projectData === 'string' 
      ? JSON.parse(projectData) 
      : projectData;

    // Находим index.html
    let htmlContent = '';
    let cssContent = '';
    let jsContent = '';

    const findFiles = (items) => {
      for (const item of items) {
        if (item.type === 'file') {
          if (item.name === 'index.html') {
            htmlContent = item.content || '';
          } else if (item.name === 'styles.css') {
            cssContent = item.content || '';
          } else if (item.name === 'script.js') {
            jsContent = item.content || '';
          }
        } else if (item.type === 'folder' && item.children) {
          findFiles(item.children);
        }
      }
    };

    findFiles(fileSystem);

    // Собираем HTML
    let html = htmlContent;

    // Вставляем CSS
    if (cssContent) {
      html = html.replace('</head>', `<style>${cssContent}</style></head>`);
    }

    // Вставляем JS
    if (jsContent) {
      html = html.replace('</body>', `<script>${jsContent}</script></body>`);
    }

    return html;
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return sub.status === 'pending';
    if (filterStatus === 'reviewed') return sub.status !== 'pending';
    return true;
  });

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'На проверке', className: 'badge-pending' },
      reviewed: { text: 'Проверено', className: 'badge-reviewed' },
      approved: { text: 'Принято', className: 'badge-approved' },
      rejected: { text: 'Отклонено', className: 'badge-rejected' }
    };
    const badge = badges[status] || badges.pending;
    return <span className={`status-badge ${badge.className}`}>{badge.text}</span>;
  };

  if (loading) {
    return <div className={styles.admin-submissions-loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.admin-submissions-container}>
      <div className={styles.submissions-header}>
        <h1>Проверка проектов</h1>
        <div className={styles.filter-tabs}>
          <button 
            className={filterStatus === 'all' ? 'active' : ''}
            onClick={() => setFilterStatus('all')}
          >
            Все ({submissions.length})
          </button>
          <button 
            className={filterStatus === 'pending' ? 'active' : ''}
            onClick={() => setFilterStatus('pending')}
          >
            На проверке ({submissions.filter(s => s.status === 'pending').length})
          </button>
          <button 
            className={filterStatus === 'reviewed' ? 'active' : ''}
            onClick={() => setFilterStatus('reviewed')}
          >
            Проверено ({submissions.filter(s => s.status !== 'pending').length})
          </button>
        </div>
      </div>

      <div className={styles.submissions-list}>
        {filteredSubmissions.length === 0 ? (
          <div className={styles.no-submissions}>Нет submissions для отображения</div>
        ) : (
          filteredSubmissions.map(submission => (
            <div key={submission.id} className={styles.submission-card}>
              <div className={styles.submission-info}>
                <h3>{submission.project_name}</h3>
                <p className={styles.student-name}>Студент: {submission.username}</p>
                <p className={styles.submission-meta}>
                  {submission.type === 'homework' && submission.homework_title && (
                    <span>ДЗ: {submission.homework_title} • </span>
                  )}
                  {new Date(submission.submitted_at).toLocaleString('ru-RU')}
                </p>
                {getStatusBadge(submission.status)}
              </div>
              <button 
                className={styles.btn-view}
                onClick={() => viewSubmission(submission)}
              >
                Просмотреть
              </button>
            </div>
          ))
        )}
      </div>

      {selectedSubmission && (
        <div className={styles.submission-viewer-overlay} onClick={closeViewer}>
          <div className={styles.submission-viewer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.viewer-header}>
              <div>
                <h2>{selectedSubmission.project_name}</h2>
                <p>Студент: {selectedSubmission.username}</p>
              </div>
              <button className={styles.btn-close} onClick={closeViewer}>×</button>
            </div>

            <div className={styles.viewer-content}>
              <div className={styles.preview-section}>
                <h3>Превью проекта</h3>
                <iframe
                  className={styles.project-preview}
                  srcDoc={getPreviewHTML(selectedSubmission.project_data)}
                  title="Project Preview"
                  sandbox="allow-scripts"
                />
              </div>

              <div className={styles.review-section}>
                <h3>Оценка</h3>
                
                <div className={styles.form-group}>
                  <label>Статус:</label>
                  <div className={styles.status-buttons}>
                    <button 
                      className={styles.btn-approve}
                      onClick={() => updateStatus('approved')}
                    >
                      <FaCheckCircle /> Принять
                    </button>
                    <button 
                      className={styles.btn-reject}
                      onClick={() => updateStatus('rejected')}
                    >
                      <FaTimesCircle /> Отклонить
                    </button>
                    <button 
                      className={styles.btn-review}
                      onClick={() => updateStatus('reviewed')}
                    >
                      Проверено
                    </button>
                  </div>
                </div>

                <div className={styles.form-group}>
                  <label>Оценка (баллы):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="Введите оценку"
                  />
                </div>

                <div className={styles.form-group}>
                  <label>Комментарий:</label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Ваш отзыв для студента..."
                    rows="6"
                  />
                </div>

                {selectedSubmission.feedback && (
                  <div className={styles.previous-feedback}>
                    <h4>Предыдущий отзыв:</h4>
                    <p>{selectedSubmission.feedback}</p>
                    {selectedSubmission.grade && (
                      <p><strong>Оценка:</strong> {selectedSubmission.grade}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
