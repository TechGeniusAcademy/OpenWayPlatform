import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { BASE_URL } from '../../utils/api';
import '../../styles/UsernameStyles.css';
import './StudentGroup.css';
import { AiOutlineWallet, AiOutlineClose, AiOutlineTrophy, AiOutlineStar, AiOutlineSend } from 'react-icons/ai';

function StudentGroup() {
  const { user, updateUser, checkAuth } = useAuth();
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cosmetics, setCosmetics] = useState({ frames: [], banners: [] });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferMessage, setTransferMessage] = useState('');
  const [transfering, setTransfering] = useState(false);
  const [transferError, setTransferError] = useState('');

  useEffect(() => {
    loadGroupInfo();
    loadCosmetics();
  }, [user]);

  const loadCosmetics = async () => {
    try {
      const [framesRes, bannersRes] = await Promise.all([
        api.get('/shop/items?type=frame'),
        api.get('/shop/items?type=banner')
      ]);
      setCosmetics({
        frames: framesRes.data.items,
        banners: bannersRes.data.items
      });
    } catch (error) {
      console.error('Ошибка загрузки косметики:', error);
    }
  };

  const loadGroupInfo = async () => {
    if (!user?.group_id) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(`/groups/${user.group_id}`);
      setGroupInfo(response.data.group);
    } catch (error) {
      console.error('Ошибка загрузки информации о группе:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFrameImage = (frameKey) => {
    if (!frameKey || frameKey === 'none') return null;
    const frame = cosmetics.frames.find(f => f.item_key === frameKey);
    return frame?.image_url ? `${BASE_URL}${frame.image_url}` : null;
  };

  const getBannerImage = (bannerKey) => {
    if (!bannerKey || bannerKey === 'default') return null;
    const banner = cosmetics.banners.find(b => b.item_key === bannerKey);
    return banner?.image_url ? `${BASE_URL}${banner.image_url}` : null;
  };

  const openStudentProfile = (student) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setShowTransferForm(false);
    setTransferAmount('');
    setTransferMessage('');
    setTransferError('');
    setTimeout(() => setSelectedStudent(null), 300);
  };

  const handleTransferPoints = async (e) => {
    e.preventDefault();
    
    if (!transferAmount || transferAmount <= 0) {
      setTransferError('Введите корректное количество баллов');
      return;
    }

    if (transferAmount > user.points) {
      setTransferError('У вас недостаточно баллов');
      return;
    }

    try {
      setTransfering(true);
      setTransferError('');
      const response = await api.post('/points/transfer', {
        recipient_id: selectedStudent.id,
        amount: parseInt(transferAmount),
        message: transferMessage
      });

      console.log('✅ Ответ сервера:', response.data);
      
      // Обновляем баланс текущего пользователя
      await checkAuth();
      
      // Обновляем данные группы
      await loadGroupInfo();
      
      // Закрываем модальное окно и форму
      closeModal();
    } catch (error) {
      console.error('Ошибка передачи баллов:', error);
      setTransferError(error.response?.data?.error || 'Ошибка при передаче баллов');
    } finally {
      setTransfering(false);
    }
  };

  if (loading) {
    return (
      <div className="student-page">
        <div className="page-header">
          <h1>Моя группа</h1>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!groupInfo) {
    return (
      <div className="student-page">
        <div className="page-header">
          <h1>Моя группа</h1>
          <p>Информация о вашей группе</p>
        </div>

        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3>Вы не состоите в группе</h3>
          <p>Обратитесь к администратору для добавления в группу</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-page">
      <div className="page-header">
        <h1>Моя группа: {groupInfo.name}</h1>
        <p>Информация о вашей группе</p>
      </div>

      <div className="group-info-card">
        <div className="group-info-section">
          <h3>Информация о группе</h3>
          <div className="profile-info-grid">
            <div className="info-row">
              <span className="info-label">Название:</span>
              <span className="info-value">{groupInfo.name}</span>
            </div>
            {groupInfo.description && (
              <div className="info-row">
                <span className="info-label">Описание:</span>
                <span className="info-value">{groupInfo.description}</span>
              </div>
            )}
            <div className="info-row">
              <span className="info-label">Количество студентов:</span>
              <span className="info-value">{groupInfo.students?.length || 0} человек</span>
            </div>
            <div className="info-row">
              <span className="info-label">Дата создания:</span>
              <span className="info-value">
                {new Date(groupInfo.created_at).toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>
        </div>

        {groupInfo.students && groupInfo.students.length > 0 && (
          <div className="group-info-section">
            <h3>Студенты группы</h3>
            <div className="students-list">
              {groupInfo.students.map((student) => {
                const frameImage = getFrameImage(student.avatar_frame);
                const bannerImage = getBannerImage(student.profile_banner);
                const defaultBanner = student.profile_banner === 'default' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'rgba(0, 0, 0, 0.05)';

                return (
                  <div 
                    key={student.id} 
                    className="student-list-item"
                    onClick={() => openStudentProfile(student)}
                    style={{
                      backgroundImage: bannerImage 
                        ? `url(${bannerImage})` 
                        : defaultBanner,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: 'pointer'
                    }}
                  >
                    {(bannerImage || student.profile_banner === 'default') && (
                      <div className="student-item-overlay"></div>
                    )}
                    
                    <div className="student-avatar-wrapper">
                      <div className="student-avatar">
                        {student.avatar_url ? (
                          <img src={`${BASE_URL}${student.avatar_url}`} alt={student.username} />
                        ) : (
                          (student.full_name || student.username).charAt(0).toUpperCase()
                        )}
                      </div>
                      {frameImage && (
                        <img 
                          src={frameImage}
                          alt="Frame"
                          className="student-avatar-frame"
                        />
                      )}
                    </div>
                    
                    <div className="student-info">
                      <strong className={`styled-username ${student.username_style || 'username-none'}`}>
                        {student.full_name || student.username}
                      </strong>
                      <small>{student.email}</small>
                      <div className="student-points"><AiOutlineWallet className="points-inline" /> {student.points || 0} баллов</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно профиля студента */}
      {showModal && selectedStudent && (
        <div className="student-profile-modal-overlay" onClick={closeModal}>
          <div className="student-profile-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={closeModal}>
              <AiOutlineClose />
            </button>

            {/* Баннер профиля */}
            <div 
              className="modal-profile-banner"
              style={{
                backgroundImage: getBannerImage(selectedStudent.profile_banner)
                  ? `url(${getBannerImage(selectedStudent.profile_banner)})`
                  : selectedStudent.profile_banner === 'default'
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="modal-banner-overlay"></div>
            </div>

            {/* Аватар с рамкой */}
            <div className="modal-avatar-section">
              <div className="modal-avatar-wrapper">
                <div className="modal-avatar">
                  {selectedStudent.avatar_url ? (
                    <img src={`${BASE_URL}${selectedStudent.avatar_url}`} alt={selectedStudent.username} />
                  ) : (
                    <span className="avatar-letter">
                      {(selectedStudent.full_name || selectedStudent.username).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {getFrameImage(selectedStudent.avatar_frame) && (
                  <img 
                    src={getFrameImage(selectedStudent.avatar_frame)}
                    alt="Frame"
                    className="modal-avatar-frame"
                  />
                )}
              </div>
              
              <div className="modal-user-info">
                <h2 className={`styled-username ${selectedStudent.username_style || 'username-none'}`}>
                  {selectedStudent.full_name || selectedStudent.username}
                </h2>
                <p className="modal-username">@{selectedStudent.username}</p>
              </div>
            </div>

            {/* Информация о студенте */}
            <div className="modal-info-section">
              <div className="modal-stats">
                <div className="modal-stat-card">
                  <div className="stat-icon">
                    <AiOutlineWallet />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{selectedStudent.points || 0}</span>
                    <span className="stat-label">Баллов</span>
                  </div>
                </div>

                <div className="modal-stat-card">
                  <div className="stat-icon">
                    <AiOutlineTrophy />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{selectedStudent.rank || 'Новичок'}</span>
                    <span className="stat-label">Ранг</span>
                  </div>
                </div>

                <div className="modal-stat-card">
                  <div className="stat-icon">
                    <AiOutlineStar />
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{selectedStudent.level || 1}</span>
                    <span className="stat-label">Уровень</span>
                  </div>
                </div>
              </div>

              <div className="modal-details">
                <h3>Информация</h3>
                <div className="modal-details-grid">
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{selectedStudent.email}</span>
                  </div>
                  {selectedStudent.phone && (
                    <div className="detail-row">
                      <span className="detail-label">Телефон:</span>
                      <span className="detail-value">{selectedStudent.phone}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Статус:</span>
                    <span className="detail-value">
                      <span className={`status-badge ${selectedStudent.is_online ? 'online' : 'offline'}`}>
                        {selectedStudent.is_online ? 'Онлайн' : 'Офлайн'}
                      </span>
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Дата регистрации:</span>
                    <span className="detail-value">
                      {new Date(selectedStudent.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Кнопка передачи баллов */}
              {selectedStudent.id !== user.id && (
                <div className="modal-transfer-section">
                  {!showTransferForm ? (
                    <button 
                      className="transfer-points-btn"
                      onClick={() => setShowTransferForm(true)}
                    >
                      <AiOutlineSend />
                      Передать баллы
                    </button>
                  ) : (
                    <form className="transfer-form" onSubmit={handleTransferPoints}>
                      <h3>Передать баллы</h3>
                      <p className="transfer-info">
                        Вы можете передать баллы пользователю {selectedStudent.full_name || selectedStudent.username}
                      </p>
                      <p className="your-balance">
                        Ваш баланс: <strong>{user.points} баллов</strong>
                      </p>
                      
                      <div className="form-group">
                        <label>Количество баллов:</label>
                        <input
                          type="number"
                          min="1"
                          max={user.points}
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          placeholder="Введите количество"
                          required
                          disabled={transfering}
                        />
                      </div>

                      <div className="form-group">
                        <label>Сообщение (необязательно):</label>
                        <textarea
                          value={transferMessage}
                          onChange={(e) => setTransferMessage(e.target.value)}
                          placeholder="Добавьте сообщение..."
                          rows="3"
                          disabled={transfering}
                        />
                      </div>

                      {transferError && (
                        <div className="transfer-error">
                          {transferError}
                        </div>
                      )}

                      <div className="transfer-actions">
                        <button 
                          type="button" 
                          className="cancel-btn"
                          onClick={() => {
                            setShowTransferForm(false);
                            setTransferAmount('');
                            setTransferMessage('');
                            setTransferError('');
                          }}
                          disabled={transfering}
                        >
                          Отмена
                        </button>
                        <button 
                          type="submit" 
                          className="submit-btn"
                          disabled={transfering || !transferAmount}
                        >
                          {transfering ? 'Отправка...' : 'Отправить'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Косметика */}
              <div className="modal-cosmetics">
                <h3>Активная косметика</h3>
                <div className="cosmetics-grid">
                  <div className="cosmetic-item">
                    <span className="cosmetic-label">Рамка аватара:</span>
                    <span className="cosmetic-value">
                      {selectedStudent.avatar_frame && selectedStudent.avatar_frame !== 'none' 
                        ? cosmetics.frames.find(f => f.item_key === selectedStudent.avatar_frame)?.name || 'Неизвестно'
                        : 'Не выбрано'}
                    </span>
                  </div>
                  <div className="cosmetic-item">
                    <span className="cosmetic-label">Баннер профиля:</span>
                    <span className="cosmetic-value">
                      {selectedStudent.profile_banner && selectedStudent.profile_banner !== 'default'
                        ? cosmetics.banners.find(b => b.item_key === selectedStudent.profile_banner)?.name || 'Неизвестно'
                        : 'По умолчанию'}
                    </span>
                  </div>
                  <div className="cosmetic-item">
                    <span className="cosmetic-label">Стиль никнейма:</span>
                    <span className="cosmetic-value">
                      {selectedStudent.username_style && selectedStudent.username_style !== 'username-none'
                        ? selectedStudent.username_style.replace('username-', '').toUpperCase()
                        : 'Обычный'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentGroup;
