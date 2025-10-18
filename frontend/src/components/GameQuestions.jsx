import { useState, useEffect } from 'react';
import api from '../utils/api';
import './GameManagement.css';

function GameQuestions() {
  const [questions, setQuestions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    category: '',
    difficulty: 'medium'
  });

  const difficulties = [
    { value: 'easy', label: '🟢 Легкий', color: '#4caf50' },
    { value: 'medium', label: '🟡 Средний', color: '#ff9800' },
    { value: 'hard', label: 'Б Сложный', color: '#f44336' }
  ];

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await api.get('/game/questions');
      setQuestions(response.data.questions);
    } catch (error) {
      console.error('Ошибка загрузки вопросов:', error);
    }
  };

  const openForm = (question = null) => {
    if (question) {
      setEditingQuestion(question);
      setFormData({
        question: question.question,
        category: question.category || '',
        difficulty: question.difficulty
      });
    } else {
      setEditingQuestion(null);
      setFormData({
        question: '',
        category: '',
        difficulty: 'medium'
      });
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingQuestion(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingQuestion) {
        await api.put(`/game/questions/${editingQuestion.id}`, formData);
      } else {
        await api.post('/game/questions', formData);
      }
      
      fetchQuestions();
      closeForm();
    } catch (error) {
      console.error('Ошибка сохранения вопроса:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить этот вопрос?')) return;
    
    try {
      await api.delete(`/game/questions/${id}`);
      fetchQuestions();
    } catch (error) {
      console.error('Ошибка удаления вопроса:', error);
    }
  };

  const getDifficultyBadge = (difficulty) => {
    const diff = difficulties.find(d => d.value === difficulty);
    return diff ? diff.label : difficulty;
  };

  return (
    <div className="game-questions-management">
      <div className="header">
        <h2>❓ Банк вопросов</h2>
        <button className="btn-primary" onClick={() => openForm()}>
          + Добавить вопрос
        </button>
      </div>

      <div className="questions-list">
        <table>
          <thead>
            <tr>
              <th>Вопрос</th>
              <th>Категория</th>
              <th>Сложность</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {questions.map(q => (
              <tr key={q.id}>
                <td className="question-text">{q.question}</td>
                <td>
                  {q.category && (
                    <span className="category-badge">{q.category}</span>
                  )}
                </td>
                <td>
                  <span className={`difficulty-badge ${q.difficulty}`}>
                    {getDifficultyBadge(q.difficulty)}
                  </span>
                </td>
                <td className="actions">
                  <button onClick={() => openForm(q)} className="btn-icon">✏️</button>
                  <button onClick={() => handleDelete(q.id)} className="btn-icon">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {questions.length === 0 && (
        <div className="empty-state">
          <p>📭 Банк вопросов пуст. Добавьте первый вопрос!</p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingQuestion ? 'Редактировать вопрос' : 'Добавить вопрос'}</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Вопрос *</label>
                <textarea
                  value={formData.question}
                  onChange={(e) => setFormData({...formData, question: e.target.value})}
                  rows={4}
                  placeholder="Введите текст вопроса..."
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Категория</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    placeholder="Например: Программирование, История..."
                  />
                </div>

                <div className="form-group">
                  <label>Сложность *</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                    required
                  >
                    {difficulties.map(diff => (
                      <option key={diff.value} value={diff.value}>
                        {diff.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={closeForm}>Отмена</button>
                <button type="submit" className="btn-primary">
                  {editingQuestion ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameQuestions;
