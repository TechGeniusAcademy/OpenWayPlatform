import { useState } from 'react';
import { FiX, FiUpload, FiCheck, FiArrowLeft, FiFileText, FiCheckCircle } from 'react-icons/fi';
import styles from './BulkTestEditor.module.css';

function BulkTestEditor({ onImport, onClose }) {
  const [bulkText, setBulkText] = useState('');
  const [testSettings, setTestSettings] = useState({
    title: '',
    description: '',
    type: 'choice',
    timeLimit: 0,
    pointsCorrect: 1,
    pointsWrong: 0,
    canRetry: false
  });
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  const exampleText = `1. Что такое переменная в JavaScript?
   a) Контейнер для данных [✓]
   b) Функция
   c) Объект
   d) Метод

2. Как объявить переменную в JavaScript?
   a) var name; [✓]
   b) variable name;
   c) new name;
   d) create name;

3. Какие типы данных существуют в JavaScript?
   a) string, number [✓]
   b) boolean, object [✓]
   c) undefined, null [✓]
   d) все вышеперечисленные

4. Что выведет console.log(typeof "hello")?
   a) string [✓]
   b) text
   c) object
   d) undefined`;

  const parseBulkText = (text) => {
    const questions = [];
    const questionBlocks = text.split(/\n(?=\d+\.)/);
    
    questionBlocks.forEach(block => {
      if (!block.trim()) return;
      
      const lines = block.trim().split('\n');
      const questionLine = lines[0];
      const optionLines = lines.slice(1);
      
      // Извлекаем номер и текст вопроса
      const questionMatch = questionLine.match(/^\d+\.\s*(.+)/);
      if (!questionMatch) return;
      
      const questionText = questionMatch[1];
      const options = [];
      
      optionLines.forEach(line => {
        const optionMatch = line.trim().match(/^[a-z]\)\s*(.+?)(\s*\[✓\])?$/i);
        if (optionMatch) {
          const optionText = optionMatch[1].trim();
          const isCorrect = !!optionMatch[2];
          options.push({ option_text: optionText, is_correct: isCorrect });
        }
      });
      
      if (options.length > 0) {
        questions.push({
          question_text: questionText,
          question_type: 'choice',
          options: options,
          code_template: '',
          code_solution: '',
          code_language: 'javascript'
        });
      }
    });
    
    return questions;
  };

  const handlePreview = () => {
    if (!bulkText.trim()) {
      alert('Введите текст для парсинга');
      return;
    }
    
    const questions = parseBulkText(bulkText);
    if (questions.length === 0) {
      alert('Не удалось распознать вопросы. Проверьте формат.');
      return;
    }
    
    setPreviewQuestions(questions);
    setShowPreview(true);
  };

  const handleImport = () => {
    if (!testSettings.title.trim()) {
      alert('Введите название теста');
      return;
    }
    
    if (previewQuestions.length === 0) {
      alert('Нет вопросов для импорта');
      return;
    }
    
    onImport({
      ...testSettings,
      questions: previewQuestions
    });
  };

  const loadExample = () => {
    setBulkText(exampleText);
    setTestSettings(prev => ({
      ...prev,
      title: 'Основы JavaScript',
      description: 'Тест на знание основ JavaScript'
    }));
  };

  return (
    <div className={styles['modal-overlay']} onClick={onClose}>
      <div className={`${styles.modal} ${styles['modal-xlarge']}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles['modal-header']}>
          <div className={styles['header-title']}>
            <div className={styles['header-icon']}>
              <FiUpload />
            </div>
            <h2>Массовое создание теста</h2>
          </div>
          <button className={styles['close-btn']} onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className={styles['modal-body']}>
        {!showPreview ? (
          <>
            {/* Настройки теста */}
            <div className={styles['settings-section']}>
              <h3 className={styles['section-title']}>Настройки теста</h3>
              <div className={styles['settings-grid']}>
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Название теста *</label>
                  <input
                    type="text"
                    className={styles['form-input']}
                    value={testSettings.title}
                    onChange={(e) => setTestSettings(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Введите название теста"
                  />
                </div>
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Время (минут)</label>
                  <input
                    type="number"
                    className={styles['form-input']}
                    value={testSettings.timeLimit}
                    onChange={(e) => setTestSettings(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
              </div>
              
              <div className={styles['form-group']}>
                <label className={styles['form-label']}>Описание</label>
                <textarea
                  className={styles['form-textarea']}
                  value={testSettings.description}
                  onChange={(e) => setTestSettings(prev => ({ ...prev, description: e.target.value }))}
                  rows="2"
                  placeholder="Введите описание теста"
                />
              </div>

              <div className={styles['settings-grid']}>
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Баллы за правильный</label>
                  <input
                    type="number"
                    className={styles['form-input']}
                    value={testSettings.pointsCorrect}
                    onChange={(e) => setTestSettings(prev => ({ ...prev, pointsCorrect: parseInt(e.target.value) || 1 }))}
                    min="0"
                  />
                </div>
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Баллы за неправильный</label>
                  <input
                    type="number"
                    className={styles['form-input']}
                    value={testSettings.pointsWrong}
                    onChange={(e) => setTestSettings(prev => ({ ...prev, pointsWrong: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className={styles['form-group']}>
                  <label className={styles['checkbox-label']}>
                    <input
                      type="checkbox"
                      checked={testSettings.canRetry}
                      onChange={(e) => setTestSettings(prev => ({ ...prev, canRetry: e.target.checked }))}
                    />
                    Можно перепройти
                  </label>
                </div>
              </div>
            </div>

            {/* Инструкция по формату */}
            <div className={styles['instruction-section']}>
              <h3 className={styles['section-title']}>
                <FiFileText />
                <span>Формат ввода вопросов</span>
              </h3>
              <div className={styles['instruction-content']}>
                <p className={styles['instruction-text']}>Используйте следующий формат:</p>
                <pre className={styles['code-block']}>{`1. Текст вопроса?
   a) Вариант ответа 1
   b) Правильный ответ [✓]
   c) Еще один вариант
   d) Последний вариант [✓]

2. Следующий вопрос?
   a) Ответ 1
   b) Правильный ответ [✓]`}</pre>
                <div className={styles['rules-box']}>
                  <p className={styles['rules-title']}><strong>Правила форматирования:</strong></p>
                  <ul className={styles['rules-list']}>
                    <li>Нумеруйте вопросы: 1., 2., 3...</li>
                    <li>Варианты ответов: a), b), c), d)</li>
                    <li>Отмечайте правильные ответы: [✓]</li>
                    <li>Можно отмечать несколько правильных ответов</li>
                    <li>Пустая строка между вопросами</li>
                  </ul>
                </div>
                <button className={styles['btn-example']} onClick={loadExample}>
                  <FiFileText />
                  <span>Загрузить пример</span>
                </button>
              </div>
            </div>

            {/* Текстовое поле для ввода */}
            <div className={styles['input-section']}>
              <h3 className={styles['section-title']}>Введите вопросы</h3>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Вставьте или введите вопросы в указанном формате..."
                rows="15"
                className={styles['bulk-textarea']}
              />
            </div>

            <div className={styles['modal-footer']}>
              <button className={styles['btn-secondary']} onClick={onClose}>
                <FiX />
                <span>Отмена</span>
              </button>
              <button className={styles['btn-primary']} onClick={handlePreview}>
                <FiFileText />
                <span>Предварительный просмотр</span>
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Предварительный просмотр */}
            <div className={styles['preview-section']}>
              <div className={styles['preview-header']}>
                <h3 className={styles['section-title']}>
                  <FiFileText />
                  <span>Предварительный просмотр</span>
                </h3>
                <div className={styles['questions-count']}>
                  {previewQuestions.length} {previewQuestions.length === 1 ? 'вопрос' : 'вопросов'}
                </div>
              </div>
              
              <div className={styles['preview-questions']}>
                {previewQuestions.map((question, index) => (
                  <div key={index} className={styles['preview-question']}>
                    <div className={styles['question-number']}>Вопрос {index + 1}</div>
                    <p className={styles['question-text']}>{question.question_text}</p>
                    <div className={styles['preview-options']}>
                      {question.options.map((option, optIndex) => (
                        <div 
                          key={optIndex} 
                          className={`${styles['preview-option']} ${option.is_correct ? styles['option-correct'] : ''}`}
                        >
                          <span className={styles['option-letter']}>{String.fromCharCode(97 + optIndex)})</span>
                          <span className={styles['option-text']}>{option.option_text}</span>
                          {option.is_correct && (
                            <span className={styles['correct-mark']}>
                              <FiCheckCircle />
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles['modal-footer']}>
                <button className={styles['btn-secondary']} onClick={() => setShowPreview(false)}>
                  <FiArrowLeft />
                  <span>Вернуться к редактированию</span>
                </button>
                <button className={styles['btn-success']} onClick={handleImport}>
                  <FiCheck />
                  <span>Создать тест</span>
                </button>
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}

export default BulkTestEditor;