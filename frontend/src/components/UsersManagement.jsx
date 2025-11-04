import { useState, useEffect } from 'react';
import { 
  FiUsers, FiEdit2, FiTrash2, FiPlus, FiImage, 
  FiUpload, FiX, FiCheck, FiAlertCircle, FiDollarSign 
} from 'react-icons/fi';
import api, { BASE_URL } from '../utils/api';
import styles from './UsersManagement.module.css';

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

  // Для загрузки аватарок
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedAvatarUser, setSelectedAvatarUser] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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

  // Управление аватарками
  const openAvatarModal = (user) => {
    setSelectedAvatarUser(user);
    setAvatarFile(null);
    setAvatarPreview(user.avatar_url ? `${BASE_URL}${user.avatar_url}` : null);
    setShowAvatarModal(true);
  };

  const closeAvatarModal = () => {
    setShowAvatarModal(false);
    setSelectedAvatarUser(null);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) {
      setError('Выберите файл изображения');
      return;
    }

    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      await api.post(`/users/${selectedAvatarUser.id}/avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('Аватарка успешно загружена');
      closeAvatarModal();
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Ошибка при загрузке аватарки');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async (userId) => {
    if (!window.confirm('Удалить аватарку?')) {
      return;
    }

    try {
      await api.delete(`/users/${userId}/avatar`);
      setSuccess('Аватарка успешно удалена');
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Ошибка при удалении аватарки');
    }
  };

  if (loading) {
    return (
      <div className={styles['loading-state']}>
        <p>Загрузка пользователей...</p>
      </div>
    );
  }

  return (
    <div className={styles['users-page']}>
      <div className={styles['page-header']}>
        <div className={styles['header-content']}>
          <div className={styles['header-left']}>
            <div className={styles['header-icon']}>
              <FiUsers />
            </div>
            <div>
              <h1>Управление пользователями</h1>
              <p>Регистрация и управление учетными записями</p>
            </div>
          </div>
          <button className={styles['btn-primary']} onClick={openCreateModal}>
            <FiPlus />
            <span>Добавить пользователя</span>
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

      <div className={styles['users-table-container']}>
        {users.length === 0 ? (
          <div className={styles['empty-state']}>
            <div className={styles['empty-state-icon']}>
              <FiUsers />
            </div>
            <h3>Нет пользователей</h3>
            <p>Создайте первого пользователя, нажав кнопку выше</p>
          </div>
        ) : (
          <table className={styles['users-table']}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Аватар</th>
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
                  <td>
                    <div className={styles['user-avatar-cell']}>
                      {user.avatar_url ? (
                        <img 
                          src={`${BASE_URL}${user.avatar_url}`} 
                          alt={user.username}
                          className={styles['user-avatar-small']}
                        />
                      ) : (
                        <div className={styles['user-avatar-placeholder']}>
                          {(user.full_name || user.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.full_name || '-'}</td>
                  <td>
                    <span className={`${styles['role-badge']} ${styles['role-' + user.role]}`}>
                      {user.role === 'admin' && 'Администратор'}
                      {user.role === 'student' && 'Ученик'}
                      {user.role === 'teacher' && 'Учитель'}
                      {user.role === 'tester' && 'Тестер'}
                      {user.role === 'css_editor' && 'CSS Редактор'}
                    </span>
                  </td>
                  <td>{user.group_name || '-'}</td>
                  <td>
                    <span className={styles['points-badge']}>{user.points || 0}</span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString('ru-RU')}</td>
                  <td>
                    <div className={styles['action-buttons']}>
                      {user.role === 'student' && (
                        <>
                          <button 
                            className={styles['btn-icon-avatar']}
                            onClick={() => openAvatarModal(user)}
                            title="Изменить аватарку"
                          >
                            <FiImage />
                          </button>
                          <button 
                            className={styles['btn-icon-points']}
                            onClick={() => openPointsModal(user)}
                            title="Управление баллами"
                          >
                            <FiDollarSign />
                          </button>
                        </>
                      )}
                      <button 
                        className={styles['btn-icon-edit']}
                        onClick={() => handleEdit(user)}
                        title="Редактировать"
                      >
                        <FiEdit2 />
                      </button>
                      <button 
                        className={styles['btn-icon-delete']}
                        onClick={() => handleDelete(user.id)}
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

      {showModal && (
        <div className={styles['modal-overlay']} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>{editingUser ? 'Редактирование пользователя' : 'Новый пользователь'}</h2>
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
                <label className={styles['form-label']}>Имя пользователя *</label>
                <input
                  type="text"
                  name="username"
                  className={styles['form-input']}
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className={styles['form-group']}>
                <label className={styles['form-label']}>Email *</label>
                <input
                  type="email"
                  name="email"
                  className={styles['form-input']}
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className={styles['form-group']}>
                <label className={styles['form-label']}>
                  Пароль {editingUser ? '(оставьте пустым, чтобы не менять)' : '*'}
                </label>
                <input
                  type="password"
                  name="password"
                  className={styles['form-input']}
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!editingUser}
                />
              </div>

              <div className={styles['form-group']}>
                <label className={styles['form-label']}>ФИО</label>
                <input
                  type="text"
                  name="full_name"
                  className={styles['form-input']}
                  value={formData.full_name}
                  onChange={handleInputChange}
                />
              </div>

              <div className={styles['form-group']}>
                <label className={styles['form-label']}>Роль *</label>
                <select
                  name="role"
                  className={styles['form-select']}
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                >
                  <option value="student">Ученик</option>
                  <option value="teacher">Учитель</option>
                  <option value="tester">Тестер</option>
                  <option value="css_editor">CSS Редактор</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>

              <div className={styles['form-actions']}>
                <button type="button" className={styles['btn-secondary']} onClick={closeModal}>
                  Отмена
                </button>
                <button type="submit" className={styles['btn-primary']}>
                  <FiCheck />
                  <span>{editingUser ? 'Сохранить' : 'Создать'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPointsModal && selectedUser && (
        <div className={styles['modal-overlay']} onClick={closePointsModal}>
          <div className={`${styles.modal} ${styles['modal-small']}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <div className={styles['modal-title']}>
                <FiDollarSign className={styles['modal-icon']} />
                <h2>Управление баллами</h2>
              </div>
              <button className={styles['close-btn']} onClick={closePointsModal}>
                <FiX />
              </button>
            </div>

            <div className={styles['modal-body']}>
              <div className={styles['user-info-box']}>
                <p><strong>Студент:</strong> {selectedUser.full_name || selectedUser.username}</p>
                <p><strong>Текущие баллы:</strong> <span className={styles['points-badge']}>{selectedUser.points || 0}</span></p>
              </div>

              <div className={styles['form-group']}>
                <label className={styles['form-label']}>Количество баллов (+ добавить, - списать)</label>
                <input
                  type="number"
                  className={styles['form-input']}
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  placeholder="Например: 10 или -5"
                />
                <small className={styles['form-hint']}>
                  Используйте отрицательные числа для списания баллов
                </small>
              </div>

              <div className={styles['quick-buttons']}>
                <button className={styles['btn-quick']} onClick={() => setPointsAmount(5)}>+5</button>
                <button className={styles['btn-quick']} onClick={() => setPointsAmount(10)}>+10</button>
                <button className={styles['btn-quick']} onClick={() => setPointsAmount(20)}>+20</button>
                <button className={`${styles['btn-quick']} ${styles['btn-negative']}`} onClick={() => setPointsAmount(-5)}>-5</button>
              </div>

              <div className={styles['form-actions']}>
                <button type="button" className={styles['btn-secondary']} onClick={closePointsModal}>
                  Отмена
                </button>
                <button type="button" className={styles['btn-primary']} onClick={handleAddPoints}>
                  <FiCheck />
                  <span>Применить</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для загрузки аватарки */}
      {showAvatarModal && selectedAvatarUser && (
        <div className={styles['modal-overlay']} onClick={closeAvatarModal}>
          <div className={`${styles.modal} ${styles['modal-small']}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <div className={styles['modal-title']}>
                <FiImage className={styles['modal-icon']} />
                <h2>Изменить аватарку</h2>
              </div>
              <button className={styles['close-btn']} onClick={closeAvatarModal}>
                <FiX />
              </button>
            </div>

            <div className={styles['modal-body']}>
              <div className={styles['user-info-box']}>
                <p><strong>Студент:</strong> {selectedAvatarUser.full_name || selectedAvatarUser.username}</p>
              </div>

              <div className={styles['avatar-upload-section']}>
                <div className={styles['avatar-preview']}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" />
                  ) : (
                    <div className={styles['avatar-placeholder-large']}>
                      {(selectedAvatarUser.full_name || selectedAvatarUser.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Выберите изображение</label>
                  <input
                    type="file"
                    className={styles['form-input']}
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleAvatarChange}
                  />
                  <small className={styles['form-hint']}>
                    Поддерживаемые форматы: JPEG, PNG, GIF, WebP (макс. 5MB)
                  </small>
                </div>
              </div>

              <div className={styles['form-actions']}>
                {selectedAvatarUser.avatar_url && (
                  <button 
                    type="button" 
                    className={styles['btn-danger']}
                    onClick={() => {
                      handleDeleteAvatar(selectedAvatarUser.id);
                      closeAvatarModal();
                    }}
                  >
                    <FiTrash2 />
                    <span>Удалить аватарку</span>
                  </button>
                )}
                <button type="button" className={styles['btn-secondary']} onClick={closeAvatarModal}>
                  Отмена
                </button>
                <button 
                  type="button" 
                  className={styles['btn-primary']} 
                  onClick={handleUploadAvatar}
                  disabled={!avatarFile || uploadingAvatar}
                >
                  <FiUpload />
                  <span>{uploadingAvatar ? 'Загрузка...' : 'Загрузить'}</span>
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
