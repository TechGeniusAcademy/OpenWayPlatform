import { useState, useEffect } from 'react';
import api from '../utils/api';
import './UsersManagement.css';

function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'student',
    full_name: ''
  });

  // Для управления баллами
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pointsAmount, setPointsAmount] = useState(0);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data.users);
    } catch (error) {
      setError('Ошибка загрузки пользователей');
      console.error(error);
    } finally {
      setLoading(false);
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
      if (editingUser) {
        // Обновление пользователя
        await api.put(`/users/${editingUser.id}`, formData);
        setSuccess('Пользователь успешно обновлен');
      } else {
        // Создание нового пользователя
        await api.post('/users', formData);
        setSuccess('Пользователь успешно создан');
      }
      
      setShowModal(false);
      resetForm();
      loadUsers();
      
      // Скрыть сообщение об успехе через 3 секунды
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Ошибка при сохранении');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      full_name: user.full_name || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      return;
    }

    try {
      await api.delete(`/users/${userId}`);
      setSuccess('Пользователь успешно удален');
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Ошибка при удалении');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'student',
      full_name: ''
    });
    setEditingUser(null);
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

  // Управление баллами
  const openPointsModal = (user) => {
    setSelectedUser(user);
    setPointsAmount(0);
    setShowPointsModal(true);
  };

  const closePointsModal = () => {
    setShowPointsModal(false);
    setSelectedUser(null);
    setPointsAmount(0);
  };

  const handleAddPoints = async () => {
    if (!pointsAmount || pointsAmount === 0) {
      setError('Введите количество баллов');
      return;
    }

    try {
      await api.post('/points/add', {
        userId: selectedUser.id,
        points: parseInt(pointsAmount)
      });
      
      setSuccess(`Баллы ${pointsAmount > 0 ? 'добавлены' : 'списаны'} успешно`);
      closePointsModal();
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Ошибка при изменении баллов');
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <p>Загрузка пользователей...</p>
      </div>
    );
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>Управление пользователями</h1>
        <p>Регистрация и управление учетными записями</p>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="page-actions">
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Добавить пользователя
        </button>
      </div>

      <div className="users-table-container">
        {users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>Нет пользователей</h3>
            <p>Создайте первого пользователя, нажав кнопку выше</p>
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Имя пользователя</th>
                <th>Email</th>
                <th>ФИО</th>
                <th>Роль</th>
                <th>Группа</th>
                <th>Баллы</th>
                <th>Дата создания</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.full_name || '-'}</td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {user.role === 'admin' ? 'Администратор' : 'Ученик'}
                    </span>
                  </td>
                  <td>{user.group_name || '-'}</td>
                  <td>
                    <span className="points-badge">{user.points || 0}</span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString('ru-RU')}</td>
                  <td>
                    <div className="action-buttons">
                      {user.role === 'student' && (
                        <button 
                          className="btn btn-small btn-points"
                          onClick={() => openPointsModal(user)}
                          title="Управление баллами"
                        >
                          ⭐ Баллы
                        </button>
                      )}
                      <button 
                        className="btn btn-small btn-edit"
                        onClick={() => handleEdit(user)}
                      >
                        Изменить
                      </button>
                      <button 
                        className="btn btn-small btn-delete"
                        onClick={() => handleDelete(user.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Редактирование пользователя' : 'Новый пользователь'}</h2>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              {error && <div className="alert alert-error">{error}</div>}

              <div className="form-group">
                <label className="form-label">Имя пользователя *</label>
                <input
                  type="text"
                  name="username"
                  className="form-input"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Пароль {editingUser ? '(оставьте пустым, чтобы не менять)' : '*'}
                </label>
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!editingUser}
                />
              </div>

              <div className="form-group">
                <label className="form-label">ФИО</label>
                <input
                  type="text"
                  name="full_name"
                  className="form-input"
                  value={formData.full_name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Роль *</label>
                <select
                  name="role"
                  className="form-select"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                >
                  <option value="student">Ученик</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-cancel" onClick={closeModal}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPointsModal && selectedUser && (
        <div className="modal-overlay" onClick={closePointsModal}>
          <div className="modal modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⭐ Управление баллами</h2>
              <button className="close-btn" onClick={closePointsModal}>&times;</button>
            </div>

            <div className="modal-body">
              <div className="user-info-box">
                <p><strong>Студент:</strong> {selectedUser.full_name || selectedUser.username}</p>
                <p><strong>Текущие баллы:</strong> <span className="points-badge">{selectedUser.points || 0}</span></p>
              </div>

              <div className="form-group">
                <label className="form-label">Количество баллов (+ добавить, - списать)</label>
                <input
                  type="number"
                  className="form-input"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  placeholder="Например: 10 или -5"
                />
                <small className="form-hint">
                  Используйте отрицательные числа для списания баллов
                </small>
              </div>

              <div className="quick-buttons">
                <button className="btn btn-quick" onClick={() => setPointsAmount(5)}>+5</button>
                <button className="btn btn-quick" onClick={() => setPointsAmount(10)}>+10</button>
                <button className="btn btn-quick" onClick={() => setPointsAmount(20)}>+20</button>
                <button className="btn btn-quick btn-negative" onClick={() => setPointsAmount(-5)}>-5</button>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-cancel" onClick={closePointsModal}>
                  Отмена
                </button>
                <button type="button" className="btn btn-primary" onClick={handleAddPoints}>
                  Применить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersManagement;
