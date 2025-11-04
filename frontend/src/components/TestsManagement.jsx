import { useState, useEffect } from 'react';
import { 
  FiFileText, FiPlus, FiEdit2, FiTrash2, FiClock, 
  FiCheckSquare, FiBarChart2, FiX, FiCheck, FiRefreshCw,
  FiUpload
} from 'react-icons/fi';
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

  if (loading) return (
    <div className={styles['loading-state']}>
      <FiRefreshCw className={styles['loading-icon']} />
      <p>Загрузка тестов...</p>
    </div>
  );

  return (
    <div className={styles['page-container']}>
      <div className={styles['page-header']}>
        <div className={styles['header-content']}>
          <div className={styles['header-left']}>
            <div className={styles['header-icon']}>
              <FiFileText />
            </div>
            <div>
              <h1>Управление тестами</h1>
              <p>Создание и назначение тестов для студентов</p>
            </div>
          </div>
          <div className={styles['header-actions']}>
            <button className={styles['btn-secondary']} onClick={() => setShowBulkEditor(true)}>
              <FiUpload />
              <span>Массовое создание</span>
            </button>
            <button className={styles['btn-primary']} onClick={() => openForm()}>
              <FiPlus />
              <span>Создать тест</span>
            </button>
          </div>
        </div>
      </div>

      <div className={styles['tests-table-container']}>
        {tests.length === 0 ? (
          <div className={styles['empty-state']}>
            <div className={styles['empty-state-icon']}>
              <FiFileText />
            </div>
            <h3>Нет созданных тестов</h3>
            <p>Создайте первый тест, нажав кнопку выше</p>
          </div>
        ) : (
          <table className={styles['tests-table']}>
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
                  <td className={styles['test-title']}>{test.title}</td>
                  <td>{test.type === 'choice' ? 'С вариантами' : 'С кодом'}</td>
                  <td>{test.questions_count}</td>
                  <td>{test.points_correct} / {test.points_wrong}</td>
                  <td>{test.time_limit || '∞'} мин</td>
                  <td>{test.can_retry ? 'Да' : 'Нет'}</td>
                  <td>
                    <div className={styles['action-buttons']}>
                      <button 
                        className={styles['btn-icon-edit']} 
                        onClick={() => openForm(test)}
                        title="Редактировать"
                      >
                        <FiEdit2 />
                      </button>
                      <button 
                        className={styles['btn-icon-assign']} 
                        onClick={() => openAssignModal(test)}
                        title="Назначить"
                      >
                        <FiCheckSquare />
                      </button>
                      <button 
                        className={styles['btn-icon-history']} 
                        onClick={() => openHistoryModal(test)}
                        title="История"
                      >
                        <FiBarChart2 />
                      </button>
                      <button 
                        className={styles['btn-icon-delete']} 
                        onClick={() => handleDelete(test.id)}
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

      {/* Форма создания/редактирования */}
      {showForm && (
        <div className={styles['modal-overlay']} onClick={() => setShowForm(false)}>
          <div className={`${styles.modal} ${styles['modal-large']}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>{editingTest ? 'Редактировать тест' : 'Создать тест'}</h2>
              <button className={styles['close-btn']} onClick={() => setShowForm(false)}>
                <FiX />
              </button>
            </div>
            <form className={styles['modal-form']} onSubmit={handleSubmit}>
              <div className={styles['form-group']}>
                <label className={styles['form-label']}>Название теста *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className={styles['form-group']}>
                <label>Описание</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                />
              </div>

              <div className={styles['form-row']}>
                <div className={styles['form-group']}>
                  <label>Тип теста</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} disabled={editingTest}>
                    <option value="choice">С вариантами ответа</option>
                    <option value="code">С исправлением кода</option>
                  </select>
                </div>

                <div className={styles['form-group']}>
                  <label>Время (минут)</label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    min="0"
                  />
                </div>
              </div>

              <div className={styles['form-row']}>
                <div className={styles['form-group']}>
                  <label>Баллы за правильный</label>
                  <input
                    type="number"
                    value={pointsCorrect}
                    onChange={(e) => setPointsCorrect(e.target.value)}
                  />
                </div>

                <div className={styles['form-group']}>
                  <label>Баллы за неправильный</label>
                  <input
                    type="number"
                    value={pointsWrong}
                    onChange={(e) => setPointsWrong(e.target.value)}
                  />
                </div>

                <div className={styles['form-group']}>
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
                <div key={qIndex} className={styles['question-block']}>
                  <div className={styles['question-header']}>
                    <h5>Вопрос {qIndex + 1}</h5>
                    <button 
                      type="button" 
                      className={styles['btn-icon-delete-small']}
                      onClick={() => removeQuestion(qIndex)}
                      title="Удалить вопрос"
                    >
                      <FiTrash2 />
                    </button>
                  </div>

                  <div className={styles['form-group']}>
                    <label>Текст вопроса *</label>
                    <textarea
                      value={question.question_text}
                      onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                      rows="2"
                      required
                    />
                  </div>

                  {type === 'choice' ? (
                    <div className={styles['options-block']}>
                      <label>Варианты ответа:</label>
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className={styles['option-row']}>
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
                          <button 
                            type="button" 
                            className={styles['btn-remove-option']}
                            onClick={() => removeOption(qIndex, oIndex)}
                            title="Удалить вариант"
                          >
                            <FiX />
                          </button>
                        </div>
                      ))}
                      <button 
                        type="button" 
                        className={styles['btn-add-option']}
                        onClick={() => addOption(qIndex)}
                      >
                        <FiPlus />
                        <span>Добавить вариант</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className={styles['form-group']}>
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

                      <div className={styles['form-group']}>
                        <label>Шаблон кода (то, что видит студент)</label>
                        <textarea
                          value={question.code_template}
                          onChange={(e) => updateQuestion(qIndex, 'code_template', e.target.value)}
                          rows="5"
                          placeholder="function solve() { ... }"
                        />
                      </div>

                      <div className={styles['form-group']}>
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

              <button 
                type="button" 
                className={styles['btn-add-question']}
                onClick={addQuestion}
              >
                <FiPlus />
                <span>Добавить вопрос</span>
              </button>

              <div className={styles['form-actions']}>
                <button type="submit" className={styles['btn-primary']}>
                  <FiCheck />
                  <span>Сохранить тест</span>
                </button>
                <button 
                  type="button" 
                  className={styles['btn-secondary']}
                  onClick={() => setShowForm(false)}
                >
                  <FiX />
                  <span>Отмена</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно назначения */}
      {showAssignModal && selectedTest && (
        <div className={styles['modal-overlay']} onClick={() => setShowAssignModal(false)}>
          <div className={`${styles.modal} ${styles['modal-small']}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>Назначение теста: {selectedTest.title}</h2>
              <button className={styles['close-btn']} onClick={() => setShowAssignModal(false)}>
                <FiX />
              </button>
            </div>
            
            <div className={styles['modal-body']}>
              <h4>Назначить группе:</h4>
              <div className={styles['assign-groups']}>
                {groups.map(group => {
                  const isAssigned = selectedTest.assignments?.some(a => a.group_id === group.id);
                  return (
                    <div key={group.id} className={styles['group-item']}>
                      <span>{group.name}</span>
                      {isAssigned ? (
                        <button 
                          className={styles['btn-unassign']}
                          onClick={() => handleUnassign(group.id)}
                        >
                          <FiX />
                          <span>Отменить</span>
                        </button>
                      ) : (
                        <button 
                          className={styles['btn-assign']}
                          onClick={() => handleAssign(group.id)}
                        >
                          <FiCheckSquare />
                          <span>Назначить</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className={styles['modal-footer']}>
                <button 
                  className={styles['btn-secondary']}
                  onClick={() => setShowAssignModal(false)}
                >
                  <span>Закрыть</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно истории */}
      {showHistoryModal && selectedTest && (
        <div className={styles['modal-overlay']} onClick={() => setShowHistoryModal(false)}>
          <div className={`${styles.modal} ${styles['modal-large']}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>История прохождения: {selectedTest.title}</h2>
              <button className={styles['close-btn']} onClick={() => setShowHistoryModal(false)}>
                <FiX />
              </button>
            </div>
            
            <div className={styles['modal-body']}>
              {testHistory.length === 0 ? (
                <div className={styles['empty-state']}>
                  <div className={styles['empty-state-icon']}>
                    <FiBarChart2 />
                  </div>
                  <p>Пока никто не проходил этот тест</p>
                </div>
              ) : (
                <table className={styles['history-table']}>
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
                          <span className={`${styles.badge} ${styles[`badge-${attempt.status}`]}`}>
                            {attempt.status === 'completed' ? (
                              <><FiCheck /> Завершен</>
                            ) : attempt.status === 'in_progress' ? (
                              <><FiClock /> В процессе</>
                            ) : (
                              <><FiX /> Истек</>
                            )}
                          </span>
                        </td>
                        <td>
                          <button 
                            className={styles['btn-icon-reassign']}
                            onClick={() => handleReassign(attempt.user_id)}
                            title="Переназначить тест"
                          >
                            <FiRefreshCw />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className={styles['modal-footer']}>
                <button 
                  className={styles['btn-secondary']}
                  onClick={() => setShowHistoryModal(false)}
                >
                  <span>Закрыть</span>
                </button>
              </div>
            </div>
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

