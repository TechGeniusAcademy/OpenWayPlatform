import { useState, useEffect } from 'react';
import styles from './JSGameManagement.module.css';
import { 
  FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaPlay, FaCheck,
  FaCode, FaList, FaLightbulb, FaVial, FaArrowUp, FaArrowDown
} from 'react-icons/fa';
import api from '../utils/api';
import { toast } from 'react-toastify';

function JSGameManagement() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLevel, setEditingLevel] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  // Форма уровня
  const [form, setForm] = useState({
    title: '',
    description: '',
    difficulty: 1,
    points_reward: 10,
    task_description: '',
    initial_code: '// Напишите вашу функцию здесь\n\nfunction solution() {\n  \n}',
    solution_code: '',
    tests: [{ input: [], expected: null }],
    hints: [''],
    time_limit: 5000,
    order_index: 0,
    is_active: true
  });

  useEffect(() => {
    loadLevels();
  }, []);

  const loadLevels = async () => {
    try {
      const response = await api.get('/js-game/admin/levels');
      setLevels(response.data);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      toast.error('Не удалось загрузить уровни');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      difficulty: 1,
      points_reward: 10,
      task_description: '',
      initial_code: '// Напишите вашу функцию здесь\n\nfunction solution() {\n  \n}',
      solution_code: '',
      tests: [{ input: [], expected: null }],
      hints: [''],
      time_limit: 5000,
      order_index: levels.length,
      is_active: true
    });
    setEditingLevel(null);
    setTestResults(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (level) => {
    setForm({
      title: level.title,
      description: level.description || '',
      difficulty: level.difficulty,
      points_reward: level.points_reward,
      task_description: level.task_description,
      initial_code: level.initial_code || '',
      solution_code: level.solution_code || '',
      tests: level.tests?.length ? level.tests : [{ input: [], expected: null }],
      hints: level.hints?.length ? level.hints : [''],
      time_limit: level.time_limit || 5000,
      order_index: level.order_index,
      is_active: level.is_active
    });
    setEditingLevel(level);
    setShowForm(true);
    setTestResults(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.task_description.trim()) {
      toast.error('Заполните название и описание задачи');
      return;
    }

    // Фильтруем пустые тесты и подсказки
    const cleanedTests = form.tests.filter(t => t.expected !== null && t.expected !== '');
    const cleanedHints = form.hints.filter(h => h.trim() !== '');

    if (cleanedTests.length === 0) {
      toast.error('Добавьте хотя бы один тест');
      return;
    }

    try {
      const data = {
        ...form,
        tests: cleanedTests,
        hints: cleanedHints
      };

      if (editingLevel) {
        await api.put(`/js-game/admin/levels/${editingLevel.id}`, data);
        toast.success('Уровень обновлён');
      } else {
        await api.post('/js-game/admin/levels', data);
        toast.success('Уровень создан');
      }

      setShowForm(false);
      resetForm();
      loadLevels();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      toast.error('Не удалось сохранить уровень');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить этот уровень?')) return;

    try {
      await api.delete(`/js-game/admin/levels/${id}`);
      toast.success('Уровень удалён');
      loadLevels();
    } catch (error) {
      console.error('Ошибка удаления:', error);
      toast.error('Не удалось удалить уровень');
    }
  };

  // Управление тестами
  const addTest = () => {
    setForm(prev => ({
      ...prev,
      tests: [...prev.tests, { input: [], expected: null }]
    }));
  };

  const updateTest = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      tests: prev.tests.map((t, i) => i === index ? { ...t, [field]: value } : t)
    }));
  };

  const removeTest = (index) => {
    setForm(prev => ({
      ...prev,
      tests: prev.tests.filter((_, i) => i !== index)
    }));
  };

  // Управление подсказками
  const addHint = () => {
    setForm(prev => ({
      ...prev,
      hints: [...prev.hints, '']
    }));
  };

  const updateHint = (index, value) => {
    setForm(prev => ({
      ...prev,
      hints: prev.hints.map((h, i) => i === index ? value : h)
    }));
  };

  const removeHint = (index) => {
    setForm(prev => ({
      ...prev,
      hints: prev.hints.filter((_, i) => i !== index)
    }));
  };

  // Тестирование решения
  const testSolution = async () => {
    if (!form.solution_code.trim()) {
      toast.error('Введите код решения для тестирования');
      return;
    }

    const cleanedTests = form.tests.filter(t => t.expected !== null && t.expected !== '');
    if (cleanedTests.length === 0) {
      toast.error('Добавьте тесты');
      return;
    }

    setIsTesting(true);
    setTestResults(null);

    try {
      const response = await api.post('/js-game/admin/test-code', {
        code: form.solution_code,
        tests: cleanedTests,
        timeLimit: form.time_limit
      });

      setTestResults(response.data.results);
      
      const passed = response.data.results.filter(r => r.passed).length;
      const total = response.data.results.length;
      
      if (passed === total) {
        toast.success(`Все ${total} тестов пройдены!`);
      } else {
        toast.warning(`Пройдено ${passed} из ${total} тестов`);
      }
    } catch (error) {
      console.error('Ошибка тестирования:', error);
      toast.error('Ошибка при тестировании');
    } finally {
      setIsTesting(false);
    }
  };

  // Парсинг JSON для тестов
  const parseTestValue = (value) => {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1><FaCode /> Управление JS-игрой</h1>
        <button className={styles.addBtn} onClick={openCreateForm}>
          <FaPlus /> Добавить уровень
        </button>
      </div>

      {/* Список уровней */}
      {!showForm && (
        <div className={styles.levelsList}>
          {levels.length === 0 ? (
            <div className={styles.empty}>
              <p>Нет уровней. Создайте первый!</p>
            </div>
          ) : (
            levels.map((level, index) => (
              <div 
                key={level.id} 
                className={`${styles.levelItem} ${!level.is_active ? styles.inactive : ''}`}
              >
                <div className={styles.levelOrder}>#{index + 1}</div>
                <div className={styles.levelContent}>
                  <h3>{level.title}</h3>
                  <p>{level.description}</p>
                  <div className={styles.levelMeta}>
                    <span className={styles.danBadge} data-dan={level.difficulty}>{level.difficulty} Дан</span>
                    <span>+{level.points_reward} очков</span>
                    <span><FaVial /> {level.tests?.length || 0} тестов</span>
                    <span>👥 {level.completions} решений</span>
                  </div>
                </div>
                <div className={styles.levelActions}>
                  <button onClick={() => openEditForm(level)} title="Редактировать">
                    <FaEdit />
                  </button>
                  <button onClick={() => handleDelete(level.id)} className={styles.deleteBtn} title="Удалить">
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Форма создания/редактирования */}
      {showForm && (
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h2>{editingLevel ? 'Редактирование уровня' : 'Новый уровень'}</h2>
            <button className={styles.closeBtn} onClick={() => setShowForm(false)}>
              <FaTimes />
            </button>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGrid}>
              {/* Основная информация */}
              <div className={styles.formSection}>
                <h3><FaList /> Основная информация</h3>
                
                <label>
                  Название *
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Сумма двух чисел"
                  />
                </label>

                <label>
                  Краткое описание
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Научитесь складывать числа"
                  />
                </label>

                <div className={styles.row}>
                  <label>
                    Дан (сложность)
                    <select
                      value={form.difficulty}
                      onChange={(e) => setForm(prev => ({ ...prev, difficulty: parseInt(e.target.value) }))}
                    >
                      <option value={1}>1 Дан - Начинающий</option>
                      <option value={2}>2 Дан - Легко</option>
                      <option value={3}>3 Дан - Нормально</option>
                      <option value={4}>4 Дан - Средне</option>
                      <option value={5}>5 Дан - Сложно</option>
                      <option value={6}>6 Дан - Трудно</option>
                      <option value={7}>7 Дан - Эксперт</option>
                      <option value={8}>8 Дан - Мастер</option>
                    </select>
                  </label>

                  <label>
                    Очки
                    <input
                      type="number"
                      value={form.points_reward}
                      onChange={(e) => setForm(prev => ({ ...prev, points_reward: parseInt(e.target.value) || 10 }))}
                      min="1"
                    />
                  </label>

                  <label>
                    Порядок
                    <input
                      type="number"
                      value={form.order_index}
                      onChange={(e) => setForm(prev => ({ ...prev, order_index: parseInt(e.target.value) || 0 }))}
                      min="0"
                    />
                  </label>
                </div>

                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                  Активен (виден ученикам)
                </label>
              </div>

              {/* Описание задачи */}
              <div className={styles.formSection}>
                <h3><FaCode /> Описание задачи *</h3>
                <textarea
                  value={form.task_description}
                  onChange={(e) => setForm(prev => ({ ...prev, task_description: e.target.value }))}
                  placeholder="Напишите функцию solution(a, b), которая принимает два числа и возвращает их сумму.&#10;&#10;Пример:&#10;solution(2, 3) → 5&#10;solution(-1, 1) → 0"
                  rows={8}
                />
              </div>

              {/* Начальный код */}
              <div className={styles.formSection}>
                <h3><FaCode /> Начальный код (шаблон для ученика)</h3>
                <textarea
                  value={form.initial_code}
                  onChange={(e) => setForm(prev => ({ ...prev, initial_code: e.target.value }))}
                  placeholder="function solution(a, b) {&#10;  // Ваш код здесь&#10;}"
                  className={styles.codeArea}
                  rows={6}
                />
              </div>

              {/* Решение */}
              <div className={styles.formSection}>
                <h3><FaCheck /> Решение (для проверки)</h3>
                <textarea
                  value={form.solution_code}
                  onChange={(e) => setForm(prev => ({ ...prev, solution_code: e.target.value }))}
                  placeholder="function solution(a, b) {&#10;  return a + b;&#10;}"
                  className={styles.codeArea}
                  rows={6}
                />
                <button 
                  type="button" 
                  className={styles.testBtn}
                  onClick={testSolution}
                  disabled={isTesting}
                >
                  <FaPlay /> {isTesting ? 'Тестирование...' : 'Проверить решение'}
                </button>

                {/* Результаты тестирования */}
                {testResults && (
                  <div className={styles.testResults}>
                    {testResults.map((result, i) => (
                      <div 
                        key={i} 
                        className={`${styles.testResult} ${result.passed ? styles.passed : styles.failed}`}
                      >
                        <span className={styles.testIcon}>
                          {result.passed ? <FaCheck /> : <FaTimes />}
                        </span>
                        <span>Тест {i + 1}:</span>
                        <code>input: {JSON.stringify(result.input)}</code>
                        <code>expected: {JSON.stringify(result.expected)}</code>
                        <code>actual: {result.error || JSON.stringify(result.actual)}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Тесты */}
              <div className={styles.formSection}>
                <h3><FaVial /> Тесты *</h3>
                <div className={styles.hint}>
                  <strong>Как заполнять тесты:</strong>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                    <li><code>[2, 3]</code> → <code>5</code> — функция получит (2, 3), должна вернуть 5</li>
                    <li><code>["hello"]</code> → <code>"HELLO"</code> — строка как аргумент и результат</li>
                    <li><code>[[1, 2, 3]]</code> → <code>6</code> — массив как один аргумент</li>
                    <li><code>[5]</code> → <code>true</code> — булевый результат</li>
                    <li><code>[]</code> → <code>"default"</code> — без аргументов</li>
                  </ul>
                </div>
                
                {form.tests.map((test, index) => (
                  <div key={index} className={styles.testRow}>
                    <span className={styles.testNum}>#{index + 1}</span>
                    <input
                      type="text"
                      value={JSON.stringify(test.input)}
                      onChange={(e) => updateTest(index, 'input', parseTestValue(e.target.value))}
                      placeholder='[2, 3] или ["hello"]'
                    />
                    <span>→</span>
                    <input
                      type="text"
                      value={test.expected !== null ? JSON.stringify(test.expected) : ''}
                      onChange={(e) => updateTest(index, 'expected', parseTestValue(e.target.value))}
                      placeholder='5 или "результат"'
                    />
                    <button 
                      type="button" 
                      onClick={() => removeTest(index)}
                      className={styles.removeBtn}
                      disabled={form.tests.length <= 1}
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
                
                <button type="button" className={styles.addItemBtn} onClick={addTest}>
                  <FaPlus /> Добавить тест
                </button>
              </div>

              {/* Подсказки */}
              <div className={styles.formSection}>
                <h3><FaLightbulb /> Подсказки (опционально)</h3>
                
                {form.hints.map((hint, index) => (
                  <div key={index} className={styles.hintRow}>
                    <span className={styles.hintNum}>{index + 1}</span>
                    <input
                      type="text"
                      value={hint}
                      onChange={(e) => updateHint(index, e.target.value)}
                      placeholder="Используйте оператор +"
                    />
                    <button 
                      type="button" 
                      onClick={() => removeHint(index)}
                      className={styles.removeBtn}
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
                
                <button type="button" className={styles.addItemBtn} onClick={addHint}>
                  <FaPlus /> Добавить подсказку
                </button>
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>
                Отмена
              </button>
              <button type="submit" className={styles.saveBtn}>
                <FaSave /> {editingLevel ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default JSGameManagement;
