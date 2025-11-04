import { useState, useEffect } from 'react';
import { FiFileText, FiPlus, FiEdit2, FiTrash2, FiCheckSquare, FiClock, FiLock, FiUnlock, FiX, FiCheck, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import api from '../utils/api';
import QuillEditor from './QuillEditor';
import styles from './HomeworksManagement.module.css';

function HomeworksManagement() {
  const [homeworks, setHomeworks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Форма домашнего задания
  const [editingHomework, setEditingHomework] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(0);
  const [deadline, setDeadline] = useState('');

  // Модуль редактора для React-Quill
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': [] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }, 
       { 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['clean']
    ],
  };

  useEffect(() => {
    loadHomeworks();
    loadGroups();
  }, []);

  const loadHomeworks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/homeworks');
      setHomeworks(response.data.homeworks);
    } catch (error) {
      console.error('Ошибка загрузки домашних заданий:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await api.get('/groups');
      setGroups(response.data.groups);
    } catch (error) {
      console.error('Ошибка загрузки групп:', error);
    }
  };

  const openForm = (homework = null) => {
    if (homework) {
      setEditingHomework(homework);
      setTitle(homework.title);
      setDescription(homework.description || '');
      setPoints(homework.points || 0);
      setDeadline(homework.deadline ? new Date(homework.deadline).toISOString().slice(0, 16) : '');
    } else {
      resetForm();
    }
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingHomework(null);
    setTitle('');
    setDescription('');
    setPoints(0);
    setDeadline('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title) {
      console.warn('Заполните название');
      return;
    }

    const homeworkData = {
      title,
      description,
      points: parseInt(points),
      deadline: deadline || null
    };

    try {
      if (editingHomework) {
        await api.put(`/homeworks/${editingHomework.id}`, homeworkData);
      } else {
        await api.post('/homeworks', homeworkData);
      }
      
      setShowForm(false);
      resetForm();
      loadHomeworks();
    } catch (error) {
      console.error('Ошибка сохранения домашнего задания:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Вы уверены, что хотите удалить это домашнее задание?')) return;

    try {
      await api.delete(`/homeworks/${id}`);
      loadHomeworks();
    } catch (error) {
      console.error('Ошибка удаления:', error);
    }
  };

  const handleToggleClosed = async (homework) => {
    try {
      await api.patch(`/homeworks/${homework.id}/toggle-closed`, {
        isClosed: !homework.is_closed
      });
      loadHomeworks();
    } catch (error) {
      console.error('Ошибка изменения статуса:', error);
    }
  };

  const openAssignModal = async (homework) => {
    setSelectedHomework(homework);
    try {
      const response = await api.get(`/homeworks/${homework.id}/assignments`);
      homework.assignments = response.data.assignments;
      setShowAssignModal(true);
    } catch (error) {
      console.error('Ошибка загрузки назначений:', error);
    }
  };

  const handleAssign = async (groupId) => {
    try {
      await api.post(`/homeworks/${selectedHomework.id}/assign`, { groupId });
      openAssignModal(selectedHomework);
    } catch (error) {
      console.error('Ошибка назначения:', error);
    }
  };

  const handleUnassign = async (groupId) => {
    try {
      await api.delete(`/homeworks/${selectedHomework.id}/assign/${groupId}`);
      openAssignModal(selectedHomework);
    } catch (error) {
      console.error('Ошибка отмены назначения:', error);
    }
  };

  const openSubmissionsModal = async (homework) => {
    setSelectedHomework(homework);
    try {
      const response = await api.get(`/homeworks/${homework.id}/submissions`);
      setSubmissions(response.data.submissions);
      setShowSubmissionsModal(true);
    } catch (error) {
      console.error('Ошибка загрузки сдач:', error);
    }
  };

  const handleCheckSubmission = async (submissionId, status, reason, pointsEarned) => {
    try {
      await api.post(`/homeworks/submission/${submissionId}/check`, {
        status,
        reason,
        pointsEarned: parseInt(pointsEarned)
      });
      openSubmissionsModal(selectedHomework);
    } catch (error) {
      console.error('Ошибка проверки сдачи:', error);
    }
  };

  const getStatusBadge = (homework) => {
    if (homework.is_closed) {
      return (
        <span className={`${styles.badge} ${styles['badge-closed']}`}>
          <FiLock />
          <span>Закрыто</span>
        </span>
      );
    }
    if (homework.deadline && new Date(homework.deadline) < new Date()) {
      return (
        <span className={`${styles.badge} ${styles['badge-expired']}`}>
          <FiClock />
          <span>Просрочено</span>
        </span>
      );
    }
    return (
      <span className={`${styles.badge} ${styles['badge-active']}`}>
        <FiCheck />
        <span>Активно</span>
      </span>
    );
  };

  if (loading) return (
    <div className={styles['loading-state']}>
      <FiRefreshCw className={styles['loading-icon']} />
      <p>Загрузка домашних заданий...</p>
    </div>
  );

  return (
    <div className={styles['page-container']}>
      <div className={styles['page-header']}>
        <div className={styles['header-content']}>
          <div className={styles['header-left']}>
            <div className={styles['header-icon']}>
              <FiFileText />
            </div>
            <div>
              <h1>Управление домашними заданиями</h1>
              <p>Создание и проверка домашних заданий для студентов</p>
            </div>
          </div>
          <div className={styles['header-actions']}>
            <button className={styles['btn-primary']} onClick={() => openForm()}>
              <FiPlus />
              <span>Создать задание</span>
            </button>
          </div>
        </div>
      </div>

      <div className={styles['table-container']}>
        {homeworks.length === 0 ? (
          <div className={styles['empty-state']}>
            <div className={styles['empty-state-icon']}>
              <FiFileText />
            </div>
            <h3>Нет созданных домашних заданий</h3>
            <p>Создайте первое задание, нажав кнопку выше</p>
          </div>
        ) : (
          <table className={styles['homeworks-table']}>
            <thead>
              <tr>
                <th>Название</th>
                <th>Баллы</th>
                <th>Дедлайн</th>
                <th>Статус</th>
                <th>Групп назначено</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {homeworks.map(homework => (
                <tr key={homework.id}>
                  <td><strong>{homework.title}</strong></td>
                  <td>{homework.points}</td>
                  <td>{homework.deadline ? new Date(homework.deadline).toLocaleString('ru-RU') : '∞'}</td>
                  <td>{getStatusBadge(homework)}</td>
                  <td>{homework.assigned_groups_count}</td>
                  <td>
                    <div className={styles['table-actions']}>
                      <button 
                        className={styles['btn-icon-edit']}
                        onClick={() => openForm(homework)} 
                        title="Редактировать"
                      >
                        <FiEdit2 />
                      </button>
                      <button 
                        className={styles['btn-icon-assign']}
                        onClick={() => openAssignModal(homework)} 
                        title="Назначить группам"
                      >
                        <FiCheckSquare />
                      </button>
                      <button 
                        className={styles['btn-icon-submissions']}
                        onClick={() => openSubmissionsModal(homework)} 
                        title="Сдачи"
                      >
                        <FiFileText />
                      </button>
                      <button 
                        className={homework.is_closed ? styles['btn-icon-unlock'] : styles['btn-icon-lock']}
                        onClick={() => handleToggleClosed(homework)}
                        title={homework.is_closed ? "Открыть" : "Закрыть"}
                      >
                        {homework.is_closed ? <FiUnlock /> : <FiLock />}
                      </button>
                      <button 
                        className={styles['btn-icon-delete']}
                        onClick={() => handleDelete(homework.id)} 
                        title="Удалить"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Форма создания/редактирования */}
      {showForm && (
        <div className={styles['modal-overlay']} onClick={() => setShowForm(false)}>
          <div className={`${styles.modal} ${styles['modal-large']}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>{editingHomework ? 'Редактировать задание' : 'Создать задание'}</h2>
              <button className={styles['close-btn']} onClick={() => setShowForm(false)}>
                <FiX />
              </button>
            </div>
            <form className={styles['modal-form']} onSubmit={handleSubmit}>
              <div className={styles['form-group']}>
                <label className={styles['form-label']}>Название задания *</label>
                <input
                  type="text"
                  className={styles['form-input']}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Введите название задания"
                  required
                />
              </div>

              <div className={styles['form-group']}>
                <label className={styles['form-label']}>Описание задания (Rich Text)</label>
                <div className={styles['editor-wrapper']}>
                  <QuillEditor
                    value={description}
                    onChange={setDescription}
                    modules={modules}
                    placeholder="Введите описание задания с форматированием, изображениями и видео..."
                  />
                </div>
              </div>

              <div className={styles['form-row']}>
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Баллы за выполнение</label>
                  <input
                    type="number"
                    className={styles['form-input']}
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    min="0"
                  />
                </div>

                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Дедлайн</label>
                  <input
                    type="datetime-local"
                    className={styles['form-input']}
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles['form-actions']}>
                <button type="button" className={styles['btn-secondary']} onClick={() => setShowForm(false)}>
                  <FiX />
                  <span>Отмена</span>
                </button>
                <button type="submit" className={styles['btn-primary']}>
                  <FiCheck />
                  <span>Сохранить</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно назначения */}
      {showAssignModal && selectedHomework && (
        <div className={styles['modal-overlay']} onClick={() => setShowAssignModal(false)}>
          <div className={`${styles.modal} ${styles['modal-small']}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>Назначение: {selectedHomework.title}</h2>
              <button className={styles['close-btn']} onClick={() => setShowAssignModal(false)}>
                <FiX />
              </button>
            </div>
            
            <div className={styles['modal-body']}>
              <h4 className={styles['section-title']}>Назначить группе:</h4>
              <div className={styles['assign-groups']}>
                {groups.map(group => {
                  const isAssigned = selectedHomework.assignments?.some(a => a.group_id === group.id);
                  return (
                    <div key={group.id} className={styles['group-item']}>
                      <span>{group.name}</span>
                      {isAssigned ? (
                        <button 
                          className={styles['btn-unassign']}
                          onClick={() => handleUnassign(group.id)}
                        >
                          <FiX />
                          <span>Отменить</span>
                        </button>
                      ) : (
                        <button 
                          className={styles['btn-assign']}
                          onClick={() => handleAssign(group.id)}
                        >
                          <FiCheckSquare />
                          <span>Назначить</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles['modal-footer']}>
              <button className={styles['btn-secondary']} onClick={() => setShowAssignModal(false)}>
                <span>Закрыть</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно сдач */}
      {showSubmissionsModal && selectedHomework && (
        <div className={styles['modal-overlay']} onClick={() => setShowSubmissionsModal(false)}>
          <div className={`${styles.modal} ${styles['modal-xlarge']}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>Сдачи: {selectedHomework.title}</h2>
              <button className={styles['close-btn']} onClick={() => setShowSubmissionsModal(false)}>
                <FiX />
              </button>
            </div>
            
            <div className={styles['modal-body']}>
              {submissions.length === 0 ? (
                <div className={styles['empty-state']}>
                  <div className={styles['empty-state-icon']}>
                    <FiFileText />
                  </div>
                  <h3>Пока никто не сдал это задание</h3>
                </div>
              ) : (
                <div className={styles['submissions-list']}>
                  {submissions.map(submission => (
                    <div key={submission.id} className={styles['submission-card']}>
                      <div className={styles['submission-header']}>
                        <div>
                          <strong>{submission.full_name}</strong>
                          <span className={styles['submission-date']}>
                            {new Date(submission.submitted_at).toLocaleString('ru-RU')}
                          </span>
                        </div>
                        <span className={`${styles['status-badge']} ${styles[`status-${submission.status}`]}`}>
                          {submission.status === 'pending' ? (
                            <><FiClock /> На проверке</>
                          ) : submission.status === 'accepted' ? (
                            <><FiCheck /> Принято</>
                          ) : (
                            <><FiX /> Отклонено</>
                          )}
                        </span>
                      </div>

                    <div className={styles['submission-text']} dangerouslySetInnerHTML={{ __html: submission.submission_text }} />

                    {submission.status !== 'pending' && (
                      <div className={styles['check-info']}>
                        <p><strong>Проверил:</strong> {submission.checker_name}</p>
                        {submission.reason && <p><strong>Причина:</strong> {submission.reason}</p>}
                        <p><strong>Баллы:</strong> {submission.points_earned}</p>
                      </div>
                    )}

                      {submission.status === 'pending' && (
                        <div className={styles['check-actions']}>
                          <input
                            type="number"
                            className={styles['input-points']}
                            placeholder="Баллы"
                            defaultValue={selectedHomework.points}
                            id={`points-${submission.id}`}
                            min="0"
                          />
                          <input
                            type="text"
                            className={styles['input-reason']}
                            placeholder="Причина (необязательно)"
                            id={`reason-${submission.id}`}
                          />
                          <button
                            className={styles['btn-accept']}
                            onClick={() => {
                              const pts = document.getElementById(`points-${submission.id}`).value;
                              const rsn = document.getElementById(`reason-${submission.id}`).value;
                              handleCheckSubmission(submission.id, 'accepted', rsn, pts);
                            }}
                          >
                            <FiCheck />
                            <span>Принять</span>
                          </button>
                          <button
                            className={styles['btn-reject']}
                            onClick={() => {
                              const rsn = document.getElementById(`reason-${submission.id}`).value;
                              handleCheckSubmission(submission.id, 'rejected', rsn, 0);
                            }}
                          >
                            <FiX />
                            <span>Отклонить</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles['modal-footer']}>
              <button className={styles['btn-secondary']} onClick={() => setShowSubmissionsModal(false)}>
                <span>Закрыть</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomeworksManagement;
