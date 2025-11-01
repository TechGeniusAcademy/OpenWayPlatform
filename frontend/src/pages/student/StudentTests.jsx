import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FaFileAlt, FaChartBar, FaClipboardList, FaCheckCircle, FaTimes } from 'react-icons/fa';
import styles from './StudentTests.module.css';

function StudentTests() {
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTest, setActiveTest] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadAssignedTests();
    loadHistory();
  }, []);

  // Таймер
  useEffect(() => {
    if (activeTest && attempt && activeTest.time_limit > 0) {
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
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
    } catch (error) {
      console.error('Ошибка загрузки тестов:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await api.get('/tests/student/history');
      setHistory(response.data.history);
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
    }
  };

  const startTest = async (test) => {
    try {
      // Проверяем, можно ли проходить тест
      const completedAttempts = history.filter(h => h.test_id === test.id && h.status === 'completed');
      
      if (completedAttempts.length > 0 && !test.can_retry) {
        console.warn('Вы уже прошли этот тест. Перепрохождение запрещено.');
        return;
      }

      // Загружаем тест с вопросами
      const testResponse = await api.get(`/tests/${test.id}`);
      const fullTest = testResponse.data.test;

      // Начинаем попытку
      const attemptResponse = await api.post(`/tests/${test.id}/start`);
      
      setActiveTest(fullTest);
      setAttempt(attemptResponse.data.attempt);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setShowResult(false);
      
      if (fullTest.time_limit > 0) {
        setTimeLeft(fullTest.time_limit * 60); // конвертируем минуты в секунды
      }
    } catch (error) {
      console.error('Ошибка начала теста:', error);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers({
      ...answers,
      [questionId]: value
    });
  };

  const handleCodeChange = (questionId, code) => {
    setAnswers({
      ...answers,
      [questionId]: { code }
    });
  };

  const saveAnswer = async (questionId) => {
    const answer = answers[questionId];
    if (!answer) return;

    try {
      const question = activeTest.questions.find(q => q.id === questionId);
      
      let answerData = {};

      if (question.question_type === 'choice') {
        answerData = {
          selected_option_id: parseInt(answer),
          answer_text: null,
          code_answer: null
        };
      } else if (question.question_type === 'code') {
        // Для кода: отправляем на проверку
        const checkResponse = await api.post('/tests/check-code', {
          code: answer.code,
          solution: question.code_solution,
          language: question.code_language
        });

        answerData = {
          code_answer: answer.code,
          is_correct: checkResponse.data.isCorrect,
          answer_text: checkResponse.data.isCorrect ? 'Правильно' : 'Неправильно'
        };
      }

      await api.post(`/tests/attempt/${attempt.id}/answer`, {
        questionId,
        answer: answerData
      });
    } catch (error) {
      console.error('Ошибка сохранения ответа:', error);
    }
  };

  const handleNext = async () => {
    const currentQuestion = activeTest.questions[currentQuestionIndex];
    await saveAnswer(currentQuestion.id);

    if (currentQuestionIndex < activeTest.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    // Проверяем, разрешено ли перепрохождение (если нет, запрещаем возврат)
    if (!activeTest.can_retry && currentQuestionIndex > 0) {
      console.warn('Возврат к предыдущим вопросам запрещен');
      return;
    }

    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleComplete = async () => {
    if (!confirm('Вы уверены, что хотите завершить тест?')) return;

    try {
      // Сохраняем последний ответ
      const currentQuestion = activeTest.questions[currentQuestionIndex];
      await saveAnswer(currentQuestion.id);

      // Вычисляем время прохождения
      const startTime = new Date(attempt.started_at).getTime();
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);

      // Завершаем тест
      const response = await api.post(`/tests/attempt/${attempt.id}/complete`, {
        timeSpent
      });

      setResult(response.data);
      setShowResult(true);
      setActiveTest(null);
      setAttempt(null);
      
      // Обновляем списки
      loadAssignedTests();
      loadHistory();
    } catch (error) {
      console.error('Ошибка завершения теста:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) return <div className={styles.loading}>Загрузка...</div>;

  // Экран прохождения теста
  if (activeTest && attempt) {
    const currentQuestion = activeTest.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / activeTest.questions.length) * 100;

    return (
      <div className={styles.test-taking}>
        <div className={styles.test-header}>
          <h2>{activeTest.title}</h2>
          {timeLeft !== null && (
            <div className={`timer ${timeLeft < 60 ? 'warning' : ''}`}>
              ⏱️ {formatTime(timeLeft)}
            </div>
          )}
        </div>

        <div className={styles.progress-bar}>
          <div className={styles.progress-fill} style={{ width: `${progress}%` }}></div>
        </div>

        <div className={styles.question-container}>
          <h3>Вопрос {currentQuestionIndex + 1} из {activeTest.questions.length}</h3>
          <p className={styles.question-text}>{currentQuestion.question_text}</p>

          {currentQuestion.question_type === 'choice' ? (
            <div className={styles.options}>
              {currentQuestion.options.map(option => (
                <label key={option.id} className={styles.option}>
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={option.id}
                    checked={answers[currentQuestion.id] === option.id}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, option.id)}
                  />
                  <span>{option.option_text}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className={styles.code-editor}>
              <label>Напишите код ({currentQuestion.code_language}):</label>
              <textarea
                value={answers[currentQuestion.id]?.code || currentQuestion.code_template || ''}
                onChange={(e) => handleCodeChange(currentQuestion.id, e.target.value)}
                rows="15"
                placeholder="Введите ваш код здесь..."
              />
            </div>
          )}

          <div className={styles.navigation-buttons}>
            {activeTest.can_retry && currentQuestionIndex > 0 && (
              <button onClick={handlePrevious}>← Назад</button>
            )}
            
            {currentQuestionIndex < activeTest.questions.length - 1 ? (
              <button className={styles.btn-primary} onClick={handleNext}>Далее →</button>
            ) : (
              <button className={styles.btn-complete} onClick={handleComplete}>Завершить тест</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Экран результата
  if (showResult && result) {
    return (
      <div className={styles.test-result}>
        <div className={styles.result-card}>
          <h2>Тест завершен!</h2>
          <div className={styles.result-score}>
            <div className={styles.score-circle}>{result.score}%</div>
            <p>Правильных ответов: {result.correctAnswers} из {result.totalQuestions}</p>
          </div>
          <div className={styles.result-points}>
            <p>Заработано баллов: <strong>{result.pointsEarned > 0 ? '+' : ''}{result.pointsEarned}</strong></p>
          </div>
          <button className={styles.btn-primary} onClick={() => setShowResult(false)}>
            Вернуться к списку тестов
          </button>
        </div>
      </div>
    );
  }

  // Главный экран с списком тестов
  return (
    <div className={styles.student-tests}>
      <div className={styles.header}>
        <h2>Мои тесты</h2>
        <button onClick={() => setShowHistory(!showHistory)}>
          {showHistory ? <><FaFileAlt /> Доступные тесты</> : <><FaChartBar /> История прохождения</>}
        </button>
      </div>

      {!showHistory ? (
        <div className={styles.tests-grid}>
          {tests.length === 0 ? (
            <p>Вам пока не назначено ни одного теста</p>
          ) : (
            tests.map(test => {
              const completedAttempts = history.filter(h => h.test_id === test.id && h.status === 'completed');
              const canTake = test.can_retry || completedAttempts.length === 0;
              const lastAttempt = completedAttempts[completedAttempts.length - 1];

              return (
                <div key={test.id} className={styles.test-card}>
                  <h3>{test.title}</h3>
                  {test.description && <p>{test.description}</p>}
                  
                  <div className={styles.test-info}>
                    <span><FaClipboardList /> {test.type === 'choice' ? 'Тест с вариантами' : 'Тест с кодом'}</span>
                    <span>⏱️ {test.time_limit || '∞'} мин</span>
                    <span>🪙 {test.points_correct} баллов</span>
                  </div>

                  {lastAttempt && (
                    <div className={styles.last-result}>
                      Последний результат: {lastAttempt.score}% ({lastAttempt.points_earned} баллов)
                    </div>
                  )}

                  <button
                    className={canTake ? 'btn-primary' : 'btn-disabled'}
                    onClick={() => canTake && startTest(test)}
                    disabled={!canTake}
                  >
                    {canTake ? 'Пройти тест' : 'Пройдено'}
                  </button>

                  {!test.can_retry && completedAttempts.length > 0 && (
                    <small>Перепрохождение запрещено</small>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className={styles.history-list}>
          {history.length === 0 ? (
            <p>История пуста</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Тест</th>
                  <th>Дата</th>
                  <th>Результат</th>
                  <th>Баллы</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {history.map(attempt => (
                  <tr key={attempt.id}>
                    <td>{attempt.title}</td>
                    <td>{new Date(attempt.started_at).toLocaleString('ru-RU')}</td>
                    <td>{attempt.score}%</td>
                    <td>{attempt.points_earned > 0 ? '+' : ''}{attempt.points_earned}</td>
                    <td>
                      {attempt.status === 'completed' ? <><FaCheckCircle /> Завершен</> : 
                       attempt.status === 'in_progress' ? '⏳ В процессе' : 
                       <><FaTimes /> Истек</>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default StudentTests;
