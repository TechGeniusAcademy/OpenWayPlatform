import { useState, useEffect } from 'react';
import { 
  FiUsers, FiEdit2, FiTrash2, FiPlus, FiUserPlus, 
  FiX, FiCheck, FiAlertCircle 
} from 'react-icons/fi';
import api from '../utils/api';
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
      <div className={styles['loading-state']}>
        <p>Загрузка групп...</p>
      </div>
    );
  }

  return (
    <div className={styles['groups-page']}>
      <div className={styles['page-header']}>
        <div className={styles['header-content']}>
          <div className={styles['header-left']}>
            <div className={styles['header-icon']}>
              <FiUsers />
            </div>
            <div>
              <h1>Управление группами</h1>
              <p>Создание групп и распределение студентов</p>
            </div>
          </div>
          <button className={styles['btn-primary']} onClick={openCreateModal}>
            <FiPlus />
            <span>Создать группу</span>
          </button>
        </div>
      </div>

      {success && (
        <div className={styles['alert-success']}>
          <FiCheck className={styles['alert-icon']} />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className={styles['alert-error']}>
          <FiAlertCircle className={styles['alert-icon']} />
          <span>{error}</span>
        </div>
      )}

      {groups.length === 0 ? (
        <div className={styles['empty-state']}>
          <div className={styles['empty-state-icon']}>
            <FiUsers />
          </div>
          <h3>Нет групп</h3>
          <p>Создайте первую группу, нажав кнопку выше</p>
        </div>
      ) : (
        <div className={styles['groups-grid']}>
          {groups.map((group) => (
            <div key={group.id} className={styles['group-card']}>
              <div className={styles['group-card-header']}>
                <h3>{group.name}</h3>
                <div className={styles['group-actions']}>
                  <button
                    className={styles['btn-icon-edit']}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(group);
                    }}
                    title="Редактировать"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    className={styles['btn-icon-delete']}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(group.id);
                    }}
                    title="Удалить"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>

              <div className={styles['group-card-body']}>
                <p className={styles['group-description']}>
                  {group.description || 'Нет описания'}
                </p>
              </div>

              <div className={styles['group-card-footer']}>
                <div className={styles['student-count']}>
                  <FiUsers />
                  <span>{group.student_count} студентов</span>
                </div>
                <button
                  className={styles['manage-btn']}
                  onClick={() => handleManageStudents(group)}
                >
                  <FiUserPlus />
                  <span>Управление</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно создания/редактирования группы */}
      {showModal && (
        <div className={styles['modal-overlay']} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>{editingGroup ? 'Редактирование группы' : 'Новая группа'}</h2>
              <button className={styles['close-btn']} onClick={closeModal}>
                <FiX />
              </button>
            </div>

            <form className={styles['modal-form']} onSubmit={handleSubmit}>
              {error && (
                <div className={styles['alert-error']}>
                  <FiAlertCircle className={styles['alert-icon']} />
                  <span>{error}</span>
                </div>
              )}

              <div className={styles['form-group']}>
                <label className={styles['form-label']}>Название группы *</label>
                <input
                  type="text"
                  name="name"
                  className={styles['form-input']}
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className={styles['form-group']}>
                <label className={styles['form-label']}>Описание</label>
                <textarea
                  name="description"
                  className={styles['form-input']}
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Необязательное описание группы"
                />
              </div>

              <div className={styles['form-actions']}>
                <button type="button" className={styles['btn-secondary']} onClick={closeModal}>
                  Отмена
                </button>
                <button type="submit" className={styles['btn-primary']}>
                  <FiCheck />
                  <span>{editingGroup ? 'Сохранить' : 'Создать'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно управления студентами */}
      {showManageModal && selectedGroup && (
        <div className={styles['modal-overlay']} onClick={closeManageModal}>
          <div className={`${styles.modal} ${styles['modal-large']}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>Управление группой: {selectedGroup.name}</h2>
              <button className={styles['close-btn']} onClick={closeManageModal}>
                <FiX />
              </button>
            </div>

            {success && (
              <div className={styles['alert-success']}>
                <FiCheck className={styles['alert-icon']} />
                <span>{success}</span>
              </div>
            )}
            {error && (
              <div className={styles['alert-error']}>
                <FiAlertCircle className={styles['alert-icon']} />
                <span>{error}</span>
              </div>
            )}

            {/* Текущие студенты */}
            <div className={styles['group-detail-section']}>
              <h3>Студенты в группе ({selectedGroup.students?.length || 0})</h3>
              {selectedGroup.students?.length > 0 ? (
                <div className={styles['students-list']}>
                  {selectedGroup.students.map((student) => (
                    <div key={student.id} className={styles['student-item']}>
                      <div className={styles['student-info']}>
                        <strong>{student.full_name || student.username}</strong>
                        <small>{student.email}</small>
                      </div>
                      <button
                        className={styles['remove-student-btn']}
                        onClick={() => handleRemoveStudent(student.id)}
                      >
                        <FiTrash2 />
                        <span>Удалить</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles['no-students-message']}>В группе пока нет студентов</p>
              )}
            </div>

            {/* Добавление студентов */}
            <div className={styles['group-detail-section']}>
              <h3>Добавить студентов</h3>
              {availableStudents.length > 0 ? (
                <>
                  <div className={styles['available-students']}>
                    {availableStudents.map((student) => (
                      <div key={student.id} className={styles['student-checkbox-item']}>
                        <input
                          type="checkbox"
                          id={`student-${student.id}`}
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                        />
                        <label 
                          htmlFor={`student-${student.id}`}
                          className={styles['student-checkbox-label']}
                        >
                          <strong>{student.full_name || student.username}</strong>
                          <small>{student.email}</small>
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className={styles['form-actions']}>
                    <button
                      type="button"
                      className={styles['btn-primary']}
                      onClick={handleAddStudents}
                      disabled={selectedStudents.length === 0}
                    >
                      <FiUserPlus />
                      <span>Добавить выбранных ({selectedStudents.length})</span>
                    </button>
                  </div>
                </>
              ) : (
                <p className={styles['no-students-message']}>Нет доступных студентов без группы</p>
              )}
            </div>

            <div className={styles['form-actions']}>
              <button type="button" className={styles['btn-secondary']} onClick={closeManageModal}>
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
