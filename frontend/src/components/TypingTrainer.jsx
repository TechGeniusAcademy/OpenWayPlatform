import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import styles from './TypingTrainer.module.css';
import { 
  FaKeyboard, 
  FaClock, 
  FaTachometerAlt, 
  FaBullseye, 
  FaExclamationTriangle,
  FaRedo,
  FaTrophy,
  FaFire,
  FaStar,
  FaCheckCircle,
  FaPlay
} from 'react-icons/fa';
import { IoSparkles } from 'react-icons/io5';
import { HiLightningBolt } from 'react-icons/hi';

// Импорты JSON файлов с языками
import javascriptData from '../data/languages/javascript.json';
import pythonData from '../data/languages/python.json';
import typescriptData from '../data/languages/typescript.json';
import javaData from '../data/languages/java.json';
import cppData from '../data/languages/cpp.json';
import csharpData from '../data/languages/csharp.json';

function TypingTrainer() {
  const { user } = useAuth();
  
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [showResults, setShowResults] = useState(false);
  const [finalStats, setFinalStats] = useState(null);
  const [isGameStarted, setIsGameStarted] = useState(false);

  const TIME_OPTIONS = [30, 60, 120, 180];

  // Доступные языки программирования
  const languages = [
    javascriptData,
    pythonData,
    typescriptData,
    javaData,
    cppData,
    csharpData
  ];

  // Получить случайное слово из выбранного языка
  const getRandomWord = () => {
    if (!selectedLanguage) return '';
    const words = selectedLanguage.words;
    return words[Math.floor(Math.random() * words.length)];
  };

  // Генерируем начальный текст из случайных слов
  const generateInitialText = () => {
    const wordCount = 15; // Начинаем с 15 слов
    const words = [];
    for (let i = 0; i < wordCount; i++) {
      words.push(getRandomWord());
    }
    return words.join(' ');
  };

  const [textToType, setTextToType] = useState('');
  const [typedChars, setTypedChars] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errors, setErrors] = useState(0);
  const [correctChars, setCorrectChars] = useState(0);
  
  const [timeLeft, setTimeLeft] = useState(selectedDuration);
  const [startTime, setStartTime] = useState(null);
  const [timerActive, setTimerActive] = useState(false);

  const containerRef = useRef(null);
  const textContentRef = useRef(null);
  const wrapperRef = useRef(null);

  // Инициализация текста после выбора языка
  useEffect(() => {
    if (selectedLanguage && !textToType) {
      setTextToType(generateInitialText());
    }
  }, [selectedLanguage]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  // Центрируем текущий символ
  useEffect(() => {
    if (textContentRef.current && wrapperRef.current) {
      const wrapperWidth = wrapperRef.current.offsetWidth;
      const charWidth = 20; // Примерная ширина символа в Courier New 32px
      
      // Вычисляем смещение: центр wrapper минус позиция текущего символа минус половина символа
      const offset = (wrapperWidth / 2) - (currentIndex * charWidth) - (charWidth / 2);
      
      textContentRef.current.style.transform = `translateX(${offset}px)`;
    }
  }, [currentIndex]);

  // Добавляем новые слова когда приближаемся к концу
  useEffect(() => {
    if (isGameStarted && !showResults && selectedLanguage) {
      const remainingChars = textToType.length - currentIndex;
      // Когда осталось меньше 50 символов, добавляем новые слова
      if (remainingChars < 50) {
        const newWords = [];
        for (let i = 0; i < 10; i++) {
          newWords.push(getRandomWord());
        }
        setTextToType(prev => prev + ' ' + newWords.join(' '));
      }
    }
  }, [currentIndex, isGameStarted, showResults, textToType.length, selectedLanguage]);

  useEffect(() => {
    let interval = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleFinish();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const calculateWPM = () => {
    if (!startTime) return 0;
    const timeElapsed = (Date.now() - startTime) / 1000 / 60;
    if (timeElapsed === 0) return 0;
    return Math.round(correctChars / timeElapsed);
  };

  const calculateAccuracy = () => {
    const totalTyped = typedChars.length;
    if (totalTyped === 0) return 100;
    return Math.round((correctChars / totalTyped) * 100);
  };

  const handleKeyPress = (e) => {
    if (timeLeft === 0 || showResults) return;

    const key = e.key;

    if (!isGameStarted && key.length === 1) {
      setIsGameStarted(true);
      setStartTime(Date.now());
      setTimerActive(true);
    }

    if (key === 'Backspace') {
      e.preventDefault();
      if (currentIndex > 0) {
        const newTypedChars = [...typedChars];
        const removedChar = newTypedChars.pop();
        setTypedChars(newTypedChars);
        setCurrentIndex(prev => prev - 1);
        
        if (removedChar && removedChar.isCorrect) {
          setCorrectChars(prev => prev - 1);
        } else if (removedChar && !removedChar.isCorrect) {
          setErrors(prev => prev - 1);
        }
      }
    } else if (key.length === 1 && currentIndex < textToType.length) {
      e.preventDefault();
      const expectedChar = textToType[currentIndex];
      const isCorrect = key === expectedChar;
      
      setTypedChars([...typedChars, { char: key, isCorrect }]);
      setCurrentIndex(prev => prev + 1);
      
      if (isCorrect) {
        setCorrectChars(prev => prev + 1);
      } else {
        setErrors(prev => prev + 1);
      }
    }
  };

  const handleFinish = async () => {
    setTimerActive(false);
    const wpm = calculateWPM();
    const accuracy = calculateAccuracy();
    const timeSpent = selectedDuration - timeLeft;
    const totalTyped = correctChars + errors;
    
    const stats = {
      wpm,
      accuracy,
      correctChars,
      errorChars: errors,
      totalChars: totalTyped,
      timeSpent
    };
    
    setFinalStats(stats);
    setShowResults(true);

    try {
      await api.post('/typing/results', {
        text_length: totalTyped,
        time_seconds: timeSpent,
        wpm: wpm,
        accuracy: accuracy,
        errors: errors
      });
    } catch (error) {
      console.error('Ошибка сохранения результата:', error);
    }
  };

  const handleReset = () => {
    setTextToType(generateInitialText());
    setTypedChars([]);
    setCurrentIndex(0);
    setErrors(0);
    setCorrectChars(0);
    setTimeLeft(selectedDuration);
    setStartTime(null);
    setTimerActive(false);
    setShowResults(false);
    setFinalStats(null);
    setIsGameStarted(false);
    
    if (containerRef.current) {
      containerRef.current.focus();
    }
  };

  const getRank = (wpm) => {
    if (wpm >= 100) return { icon: <FaTrophy />, text: 'Мастер', color: '#ffd700' };
    if (wpm >= 80) return { icon: <FaFire />, text: 'Эксперт', color: '#ff6b6b' };
    if (wpm >= 60) return { icon: <FaStar />, text: 'Профи', color: '#4dabf7' };
    if (wpm >= 40) return { icon: <FaCheckCircle />, text: 'Хорошо', color: '#51cf66' };
    return { icon: <IoSparkles />, text: 'Новичок', color: '#868e96' };
  };

  const currentWPM = calculateWPM();
  const currentAccuracy = calculateAccuracy();

  // Раскладка клавиатуры
  const keyboardLayout = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
    ['Space']
  ];

  // Получить текущую клавишу для подсветки
  const getCurrentKey = () => {
    if (currentIndex >= textToType.length) return null;
    const char = textToType[currentIndex];
    if (char === ' ') return 'Space';
    return char.toLowerCase();
  };

  const currentKey = getCurrentKey();

  // Если язык не выбран, показываем выбор языка
  if (!selectedLanguage) {
    return (
      <div className={styles.container}>
        <motion.div 
          className={styles.languageSelection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.selectionHeader}>
            <FaKeyboard className={styles.selectionIcon} />
            <h1 className={styles.selectionTitle}>Выберите язык программирования</h1>
            <p className={styles.selectionSubtitle}>Тренируйте скорость печати на ключевых словах</p>
          </div>
          
          <div className={styles.languageGrid}>
            {languages.map((lang, index) => (
              <motion.div
                key={lang.name}
                className={styles.languageCard}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedLanguage(lang)}
                style={{ 
                  borderColor: lang.color,
                  '--lang-color': lang.color,
                  '--lang-color-light': lang.color + '20'
                }}
              >
                <div 
                  className={styles.languageIcon} 
                  style={{ backgroundColor: lang.color + '20' }}
                >
                  {lang.icon.startsWith('http') ? (
                    <img 
                      src={lang.icon} 
                      alt={lang.name} 
                      className={styles.languageIconImage}
                    />
                  ) : (
                    <span className={styles.languageIconEmoji}>{lang.icon}</span>
                  )}
                </div>
                <h3 
                  className={styles.languageName} 
                  style={{ color: lang.color }}
                >
                  {lang.name}
                </h3>
                <p className={styles.languageInfo}>{lang.words.length} слов</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className={styles.container}
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyPress}
    >
      <motion.div 
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.headerLeft}>
          <div 
            className={styles.languageBadge} 
            style={{ 
              backgroundColor: selectedLanguage.color + '20', 
              color: selectedLanguage.color 
            }}
          >
            {selectedLanguage.icon.startsWith('http') ? (
              <img 
                src={selectedLanguage.icon} 
                alt={selectedLanguage.name} 
                className={styles.languageBadgeImage}
              />
            ) : (
              <span className={styles.languageBadgeEmoji}>{selectedLanguage.icon}</span>
            )}
            <span>{selectedLanguage.name}</span>
          </div>
          <FaKeyboard className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>Тренировка скорости печати</h1>
            <p className={styles.subtitle}>Тренируй скорость печати на реальном коде</p>
          </div>
        </div>
        
        {!isGameStarted && (
          <motion.div 
            className={styles.timeSelector}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            {TIME_OPTIONS.map(time => (
              <button
                key={time}
                className={`${styles.timeBtn} ${selectedDuration === time ? styles.timeActive : ''}`}
                onClick={() => {
                  setSelectedDuration(time);
                  setTimeLeft(time);
                }}
              >
                {time < 60 ? `${time}с` : `${time / 60}м`}
              </button>
            ))}
          </motion.div>
        )}
      </motion.div>

      <motion.div 
        className={styles.statsBar}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <motion.div 
          className={styles.statCard}
          whileHover={{ scale: 1.02 }}
        >
          <FaClock className={styles.statIcon} />
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Время</span>
            <span className={styles.statValue}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </motion.div>

        <motion.div 
          className={styles.statCard}
          whileHover={{ scale: 1.02 }}
        >
          <FaTachometerAlt className={styles.statIcon} />
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Скорость</span>
            <span className={styles.statValue}>{currentWPM} зн/мин</span>
          </div>
        </motion.div>

        <motion.div 
          className={styles.statCard}
          whileHover={{ scale: 1.02 }}
        >
          <FaBullseye className={styles.statIcon} />
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Точность</span>
            <span className={styles.statValue}>{currentAccuracy}%</span>
          </div>
        </motion.div>

        <motion.div 
          className={styles.statCard}
          whileHover={{ scale: 1.02 }}
        >
          <FaExclamationTriangle className={styles.statIcon} />
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Ошибки</span>
            <span className={styles.statValue}>{errors}</span>
          </div>
        </motion.div>
      </motion.div>

      <motion.div 
        className={styles.textDisplay}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className={styles.textWrapper} ref={wrapperRef}>
          <div 
            className={styles.textContent}
            ref={textContentRef}
          >
            {textToType.split('').map((char, index) => {
              let className = styles.char;
              
              if (index < currentIndex) {
                // Уже напечатанные символы
                className += typedChars[index]?.isCorrect ? ` ${styles.correct}` : ` ${styles.error}`;
              }
              
              if (index === currentIndex) {
                // Текущий символ для печати
                className += ` ${styles.current}`;
              }
              
              // Показываем символы с затемнением по мере удаления от текущего
              const distance = Math.abs(index - currentIndex);
              let opacity = 1;
              
              if (index < currentIndex) {
                // Уже напечатанные - затемняем по мере удаления
                opacity = Math.max(0.2, 1 - distance * 0.05);
              } else if (index > currentIndex) {
                // Будущие символы - затемняем сильнее
                opacity = Math.max(0.3, 1 - distance * 0.03);
              }
              
              // Отображаем пробелы визуально
              const displayChar = char === ' ' ? '␣' : char;
              
              return (
                <span 
                  key={index} 
                  className={className}
                  style={{ 
                    opacity,
                    '--char-opacity': opacity 
                  }}
                >
                  {displayChar}
                </span>
              );
            })}
          </div>
        </div>

        {!isGameStarted && (
          <motion.div 
            className={styles.startHint}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <FaPlay className={styles.playIcon} />
            <p>Начните печатать, чтобы запустить тест</p>
          </motion.div>
        )}
      </motion.div>

      <motion.div 
        className={styles.progressSection}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className={styles.progressBar}>
          <motion.div 
            className={styles.progressFill} 
            initial={{ width: 0 }}
            animate={{ width: `${((selectedDuration - timeLeft) / selectedDuration) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <motion.button 
          onClick={handleReset} 
          className={styles.resetBtn}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaRedo /> Заново
        </motion.button>
      </motion.div>

            <motion.div 
        className={styles.infoSection}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <div className={styles.infoCard}>
          <HiLightningBolt className={styles.infoIcon} />
          <div>
            <h3>Печатайте символы</h3>
            <p>Символов напечатано: {correctChars + errors}</p>
          </div>
        </div>
        <div className={styles.infoCard}>
          <FaKeyboard className={styles.infoIcon} />
          <div>
            <h3>Текущий символ</h3>
            <p>Следующий: <strong>{textToType[currentIndex] || '✓'}</strong></p>
          </div>
        </div>
      </motion.div>

      <motion.div 
        className={styles.keyboardSection}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <h3 className={styles.keyboardTitle}>
          <FaKeyboard /> Виртуальная клавиатура
        </h3>
        <div className={styles.keyboard}>
          {keyboardLayout.map((row, rowIndex) => (
            <div key={rowIndex} className={styles.keyboardRow}>
              {row.map((key) => {
                const isActive = currentKey === key.toLowerCase();
                const keyClass = `${styles.key} ${isActive ? styles.keyActive : ''} ${key === 'Space' ? styles.keySpace : ''}`;
                
                return (
                  <motion.div
                    key={key}
                    className={keyClass}
                    initial={{ scale: 1 }}
                    animate={isActive ? {
                      scale: 1.1
                    } : {
                      scale: 1
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {key === 'Space' ? 'Пробел' : key}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
        <div className={styles.keyboardHint}>
          <p>Нажимайте подсвеченные клавиши для набора текста</p>
        </div>
      </motion.div>

      <AnimatePresence>
        {showResults && finalStats && (
          <motion.div 
            className={styles.resultsModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowResults(false)}
          >
            <motion.div 
              className={styles.modalContent}
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.resultsHeader}>
                <div 
                  className={styles.rankBadge} 
                  style={{ 
                    color: getRank(finalStats.wpm).color,
                    '--rank-color': getRank(finalStats.wpm).color
                  }}
                >
                  {getRank(finalStats.wpm).icon}
                  <span>{getRank(finalStats.wpm).text}</span>
                </div>
                <h2>Тест завершён!</h2>
                <p className={styles.resultsSubtitle}>Отличная работа! Вот твои результаты:</p>
              </div>

              <div className={styles.resultsGrid}>
                <motion.div 
                  className={styles.resultCard}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <FaClock className={styles.resultIcon} />
                  <div>
                    <span className={styles.resultLabel}>Время</span>
                    <span className={styles.resultValue}>
                      {Math.floor(finalStats.timeSpent / 60)}:{(finalStats.timeSpent % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </motion.div>

                <motion.div 
                  className={styles.resultCard}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <FaTachometerAlt className={styles.resultIcon} />
                  <div>
                    <span className={styles.resultLabel}>Скорость</span>
                    <span className={styles.resultValue}>{finalStats.wpm} зн/м</span>
                  </div>
                </motion.div>

                <motion.div 
                  className={styles.resultCard}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <FaBullseye className={styles.resultIcon} />
                  <div>
                    <span className={styles.resultLabel}>Точность</span>
                    <span className={styles.resultValue}>{finalStats.accuracy}%</span>
                  </div>
                </motion.div>

                <motion.div 
                  className={styles.resultCard}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <FaExclamationTriangle className={styles.resultIcon} />
                  <div>
                    <span className={styles.resultLabel}>Ошибки</span>
                    <span className={styles.resultValue}>{finalStats.errorChars}</span>
                  </div>
                </motion.div>

                <motion.div 
                  className={styles.resultCard}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <FaCheckCircle className={styles.resultIcon} />
                  <div>
                    <span className={styles.resultLabel}>Правильных</span>
                    <span className={styles.resultValue}>{finalStats.correctChars}</span>
                  </div>
                </motion.div>

                <motion.div 
                  className={styles.resultCard}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <HiLightningBolt className={styles.resultIcon} />
                  <div>
                    <span className={styles.resultLabel}>Всего символов</span>
                    <span className={styles.resultValue}>{finalStats.totalChars}</span>
                  </div>
                </motion.div>
              </div>

              <div className={styles.resultsActions}>
                <motion.button 
                  onClick={handleReset} 
                  className={styles.btnPrimary}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaRedo /> Новый тест
                </motion.button>
                <motion.button 
                  onClick={() => setShowResults(false)} 
                  className={styles.btnSecondary}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Закрыть
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TypingTrainer;
