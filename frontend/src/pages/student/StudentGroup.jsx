import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { BASE_URL } from '../../utils/api';
import '../../styles/UsernameStyles.css';
import styles from './StudentGroup.module.css';
import {
  AiOutlineWallet,
  AiOutlineClose,
  AiOutlineTrophy,
  AiOutlineStar,
  AiOutlineSend,
  AiOutlineTeam,
  AiOutlineLineChart,
  AiOutlineCode,
  AiOutlineCheckCircle,
  AiOutlineCrown,
  AiOutlineUser,
  AiOutlineCalendar,
  AiOutlineMail,
  AiOutlinePhone,
} from 'react-icons/ai';
import { FaMedal, FaUsers, FaRegGem } from 'react-icons/fa';

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
  const [groupStats, setGroupStats] = useState({
    totalPoints: 0,
    totalProjects: 0,
    completedTasks: 0,
    averageLevel: 0
  });

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
      calculateGroupStats(response.data.group);
    } catch (error) {
      console.error('Ошибка загрузки информации о группе:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateGroupStats = (group) => {
    if (!group || !group.students || group.students.length === 0) {
      return;
    }

    const totalPoints = group.students.reduce((sum, student) => sum + (student.points || 0), 0);
    const totalProjects = group.students.length * 3; // Моковые данные
    const completedTasks = group.students.length * 8; // Моковые данные
    const averageLevel = Math.round(group.students.reduce((sum, student) => sum + (student.level || 1), 0) / group.students.length);

    setGroupStats({
      totalPoints,
      totalProjects,
      completedTasks,
      averageLevel
    });
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
      <div className={styles['group-page']}>
        <div className={styles['spinner-wrap']}>
          <div className={styles['spinner']} />
        </div>
      </div>
    );
  }

  if (!groupInfo) {
    return (
      <div className={styles['group-page']}>
        <div className={styles['empty-state']}>
          <FaUsers className={styles['empty-icon']} />
          <h3>Вы не состоите в группе</h3>
          <p>Обратитесь к администратору для добавления в группу</p>
        </div>
      </div>
    );
  }

  const sortedStudents = groupInfo?.students
    ? [...groupInfo.students].sort((a, b) => (b.points || 0) - (a.points || 0))
    : [];
  const topStudent = sortedStudents[0];
  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

  return (
    <div className={styles['group-page']}>

      {/* ── PAGE HEADER ── */}
      <div className={styles['page-header']}>
        <div className={styles['page-header-icon']}><FaUsers /></div>
        <div>
          <h1 className={styles['page-title']}>{groupInfo.name}</h1>
          <p className={styles['page-sub']}>Моя группа · {sortedStudents.length} участников</p>
        </div>
      </div>

      {/* ── STAT TILES ── */}
      <div className={styles['stats-row']}>
        <div className={styles['stat-tile']}>
          <span className={styles['stat-tile-icon']}><AiOutlineWallet /></span>
          <span className={styles['stat-tile-val']}>{groupStats.totalPoints.toLocaleString()}</span>
          <span className={styles['stat-tile-label']}>Всего баллов</span>
        </div>
        <div className={styles['stat-tile']}>
          <span className={styles['stat-tile-icon']}><AiOutlineCode /></span>
          <span className={styles['stat-tile-val']}>{groupStats.totalProjects}</span>
          <span className={styles['stat-tile-label']}>Проектов</span>
        </div>
        <div className={styles['stat-tile']}>
          <span className={styles['stat-tile-icon']}><AiOutlineCheckCircle /></span>
          <span className={styles['stat-tile-val']}>{groupStats.completedTasks}</span>
          <span className={styles['stat-tile-label']}>Заданий выполнено</span>
        </div>
        <div className={styles['stat-tile']}>
          <span className={styles['stat-tile-icon']}><AiOutlineStar /></span>
          <span className={styles['stat-tile-val']}>{groupStats.averageLevel}</span>
          <span className={styles['stat-tile-label']}>Средний уровень</span>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className={styles['main-grid']}>

        {/* LEFT COLUMN */}
        <div className={styles['left-col']}>

          {/* Group info card */}
          <div className={styles['card']}>
            <div className={styles['card-header']}>
              <span className={styles['card-header-icon']}><AiOutlineTeam /></span>
              Информация о группе
            </div>
            <ul className={styles['info-list']}>
              <li className={styles['info-row']}>
                <span className={styles['info-key']}>Название</span>
                <span className={styles['info-val']}>{groupInfo.name}</span>
              </li>
              {groupInfo.description && (
                <li className={styles['info-row']}>
                  <span className={styles['info-key']}>Описание</span>
                  <span className={styles['info-val']}>{groupInfo.description}</span>
                </li>
              )}
              <li className={styles['info-row']}>
                <span className={styles['info-key']}>Студентов</span>
                <span className={styles['info-val']}>{groupInfo.students?.length || 0}</span>
              </li>
              <li className={styles['info-row']}>
                <span className={styles['info-key']}>Создана</span>
                <span className={styles['info-val']}>
                  {new Date(groupInfo.created_at).toLocaleDateString('ru-RU')}
                </span>
              </li>
            </ul>
          </div>

          {/* Leader card */}
          {topStudent && (
            <div className={styles['card']}>
              <div className={styles['card-header']}>
                <span className={styles['card-header-icon']}><AiOutlineCrown /></span>
                Лидер группы
              </div>
              <div
                className={styles['leader-card']}
                onClick={() => openStudentProfile(topStudent)}
              >
                <div className={styles['leader-avatar-wrap']}>
                  <div className={styles['leader-avatar']}>
                    {topStudent.avatar_url ? (
                      <img src={`${BASE_URL}${topStudent.avatar_url}`} alt={topStudent.username} />
                    ) : (
                      (topStudent.full_name || topStudent.username).charAt(0).toUpperCase()
                    )}
                  </div>
                  {getFrameImage(topStudent.avatar_frame) && (
                    <img
                      src={getFrameImage(topStudent.avatar_frame)}
                      alt="Frame"
                      className={styles['leader-frame']}
                    />
                  )}
                  <span className={styles['leader-crown']}><FaMedal /></span>
                </div>
                <div className={styles['leader-info']}>
                  <span className={`styled-username ${topStudent.username_style || 'username-none'} ${styles['leader-name']}`}>
                    {topStudent.full_name || topStudent.username}
                  </span>
                  <span className={styles['leader-pts']}>
                    <AiOutlineWallet /> {(topStudent.points || 0).toLocaleString()} баллов
                  </span>
                  <span className={styles['leader-lvl']}>
                    <AiOutlineStar /> Уровень {topStudent.level || 1}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — Students list */}
        <div className={styles['right-col']}>
          <div className={styles['card']}>
            <div className={styles['card-header']}>
              <span className={styles['card-header-icon']}><FaUsers /></span>
              Рейтинг участников
              <span className={styles['member-count-badge']}>{sortedStudents.length}</span>
            </div>

            {sortedStudents.length === 0 ? (
              <div className={styles['empty-state']}>
                <AiOutlineTeam className={styles['empty-icon']} />
                <p>Нет студентов</p>
              </div>
            ) : (
              <ul className={styles['students-list']}>
                {sortedStudents.map((student, index) => {
                  const frameImage = getFrameImage(student.avatar_frame);
                  const bannerImage = getBannerImage(student.profile_banner);
                  const isMe = student.id === user.id;

                  return (
                    <li
                      key={student.id}
                      className={`${styles['student-row']} ${isMe ? styles['student-row--me'] : ''}`}
                      onClick={() => openStudentProfile(student)}
                    >
                      {bannerImage && (
                        <div
                          className={styles['student-row-bg']}
                          style={{ backgroundImage: `url(${bannerImage})` }}
                        />
                      )}
                      <span
                        className={styles['student-rank']}
                        style={{ color: index < 3 ? rankColors[index] : 'var(--text-secondary)' }}
                      >
                        {index < 3 ? <FaMedal /> : `#${index + 1}`}
                      </span>
                      <div className={styles['student-av-wrap']}>
                        <div className={styles['student-av']}>
                          {student.avatar_url ? (
                            <img src={`${BASE_URL}${student.avatar_url}`} alt={student.username} />
                          ) : (
                            (student.full_name || student.username).charAt(0).toUpperCase()
                          )}
                        </div>
                        {frameImage && (
                          <img src={frameImage} alt="Frame" className={styles['student-av-frame']} />
                        )}
                        <span className={styles['online-dot']} data-online={student.is_online ? 'true' : 'false'} />
                      </div>
                      <div className={styles['student-meta']}>
                        <span className={`styled-username ${student.username_style || 'username-none'} ${styles['student-name']}`}>
                          {student.full_name || student.username}
                          {isMe && <span className={styles['me-badge']}>Вы</span>}
                        </span>
                        <span className={styles['student-email']}>{student.email}</span>
                      </div>
                      <div className={styles['student-pts']}>
                        <span className={styles['pts-val']}>{(student.points || 0).toLocaleString()}</span>
                        <span className={styles['pts-label']}>баллов</span>
                      </div>
                      <div className={styles['student-lv']}>
                        <AiOutlineStar />
                        <span>{student.level || 1}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── STUDENT PROFILE MODAL ── */}
      {showModal && selectedStudent && (
        <div className={styles['modal-overlay']} onClick={closeModal}>
          <div className={styles['modal']} onClick={(e) => e.stopPropagation()}>

            <div
              className={styles['modal-banner']}
              style={{
                backgroundImage: getBannerImage(selectedStudent.profile_banner)
                  ? `url(${getBannerImage(selectedStudent.profile_banner)})`
                  : selectedStudent.profile_banner === 'default'
                    ? 'linear-gradient(135deg, var(--accent) 0%, #764ba2 100%)'
                    : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className={styles['modal-banner-overlay']} />
              <button className={styles['modal-close']} onClick={closeModal}>
                <AiOutlineClose />
              </button>
            </div>

            <div className={styles['modal-head']}>
              <div className={styles['modal-av-wrap']}>
                <div className={styles['modal-av']}>
                  {selectedStudent.avatar_url ? (
                    <img src={`${BASE_URL}${selectedStudent.avatar_url}`} alt={selectedStudent.username} />
                  ) : (
                    (selectedStudent.full_name || selectedStudent.username).charAt(0).toUpperCase()
                  )}
                </div>
                {getFrameImage(selectedStudent.avatar_frame) && (
                  <img
                    src={getFrameImage(selectedStudent.avatar_frame)}
                    alt="Frame"
                    className={styles['modal-av-frame']}
                  />
                )}
              </div>
              <div className={styles['modal-identity']}>
                <h2 className={`styled-username ${selectedStudent.username_style || 'username-none'}`}>
                  {selectedStudent.full_name || selectedStudent.username}
                </h2>
                <p className={styles['modal-at']}>@{selectedStudent.username}</p>
                <span className={`${styles['modal-status']} ${selectedStudent.is_online ? styles['status-online'] : styles['status-offline']}`}>
                  {selectedStudent.is_online ? 'Онлайн' : 'Офлайн'}
                </span>
              </div>
            </div>

            <div className={styles['modal-body']}>

              <div className={styles['modal-stats']}>
                <div className={styles['modal-stat']}>
                  <span className={styles['modal-stat-icon']}><AiOutlineWallet /></span>
                  <span className={styles['modal-stat-val']}>{(selectedStudent.points || 0).toLocaleString()}</span>
                  <span className={styles['modal-stat-lbl']}>Баллов</span>
                </div>
                <div className={styles['modal-stat']}>
                  <span className={styles['modal-stat-icon']}><AiOutlineTrophy /></span>
                  <span className={styles['modal-stat-val']}>{selectedStudent.rank || 'Новичок'}</span>
                  <span className={styles['modal-stat-lbl']}>Ранг</span>
                </div>
                <div className={styles['modal-stat']}>
                  <span className={styles['modal-stat-icon']}><AiOutlineStar /></span>
                  <span className={styles['modal-stat-val']}>{selectedStudent.level || 1}</span>
                  <span className={styles['modal-stat-lbl']}>Уровень</span>
                </div>
              </div>

              <div className={styles['modal-section']}>
                <h3 className={styles['modal-section-title']}>Информация</h3>
                <ul className={styles['modal-info-list']}>
                  <li className={styles['modal-info-row']}>
                    <span className={styles['modal-info-icon']}><AiOutlineMail /></span>
                    <span className={styles['modal-info-key']}>Email</span>
                    <span className={styles['modal-info-val']}>{selectedStudent.email}</span>
                  </li>
                  {selectedStudent.phone && (
                    <li className={styles['modal-info-row']}>
                      <span className={styles['modal-info-icon']}><AiOutlinePhone /></span>
                      <span className={styles['modal-info-key']}>Телефон</span>
                      <span className={styles['modal-info-val']}>{selectedStudent.phone}</span>
                    </li>
                  )}
                  <li className={styles['modal-info-row']}>
                    <span className={styles['modal-info-icon']}><AiOutlineCalendar /></span>
                    <span className={styles['modal-info-key']}>Регистрация</span>
                    <span className={styles['modal-info-val']}>
                      {new Date(selectedStudent.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </span>
                  </li>
                </ul>
              </div>

              <div className={styles['modal-section']}>
                <h3 className={styles['modal-section-title']}>
                  <FaRegGem style={{ marginRight: 6 }} />Косметика
                </h3>
                <div className={styles['cosmetics-grid']}>
                  <div className={styles['cosmetic-chip']}>
                    <span className={styles['cosmetic-chip-label']}>Рамка</span>
                    <span className={styles['cosmetic-chip-val']}>
                      {selectedStudent.avatar_frame && selectedStudent.avatar_frame !== 'none'
                        ? cosmetics.frames.find(f => f.item_key === selectedStudent.avatar_frame)?.name || 'Неизвестно'
                        : 'Без рамки'}
                    </span>
                  </div>
                  <div className={styles['cosmetic-chip']}>
                    <span className={styles['cosmetic-chip-label']}>Баннер</span>
                    <span className={styles['cosmetic-chip-val']}>
                      {selectedStudent.profile_banner && selectedStudent.profile_banner !== 'default'
                        ? cosmetics.banners.find(b => b.item_key === selectedStudent.profile_banner)?.name || 'Неизвестно'
                        : 'По умолчанию'}
                    </span>
                  </div>
                  <div className={styles['cosmetic-chip']}>
                    <span className={styles['cosmetic-chip-label']}>Никнейм</span>
                    <span className={styles['cosmetic-chip-val']}>
                      {selectedStudent.username_style && selectedStudent.username_style !== 'username-none'
                        ? selectedStudent.username_style.replace('username-', '').toUpperCase()
                        : 'Обычный'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedStudent.id !== user.id && (
                <div className={styles['modal-section']}>
                  {!showTransferForm ? (
                    <button className={styles['btn-transfer']} onClick={() => setShowTransferForm(true)}>
                      <AiOutlineSend /> Передать баллы
                    </button>
                  ) : (
                    <form className={styles['transfer-form']} onSubmit={handleTransferPoints}>
                      <h3 className={styles['modal-section-title']}>Передать баллы</h3>
                      <p className={styles['transfer-desc']}>
                        Получатель: <strong>{selectedStudent.full_name || selectedStudent.username}</strong>
                      </p>
                      <p className={styles['transfer-balance']}>
                        Ваш баланс: <strong>{user.points} баллов</strong>
                      </p>
                      <div className={styles['form-group']}>
                        <label>Количество баллов</label>
                        <input
                          type="number" min="1" max={user.points}
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          placeholder="Введите количество"
                          required disabled={transfering}
                        />
                      </div>
                      <div className={styles['form-group']}>
                        <label>Сообщение (необязательно)</label>
                        <textarea
                          value={transferMessage}
                          onChange={(e) => setTransferMessage(e.target.value)}
                          placeholder="Добавьте сообщение..."
                          rows="3" disabled={transfering}
                        />
                      </div>
                      {transferError && <div className={styles['transfer-error']}>{transferError}</div>}
                      <div className={styles['transfer-actions']}>
                        <button
                          type="button" className={styles['btn-ghost']}
                          onClick={() => { setShowTransferForm(false); setTransferAmount(''); setTransferMessage(''); setTransferError(''); }}
                          disabled={transfering}
                        >Отмена</button>
                        <button type="submit" className={styles['btn-primary']} disabled={transfering || !transferAmount}>
                          {transfering ? 'Отправка...' : 'Отправить'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentGroup;
