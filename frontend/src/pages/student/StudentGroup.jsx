import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { BASE_URL } from '../../utils/api';
import '../../styles/UsernameStyles.css';
import styles from './StudentGroup.module.css';
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
      <div className={styles.student-page}>
        <div className={styles.page-header}>
          <h1>Моя группа</h1>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!groupInfo) {
    return (
      <div className={styles.student-page}>
        <div className={styles.page-header}>
          <h1>Моя группа</h1>
          <p>Информация о вашей группе</p>
        </div>

        <div className={styles.empty-state}>
          <div className={styles.empty-state-icon}>👥</div>
          <h3>Вы не состоите в группе</h3>
          <p>Обратитесь к администратору для добавления в группу</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.student-page}>
      <div className={styles.page-header}>
        <h1>Моя группа: {groupInfo.name}</h1>
        <p>Информация о вашей группе</p>
      </div>

      <div className={styles.group-info-card}>
        <div className={styles.group-info-section}>
          <h3>Информация о группе</h3>
          <div className={styles.profile-info-grid}>
            <div className={styles.info-row}>
              <span className={styles.info-label}>Название:</span>
              <span className={styles.info-value}>{groupInfo.name}</span>
            </div>
            {groupInfo.description && (
              <div className={styles.info-row}>
                <span className={styles.info-label}>Описание:</span>
                <span className={styles.info-value}>{groupInfo.description}</span>
              </div>
            )}
            <div className={styles.info-row}>
              <span className={styles.info-label}>Количество студентов:</span>
              <span className={styles.info-value}>{groupInfo.students?.length || 0} человек</span>
            </div>
            <div className={styles.info-row}>
              <span className={styles.info-label}>Дата создания:</span>
              <span className={styles.info-value}>
                {new Date(groupInfo.created_at).toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>
        </div>

        {groupInfo.students && groupInfo.students.length > 0 && (
          <div className={styles.group-info-section}>
            <h3>Студенты группы</h3>
            <div className={styles.students-list}>
              {groupInfo.students.map((student) => {
                const frameImage = getFrameImage(student.avatar_frame);
                const bannerImage = getBannerImage(student.profile_banner);
                const defaultBanner = student.profile_banner === 'default' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'rgba(0, 0, 0, 0.05)';

                return (
                  <div 
                    key={student.id} 
                    className={styles.student-list-item}
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
                      <div className={styles.student-item-overlay}></div>
                    )}
                    
                    <div className={styles.student-avatar-wrapper}>
                      <div className={styles.student-avatar}>
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
                          className={styles.student-avatar-frame}
                        />
                      )}
                    </div>
                    
                    <div className={styles.student-info}>
                      <strong className={`styled-username ${student.username_style || 'username-none'}`}>
                        {student.full_name || student.username}
                      </strong>
                      <small>{student.email}</small>
                      <div className={styles.student-points}><AiOutlineWallet className={styles.points-inline} /> {student.points || 0} баллов</div>
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
        <div className={styles.student-profile-modal-overlay} onClick={closeModal}>
          <div className={styles.student-profile-modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modal-close-btn} onClick={closeModal}>
              <AiOutlineClose />
            </button>

            {/* Баннер профиля */}
            <div 
              className={styles.modal-profile-banner}
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
              <div className={styles.modal-banner-overlay}></div>
            </div>

            {/* Аватар с рамкой */}
            <div className={styles.modal-avatar-section}>
              <div className={styles.modal-avatar-wrapper}>
                <div className={styles.modal-avatar}>
                  {selectedStudent.avatar_url ? (
                    <img src={`${BASE_URL}${selectedStudent.avatar_url}`} alt={selectedStudent.username} />
                  ) : (
                    <span className={styles.avatar-letter}>
                      {(selectedStudent.full_name || selectedStudent.username).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {getFrameImage(selectedStudent.avatar_frame) && (
                  <img 
                    src={getFrameImage(selectedStudent.avatar_frame)}
                    alt="Frame"
                    className={styles.modal-avatar-frame}
                  />
                )}
              </div>
              
              <div className={styles.modal-user-info}>
                <h2 className={`styled-username ${selectedStudent.username_style || 'username-none'}`}>
                  {selectedStudent.full_name || selectedStudent.username}
                </h2>
                <p className={styles.modal-username}>@{selectedStudent.username}</p>
              </div>
            </div>

            {/* Информация о студенте */}
            <div className={styles.modal-info-section}>
              <div className={styles.modal-stats}>
                <div className={styles.modal-stat-card}>
                  <div className={styles.stat-icon}>
                    <AiOutlineWallet />
                  </div>
                  <div className={styles.stat-info}>
                    <span className={styles.stat-value}>{selectedStudent.points || 0}</span>
                    <span className={styles.stat-label}>Баллов</span>
                  </div>
                </div>

                <div className={styles.modal-stat-card}>
                  <div className={styles.stat-icon}>
                    <AiOutlineTrophy />
                  </div>
                  <div className={styles.stat-info}>
                    <span className={styles.stat-value}>{selectedStudent.rank || 'Новичок'}</span>
                    <span className={styles.stat-label}>Ранг</span>
                  </div>
                </div>

                <div className={styles.modal-stat-card}>
                  <div className={styles.stat-icon}>
                    <AiOutlineStar />
                  </div>
                  <div className={styles.stat-info}>
                    <span className={styles.stat-value}>{selectedStudent.level || 1}</span>
                    <span className={styles.stat-label}>Уровень</span>
                  </div>
                </div>
              </div>

              <div className={styles.modal-details}>
                <h3>Информация</h3>
                <div className={styles.modal-details-grid}>
                  <div className={styles.detail-row}>
                    <span className={styles.detail-label}>Email:</span>
                    <span className={styles.detail-value}>{selectedStudent.email}</span>
                  </div>
                  {selectedStudent.phone && (
                    <div className={styles.detail-row}>
                      <span className={styles.detail-label}>Телефон:</span>
                      <span className={styles.detail-value}>{selectedStudent.phone}</span>
                    </div>
                  )}
                  <div className={styles.detail-row}>
                    <span className={styles.detail-label}>Статус:</span>
                    <span className={styles.detail-value}>
                      <span className={`status-badge ${selectedStudent.is_online ? 'online' : 'offline'}`}>
                        {selectedStudent.is_online ? 'Онлайн' : 'Офлайн'}
                      </span>
                    </span>
                  </div>
                  <div className={styles.detail-row}>
                    <span className={styles.detail-label}>Дата регистрации:</span>
                    <span className={styles.detail-value}>
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
                <div className={styles.modal-transfer-section}>
                  {!showTransferForm ? (
                    <button 
                      className={styles.transfer-points-btn}
                      onClick={() => setShowTransferForm(true)}
                    >
                      <AiOutlineSend />
                      Передать баллы
                    </button>
                  ) : (
                    <form className={styles.transfer-form} onSubmit={handleTransferPoints}>
                      <h3>Передать баллы</h3>
                      <p className={styles.transfer-info}>
                        Вы можете передать баллы пользователю {selectedStudent.full_name || selectedStudent.username}
                      </p>
                      <p className={styles.your-balance}>
                        Ваш баланс: <strong>{user.points} баллов</strong>
                      </p>
                      
                      <div className={styles.form-group}>
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

                      <div className={styles.form-group}>
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
                        <div className={styles.transfer-error}>
                          {transferError}
                        </div>
                      )}

                      <div className={styles.transfer-actions}>
                        <button 
                          type="button" 
                          className={styles.cancel-btn}
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
                          className={styles.submit-btn}
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
              <div className={styles.modal-cosmetics}>
                <h3>Активная косметика</h3>
                <div className={styles.cosmetics-grid}>
                  <div className={styles.cosmetic-item}>
                    <span className={styles.cosmetic-label}>Рамка аватара:</span>
                    <span className={styles.cosmetic-value}>
                      {selectedStudent.avatar_frame && selectedStudent.avatar_frame !== 'none' 
                        ? cosmetics.frames.find(f => f.item_key === selectedStudent.avatar_frame)?.name || 'Неизвестно'
                        : 'Не выбрано'}
                    </span>
                  </div>
                  <div className={styles.cosmetic-item}>
                    <span className={styles.cosmetic-label}>Баннер профиля:</span>
                    <span className={styles.cosmetic-value}>
                      {selectedStudent.profile_banner && selectedStudent.profile_banner !== 'default'
                        ? cosmetics.banners.find(b => b.item_key === selectedStudent.profile_banner)?.name || 'Неизвестно'
                        : 'По умолчанию'}
                    </span>
                  </div>
                  <div className={styles.cosmetic-item}>
                    <span className={styles.cosmetic-label}>Стиль никнейма:</span>
                    <span className={styles.cosmetic-value}>
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
