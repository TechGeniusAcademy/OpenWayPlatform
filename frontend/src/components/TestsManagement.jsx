import { useState, useEffect } from 'react';
import api from '../utils/api';
import BulkTestEditor from './BulkTestEditor';
import styles from './TestsManagement.module.css';

function TestsManagement() {
  const [tests, setTests] = useState([]);
  const [groups, setGroups] = useState([]);
  const [editingTest, setEditingTest] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showBulkEditor, setShowBulkEditor] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [testHistory, setTestHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Форма теста
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('choice');
  const [timeLimit, setTimeLimit] = useState(0);
  const [pointsCorrect, setPointsCorrect] = useState(1);
  const [pointsWrong, setPointsWrong] = useState(0);
  const [canRetry, setCanRetry] = useState(false);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    loadTests();
    loadGroups();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tests');
      setTests(response.data.tests);
    } catch (error) {
      console.error('Ошибка загрузки тестов:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await api.get('/groups');
      setGroups(response.data.groups);
    } catch (error) {
      console.error('Ошибка загрузки групп:', error);
    }
  };

  const openForm = (test = null) => {
    if (test) {
      setEditingTest(test);
      setTitle(test.title);
      setDescription(test.description || '');
      setType(test.type);
      setTimeLimit(test.time_limit || 0);
      setPointsCorrect(test.points_correct);
      setPointsWrong(test.points_wrong);
      setCanRetry(test.can_retry);
      setQuestions(test.questions || []);
    } else {
      resetForm();
    }
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingTest(null);
    setTitle('');
    setDescription('');
    setType('choice');
    setTimeLimit(0);
    setPointsCorrect(1);
    setPointsWrong(0);
    setCanRetry(false);
    setQuestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || questions.length === 0) {
      console.warn('Заполните название и добавьте хотя бы один вопрос');
      return;
    }

    const testData = {
      test: {
        title,
        description,
        type,
        time_limit: parseInt(timeLimit),
        points_correct: parseInt(pointsCorrect),
        points_wrong: parseInt(pointsWrong),
        can_retry: canRetry
      },
      questions
    };

    try {
      if (editingTest) {
        await api.put(`/tests/${editingTest.id}`, testData);
      } else {
        await api.post('/tests', testData);
      }
      
      setShowForm(false);
      resetForm();
      loadTests();
    } catch (error) {
      console.error('Ошибка сохранения теста:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Вы уверены, что хотите удалить этот тест?')) return;

    try {
      await api.delete(`/tests/${id}`);
      loadTests();
    } catch (error) {
      console.error('Ошибка удаления теста:', error);
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: '',
        question_type: type,
        code_template: '',
        code_solution: '',
        code_language: 'javascript',
        options: type === 'choice' ? [{ option_text: '', is_correct: false }] : []
      }
    ]);
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const addOption = (questionIndex) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options.push({ option_text: '', is_correct: false });
    setQuestions(newQuestions);
  };

  const updateOption = (questionIndex, optionIndex, field, value) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex][field] = value;
    setQuestions(newQuestions);
  };

  const removeOption = (questionIndex, optionIndex) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options = newQuestions[questionIndex].options.filter((_, i) => i !== optionIndex);
    setQuestions(newQuestions);
  };

  const openAssignModal = async (test) => {
    setSelectedTest(test);
    try {
      const response = await api.get(`/tests/${test.id}/assignments`);
      test.assignments = response.data.assignments;
      setShowAssignModal(true);
    } catch (error) {
      console.error('Ошибка загрузки назначений:', error);
    }
  };

  const handleAssign = async (groupId) => {
    try {
      await api.post(`/tests/${selectedTest.id}/assign`, { groupId });
      openAssignModal(selectedTest);
    } catch (error) {
      console.error('Ошибка назначения теста:', error);
    }
  };

  const handleUnassign = async (groupId) => {
    try {
      await api.delete(`/tests/${selectedTest.id}/assign/${groupId}`);
      openAssignModal(selectedTest);
    } catch (error) {
      console.error('Ошибка отмены назначения:', error);
    }
  };

  const openHistoryModal = async (test) => {
    setSelectedTest(test);
    try {
      const response = await api.get(`/tests/${test.id}/history`);
      setTestHistory(response.data.history);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
    }
  };

  const handleReassign = async (userId) => {
    if (!confirm('Вы уверены, что хотите переназначить тест? Все предыдущие попытки будут аннулированы.')) return;

    try {
      await api.post(`/tests/${selectedTest.id}/reassign/${userId}`);
      openHistoryModal(selectedTest);
    } catch (error) {
      console.error('Ошибка переназначения:', error);
    }
  };

  const handleBulkImport = async (testData) => {
    try {
      const requestData = {
        test: {
          title: testData.title,
          description: testData.description,
          type: testData.type,
          time_limit: testData.timeLimit,
          points_correct: testData.pointsCorrect,
          points_wrong: testData.pointsWrong,
          can_retry: testData.canRetry
        },
        questions: testData.questions
      };

      await api.post('/tests', requestData);
      setShowBulkEditor(false);
      loadTests();
      alert(`Тест "${testData.title}" успешно создан с ${testData.questions.length} вопросами!`);
    } catch (error) {
      console.error('Ошибка создания теста:', error);
      alert('Ошибка при создании теста');
    }
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className={styles['tests-mgmt-container']}>
      <div className={styles['tests-mgmt-header']}>
        <h2>Управление тестами</h2>
        <div className={styles['tests-mgmt-header-actions']}>
          <button className={styles['tests-mgmt-btn-secondary']} onClick={() => setShowBulkEditor(true)}>
            📝 Массовое создание
          </button>
          <button className={styles['tests-mgmt-btn-primary']} onClick={() => openForm()}>
            + Создать тест
          </button>
        </div>
      </div>

      <div className={styles['tests-mgmt-list']}>
        {tests.length === 0 ? (
          <p>Нет созданных тестов</p>
        ) : (
          <table className={styles['tests-mgmt-table']}>
            <thead>
              <tr>
                <th>Название</th>
                <th>Тип</th>
                <th>Вопросов</th>
                <th>Баллы (+/-)</th>
                <th>Время</th>
                <th>Перепрохождение</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {tests.map(test => (
                <tr key={test.id}>
                  <td>{test.title}</td>
                  <td>{test.type === 'choice' ? 'С вариантами' : 'С кодом'}</td>
                  <td>{test.questions_count}</td>
                  <td>{test.points_correct} / {test.points_wrong}</td>
                  <td>{test.time_limit || '∞'} мин</td>
                  <td>{test.can_retry ? 'Да' : 'Нет'}</td>
                  <td>
                    <button onClick={() => openForm(test)}>✏️</button>
                    <button onClick={() => openAssignModal(test)}>📋</button>
                    <button onClick={() => openHistoryModal(test)}>📊</button>
                    <button onClick={() => handleDelete(test.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Форма создания/редактирования */}
      {showForm && (
        <div className={styles['tests-mgmt-modal-overlay']} onClick={() => setShowForm(false)}>
          <div className={styles['tests-mgmt-modal-content']} onClick={(e) => e.stopPropagation()}>
            <h3>{editingTest ? 'Редактировать тест' : 'Создать тест'}</h3>
            <form onSubmit={handleSubmit}>
              <div className={styles['tests-mgmt-form-group']}>
                <label>Название теста *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className={styles['tests-mgmt-form-group']}>
                <label>Описание</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                />
              </div>

              <div className={styles['tests-mgmt-form-row']}>
                <div className={styles['tests-mgmt-form-group']}>
                  <label>Тип теста</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} disabled={editingTest}>
                    <option value="choice">С вариантами ответа</option>
                    <option value="code">С исправлением кода</option>
                  </select>
                </div>

                <div className={styles['tests-mgmt-form-group']}>
                  <label>Время (минут)</label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    min="0"
                  />
                </div>
              </div>

              <div className={styles['tests-mgmt-form-row']}>
                <div className={styles['tests-mgmt-form-group']}>
                  <label>Баллы за правильный</label>
                  <input
                    type="number"
                    value={pointsCorrect}
                    onChange={(e) => setPointsCorrect(e.target.value)}
                  />
                </div>

                <div className={styles['tests-mgmt-form-group']}>
                  <label>Баллы за неправильный</label>
                  <input
                    type="number"
                    value={pointsWrong}
                    onChange={(e) => setPointsWrong(e.target.value)}
                  />
                </div>

                <div className={styles['tests-mgmt-form-group']}>
                  <label>
                    <input
                      type="checkbox"
                      checked={canRetry}
                      onChange={(e) => setCanRetry(e.target.checked)}
                    />
                    Можно перепройти
                  </label>
                </div>
              </div>

              <hr />
              <h4>Вопросы</h4>
              
              {questions.map((question, qIndex) => (
                <div key={qIndex} className={styles['tests-mgmt-question-block']}>
                  <div className={styles['tests-mgmt-question-header']}>
                    <h5>Вопрос {qIndex + 1}</h5>
                    <button type="button" onClick={() => removeQuestion(qIndex)}>🗑️</button>
                  </div>

                  <div className={styles['tests-mgmt-form-group']}>
                    <label>Текст вопроса *</label>
                    <textarea
                      value={question.question_text}
                      onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                      rows="2"
                      required
                    />
                  </div>

                  {type === 'choice' ? (
                    <div className={styles['tests-mgmt-options-block']}>
                      <label>Варианты ответа:</label>
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className={styles['tests-mgmt-option-row']}>
                          <input
                            type="checkbox"
                            checked={option.is_correct}
                            onChange={(e) => updateOption(qIndex, oIndex, 'is_correct', e.target.checked)}
                            title="Правильный ответ"
                          />
                          <input
                            type="text"
                            value={option.option_text}
                            onChange={(e) => updateOption(qIndex, oIndex, 'option_text', e.target.value)}
                            placeholder="Вариант ответа"
                          />
                          <button type="button" onClick={() => removeOption(qIndex, oIndex)}>✖</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => addOption(qIndex)}>+ Добавить вариант</button>
                    </div>
                  ) : (
                    <>
                      <div className={styles['tests-mgmt-form-group']}>
                        <label>Язык программирования</label>
                        <select
                          value={question.code_language}
                          onChange={(e) => updateQuestion(qIndex, 'code_language', e.target.value)}
                        >
                          <option value="javascript">JavaScript</option>
                          <option value="python">Python</option>
                          <option value="java">Java</option>
                          <option value="cpp">C++</option>
                        </select>
                      </div>

                      <div className={styles['tests-mgmt-form-group']}>
                        <label>Шаблон кода (то, что видит студент)</label>
                        <textarea
                          value={question.code_template}
                          onChange={(e) => updateQuestion(qIndex, 'code_template', e.target.value)}
                          rows="5"
                          placeholder="function solve() { ... }"
                        />
                      </div>

                      <div className={styles['tests-mgmt-form-group']}>
                        <label>Правильное решение (для проверки)</label>
                        <textarea
                          value={question.code_solution}
                          onChange={(e) => updateQuestion(qIndex, 'code_solution', e.target.value)}
                          rows="5"
                          placeholder="function solve() { return 42; }"
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}

              <button type="button" onClick={addQuestion}>+ Добавить вопрос</button>

              <div className={styles['tests-mgmt-form-actions']}>
                <button type="submit" className={styles['tests-mgmt-btn-primary']}>Сохранить тест</button>
                <button type="button" onClick={() => setShowForm(false)}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно назначения */}
      {showAssignModal && selectedTest && (
        <div className={styles['tests-mgmt-modal-overlay']} onClick={() => setShowAssignModal(false)}>
          <div className="tests-mgmt-modal-content tests-mgmt-modal-small" onClick={(e) => e.stopPropagation()}>
            <h3>Назначение теста: {selectedTest.title}</h3>
            
            <h4>Назначить группе:</h4>
            <div className={styles['tests-mgmt-assign-groups']}>
              {groups.map(group => {
                const isAssigned = selectedTest.assignments?.some(a => a.group_id === group.id);
                return (
                  <div key={group.id} className={styles['tests-mgmt-group-item']}>
                    <span>{group.name}</span>
                    {isAssigned ? (
                      <button onClick={() => handleUnassign(group.id)}>Отменить</button>
                    ) : (
                      <button onClick={() => handleAssign(group.id)}>Назначить</button>
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={() => setShowAssignModal(false)}>Закрыть</button>
          </div>
        </div>
      )}

      {/* Модальное окно истории */}
      {showHistoryModal && selectedTest && (
        <div className={styles['tests-mgmt-modal-overlay']} onClick={() => setShowHistoryModal(false)}>
          <div className="tests-mgmt-modal-content tests-mgmt-modal-large" onClick={(e) => e.stopPropagation()}>
            <h3>История прохождения: {selectedTest.title}</h3>
            
            {testHistory.length === 0 ? (
              <p>Пока никто не проходил этот тест</p>
            ) : (
              <table className={styles['tests-mgmt-table']}>
                <thead>
                  <tr>
                    <th>Студент</th>
                    <th>Дата</th>
                    <th>Результат</th>
                    <th>Баллы</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {testHistory.map(attempt => (
                    <tr key={attempt.id}>
                      <td>{attempt.full_name}</td>
                      <td>{new Date(attempt.started_at).toLocaleString('ru-RU')}</td>
                      <td>{attempt.score}%</td>
                      <td>{attempt.points_earned}</td>
                      <td>
                        {attempt.status === 'completed' ? '✅ Завершен' : 
                         attempt.status === 'in_progress' ? '⏳ В процессе' : 
                         '❌ Истек'}
                      </td>
                      <td>
                        <button onClick={() => handleReassign(attempt.user_id)}>🔄 Переназначить</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <button onClick={() => setShowHistoryModal(false)}>Закрыть</button>
          </div>
        </div>
      )}

      {/* Массовый редактор тестов */}
      {showBulkEditor && (
        <BulkTestEditor
          onImport={handleBulkImport}
          onClose={() => setShowBulkEditor(false)}
        />
      )}
    </div>
  );
}

export default TestsManagement;
