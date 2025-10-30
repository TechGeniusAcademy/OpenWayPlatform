import { useState, useEffect } from 'react';
import api from '../../utils/api';
import '../../components/GamesManagement.css';
import { 
  MdOutlineQuiz, 
  MdSportsEsports 
} from "react-icons/md";
import { 
  FaChess, 
  FaGamepad, 
  FaTrophy, 
  FaCheckCircle, 
  FaClock,
  FaPencilAlt,
  FaTrash,
  FaPlus
} from "react-icons/fa";


function GamesManagement() {
  const [activeTab, setActiveTab] = useState('crash');
  const [chessGames, setChessGames] = useState([]);
  const [quizBattles, setQuizBattles] = useState([]);
  const [crashGames, setCrashGames] = useState([]);
  const [rouletteGames, setRouletteGames] = useState([]);
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  
  // Модальные окна
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  
  // Формы
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [questionForm, setQuestionForm] = useState({
    category_id: '',
    question: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_option: 'a',
    difficulty: 'medium'
  });

  useEffect(() => {
    fetchChessGames();
    fetchQuizBattles();
    fetchCrashGames();
    fetchRouletteGames();
    fetchCategories();
    fetchQuestions();
  }, []);

  const fetchChessGames = async () => {
    try {
      const response = await api.get('/chess/history?limit=50');
      setChessGames(response.data);
    } catch (error) {
      console.error('Failed to fetch chess games:', error);
    }
  };

  const fetchQuizBattles = async () => {
    try {
      const response = await api.get('/quiz-battle/all-battles');
      setQuizBattles(response.data);
    } catch (error) {
      console.error('Failed to fetch quiz battles:', error);
    }
  };

  const fetchCrashGames = async () => {
    try {
      const response = await api.get('/crash/history?limit=100');
      setCrashGames(response.data.history || []);
    } catch (error) {
      console.error('Failed to fetch crash games:', error);
    }
  };

  const fetchRouletteGames = async () => {
    try {
      const response = await api.get('/roulette/history?limit=100');
      setRouletteGames(response.data.history || []);
    } catch (error) {
      console.error('Failed to fetch roulette games:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/quiz-battle/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await api.get('/quiz-battle/questions');
      setQuestions(response.data);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/quiz-battle/categories/${editingCategory.id}`, categoryForm);
      } else {
        await api.post('/quiz-battle/categories', categoryForm);
      }
      setShowCategoryModal(false);
      setCategoryForm({ name: '', description: '' });
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      alert('Ошибка при сохранении категории');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Удалить категорию?')) return;
    try {
      await api.delete(`/quiz-battle/categories/${id}`);
      fetchCategories();
    } catch (error) {
      alert('Ошибка при удалении категории');
    }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    try {
      if (editingQuestion) {
        await api.put(`/quiz-battle/questions/${editingQuestion.id}`, questionForm);
      } else {
        await api.post('/quiz-battle/questions', questionForm);
      }
      setShowQuestionModal(false);
      setQuestionForm({
        category_id: '',
        question: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: 'a',
        difficulty: 'medium'
      });
      setEditingQuestion(null);
      fetchQuestions();
    } catch (error) {
      alert('Ошибка при сохранении вопроса');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm('Удалить вопрос?')) return;
    try {
      await api.delete(`/quiz-battle/questions/${id}`);
      fetchQuestions();
    } catch (error) {
      alert('Ошибка при удалении вопроса');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('ru-RU');
  };

  return (
    <div className="games-management">
      <h1><FaGamepad /> Управление Играми</h1>

      <div className="games-tabs">
        <button 
          className={`tab-btn ${activeTab === 'crash' ? 'active' : ''}`}
          onClick={() => setActiveTab('crash')}
        >
          🚀 Crash Game
        </button>
        <button 
          className={`tab-btn ${activeTab === 'roulette' ? 'active' : ''}`}
          onClick={() => setActiveTab('roulette')}
        >
          🎰 Рулетка
        </button>
        <button 
          className={`tab-btn ${activeTab === 'chess' ? 'active' : ''}`}
          onClick={() => setActiveTab('chess')}
        >
          <FaChess /> Шахматы
        </button>
        <button 
          className={`tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
          onClick={() => setActiveTab('quiz')}
        >
          <MdOutlineQuiz /> Битва Знаний
        </button>
      </div>

      {/* CRASH GAME */}
      {activeTab === 'crash' && (
        <div className="crash-section">
          <div className="section-card">
            <h2>История Crash игр</h2>
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-label">Всего игр</div>
                <div className="stat-value">{crashGames.length}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Средний краш</div>
                <div className="stat-value">
                  {crashGames.length > 0 
                    ? (crashGames.reduce((sum, g) => sum + parseFloat(g.crash_point), 0) / crashGames.length).toFixed(2) 
                    : '0.00'}x
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Макс. краш</div>
                <div className="stat-value">
                  {crashGames.length > 0 
                    ? Math.max(...crashGames.map(g => parseFloat(g.crash_point))).toFixed(2) 
                    : '0.00'}x
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Мин. краш</div>
                <div className="stat-value">
                  {crashGames.length > 0 
                    ? Math.min(...crashGames.map(g => parseFloat(g.crash_point))).toFixed(2) 
                    : '0.00'}x
                </div>
              </div>
            </div>
            <div className="games-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Crash Point</th>
                    <th>Статус</th>
                    <th>Начало</th>
                    <th>Конец</th>
                  </tr>
                </thead>
                <tbody>
                  {crashGames.map(game => (
                    <tr key={game.id}>
                      <td>#{game.id}</td>
                      <td>
                        <span 
                          className="crash-point-badge"
                          style={{
                            backgroundColor: 
                              parseFloat(game.crash_point) < 2 ? '#ff5722' : 
                              parseFloat(game.crash_point) < 5 ? '#ff9800' : 
                              parseFloat(game.crash_point) < 10 ? '#4caf50' : '#00ff88',
                            color: 'white',
                            padding: '5px 10px',
                            borderRadius: '5px',
                            fontWeight: 'bold'
                          }}
                        >
                          {parseFloat(game.crash_point).toFixed(2)}x
                        </span>
                      </td>
                      <td>
                        <span className="status-badge crashed">
                          💥 Crashed
                        </span>
                      </td>
                      <td>{formatDate(game.started_at)}</td>
                      <td>{formatDate(game.crashed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {crashGames.length === 0 && (
                <p className="no-data">Нет истории Crash игр</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* РУЛЕТКА */}
      {activeTab === 'roulette' && (
        <div className="roulette-section">
          <div className="section-card">
            <h2>История игр в Рулетку</h2>
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-label">Всего игр</div>
                <div className="stat-value">{rouletteGames.length}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Общие ставки</div>
                <div className="stat-value">
                  {rouletteGames.reduce((sum, g) => sum + (g.total_bets || 0), 0)}
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Общие выплаты</div>
                <div className="stat-value">
                  {rouletteGames.reduce((sum, g) => sum + (g.total_payout || 0), 0)}
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-label">House Edge</div>
                <div className="stat-value">
                  {rouletteGames.length > 0 
                    ? ((1 - rouletteGames.reduce((sum, g) => sum + (g.total_payout || 0), 0) / 
                        Math.max(1, rouletteGames.reduce((sum, g) => sum + (g.total_bets || 0), 0))) * 100).toFixed(2)
                    : '0.00'}%
                </div>
              </div>
            </div>
            <div className="games-table">
              <table>
                <thead>
                  <tr>
                    <th>Игра #</th>
                    <th>Выпало число</th>
                    <th>Цвет</th>
                    <th>Всего ставок</th>
                    <th>Выплачено</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {rouletteGames.map(game => (
                    <tr key={game.id}>
                      <td>#{game.game_number}</td>
                      <td>
                        <span 
                          className="roulette-number-badge"
                          style={{
                            backgroundColor: 
                              game.winning_color === 'green' ? '#27ae60' :
                              game.winning_color === 'red' ? '#e74c3c' : '#2c3e50',
                            color: 'white',
                            padding: '8px 15px',
                            borderRadius: '50%',
                            fontWeight: 'bold',
                            fontSize: '1.1rem',
                            display: 'inline-block',
                            minWidth: '50px',
                            textAlign: 'center'
                          }}
                        >
                          {game.winning_number}
                        </span>
                      </td>
                      <td>
                        <span className={`color-badge ${game.winning_color}`}>
                          {game.winning_color === 'red' && '🔴 Красное'}
                          {game.winning_color === 'black' && '⚫ Черное'}
                          {game.winning_color === 'green' && '🟢 Зеленое'}
                        </span>
                      </td>
                      <td>{game.total_bets || 0}</td>
                      <td>{game.total_payout || 0}</td>
                      <td>{formatDate(game.finished_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rouletteGames.length === 0 && (
                <p className="no-data">Нет истории игр в рулетку</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ШАХМАТЫ */}
      {activeTab === 'chess' && (
        <div className="chess-section">
          <div className="section-card">
            <h2>История Шахматных Игр</h2>
            <div className="games-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Белые</th>
                    <th>Черные</th>
                    <th>Результат</th>
                    <th>Ставка</th>
                    <th>Дата</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {chessGames.map(game => (
                    <tr key={game.id}>
                      <td>#{game.id}</td>
                      <td>{game.white_player_username}</td>
                      <td>{game.black_player_username}</td>
                      <td>
                        {game.result === 'white' && '⚪ Победа белых'}
                        {game.result === 'black' && '⚫ Победа черных'}
                        {game.result === 'draw' && '🤝 Ничья'}
                        {!game.result && '-'}
                      </td>
                      <td>{game.bet_amount || 0} <FaTrophy /></td>
                      <td>{formatDate(game.created_at)}</td>
                      <td>
                        <span className={`status-badge ${game.status}`}>
                          {game.status === 'finished' && <><FaCheckCircle /> Завершена</>}
                          {game.status === 'active' && <><MdSportsEsports /> Идёт игра</>}
                          {game.status === 'pending' && <><FaClock /> Ожидание</>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {chessGames.length === 0 && (
                <p className="no-data">Нет истории игр</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* КВИЗ */}
      {activeTab === 'quiz' && (
        <div className="quiz-section">
          <div className="quiz-grid">
            {/* История битв */}
            <div className="section-card">
              <h2>История Битв Знаний</h2>
              <div className="games-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Код</th>
                      <th>Создатель</th>
                      <th>Игроков</th>
                      <th>Дата</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizBattles.map(battle => (
                      <tr key={battle.id}>
                        <td>#{battle.id}</td>
                        <td><code>{battle.room_code}</code></td>
                        <td>{battle.creator_name}</td>
                        <td>{battle.player_count || 0}</td>
                      <td>{formatDate(battle.created_at)}</td>
                      <td>
                        <span className={`status-badge ${battle.status}`}>
                          {battle.status === 'finished' && <><FaCheckCircle /> Завершена</>}
                          {battle.status === 'in_progress' && <><MdSportsEsports /> Идёт игра</>}
                          {battle.status === 'waiting' && <><FaClock /> Ожидание</>}
                        </span>
                      </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {quizBattles.length === 0 && (
                  <p className="no-data">Нет истории битв</p>
                )}
              </div>
            </div>

            {/* Категории вопросов */}
            <div className="section-card">
              <div className="section-header">
                <h2>Категории Вопросов</h2>
                <button 
                  className="add-btn"
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryForm({ name: '', description: '' });
                    setShowCategoryModal(true);
                  }}
                >
                  <FaPlus /> Добавить категорию
                </button>
              </div>
              <div className="categories-list">
                {categories.map(cat => (
                  <div key={cat.id} className="category-item">
                    <div className="category-info">
                      <h3>{cat.name}</h3>
                      <p>{cat.description}</p>
                      <span className="question-count">{cat.question_count || 0} вопросов</span>
                    </div>
                    <div className="category-actions">
                      <button 
                        className="edit-btn"
                        onClick={() => {
                          setEditingCategory(cat);
                          setCategoryForm({ name: cat.name, description: cat.description });
                          setShowCategoryModal(true);
                        }}
                      >
                        <FaPencilAlt />
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => handleDeleteCategory(cat.id)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="no-data">Нет категорий</p>
                )}
              </div>
            </div>

            {/* Вопросы */}
            <div className="section-card full-width">
              <div className="section-header">
                <h2>Вопросы для Квиза</h2>
                <button 
                  className="add-btn"
                  onClick={() => {
                    setEditingQuestion(null);
                    setQuestionForm({
                      category_id: '',
                      question: '',
                      option_a: '',
                      option_b: '',
                      option_c: '',
                      option_d: '',
                      correct_option: 'a',
                      difficulty: 'medium'
                    });
                    setShowQuestionModal(true);
                  }}
                >
                  <FaPlus /> Добавить вопрос
                </button>
              </div>
              <div className="questions-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Вопрос</th>
                      <th>Категория</th>
                      <th>Сложность</th>
                      <th>Правильный ответ</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map(q => (
                      <tr key={q.id}>
                        <td>#{q.id}</td>
                        <td>{q.question}</td>
                        <td>{q.category_name || 'Без категории'}</td>
                        <td>
                          <span className={`difficulty ${q.difficulty}`}>
                            {q.difficulty === 'easy' && '🟢 Легко'}
                            {q.difficulty === 'medium' && '🟡 Средне'}
                            {q.difficulty === 'hard' && '🔴 Сложно'}
                          </span>
                        </td>
                        <td><strong>{q.correct_option?.toUpperCase()}</strong></td>
                        <td>
                          <button 
                            className="edit-btn"
                            onClick={() => {
                              setEditingQuestion(q);
                              setQuestionForm({
                                category_id: q.category_id || '',
                                question: q.question,
                                option_a: q.option_a,
                                option_b: q.option_b,
                                option_c: q.option_c,
                                option_d: q.option_d,
                                correct_option: q.correct_option,
                                difficulty: q.difficulty
                              });
                              setShowQuestionModal(true);
                            }}
                          >
                            <FaPencilAlt />
                          </button>
                          <button 
                            className="delete-btn"
                            onClick={() => handleDeleteQuestion(q.id)}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {questions.length === 0 && (
                  <p className="no-data">Нет вопросов</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно категории */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingCategory ? 'Редактировать категорию' : 'Новая категория'}</h2>
            <form onSubmit={handleCreateCategory}>
              <div className="form-group">
                <label>Название *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  required
                  placeholder="Например: История"
                />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Краткое описание категории"
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCategoryModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="primary">
                  {editingCategory ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно вопроса */}
      {showQuestionModal && (
        <div className="modal-overlay" onClick={() => setShowQuestionModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>{editingQuestion ? 'Редактировать вопрос' : 'Новый вопрос'}</h2>
            <form onSubmit={handleCreateQuestion}>
              <div className="form-row">
                <div className="form-group">
                  <label>Категория</label>
                  <select
                    value={questionForm.category_id}
                    onChange={(e) => setQuestionForm({ ...questionForm, category_id: e.target.value })}
                  >
                    <option value="">Без категории</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Сложность *</label>
                  <select
                    value={questionForm.difficulty}
                    onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                    required
                  >
                    <option value="easy">🟢 Легко</option>
                    <option value="medium">🟡 Средне</option>
                    <option value="hard">🔴 Сложно</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Вопрос *</label>
                <textarea
                  value={questionForm.question}
                  onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                  required
                  placeholder="Введите текст вопроса"
                  rows="3"
                />
              </div>

              <div className="options-grid">
                <div className="form-group">
                  <label>Вариант A *</label>
                  <input
                    type="text"
                    value={questionForm.option_a}
                    onChange={(e) => setQuestionForm({ ...questionForm, option_a: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Вариант B *</label>
                  <input
                    type="text"
                    value={questionForm.option_b}
                    onChange={(e) => setQuestionForm({ ...questionForm, option_b: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Вариант C *</label>
                  <input
                    type="text"
                    value={questionForm.option_c}
                    onChange={(e) => setQuestionForm({ ...questionForm, option_c: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Вариант D *</label>
                  <input
                    type="text"
                    value={questionForm.option_d}
                    onChange={(e) => setQuestionForm({ ...questionForm, option_d: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Правильный ответ *</label>
                <select
                  value={questionForm.correct_option}
                  onChange={(e) => setQuestionForm({ ...questionForm, correct_option: e.target.value })}
                  required
                >
                  <option value="a">A - {questionForm.option_a || '...'}</option>
                  <option value="b">B - {questionForm.option_b || '...'}</option>
                  <option value="c">C - {questionForm.option_c || '...'}</option>
                  <option value="d">D - {questionForm.option_d || '...'}</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowQuestionModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="primary">
                  {editingQuestion ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default GamesManagement;
