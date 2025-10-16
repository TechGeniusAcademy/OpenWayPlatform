import { useState, useEffect } from 'react';
import api from '../utils/api';
import QuillEditor from './QuillEditor';
import './HomeworksManagement.css';

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
    if (homework.is_closed) return <span className="badge badge-closed">Закрыто</span>;
    if (homework.deadline && new Date(homework.deadline) < new Date()) {
      return <span className="badge badge-expired">Просрочено</span>;
    }
    return <span className="badge badge-active">Активно</span>;
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="homeworks-management">
      <div className="header">
        <h2>Управление домашними заданиями</h2>
        <button className="btn-primary" onClick={() => openForm()}>+ Создать задание</button>
      </div>

      <div className="homeworks-list">
        {homeworks.length === 0 ? (
          <p>Нет созданных домашних заданий</p>
        ) : (
          <table>
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
                  <td className="actions">
                    <button onClick={() => openForm(homework)} title="Редактировать">✏️</button>
                    <button onClick={() => openAssignModal(homework)} title="Назначить группам">📋</button>
                    <button onClick={() => openSubmissionsModal(homework)} title="Сдачи">📝</button>
                    <button 
                      onClick={() => handleToggleClosed(homework)}
                      title={homework.is_closed ? "Открыть" : "Закрыть"}
                    >
                      {homework.is_closed ? '🔓' : '🔒'}
                    </button>
                    <button onClick={() => handleDelete(homework.id)} title="Удалить">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Форма создания/редактирования */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>{editingHomework ? 'Редактировать задание' : 'Создать задание'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Название задания *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Описание задания (Rich Text)</label>
                <QuillEditor
                  value={description}
                  onChange={setDescription}
                  modules={modules}
                  placeholder="Введите описание задания с форматированием, изображениями и видео..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Баллы за выполнение</label>
                  <input
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Дедлайн</label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">Сохранить</button>
                <button type="button" onClick={() => setShowForm(false)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно назначения */}
      {showAssignModal && selectedHomework && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <h3>Назначение: {selectedHomework.title}</h3>
            
            <h4>Назначить группе:</h4>
            <div className="assign-groups">
              {groups.map(group => {
                const isAssigned = selectedHomework.assignments?.some(a => a.group_id === group.id);
                return (
                  <div key={group.id} className="group-item">
                    <span>{group.name}</span>
                    {isAssigned ? (
                      <button onClick={() => handleUnassign(group.id)}>Отменить</button>
                    ) : (
                      <button onClick={() => handleAssign(group.id)}>Назначить</button>
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={() => setShowAssignModal(false)}>Закрыть</button>
          </div>
        </div>
      )}

      {/* Модальное окно сдач */}
      {showSubmissionsModal && selectedHomework && (
        <div className="modal-overlay" onClick={() => setShowSubmissionsModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>Сдачи: {selectedHomework.title}</h3>
            
            {submissions.length === 0 ? (
              <p>Пока никто не сдал это задание</p>
            ) : (
              <div className="submissions-list">
                {submissions.map(submission => (
                  <div key={submission.id} className="submission-card">
                    <div className="submission-header">
                      <div>
                        <strong>{submission.full_name}</strong>
                        <span className="submission-date">
                          {new Date(submission.submitted_at).toLocaleString('ru-RU')}
                        </span>
                      </div>
                      <span className={`status-badge status-${submission.status}`}>
                        {submission.status === 'pending' ? 'На проверке' :
                         submission.status === 'accepted' ? 'Принято' : 'Отклонено'}
                      </span>
                    </div>

                    <div className="submission-text" dangerouslySetInnerHTML={{ __html: submission.submission_text }} />

                    {submission.status !== 'pending' && (
                      <div className="check-info">
                        <p><strong>Проверил:</strong> {submission.checker_name}</p>
                        {submission.reason && <p><strong>Причина:</strong> {submission.reason}</p>}
                        <p><strong>Баллы:</strong> {submission.points_earned}</p>
                      </div>
                    )}

                    {submission.status === 'pending' && (
                      <div className="check-actions">
                        <input
                          type="number"
                          placeholder="Баллы"
                          defaultValue={selectedHomework.points}
                          id={`points-${submission.id}`}
                          min="0"
                        />
                        <input
                          type="text"
                          placeholder="Причина (необязательно)"
                          id={`reason-${submission.id}`}
                        />
                        <button
                          className="btn-accept"
                          onClick={() => {
                            const pts = document.getElementById(`points-${submission.id}`).value;
                            const rsn = document.getElementById(`reason-${submission.id}`).value;
                            handleCheckSubmission(submission.id, 'accepted', rsn, pts);
                          }}
                        >
                          ✅ Принять
                        </button>
                        <button
                          className="btn-reject"
                          onClick={() => {
                            const rsn = document.getElementById(`reason-${submission.id}`).value;
                            handleCheckSubmission(submission.id, 'rejected', rsn, 0);
                          }}
                        >
                          ❌ Отклонить
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setShowSubmissionsModal(false)}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomeworksManagement;
