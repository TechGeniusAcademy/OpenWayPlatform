import { useState, useEffect } from 'react';
import api from '../utils/api';
import { HiUserGroup } from 'react-icons/hi';
import { AiOutlineEdit, AiOutlineDelete, AiOutlineUserAdd } from 'react-icons/ai';
import styles from './GroupsManagement.module.css';

function GroupsManagement() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await api.get('/groups');
      setGroups(response.data.groups);
    } catch (error) {
      setError('Ошибка загрузки групп');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupDetails = async (groupId) => {
    try {
      const response = await api.get(`/groups/${groupId}`);
      setSelectedGroup(response.data.group);
    } catch (error) {
      setError('Ошибка загрузки данных группы');
      console.error(error);
    }
  };

  const loadAvailableStudents = async () => {
    try {
      const response = await api.get('/groups/students/available');
      setAvailableStudents(response.data.students);
    } catch (error) {
      setError('Ошибка загрузки студентов');
      console.error(error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingGroup) {
        await api.put(`/groups/${editingGroup.id}`, formData);
        setSuccess('Группа успешно обновлена');
      } else {
        await api.post('/groups', formData);
        setSuccess('Группа успешно создана');
      }
      
      setShowModal(false);
      resetForm();
      loadGroups();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Ошибка при сохранении');
    }
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (groupId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту группу? Студенты не будут удалены, только связь с группой.')) {
      return;
    }

    try {
      await api.delete(`/groups/${groupId}`);
      setSuccess('Группа успешно удалена');
      loadGroups();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Ошибка при удалении');
    }
  };

  const handleManageStudents = async (group) => {
    await loadGroupDetails(group.id);
    await loadAvailableStudents();
    setShowManageModal(true);
  };

  const handleAddStudents = async () => {
    if (selectedStudents.length === 0) {
      setError('Выберите хотя бы одного студента');
      return;
    }

    try {
      await api.post(`/groups/${selectedGroup.id}/students`, {
        studentIds: selectedStudents
      });
      setSuccess('Студенты успешно добавлены');
      setSelectedStudents([]);
      await loadGroupDetails(selectedGroup.id);
      await loadAvailableStudents();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Ошибка при добавлении студентов');
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!window.confirm('Удалить студента из группы?')) {
      return;
    }

    try {
      await api.delete(`/groups/${selectedGroup.id}/students/${studentId}`);
      setSuccess('Студент удален из группы');
      await loadGroupDetails(selectedGroup.id);
      await loadAvailableStudents();
      loadGroups();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Ошибка при удалении студента');
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: ''
    });
    setEditingGroup(null);
    setError('');
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const closeManageModal = () => {
    setShowManageModal(false);
    setSelectedGroup(null);
    setSelectedStudents([]);
    setError('');
    loadGroups();
  };

  if (loading) {
    return (
      <div className={styles.loading-state}>
        <p>Загрузка групп...</p>
      </div>
    );
  }

  return (
    <div className={styles.groups-page}>
      <div className={styles.page-header}>
        <h1>Управление группами</h1>
        <p>Создание групп и распределение студентов</p>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className={styles.page-actions}>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Создать группу
        </button>
      </div>

      {groups.length === 0 ? (
        <div className={styles.empty-state}>
          <div className={styles.empty-state-icon}>📚</div>
          <h3>Нет групп</h3>
          <p>Создайте первую группу, нажав кнопку выше</p>
        </div>
      ) : (
        <div className={styles.groups-grid}>
          {groups.map((group) => (
            <div key={group.id} className={styles.group-card}>
              <div className={styles.group-card-header}>
                <h3>{group.name}</h3>
                <div className={styles.group-actions}>
                  <button
                    className={styles.icon-btn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(group);
                    }}
                    title="Редактировать"
                  >
                    <AiOutlineEdit />
                  </button>
                  <button
                    className="icon-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(group.id);
                    }}
                    title="Удалить"
                  >
                    <AiOutlineDelete />
                  </button>
                </div>
              </div>

              <div className={styles.group-card-body}>
                <p className={styles.group-description}>
                  {group.description || 'Нет описания'}
                </p>
              </div>

              <div className={styles.group-card-footer}>
                <div className={styles.student-count}>
                  <HiUserGroup className={styles.student-count-icon} />
                  <span>{group.student_count} студентов</span>
                </div>
                <button
                  className={styles.manage-btn}
                  onClick={() => handleManageStudents(group)}
                >
                  <AiOutlineUserAdd style={{ marginRight: '5px' }} />
                  Управление
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно создания/редактирования группы */}
      {showModal && (
        <div className={styles.modal-overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modal-header}>
              <h2>{editingGroup ? 'Редактирование группы' : 'Новая группа'}</h2>
              <button className={styles.close-btn} onClick={closeModal}>&times;</button>
            </div>

            <form className={styles.modal-form} onSubmit={handleSubmit}>
              {error && <div className="alert alert-error">{error}</div>}

              <div className={styles.form-group}>
                <label className={styles.form-label}>Название группы *</label>
                <input
                  type="text"
                  name="name"
                  className={styles.form-input}
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className={styles.form-group}>
                <label className={styles.form-label}>Описание</label>
                <textarea
                  name="description"
                  className={styles.form-input}
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Необязательное описание группы"
                />
              </div>

              <div className={styles.form-actions}>
                <button type="button" className="btn btn-cancel" onClick={closeModal}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingGroup ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно управления студентами */}
      {showManageModal && selectedGroup && (
        <div className={styles.modal-overlay} onClick={closeManageModal}>
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <div className={styles.modal-header}>
              <h2>Управление группой: {selectedGroup.name}</h2>
              <button className={styles.close-btn} onClick={closeManageModal}>&times;</button>
            </div>

            {success && <div className="alert alert-success">{success}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            {/* Текущие студенты */}
            <div className={styles.group-detail-section}>
              <h3>Студенты в группе ({selectedGroup.students?.length || 0})</h3>
              {selectedGroup.students?.length > 0 ? (
                <div className={styles.students-list}>
                  {selectedGroup.students.map((student) => (
                    <div key={student.id} className={styles.student-item}>
                      <div className={styles.student-info}>
                        <strong>{student.full_name || student.username}</strong>
                        <small>{student.email}</small>
                      </div>
                      <button
                        className={styles.remove-student-btn}
                        onClick={() => handleRemoveStudent(student.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.no-students-message}>В группе пока нет студентов</p>
              )}
            </div>

            {/* Добавление студентов */}
            <div className={styles.group-detail-section}>
              <h3>Добавить студентов</h3>
              {availableStudents.length > 0 ? (
                <>
                  <div className={styles.available-students}>
                    {availableStudents.map((student) => (
                      <div key={student.id} className={styles.student-checkbox-item}>
                        <input
                          type="checkbox"
                          id={`student-${student.id}`}
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                        />
                        <label 
                          htmlFor={`student-${student.id}`}
                          className={styles.student-checkbox-label}
                        >
                          <strong>{student.full_name || student.username}</strong>
                          <small>{student.email}</small>
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className={styles.form-actions}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleAddStudents}
                      disabled={selectedStudents.length === 0}
                    >
                      Добавить выбранных ({selectedStudents.length})
                    </button>
                  </div>
                </>
              ) : (
                <p className={styles.no-students-message}>Нет доступных студентов без группы</p>
              )}
            </div>

            <div className={styles.form-actions}>
              <button type="button" className="btn btn-cancel" onClick={closeManageModal}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupsManagement;
