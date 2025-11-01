import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import styles from './TypingTrainer.module.css';

function TypingTrainer() {
  const { user } = useAuth();
  
  // Константы
  const WORDS_AHEAD = 10; // Количество слов для отображения
  const TIME_OPTIONS = [60, 120, 180, 300]; // 1, 2, 3, 5 минут

  // Программистские слова для генерации
  const programmingWords = [
    'function', 'variable', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while',
    'array', 'object', 'string', 'number', 'boolean', 'null', 'undefined', 'true', 'false',
    'class', 'method', 'property', 'constructor', 'prototype', 'this', 'super', 'extends',
    'import', 'export', 'default', 'from', 'require', 'module', 'exports', 'async', 'await',
    'promise', 'then', 'catch', 'finally', 'try', 'throw', 'error', 'console', 'log',
    'document', 'window', 'element', 'event', 'listener', 'click', 'change', 'submit',
    'html', 'head', 'body', 'div', 'span', 'img', 'link', 'script', 'style', 'meta',
    'class', 'id', 'src', 'href', 'alt', 'title', 'data', 'value', 'name', 'type',
    'css', 'selector', 'property', 'value', 'color', 'background', 'margin', 'padding',
    'border', 'width', 'height', 'display', 'position', 'absolute', 'relative', 'fixed',
    'flexbox', 'grid', 'justify', 'align', 'center', 'space', 'between', 'around',
    'php', 'mysql', 'database', 'table', 'query', 'select', 'insert', 'update', 'delete',
    'where', 'join', 'inner', 'left', 'right', 'order', 'group', 'having', 'limit',
    'connection', 'result', 'fetch', 'prepare', 'execute', 'bind', 'param', 'row',
    'react', 'component', 'props', 'state', 'hook', 'effect', 'context', 'router',
    'redux', 'action', 'reducer', 'store', 'dispatch', 'connect', 'provider', 'selector'
  ];

  // Состояния
  const [gameDuration, setGameDuration] = useState(180); // Выбранная длительность
  const [currentWords, setCurrentWords] = useState([]);
  const [typedText, setTypedText] = useState(''); // Весь напечатанный текст
  const [typedStatus, setTypedStatus] = useState([]); // Статус каждого символа: 'correct', 'error', 'pending'
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [errors, setErrors] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(180);
  const [currentChar, setCurrentChar] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [finalTimeSpent, setFinalTimeSpent] = useState(0);
  
  const inputRef = useRef(null);
  const intervalRef = useRef(null);
  const statsRef = useRef({ typedText: '', typedStatus: [], errors: 0 }); // Для актуальных данных

  // Английская QWERTY раскладка
  const keyboardLayout = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', ' ']
  ];

  // Маппинг пальцев для клавиш
  const fingerMapping = {
    '`': 'pinky-left', '1': 'pinky-left', '2': 'ring-left', '3': 'middle-left', '4': 'index-left', '5': 'index-left',
    '6': 'index-right', '7': 'index-right', '8': 'middle-right', '9': 'ring-right', '0': 'pinky-right', '-': 'pinky-right', '=': 'pinky-right',
    'q': 'pinky-left', 'w': 'ring-left', 'e': 'middle-left', 'r': 'index-left', 't': 'index-left',
    'y': 'index-right', 'u': 'index-right', 'i': 'middle-right', 'o': 'ring-right', 'p': 'pinky-right', '[': 'pinky-right', ']': 'pinky-right',
    'a': 'pinky-left', 's': 'ring-left', 'd': 'middle-left', 'f': 'index-left', 'g': 'index-left',
    'h': 'index-right', 'j': 'index-right', 'k': 'middle-right', 'l': 'ring-right', ';': 'pinky-right', "'": 'pinky-right',
    'z': 'pinky-left', 'x': 'ring-left', 'c': 'middle-left', 'v': 'index-left', 'b': 'index-left',
    'n': 'index-right', 'm': 'index-right', ',': 'middle-right', '.': 'ring-right', '/': 'pinky-right', ' ': 'thumb'
  };

  useEffect(() => {
    resetTest();
  }, []);

  // Генерация случайных слов
  const generateRandomWords = (count) => {
    const words = [];
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * programmingWords.length);
      words.push(programmingWords[randomIndex]);
    }
    return words;
  };

  // Добавление новых слов к существующим
  const addMoreWords = () => {
    const newWords = generateRandomWords(5);
    setCurrentWords(prev => [...prev, ...newWords]);
  };

  useEffect(() => {
    if (isActive && timeRemaining > 0 && startTime) {
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = gameDuration - elapsed;
        setTimeElapsed(elapsed);
        setTimeRemaining(remaining);

        if (remaining <= 0) {
          finishTest();
        }
      }, 100); // Обновляем каждые 100ms для плавности
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isActive, startTime]); // Убрали зависимость от typedText.length

  useEffect(() => {
    // Добавляем новые слова когда осталось мало
    if (currentWordIndex >= currentWords.length - 3) {
      addMoreWords();
    }
  }, [currentWordIndex, currentWords.length]);

  useEffect(() => {
    // Обновляем текущий символ
    if (currentWords.length > 0) {
      const currentWord = currentWords[currentWordIndex] || '';
      setCurrentChar(currentWord[currentCharIndex] || ' ');
    }
  }, [currentWordIndex, currentCharIndex, currentWords]);

  const resetTest = () => {
    const initialWords = generateRandomWords(WORDS_AHEAD);
    setCurrentWords(initialWords);
    setTypedText('');
    setTypedStatus([]);
    setCurrentWordIndex(0);
    setCurrentCharIndex(0);
    setErrors(0);
    setStartTime(null);
    setIsActive(false);
    setWpm(0);
    setAccuracy(100);
    setTimeElapsed(0);
    setTimeRemaining(gameDuration);
    setCurrentChar(initialWords[0]?.[0] || '');
    setShowResults(false);
    setFinalTimeSpent(0);
    
    // Сбрасываем ref
    statsRef.current = { typedText: '', typedStatus: [], errors: 0 };
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    
    // ЗАПРЕЩАЕМ УДАЛЕНИЕ ТЕКСТА (Backspace)
    if (value.length < typedText.length) {
      e.preventDefault();
      return;
    }
    
    if (!isActive && value.length === 1) {
      setStartTime(Date.now());
      setIsActive(true);
    }

    if (timeRemaining <= 0) return;

    // Создаем строку ожидаемого текста (больше слов для непрерывного ввода)
    const expectedText = currentWords.slice(0, Math.min(currentWordIndex + 10, currentWords.length)).join(' ');
    
    // Разрешаем вводить до конца ожидаемого текста
    if (value.length > expectedText.length) return;

    // Обновляем типизированный текст
    setTypedText(value);

    // Определяем статус каждого символа
    const newStatus = [];
    let errorCount = 0;
    
    for (let i = 0; i < value.length; i++) {
      if (i < expectedText.length) {
        if (value[i] === expectedText[i]) {
          newStatus.push('correct');
        } else {
          newStatus.push('error');
          errorCount++;
        }
      }
    }
    
    setTypedStatus(newStatus);
    setErrors(errorCount);
    
    // Сохраняем актуальные данные в ref для finishTest
    statsRef.current = { typedText: value, typedStatus: newStatus, errors: errorCount };

    // Обновление текущего символа для подсветки клавиши
    if (value.length < expectedText.length) {
      setCurrentChar(expectedText[value.length] || '');
    }

    // Обновление позиции (подсчет слов)
    const words = value.split(' ');
    const completedWords = words.length - 1;
    setCurrentWordIndex(Math.min(completedWords, currentWords.length - 1));
    
    // Обновление статистики в реальном времени
    if (value.length > 0) {
      const totalChars = value.length;
      const correctChars = totalChars - errorCount;
      const acc = Math.round((correctChars / totalChars) * 100);
      setAccuracy(Math.max(0, acc));
      
      // Обновляем CPM (Characters Per Minute) в реальном времени если игра активна
      if (isActive && startTime) {
        const elapsedSeconds = Math.max(1, (Date.now() - startTime) / 1000);
        const minutes = elapsedSeconds / 60;
        const currentWpm = Math.round(correctChars / minutes);
        setWpm(currentWpm);
      }
    }
  };

  const finishTest = async () => {
    setIsActive(false);
    setShowResults(true);

    // Окончательные расчеты на основе реальных данных
    // Используем реальное прошедшее время от startTime
    const actualTimeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : Math.max(1, gameDuration - timeRemaining);
    setFinalTimeSpent(actualTimeSpent); // Сохраняем для отображения в модальном окне
    
    // Используем актуальные данные из ref вместо state
    const { typedText: finalTypedText, typedStatus: finalTypedStatus, errors: finalErrors } = statsRef.current;
    const finalChars = finalTypedText.length;
    
    // Пересчитываем ошибки на основе typedStatus
    const errorCount = finalTypedStatus.filter(status => status === 'error').length;
    const correctChars = finalChars - errorCount;
    
    // CPM (Characters Per Minute) = правильные символы / минуты
    const minutes = actualTimeSpent / 60;
    const finalWpm = minutes > 0 ? Math.round(correctChars / minutes) : 0;
    
    const finalAccuracy = finalChars > 0 ? ((correctChars / finalChars) * 100) : 100;

    // Обновляем состояние для отображения
    setWpm(finalWpm);
    setAccuracy(finalAccuracy);
    setErrors(errorCount);
    setTypedText(finalTypedText); // Обновляем typedText для отображения в модальном окне

    // Отправка результатов на сервер
    try {
      await api.post('/typing/results', {
        text_length: finalChars,
        time_seconds: actualTimeSpent,
        wpm: finalWpm,
        accuracy: finalAccuracy,
        errors: errorCount
      });
    } catch (error) {
      console.error('Ошибка сохранения результата:', error);
    }
  };

  const getKeyClass = (key) => {
    let classes = 'key';
    
    if (key === ' ') {
      classes += ' spacebar';
    }
    
    if (currentChar && key.toLowerCase() === currentChar.toLowerCase()) {
      classes += ' next-key';
    }
    
    return classes;
  };

  const getFingerClass = (key) => {
    if (currentChar && key.toLowerCase() === currentChar.toLowerCase()) {
      return fingerMapping[key.toLowerCase()] || '';
    }
    return '';
  };

  return (
    <div className={styles['typing-trainer']}>
      <div className={styles['trainer-header']}>
        <h2>⌨️ Клавиатурный тренажер</h2>
        
        {!isActive && !showResults && (
          <div className={styles['time-selector']}>
            <span className={styles['time-label']}>Длительность теста:</span>
            {TIME_OPTIONS.map(time => (
              <button
                key={time}
                className={`time-option ${gameDuration === time ? 'active' : ''}`}
                onClick={() => {
                  setGameDuration(time);
                  setTimeRemaining(time);
                }}
              >
                {time / 60} мин
              </button>
            ))}
          </div>
        )}
        
        <div className={styles['trainer-stats']}>
          <div className={styles.stat}>
            <span className={styles['stat-label']}>Осталось:</span>
            <span className="stat-value time-remaining">{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles['stat-label']}>Скорость:</span>
            <span className={styles['stat-value']}>{wpm} зн/мин</span>
          </div>
          <div className={styles.stat}>
            <span className={styles['stat-label']}>Точность:</span>
            <span className={styles['stat-value']}>{accuracy}%</span>
          </div>
          <div className={styles.stat}>
            <span className={styles['stat-label']}>Ошибки:</span>
            <span className={styles['stat-value']}>{errors}</span>
          </div>
        </div>
      </div>

      <div className={styles['text-display']}>
        <div className={styles['text-content']}>
          {(() => {
            // Получаем текст для отображения (текущие слова)
            const displayWords = currentWords.slice(0, Math.min(currentWordIndex + WORDS_AHEAD, currentWords.length));
            const targetText = displayWords.join(' ');
            
            return targetText.split('').map((char, index) => {
              let className = 'char';
              
              if (index < typedText.length) {
                // Уже введенные символы
                if (index < typedStatus.length) {
                  className += ` ${typedStatus[index]}`;
                } else {
                  className += ' correct';
                }
              } else if (index === typedText.length) {
                // Текущий символ для ввода
                className += ' current';
              } else {
                // Будущие символы
                className += ' pending';
              }
              
              return (
                <span key={index} className={className}>
                  {char === ' ' ? '\u00A0' : char}
                </span>
              );
            });
          })()}
        </div>
      </div>

      <div className={styles['input-section']}>
        <textarea
          ref={inputRef}
          value={typedText}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            // БЛОКИРУЕМ BACKSPACE И DELETE
            if (e.key === 'Backspace' || e.key === 'Delete') {
              e.preventDefault();
              return false;
            }
          }}
          placeholder="Начните печатать здесь..."
          disabled={timeRemaining <= 0 || showResults}
          className={styles['typing-input']}
          rows={4}
        />
      </div>

      <div className={styles.keyboard}>
        {keyboardLayout.map((row, rowIndex) => (
          <div key={rowIndex} className={styles['keyboard-row']}>
            {row.map((key) => (
              <div
                key={key}
                className={`${getKeyClass(key)} ${getFingerClass(key)}`}
                data-key={key}
              >
                {key === ' ' ? 'Пробел' : key}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className={styles['hands-guide']}>
        <div className="hand left-hand">
          <div className="finger thumb" data-finger="thumb-left">L</div>
          <div className="finger index" data-finger="index-left">F</div>
          <div className="finger middle" data-finger="middle-left">D</div>
          <div className="finger ring" data-finger="ring-left">S</div>
          <div className="finger pinky" data-finger="pinky-left">A</div>
        </div>
        <div className="hand right-hand">
          <div className="finger pinky" data-finger="pinky-right">;</div>
          <div className="finger ring" data-finger="ring-right">L</div>
          <div className="finger middle" data-finger="middle-right">K</div>
          <div className="finger index" data-finger="index-right">J</div>
          <div className="finger thumb" data-finger="thumb-right">⎵</div>
        </div>
      </div>

      {showResults && (
        <div className={styles['results-modal']}>
          <div className={styles['modal-content']}>
            <h3>🎉 Тест завершен!</h3>
            <div className={styles['results-grid']}>
              <div className={styles['result-item']}>
                <span className={styles['result-label']}>Время:</span>
                <span className={styles['result-value']}>{Math.floor(finalTimeSpent / 60)}:{(finalTimeSpent % 60).toString().padStart(2, '0')}</span>
              </div>
              <div className={styles['result-item']}>
                <span className={styles['result-label']}>Скорость:</span>
                <span className={styles['result-value']}>{wpm} символов/мин</span>
              </div>
              <div className={styles['result-item']}>
                <span className={styles['result-label']}>Точность:</span>
                <span className={styles['result-value']}>{accuracy.toFixed(2)}%</span>
              </div>
              <div className={styles['result-item']}>
                <span className={styles['result-label']}>Ошибки:</span>
                <span className={styles['result-value']}>{errors}</span>
              </div>
              <div className={styles['result-item']}>
                <span className={styles['result-label']}>Символов:</span>
                <span className={styles['result-value']}>{typedText.length}</span>
              </div>
            </div>
            <div className={styles['results-actions']}>
              <button onClick={resetTest} className={styles['btn-primary']}>
                Новый тест
              </button>
              <button onClick={() => setShowResults(false)} className={styles['btn-secondary']}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles['trainer-controls']}>
        <button onClick={resetTest} className={styles['btn-secondary']}>
          Заного
        </button>
        <div className={styles['progress-bar']}>
          <div 
            className={styles['progress-fill']} 
            style={{ width: `${((gameDuration - timeRemaining) / gameDuration) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export default TypingTrainer;