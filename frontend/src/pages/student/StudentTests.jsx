import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
  FaFileAlt, FaChartBar, FaClipboardList, FaCheckCircle, FaTimes,
  FaTrophy, FaExclamationTriangle, FaBan, FaHistory, FaShieldAlt,
} from 'react-icons/fa';
import {
  AiOutlineClockCircle, AiOutlineLoading3Quarters, AiOutlineBook,
  AiOutlineStar, AiOutlineBarChart, AiOutlineThunderbolt,
} from 'react-icons/ai';
import { MdOutlineQuiz, MdLockClock } from 'react-icons/md';
import { HiOutlineStatusOnline } from 'react-icons/hi';
import styles from './StudentTests.module.css';
import { useAntiCheat } from '../../hooks/useAntiCheat';
import WatermarkLayer from '../../components/protection/WatermarkLayer';
import AntiPhotoOverlay from '../../components/protection/AntiPhotoOverlay';

// Unique ID for this browser tab (session-scoped)
const TAB_ID = Math.random().toString(36).slice(2);
const LOCK_PREFIX = 'test_lock_';
const BC_CHANNEL = 'student_tests_channel';
const TAB_SWITCH_LIMIT = 5; // synced with useAntiCheat

function StudentTests() {
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTest, setActiveTest] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [blockedByOtherTab, setBlockedByOtherTab] = useState(false);
  const [blockedTestId, setBlockedTestId] = useState(null);
  const channelRef = useRef(null);
  const activeTestRef = useRef(null);

  // Anti-cheat system — активируется только во время прохождения теста
  const handleForceSubmit = useCallback(() => {
    if (activeTestRef.current && attempt) {
      // Auto-complete the test due to violations
      confirmComplete();
    }
  }, [attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const { blurred, contentHidden, contentFadingOut, violationCount } = useAntiCheat({
    enabled: !!(activeTest && attempt),
    attemptId: attempt?.id ?? null,
    onForceSubmit: handleForceSubmit,
  });

  // Keep ref in sync for use inside event listeners
  useEffect(() => { activeTestRef.current = activeTest; }, [activeTest]);

  // Setup BroadcastChannel for cross-tab communication
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      channelRef.current = new BroadcastChannel(BC_CHANNEL);
      channelRef.current.onmessage = (e) => {
        const { type, testId, tabId } = e.data;
        if (type === 'test_locked' && tabId !== TAB_ID) {
          const cur = activeTestRef.current;
          if (cur && cur.id === testId) setBlockedByOtherTab(true);
        }
        if (type === 'test_released' && tabId !== TAB_ID) {
          setBlockedByOtherTab(false);
        }
      };
    }

    // Fallback: storage event (for Safari / older browsers)
    const handleStorage = (e) => {
      if (!e.key || !e.key.startsWith(LOCK_PREFIX)) return;
      const testId = parseInt(e.key.replace(LOCK_PREFIX, ''));
      const cur = activeTestRef.current;
      if (e.newValue) {
        const lock = JSON.parse(e.newValue);
        if (lock.tabId !== TAB_ID && cur && cur.id === testId) setBlockedByOtherTab(true);
      } else {
        // Lock released
        setBlockedByOtherTab(false);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      channelRef.current?.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Release lock when tab/window closes
  useEffect(() => {
    const handleUnload = () => {
      const cur = activeTestRef.current;
      if (cur) releaseTestLock(cur.id);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // Acquire lock — returns false if another tab already holds it
  const acquireTestLock = (testId) => {
    const key = LOCK_PREFIX + testId;
    const raw = localStorage.getItem(key);
    if (raw) {
      const lock = JSON.parse(raw);
      if (lock.tabId !== TAB_ID) {
        const age = Date.now() - lock.timestamp;
        if (age < 5 * 60 * 1000) return false; // stale check: 5 min
      }
    }
    localStorage.setItem(key, JSON.stringify({ tabId: TAB_ID, timestamp: Date.now() }));
    channelRef.current?.postMessage({ type: 'test_locked', testId, tabId: TAB_ID });
    return true;
  };

  const releaseTestLock = (testId) => {
    localStorage.removeItem(LOCK_PREFIX + testId);
    channelRef.current?.postMessage({ type: 'test_released', testId, tabId: TAB_ID });
  };

  useEffect(() => {
    loadAssignedTests();
    loadHistory();
  }, []);

  // Timer
  useEffect(() => {
    if (activeTest && attempt && activeTest.time_limit > 0) {
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { handleComplete(); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeTest, attempt]);

  const loadAssignedTests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tests/student/assigned');
      setTests(response.data.tests);
    } catch (error) { console.error('Ошибка загрузки тестов:', error); }
    finally { setLoading(false); }
  };

  const loadHistory = async () => {
    try {
      const response = await api.get('/tests/student/history');
      setHistory(response.data.history);
    } catch (error) { console.error('Ошибка загрузки истории:', error); }
  };

  const startTest = async (test) => {
    // Anti-duplicate-tab check
    if (!acquireTestLock(test.id)) {
      setBlockedTestId(test.id);
      setBlockedByOtherTab(true);
      return;
    }

    try {
      const completedAttempts = history.filter(h => h.test_id === test.id && h.status === 'completed');
      if (completedAttempts.length > 0 && !test.can_retry) {
        releaseTestLock(test.id);
        return;
      }
      const testResponse = await api.get(`/tests/${test.id}`);
      const fullTest = testResponse.data.test;
      const attemptResponse = await api.post(`/tests/${test.id}/start`);
      setActiveTest(fullTest);
      setAttempt(attemptResponse.data.attempt);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setShowResult(false);
      setBlockedByOtherTab(false);
      if (fullTest.time_limit > 0) setTimeLeft(fullTest.time_limit * 60);
    } catch (error) {
      console.error('Ошибка начала теста:', error);
      releaseTestLock(test.id);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleCodeChange = (questionId, code) => {
    setAnswers({ ...answers, [questionId]: { code } });
  };

  const saveAnswer = async (questionId) => {
    const answer = answers[questionId];
    if (!answer) return;
    try {
      const question = activeTest.questions.find(q => q.id === questionId);
      let answerData = {};
      if (question.question_type === 'choice') {
        answerData = { selected_option_id: parseInt(answer), answer_text: null, code_answer: null };
      } else if (question.question_type === 'code') {
        const checkResponse = await api.post('/tests/check-code', {
          code: answer.code,
          solution: question.code_solution,
          language: question.code_language,
        });
        answerData = {
          code_answer: answer.code,
          is_correct: checkResponse.data.isCorrect,
          answer_text: checkResponse.data.isCorrect ? 'Правильно' : 'Неправильно',
        };
      }
      await api.post(`/tests/attempt/${attempt.id}/answer`, { questionId, answer: answerData });
    } catch (error) { console.error('Ошибка сохранения ответа:', error); }
  };

  const handleNext = async () => {
    const currentQuestion = activeTest.questions[currentQuestionIndex];
    const currentAnswer = answers[currentQuestion.id];
    if (!currentAnswer || (currentQuestion.question_type === 'coding' && !currentAnswer.code)) return;
    await saveAnswer(currentQuestion.id);
    if (currentQuestionIndex < activeTest.questions.length - 1)
      setCurrentQuestionIndex(currentQuestionIndex + 1);
  };

  const handlePrevious = () => {
    if (!activeTest.can_retry && currentQuestionIndex > 0) return;
    if (currentQuestionIndex > 0) setCurrentQuestionIndex(currentQuestionIndex - 1);
  };

  const handleComplete = () => {
    const currentQuestion = activeTest.questions[currentQuestionIndex];
    const currentAnswer = answers[currentQuestion.id];
    if (!currentAnswer || (currentQuestion.question_type === 'coding' && !currentAnswer.code)) return;
    setShowConfirmModal(true);
  };

  const confirmComplete = async () => {
    setShowConfirmModal(false);
    try {
      const currentQuestion = activeTest.questions[currentQuestionIndex];
      await saveAnswer(currentQuestion.id);
      const startTime = new Date(attempt.started_at).getTime();
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      const response = await api.post(`/tests/attempt/${attempt.id}/complete`, { timeSpent });
      releaseTestLock(activeTest.id);
      setResult(response.data);
      setShowResult(true);
      setActiveTest(null);
      setAttempt(null);
      loadAssignedTests();
      loadHistory();
    } catch (error) { console.error('Ошибка завершения теста:', error); }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && activeTest && attempt && !showConfirmModal) {
        const currentQuestion = activeTest.questions[currentQuestionIndex];
        const currentAnswer = answers[currentQuestion.id];
        const hasAnswer = currentAnswer && (currentQuestion.question_type !== 'coding' || currentAnswer.code);
        if (hasAnswer) {
          if (currentQuestionIndex < activeTest.questions.length - 1) handleNext();
          else handleComplete();
        }
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeTest, attempt, currentQuestionIndex, answers, showConfirmModal]);

  // ── LOADING ──
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.spinnerWrap}>
          <div className={styles.spinner} />
          <p>Загрузка тестов...</p>
        </div>
      </div>
    );
  }

  // ── BLOCKED BY OTHER TAB ──
  if (blockedByOtherTab) {
    return (
      <div className={styles.page}>
        <div className={styles.blockedWrap}>
          <div className={styles.blockedCard}>
            <div className={styles.blockedIcon}><MdLockClock /></div>
            <h2 className={styles.blockedTitle}>Тест уже открыт</h2>
            <p className={styles.blockedDesc}>
              Этот тест уже проходится в другой вкладке браузера.<br />
              Закройте другую вкладку и вернитесь сюда, чтобы продолжить.
            </p>
            <button
              className={styles.btnPrimary}
              onClick={() => { setBlockedByOtherTab(false); setBlockedTestId(null); }}
            >
              Вернуться к списку тестов
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── TEST TAKING ──
  if (activeTest && attempt) {
    const currentQuestion = activeTest.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / activeTest.questions.length) * 100;
    const currentAnswer = answers[currentQuestion.id];
    const hasAnswer = currentAnswer && (currentQuestion.question_type !== 'coding' || currentAnswer.code);

    return (
      <div className={`${styles.page} ${styles.testActivePage}`}>
        {/* ── Anti-cheat overlays ── */}
        <AntiPhotoOverlay />
        <WatermarkLayer
          userId={user?.id}
          username={user?.username || user?.full_name || 'unknown'}
          testId={activeTest.id}
        />

        {/* ── Blur overlay when tab is hidden ── */}
        {blurred && (
          <div className={styles.blurOverlay}>
            <div className={styles.blurOverlayCard}>
              <FaShieldAlt className={styles.blurOverlayIcon} />
              <h3>Вернитесь на страницу теста</h3>
              <p>Переключение вкладок зафиксировано</p>
            </div>
          </div>
        )}

        {/* ── Hidden content overlay (DevTools / PrintScreen) ── */}
        {(contentHidden || contentFadingOut) && (
          <div className={`${styles.hiddenOverlay}${contentFadingOut ? ` ${styles.hiddenOverlayFadeOut}` : ''}`}>
            <FaShieldAlt className={styles.hiddenOverlayIcon} />
            <p>Содержимое скрыто по соображениям безопасности</p>
            {contentHidden && !contentFadingOut && <p className={styles.hiddenOverlaySub}>Страница будет перезагружена</p>}
          </div>
        )}

        {/* ── Violation counter badge ── */}
        {violationCount > 0 && (
          <div className={`${styles.violationBadge} ${violationCount >= 3 ? styles.violationBadgeDanger : ''}`}>
            <FaExclamationTriangle />
            <span>Нарушений: {violationCount}{violationCount >= TAB_SWITCH_LIMIT - 1 ? ' ⚠ автозавершение близко' : ''}</span>
          </div>
        )}
        {showConfirmModal && (
          <div className={styles.modalOverlay} onClick={() => setShowConfirmModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalIconWrap}><FaExclamationTriangle /></div>
              <h3 className={styles.modalTitle}>Завершить тест?</h3>
              <p className={styles.modalDesc}>
                Вы уверены? После завершения изменить ответы будет невозможно.
              </p>
              <div className={styles.modalBtns}>
                <button className={styles.btnGhost} onClick={() => setShowConfirmModal(false)}>Отмена</button>
                <button className={styles.btnPrimary} onClick={confirmComplete}>Завершить</button>
              </div>
            </div>
          </div>
        )}

        <div className={styles.testTaking}>
          <div className={styles.testHeader}>
            <div className={styles.testHeaderLeft}>
              <div className={styles.testHeaderIcon}><MdOutlineQuiz /></div>
              <div>
                <h2 className={styles.testTitle}>{activeTest.title}</h2>
                <span className={styles.testQCount}>
                  Вопрос {currentQuestionIndex + 1} из {activeTest.questions.length}
                </span>
              </div>
            </div>
            {timeLeft !== null && (
              <div className={`${styles.timer} ${timeLeft < 60 ? styles.timerWarning : ''}`}>
                <AiOutlineClockCircle />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>

          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>

          <div className={styles.questionCard}>
            <p className={styles.questionText}>{currentQuestion.question_text}</p>

            {currentQuestion.question_type === 'choice' ? (
              <div className={styles.options}>
                {currentQuestion.options.map(option => (
                  <label
                    key={option.id}
                    className={`${styles.option} ${answers[currentQuestion.id] === option.id ? styles.optionSelected : ''}`}
                  >
                    <input
                      type="radio"
                      name={`q-${currentQuestion.id}`}
                      value={option.id}
                      checked={answers[currentQuestion.id] === option.id}
                      onChange={() => handleAnswerChange(currentQuestion.id, option.id)}
                    />
                    <span>{option.option_text}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className={styles.codeEditor}>
                <label>Напишите код ({currentQuestion.code_language}):</label>
                <textarea
                  value={answers[currentQuestion.id]?.code || currentQuestion.code_template || ''}
                  onChange={(e) => handleCodeChange(currentQuestion.id, e.target.value)}
                  rows="15"
                  placeholder="Введите ваш код здесь..."
                />
              </div>
            )}

            <div className={styles.navBtns}>
              {activeTest.can_retry && currentQuestionIndex > 0 && (
                <button className={styles.btnGhost} onClick={handlePrevious}>← Назад</button>
              )}
              <div className={styles.btnWithHint}>
                {currentQuestionIndex < activeTest.questions.length - 1 ? (
                  <button
                    className={hasAnswer ? styles.btnPrimary : styles.btnDisabled}
                    onClick={handleNext}
                    disabled={!hasAnswer}
                  >
                    Далее →
                  </button>
                ) : (
                  <button
                    className={hasAnswer ? styles.btnComplete : styles.btnDisabled}
                    onClick={handleComplete}
                    disabled={!hasAnswer}
                  >
                    Завершить тест
                  </button>
                )}
                {hasAnswer && <span className={styles.kbHint}>Enter</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── RESULT ──
  if (showResult && result) {
    return (
      <div className={styles.page}>
        <div className={styles.resultWrap}>
          <div className={styles.resultCard}>
            <div className={styles.resultBanner}>
              <FaTrophy className={styles.resultTrophyIcon} />
              <h2>Тест завершён!</h2>
            </div>
            <div className={styles.resultBody}>
              <div className={styles.scoreCircle}>{result.score}%</div>
              <p className={styles.scoreSubtitle}>
                Правильных ответов: <strong>{result.correctAnswers}</strong> из <strong>{result.totalQuestions}</strong>
              </p>
              <div className={styles.resultPointsBadge}>
                <AiOutlineThunderbolt />
                <span>Заработано баллов: <strong>{result.pointsEarned > 0 ? '+' : ''}{result.pointsEarned}</strong></span>
              </div>
              <button className={styles.btnPrimary} onClick={() => setShowResult(false)}>
                Вернуться к тестам
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN LIST ──
  const completedTests = history.filter(h => h.status === 'completed');
  const averageScore = completedTests.length > 0
    ? Math.round(completedTests.reduce((s, h) => s + h.score, 0) / completedTests.length) : 0;
  const totalPoints = completedTests.reduce((s, h) => s + h.points_earned, 0);
  const availableTests = tests.filter(test => {
    const done = history.filter(h => h.test_id === test.id && h.status === 'completed');
    return test.can_retry || done.length === 0;
  });

  return (
    <div className={styles.page}>

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderIcon}><MdOutlineQuiz /></div>
        <div>
          <h1 className={styles.pageTitle}>Мои тесты</h1>
          <p className={styles.pageSub}>Проходите тесты и зарабатывайте баллы</p>
        </div>
        <div className={styles.pageHeaderRight}>
          <button
            className={`${styles.tabBtn} ${!showHistory ? styles.tabBtnActive : ''}`}
            onClick={() => setShowHistory(false)}
          >
            <FaFileAlt /> Тесты
          </button>
          <button
            className={`${styles.tabBtn} ${showHistory ? styles.tabBtnActive : ''}`}
            onClick={() => setShowHistory(true)}
          >
            <FaHistory /> История
          </button>
        </div>
      </div>

      {/* Stat tiles */}
      {!showHistory && (
        <div className={styles.statsRow}>
          <div className={styles.statTile}>
            <span className={styles.statTileIcon}><FaCheckCircle /></span>
            <span className={styles.statTileVal}>{completedTests.length}</span>
            <span className={styles.statTileLabel}>Пройдено</span>
          </div>
          <div className={styles.statTile}>
            <span className={styles.statTileIcon}><AiOutlineBarChart /></span>
            <span className={styles.statTileVal}>{averageScore}%</span>
            <span className={styles.statTileLabel}>Средний балл</span>
          </div>
          <div className={styles.statTile}>
            <span className={styles.statTileIcon}><FaTrophy /></span>
            <span className={styles.statTileVal}>{totalPoints}</span>
            <span className={styles.statTileLabel}>Получено баллов</span>
          </div>
          <div className={styles.statTile}>
            <span className={styles.statTileIcon}><FaFileAlt /></span>
            <span className={styles.statTileVal}>{availableTests.length}</span>
            <span className={styles.statTileLabel}>Доступно</span>
          </div>
        </div>
      )}

      {/* Tests grid */}
      {!showHistory ? (
        <>
          {tests.length === 0 ? (
            <div className={styles.emptyState}>
              <MdOutlineQuiz className={styles.emptyIcon} />
              <h3>Нет назначенных тестов</h3>
              <p>Преподаватель ещё не назначил вам тесты</p>
            </div>
          ) : (
            <div className={styles.testsGrid}>
              {tests.map(test => {
                const completedAttempts = history.filter(h => h.test_id === test.id && h.status === 'completed');
                const canTake = test.can_retry || completedAttempts.length === 0;
                const lastAttempt = completedAttempts.length > 0
                  ? completedAttempts.sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0]
                  : null;
                const difficulty = test.points_correct >= 100 ? 'hard' : test.points_correct >= 50 ? 'medium' : 'easy';
                const diffLabel = { easy: 'Легкий', medium: 'Средний', hard: 'Сложный' };
                const isLocked = (() => {
                  const raw = localStorage.getItem(LOCK_PREFIX + test.id);
                  if (!raw) return false;
                  const lock = JSON.parse(raw);
                  return lock.tabId !== TAB_ID && (Date.now() - lock.timestamp) < 5 * 60 * 1000;
                })();

                return (
                  <div key={test.id} className={styles.testCard}>
                    <div className={styles.testCardHead}>
                      <h3 className={styles.testCardTitle}>{test.title}</h3>
                      <span className={`${styles.diffBadge} ${styles['diff_' + difficulty]}`}>
                        {diffLabel[difficulty]}
                      </span>
                    </div>
                    {test.description && <p className={styles.testCardDesc}>{test.description}</p>}
                    <div className={styles.testMeta}>
                      <span><FaClipboardList /> {test.type === 'choice' ? 'С вариантами' : 'С кодом'}</span>
                      <span><AiOutlineClockCircle /> {test.time_limit || '∞'} мин</span>
                      <span><FaTrophy /> {test.points_correct} баллов</span>
                    </div>
                    {lastAttempt && (
                      <div className={styles.lastResult}>
                        Последний результат: <strong>{lastAttempt.score}%</strong> ({lastAttempt.points_earned} баллов)
                      </div>
                    )}
                    {isLocked && (
                      <div className={styles.lockWarning}>
                        <MdLockClock /> Открыт в другой вкладке
                      </div>
                    )}
                    <button
                      className={canTake && !isLocked ? styles.btnPrimary : styles.btnDisabled}
                      onClick={() => canTake && !isLocked && startTest(test)}
                      disabled={!canTake || isLocked}
                    >
                      {!canTake ? 'Пройдено' : isLocked ? 'Открыт в другой вкладке' : 'Пройти тест'}
                    </button>
                    {!test.can_retry && completedAttempts.length > 0 && (
                      <small className={styles.noRetry}>Перепрохождение запрещено</small>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* History */
        <div className={styles.historyWrap}>
          {history.length === 0 ? (
            <div className={styles.emptyState}>
              <FaHistory className={styles.emptyIcon} />
              <h3>История пуста</h3>
              <p>Пройдите хотя бы один тест</p>
            </div>
          ) : (
            <div className={styles.historyTable}>
              <div className={styles.historyHead}>
                <span>Тест</span>
                <span>Дата</span>
                <span>Результат</span>
                <span>Баллы</span>
                <span>Статус</span>
              </div>
              {history.map(attempt => (
                <div key={attempt.id} className={styles.historyRow}>
                  <span className={styles.historyName}>{attempt.title}</span>
                  <span className={styles.historyDate}>{new Date(attempt.started_at).toLocaleString('ru-RU')}</span>
                  <span className={styles.historyScore}>{attempt.score}%</span>
                  <span className={styles.historyPoints}>
                    {attempt.points_earned > 0 ? '+' : ''}{attempt.points_earned}
                  </span>
                  <span className={styles.historyStatus}>
                    {attempt.status === 'completed'
                      ? <span className={styles.statusDone}><FaCheckCircle /> Завершён</span>
                      : attempt.status === 'in_progress'
                      ? <span className={styles.statusProg}><AiOutlineLoading3Quarters /> В процессе</span>
                      : <span className={styles.statusExp}><FaTimes /> Истёк</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StudentTests;
