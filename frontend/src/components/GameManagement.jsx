import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../utils/api';
import GameCards from './GameCards';
import GameQuestions from './GameQuestions';
import styles from './GameManagement.module.css';
import { 
  FiPlay, FiUsers, FiGrid, FiHelpCircle, FiX, FiCheck,
  FiAlertCircle, FiRefreshCw, FiTrash2, FiSettings, FiAward
} from 'react-icons/fi';

function GameManagement() {
  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions', 'cards', 'questions'
  const [sessions, setSessions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [showGameModal, setShowGameModal] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [groupStudents, setGroupStudents] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [currentRound, setCurrentRound] = useState(null);
  const [drawnCard, setDrawnCard] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [showCardAnimation, setShowCardAnimation] = useState(false);
  const [allCards, setAllCards] = useState([]);
  const [scrollingCards, setScrollingCards] = useState([]);
  const [extraQuestionsCount, setExtraQuestionsCount] = useState(0); // Счетчик дополнительных вопросов
  const [notification, setNotification] = useState({ show: false, title: '', message: '', type: 'info' }); // Модальное уведомление

  useEffect(() => {
    fetchSessions();
    fetchGroups();
    fetchAllCards();
  }, []);

  const fetchAllCards = async () => {
    try {
      const response = await api.get('/game/cards');
      setAllCards(response.data.cards || []);
    } catch (error) {
      console.error('Ошибка загрузки карточек:', error);
    }
  };

  const showNotification = (title, message, type = 'info') => {
    setNotification({ show: true, title, message, type });
  };

  const closeNotification = () => {
    setNotification({ show: false, title: '', message: '', type: 'info' });
  };

  const fetchSessions = async () => {
    try {
      const response = await api.get('/game/sessions');
      setSessions(response.data.sessions);
    } catch (error) {
      console.error('Ошибка загрузки сессий:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await api.get('/groups');
      setGroups(response.data.groups);
    } catch (error) {
      console.error('Ошибка загрузки групп:', error);
    }
  };

  const openCreateModal = async (group) => {
    setSelectedGroup(group);
    
    // Загружаем студентов группы
    try {
      const response = await api.get(`/groups/${group.id}`);
      console.log('Ответ API группы:', response.data);
      setGroupStudents(response.data.group.students || []);
      setShowCreateModal(true);
    } catch (error) {
      console.error('Ошибка загрузки студентов:', error);
    }
  };

  const createSession = async () => {
    if (!selectedGroup) return;
    
    try {
      const response = await api.post('/game/sessions', {
        groupId: selectedGroup.id,
        totalRounds: 10
      });
      
      const session = response.data.session;
      setCurrentSession(session);
      setShowCreateModal(false);
      setShowPlayersModal(true);
      fetchSessions();
    } catch (error) {
      console.error('Ошибка создания сессии:', error);
    }
  };

  const togglePlayerSelection = (userId) => {
    setSelectedPlayers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const assignTeams = async () => {
    if (selectedPlayers.length < 2) {
      showNotification('Ошибка', 'Выберите минимум 2 игрока для формирования команд', 'warning');
      return;
    }

    try {
      await api.post(`/game/sessions/${currentSession.id}/assign-teams`, {
        userIds: selectedPlayers
      });
      
      showNotification('Успешно', 'Команды успешно сформированы и игра готова к запуску', 'success');
      setShowPlayersModal(false);
      fetchSessionDetails(currentSession.id);
    } catch (error) {
      console.error('Ошибка распределения команд:', error);
      showNotification('Ошибка', 'Не удалось сформировать команды', 'error');
    }
  };

  const fetchSessionDetails = async (sessionId) => {
    try {
      const response = await api.get(`/game/sessions/${sessionId}`);
      setCurrentSession(response.data.session);
    } catch (error) {
      console.error('Ошибка загрузки сессии:', error);
    }
  };

  const startGame = async (sessionId) => {
    try {
      await api.post(`/game/sessions/${sessionId}/start`);
      fetchSessionDetails(sessionId);
      openGameControl(sessionId);
    } catch (error) {
      console.error('Ошибка старта игры:', error);
    }
  };

  const openGameControl = async (sessionId) => {
    await fetchSessionDetails(sessionId);
    setShowGameModal(true);
    checkCurrentRound(sessionId);
  };

  const checkCurrentRound = async (sessionId) => {
    try {
      const response = await api.get(`/game/sessions/${sessionId}/current-round`);
      setCurrentRound(response.data.round);
    } catch (error) {
      console.error('Ошибка получения раунда:', error);
    }
  };

  const drawCard = async () => {
    if (!currentSession) return;
    
    try {
      const response = await api.get(`/game/sessions/${currentSession.id}/draw-card`);
      const { card, question } = response.data;
      
      // Проверка наличия вопроса
      if (!question) {
        showNotification('Нет вопросов', 'В базе данных нет доступных вопросов. Пожалуйста, добавьте вопросы в разделе "Вопросы".', 'warning');
        return;
      }
      
      setShowCardAnimation(true);
      
      // Создаем массив карточек для вертикальной прокрутки (слот-машина стиль)
      // Повторяем карточки 3 раза + добавляем выбранную в конец
      const shuffled = [...allCards].sort(() => Math.random() - 0.5);
      const reelCards = [...shuffled, ...shuffled, ...shuffled, card];
      
      setScrollingCards(reelCards);
      
      // Запускаем анимацию с CSS
      setTimeout(() => {
        const container = document.querySelector('.slot-reel');
        if (container) {
          // Вычисляем финальную позицию (последняя карточка)
          const cardHeight = 380; // высота карточки + gap
          const finalPosition = -(reelCards.length - 1) * cardHeight;
          
          container.style.setProperty('--final-position', `${finalPosition}px`);
          container.classList.add('spinning');
          
          // После завершения анимации показываем результат
          setTimeout(() => {
            setDrawnCard(card);
            setCurrentQuestion(question);
            setShowCardAnimation(false);
            setScrollingCards([]);
            
            // Создаем новый раунд
            createRound(card, question);
          }, 4000); // 4 секунды на анимацию
        }
      }, 100);
      
    } catch (error) {
      console.error('Ошибка вытягивания карточки:', error);
      setShowCardAnimation(false);
      setScrollingCards([]);
      showNotification('Ошибка', 'Не удалось вытянуть карточку. Проверьте подключение к серверу', 'error');
    }
  };

  const createRound = async (card, question) => {
    try {
      // Проверка наличия вопроса
      if (!question) {
        showNotification('Ошибка', 'Не удалось загрузить вопрос. Проверьте, что в базе данных есть вопросы', 'error');
        return;
      }

      // roundNumber будет вычислен автоматически на бэкенде
      const response = await api.post(`/game/sessions/${currentSession.id}/rounds`, {
        team: currentSession.current_team,
        cardId: card.id,
        questionId: question.id,
        question: question.question,
        timeLimit: card.card_type === 'time_bonus' ? 90 : 
                   card.card_type === 'minus_time' ? 45 : 60
      });
      
      setCurrentRound(response.data.round);
    } catch (error) {
      console.error('Ошибка создания раунда:', error);
      showNotification('Ошибка', 'Не удалось создать раунд', 'error');
    }
  };

  const answerCorrect = async () => {
    if (!currentRound) return;
    
    let points = 10;
    let notificationMessage = '';
    
    // Применяем эффект карточки
    if (drawnCard?.card_type === 'double_points') {
      points = 20;
      notificationMessage = 'Двойные очки! Команда получает +20 баллов';
    } else if (drawnCard?.card_type === 'steal_points') {
      points = 10;
      notificationMessage = 'Кража очков! +10 баллов команде, -5 противнику';
      // Отнимаем у другой команды
      const otherTeam = currentSession.current_team === 'team_a' ? 'team_b' : 'team_a';
      await api.post(`/game/sessions/${currentSession.id}/rounds`, {
        team: otherTeam,
        points: -5
      });
    } else if (drawnCard?.card_type === 'time_bonus') {
      points = 10;
      notificationMessage = 'Бонус времени! +10 баллов и дополнительное время на следующий вопрос';
    } else if (drawnCard?.card_type === 'minus_time') {
      points = 10;
      notificationMessage = 'Правильный ответ! +10 баллов, но ограничение времени на следующий вопрос';
    } else if (drawnCard?.card_type === 'skip_turn') {
      points = 0;
      notificationMessage = 'Пропуск хода! Ход переходит к противнику без начисления очков';
    } else if (drawnCard?.card_type === 'transfer_question') {
      points = 10;
      notificationMessage = 'Правильный ответ! +10 баллов (вопрос не был передан)';
    } else if (drawnCard?.card_type === 'extra_questions') {
      points = 10;
      notificationMessage = 'Правильный ответ! +10 баллов';
    } else {
      notificationMessage = 'Правильный ответ! Команда получает +10 баллов';
    }
    
    if (notificationMessage) {
      showNotification('Правильный ответ', notificationMessage, 'success');
    }
    
    try {
      await api.post(`/game/rounds/${currentRound.id}/answer-correct`, {
        answer: 'Правильный ответ (проверено админом)',
        points
      });
      
      await handleNextRound();
    } catch (error) {
      console.error('Ошибка ответа:', error);
      showNotification('Ошибка', 'Не удалось сохранить ответ', 'error');
    }
  };

  const answerWrong = async () => {
    if (!currentRound) return;
    
    showNotification('Неправильный ответ', 'Ответ неверный. Команда получает -5 баллов', 'error');
    
    try {
      await api.post(`/game/rounds/${currentRound.id}/answer-wrong`, {
        answer: 'Неправильный ответ',
        points: -5
      });
      
      await handleNextRound();
    } catch (error) {
      console.error('Ошибка ответа:', error);
      showNotification('Ошибка', 'Не удалось сохранить ответ', 'error');
    }
  };

  const handleNextRound = async () => {
    // Проверяем специальные карточки
    if (drawnCard?.card_type === 'extra_questions' && extraQuestionsCount === 0) {
      // Активируем режим дополнительных вопросов
      setExtraQuestionsCount(3);
      showNotification('Дополнительные вопросы', 'Команде выпало 3 дополнительных вопроса подряд', 'success');
    }
    
    setDrawnCard(null);
    setCurrentQuestion(null);
    setCurrentRound(null);
    
    // Если есть дополнительные вопросы, уменьшаем счетчик и НЕ переключаем команду
    if (extraQuestionsCount > 0) {
      setExtraQuestionsCount(extraQuestionsCount - 1);
      // Обновляем данные сессии без переключения хода
      await fetchSessionDetails(currentSession.id);
      
      if (extraQuestionsCount === 1) {
        showNotification('Бонус завершен', 'Дополнительные вопросы закончились. Ход переходит к другой команде', 'info');
        // Теперь переключаем ход
        await api.post(`/game/sessions/${currentSession.id}/next-turn`);
        await fetchSessionDetails(currentSession.id);
      }
    } else {
      // Обычное переключение хода
      await api.post(`/game/sessions/${currentSession.id}/next-turn`);
      await fetchSessionDetails(currentSession.id);
    }
    
    // Игра продолжается до ручного завершения
    // Автоматическое завершение убрано
  };

  const finishGame = async () => {
    if (!confirm('Завершить игру?')) return;
    
    try {
      const response = await api.post(`/game/sessions/${currentSession.id}/finish`);
      
      const winnerText = response.data.winner === 'team_a' ? 'Команда А' : 
                        response.data.winner === 'team_b' ? 'Команда Б' : 
                        'Ничья';
      
      showNotification('Игра завершена', `Победитель: ${winnerText}`, 'success');
      
      setTimeout(() => {
        setShowGameModal(false);
        setCurrentSession(null);
        fetchSessions();
      }, 2000);
    } catch (error) {
      console.error('Ошибка завершения игры:', error);
      showNotification('Ошибка', 'Не удалось завершить игру', 'error');
    }
  };

  const deleteSession = async (id) => {
    if (!confirm('Удалить эту игру?')) return;
    
    try {
      await api.delete(`/game/sessions/${id}`);
      fetchSessions();
    } catch (error) {
      console.error('Ошибка удаления сессии:', error);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderIcon}>
          <FiPlay size={32} />
        </div>
        <div className={styles.pageHeaderContent}>
          <h1 className={styles.pageTitle}>Управление Игрой</h1>
          <p className={styles.pageDescription}>Создание и управление игровыми сессиями</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'sessions' ? styles.active : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          <FiPlay size={18} />
          Игры
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'cards' ? styles.active : ''}`}
          onClick={() => setActiveTab('cards')}
        >
          <FiGrid size={18} />
          Карточки
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'questions' ? styles.active : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          <FiHelpCircle size={18} />
          Вопросы
        </button>
      </div>

      {activeTab === 'sessions' && (
        <div className={styles.sessionsTab}>
          <h2 className={styles.sectionTitle}>
            <FiPlay size={24} />
            Игровые сессии
          </h2>

          <h3 className={styles.subsectionTitle}>
            Выберите группу для создания игры:
          </h3>
          <div className={styles.groupsGrid}>
            {groups.map(group => (
              <div key={group.id} className={styles.groupCard}>
                <h4 className={styles.groupName}>{group.name}</h4>
                <p className={styles.groupInfo}>
                  <FiUsers size={16} />
                  Студентов: {group.member_count || 0}
                </p>
                <button 
                  className={styles.btnCreate}
                  onClick={() => openCreateModal(group)}
                >
                  <FiPlay size={16} />
                  Создать игру
                </button>
              </div>
            ))}
          </div>

          <h3 className={styles.subsectionTitle}>
            Активные и завершенные игры:
          </h3>
          <div className={styles.sessionsList}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Группа</th>
                  <th>Статус</th>
                  <th>Счет</th>
                  <th>Игроков</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(session => (
                  <tr key={session.id}>
                    <td>{session.group_name}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[session.status]}`}>
                        {session.status === 'preparing' ? 'Подготовка' :
                         session.status === 'in_progress' ? 'В процессе' : 'Завершена'}
                      </span>
                    </td>
                    <td>
                      <span className={styles.score}>
                        А {session.team_a_score} : {session.team_b_score} Б
                      </span>
                    </td>
                    <td>
                      <FiUsers size={14} style={{ marginRight: '4px' }} />
                      {session.player_count}
                    </td>
                    <td className={styles.actions}>
                      {session.status === 'preparing' && (
                        <button 
                          onClick={() => startGame(session.id)}
                          className={styles.btnStart}
                        >
                          <FiPlay size={16} />
                          Старт
                        </button>
                      )}
                      {session.status === 'in_progress' && (
                        <button 
                          onClick={() => openGameControl(session.id)}
                          className={styles.btnControl}
                        >
                          <FiSettings size={16} />
                          Управление
                        </button>
                      )}
                      <button 
                        onClick={() => deleteSession(session.id)}
                        className={styles.btnDelete}
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'cards' && <GameCards />}
      {activeTab === 'questions' && <GameQuestions />}

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Создать игру для группы: {selectedGroup?.name}</h3>
              <button className={styles.modalClose} onClick={() => setShowCreateModal(false)}>
                <FiX size={20} />
              </button>
            </div>
            <p className={styles.modalText}>
              <FiUsers size={16} />
              Студентов в группе: {groupStudents.length}
            </p>
            
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setShowCreateModal(false)}>
                Отмена
              </button>
              <button className={styles.btnConfirm} onClick={createSession}>
                <FiPlay size={16} />
                Создать игру
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Players Selection Modal */}
      {showPlayersModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPlayersModal(false)}>
          <div className={`${styles.modalContent} ${styles.large}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Выберите игроков</h3>
              <button className={styles.modalClose} onClick={() => setShowPlayersModal(false)}>
                <FiX size={20} />
              </button>
            </div>
            <p className={styles.modalText}>
              <FiUsers size={16} />
              Выбрано: {selectedPlayers.length} игроков
            </p>
            
            <div className={styles.playersList}>
              {groupStudents.map(student => (
                <div 
                  key={student.id} 
                  className={`${styles.playerItem} ${selectedPlayers.includes(student.id) ? styles.selected : ''}`}
                  onClick={() => togglePlayerSelection(student.id)}
                >
                  <span>{student.full_name || student.username}</span>
                  {selectedPlayers.includes(student.id) && (
                    <span className={styles.checkmark}>
                      <FiCheck size={18} />
                    </span>
                  )}
                </div>
              ))}
            </div>
            
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setShowPlayersModal(false)}>
                Отмена
              </button>
              <button 
                className={styles.btnConfirm}
                onClick={assignTeams}
                disabled={selectedPlayers.length < 2}
              >
                <FiUsers size={16} />
                Разделить на команды ({selectedPlayers.length} игроков)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Control Modal */}
      {showGameModal && currentSession && (
        <div className={styles.gameControlModal}>
          <div className={styles.gameModalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setShowGameModal(false)}>✕</button>
            
            <div className={styles.gameHeader}>
              <h2><FiPlay size={24} /> Игра: {currentSession.group_name}</h2>
              <div className={styles.gameInfo}>
                <span className={styles.scoreDisplay}>
                  А Команда: {currentSession.team_a_score} | Команда Б: {currentSession.team_b_score}
                </span>
              </div>
            </div>

            <div className={styles.currentTeamDisplay}>
              <h3>
                Ход: {currentSession.current_team === 'team_a' ? 'А Команда' : 'Б Команда'}
                {extraQuestionsCount > 0 && (
                  <span className={styles.extraQuestionsBadge}>
                    <FiAward size={16} /> Дополнительные вопросы: {extraQuestionsCount}
                  </span>
                )}
              </h3>
            </div>

            {showCardAnimation && scrollingCards.length > 0 && (
              <div className={styles.slotMachineOverlay}>
                <div className={styles.slotMachineContainer}>
                  <div className={styles.slotWindow}>
                    <div className={styles.slotReel}>
                      {scrollingCards.map((card, index) => (
                        <div 
                          key={`${card.id}-${index}`} 
                          className={styles.slotCard}
                        >
                          <div className={styles.cardInner}>
                            {card.image_url ? (
                              <img src={`${BASE_URL}${card.image_url}`} alt={card.name} />
                            ) : (
                              <div className={styles.cardPlaceholder}>
                                <FiGrid size={48} />
                              </div>
                            )}
                            <div className={styles.cardName}>{card.name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={styles.slotIndicatorLine}></div>
                  <p className={styles.slotText}>КРУТИМ</p>
                </div>
              </div>
            )}

            {!currentRound && !drawnCard && !showCardAnimation && (
              <div className={styles.roundActions}>
                <button onClick={drawCard}>
                  <FiRefreshCw size={20} /> Вытянуть карточку
                </button>
              </div>
            )}

            {drawnCard && (
              <div className={styles.drawnCardDisplay}>
                <div className={styles.cardLarge}>
                  {drawnCard.image_url ? (
                    <img src={`${BASE_URL}${drawnCard.image_url}`} alt={drawnCard.name} />
                  ) : (
                    <div className={styles.cardPlaceholder}>
                      <FiGrid size={48} />
                    </div>
                  )}
                  <h3>{drawnCard.name}</h3>
                  <p>{drawnCard.description}</p>
                  <div className={styles.cardEffect}>
                    Эффект: {drawnCard.effect_value > 0 ? '+' : ''}{drawnCard.effect_value}
                  </div>
                </div>
              </div>
            )}

            {currentQuestion && (
              <div className={styles.questionDisplay}>
                <h3><FiHelpCircle size={20} /> Вопрос:</h3>
                <p className={styles.questionText}>{currentQuestion.question}</p>
                
                <div className={styles.answerControls}>
                  <button className={styles.btnSuccess} onClick={answerCorrect}>
                    <FiCheck size={18} /> Правильный ответ
                  </button>
                  <button className={styles.btnDanger} onClick={answerWrong}>
                    <FiX size={18} /> Неправильный ответ
                  </button>
                </div>
              </div>
            )}

            <div className={styles.gameControls}>
              <button className={styles.btnDanger} onClick={finishGame}>
                <FiX size={20} /> Завершить игру
              </button>
            </div>

            {/* Teams Display */}
            <div className={styles.teamsDisplay}>
              <div className={`${styles.team} ${styles.teamA}`}>
                <h3>
                  <span>А Команда</span>
                  <span className={styles.score}>{currentSession.team_a_score}</span>
                </h3>
                <ul>
                  {currentSession.participants
                    ?.filter(p => p.team === 'team_a')
                    .map(p => (
                      <li key={p.id}>
                        <FiUsers size={14} />
                        {p.full_name || p.username}
                      </li>
                    ))}
                </ul>
              </div>
              
              <div className={`${styles.team} ${styles.teamB}`}>
                <h3>
                  <span>Б Команда</span>
                  <span className={styles.score}>{currentSession.team_b_score}</span>
                </h3>
                <ul>
                  {currentSession.participants
                    ?.filter(p => p.team === 'team_b')
                    .map(p => (
                      <li key={p.id}>
                        <FiUsers size={14} />
                        {p.full_name || p.username}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {notification.show && (
        <div className={styles.notificationOverlay} onClick={closeNotification}>
          <div className={`${styles.notificationModal} ${styles[notification.type]}`} onClick={(e) => e.stopPropagation()}>
            <button className={styles.notificationClose} onClick={closeNotification}>
              <FiX size={20} />
            </button>
            <div className={styles.notificationHeader}>
              {notification.type === 'success' && <FiCheck size={32} />}
              {notification.type === 'error' && <FiX size={32} />}
              {notification.type === 'warning' && <FiAlertCircle size={32} />}
              {notification.type === 'info' && <FiAlertCircle size={32} />}
              <h3>{notification.title}</h3>
            </div>
            <div className={styles.notificationBody}>
              <p>{notification.message}</p>
            </div>
            <div className={styles.notificationFooter}>
              <button className={styles.btnPrimary} onClick={closeNotification}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameManagement;
