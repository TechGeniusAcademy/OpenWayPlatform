import { useState } from 'react';
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
    <div className={styles.bulk-test-editor}>
      <div className={styles.bulk-editor-header}>
        <h3>Массовое создание теста</h3>
        <button className={styles.bulk-btn-close} onClick={onClose}>✕</button>
      </div>

      <div className={styles.bulk-editor-content}>
        {!showPreview ? (
          <>
            {/* Настройки теста */}
            <div className={styles.bulk-test-settings}>
              <h4>Настройки теста</h4>
              <div className={styles.bulk-settings-row}>
                <div className={styles.bulk-form-group}>
                  <label>Название теста *</label>
                  <input
                    type="text"
                    value={testSettings.title}
                    onChange={(e) => setTestSettings(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Название теста"
                  />
                </div>
                <div className={styles.bulk-form-group}>
                  <label>Время (минут)</label>
                  <input
                    type="number"
                    value={testSettings.timeLimit}
                    onChange={(e) => setTestSettings(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
              </div>
              
              <div className={styles.bulk-form-group}>
                <label>Описание</label>
                <textarea
                  value={testSettings.description}
                  onChange={(e) => setTestSettings(prev => ({ ...prev, description: e.target.value }))}
                  rows="2"
                  placeholder="Описание теста"
                />
              </div>

              <div className={styles.bulk-settings-row}>
                <div className={styles.bulk-form-group}>
                  <label>Баллы за правильный</label>
                  <input
                    type="number"
                    value={testSettings.pointsCorrect}
                    onChange={(e) => setTestSettings(prev => ({ ...prev, pointsCorrect: parseInt(e.target.value) || 1 }))}
                    min="0"
                  />
                </div>
                <div className={styles.bulk-form-group}>
                  <label>Баллы за неправильный</label>
                  <input
                    type="number"
                    value={testSettings.pointsWrong}
                    onChange={(e) => setTestSettings(prev => ({ ...prev, pointsWrong: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className={styles.bulk-form-group}>
                  <label>
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
            <div className={styles.bulk-format-instruction}>
              <h4>Формат ввода вопросов</h4>
              <div className={styles.bulk-instruction-content}>
                <p>Используйте следующий формат:</p>
                <pre>{`1. Текст вопроса?
   a) Вариант ответа 1
   b) Правильный ответ [✓]
   c) Еще один вариант
   d) Последний вариант [✓]

2. Следующий вопрос?
   a) Ответ 1
   b) Правильный ответ [✓]`}</pre>
                <p><strong>Правила:</strong></p>
                <ul>
                  <li>Нумеруйте вопросы: 1., 2., 3...</li>
                  <li>Варианты ответов: a), b), c), d)</li>
                  <li>Отмечайте правильные ответы: [✓]</li>
                  <li>Можно отмечать несколько правильных ответов</li>
                  <li>Пустая строка между вопросами</li>
                </ul>
                <button className={styles.bulk-btn-secondary} onClick={loadExample}>
                  Загрузить пример
                </button>
              </div>
            </div>

            {/* Текстовое поле для ввода */}
            <div className={styles.bulk-input}>
              <h4>Введите вопросы</h4>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Вставьте или введите вопросы в указанном формате..."
                rows="15"
                className={styles.bulk-textarea}
              />
            </div>

            <div className={styles.bulk-actions}>
              <button className={styles.bulk-btn-primary} onClick={handlePreview}>
                Предварительный просмотр
              </button>
              <button className={styles.bulk-btn-secondary} onClick={onClose}>
                Отмена
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Предварительный просмотр */}
            <div className={styles.bulk-preview-section}>
              <h4>Предварительный просмотр ({previewQuestions.length} вопросов)</h4>
              
              <div className={styles.bulk-preview-questions}>
                {previewQuestions.map((question, index) => (
                  <div key={index} className={styles.bulk-preview-question}>
                    <h5>Вопрос {index + 1}</h5>
                    <p className={styles.bulk-question-text}>{question.question_text}</p>
                    <div className={styles.bulk-preview-options}>
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} className={`bulk-preview-option ${option.is_correct ? 'bulk-correct' : ''}`}>
                          <span className={styles.bulk-option-letter}>{String.fromCharCode(97 + optIndex)})</span>
                          <span className={styles.bulk-option-text}>{option.option_text}</span>
                          {option.is_correct && <span className={styles.bulk-correct-mark}>✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.bulk-preview-actions}>
                <button className={styles.bulk-btn-success} onClick={handleImport}>
                  Создать тест
                </button>
                <button className={styles.bulk-btn-secondary} onClick={() => setShowPreview(false)}>
                  Вернуться к редактированию
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BulkTestEditor;