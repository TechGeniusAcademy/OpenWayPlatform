import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styles from './JSGame.module.css';
import { 
  FaArrowLeft, FaPlay, FaCheck, FaTimes, FaLock, FaCode, 
  FaTrophy, FaLightbulb, FaTerminal, FaCheckCircle, FaTimesCircle,
  FaClock, FaStar, FaRocket, FaBook
} from 'react-icons/fa';
import { BsLightningChargeFill } from 'react-icons/bs';
import api from '../utils/api';
import { toast } from 'react-toastify';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';

// Rainbow цвета для отступов
const INDENT_COLORS = [
  'rgba(255, 121, 198, 0.15)',
  'rgba(139, 233, 253, 0.15)',
  'rgba(80, 250, 123, 0.15)',
  'rgba(255, 184, 108, 0.15)',
  'rgba(189, 147, 249, 0.15)',
  'rgba(255, 255, 128, 0.15)',
];

// Компонент подсветки синтаксиса
const CodeHighlight = ({ code }) => {
  const highlighted = useMemo(() => {
    if (!code) return '';
    try {
      return Prism.highlight(code, Prism.languages.javascript, 'javascript');
    } catch (e) {
      return code;
    }
  }, [code]);

  const lines = code.split('\n');
  const highlightedLines = highlighted.split('\n');

  return (
    <div className={styles.highlightOverlay}>
      {lines.map((line, i) => {
        const spaces = line.match(/^(\s*)/)?.[1] || '';
        const indentLevel = Math.floor(spaces.length / 2);
        const bgColor = indentLevel > 0 ? INDENT_COLORS[indentLevel % INDENT_COLORS.length] : 'transparent';
        
        return (
          <div 
            key={i} 
            className={styles.highlightLine}
            style={{ background: bgColor }}
          >
            <span dangerouslySetInnerHTML={{ __html: highlightedLines[i] || '&nbsp;' }} />
          </div>
        );
      })}
    </div>
  );
};

function JSGame({ onBack }) {
  const [levels, setLevels] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  // Редактор
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [showHints, setShowHints] = useState(false);
  const [currentHint, setCurrentHint] = useState(0);
  
  // Refs
  const editorRef = useRef(null);
  const highlightRef = useRef(null);

  // Загрузка уровней
  useEffect(() => {
    loadLevels();
    loadStats();
  }, []);

  const loadLevels = async () => {
    try {
      const response = await api.get('/js-game/levels');
      setLevels(response.data);
    } catch (error) {
      console.error('Ошибка загрузки уровней:', error);
      toast.error('Не удалось загрузить уровни');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/js-game/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  // Выбор уровня
  const selectLevel = (level) => {
    setSelectedLevel(level);
    setCode(level.submitted_code || level.initial_code || '// Напишите ваше решение здесь\n\nfunction solution() {\n  \n}');
    setResults(null);
    setShowHints(false);
    setCurrentHint(0);
  };

  // Синхронизация скролла
  const syncScroll = useCallback(() => {
    if (editorRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = editorRef.current.scrollTop;
      highlightRef.current.scrollLeft = editorRef.current.scrollLeft;
    }
  }, []);

  // Запуск кода
  const runCode = async () => {
    if (!code.trim()) {
      toast.warning('Напишите код для проверки');
      return;
    }

    setIsRunning(true);
    setResults(null);

    try {
      const response = await api.post(`/js-game/levels/${selectedLevel.id}/run`, { code });
      setResults(response.data);

      if (response.data.success) {
        toast.success(response.data.message);
        loadLevels();
        loadStats();
      } else {
        toast.warning(response.data.message);
      }
    } catch (error) {
      console.error('Ошибка выполнения:', error);
      toast.error('Ошибка при выполнении кода');
    } finally {
      setIsRunning(false);
    }
  };

  // Показать подсказку
  const showNextHint = () => {
    const hints = selectedLevel?.hints || [];
    if (currentHint < hints.length) {
      setShowHints(true);
      setCurrentHint(prev => Math.min(prev + 1, hints.length));
    }
  };

  // Экран выбора уровней
  if (!selectedLevel) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={onBack} className={styles.backBtn}>
            <FaArrowLeft /> Назад
          </button>
          <h1 className={styles.title}>
            <FaCode /> JavaScript
          </h1>
          {stats && (
            <div className={styles.stats}>
              <span><FaTrophy /> {stats.completed_levels}/{stats.total_levels}</span>
              <span><BsLightningChargeFill /> {stats.total_points} очков</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className={styles.loading}>Загрузка уровней...</div>
        ) : levels.length === 0 ? (
          <div className={styles.empty}>
            <FaCode className={styles.emptyIcon} />
            <p>Пока нет доступных уровней</p>
            <p className={styles.emptyHint}>Администратор скоро добавит новые задания</p>
          </div>
        ) : (
          <div className={styles.levelsGrid}>
            {levels.map((level, index) => {
              const isLocked = index > 0 && levels[index - 1].user_status !== 'passed';
              const isPassed = level.user_status === 'passed';
              
              return (
                <div 
                  key={level.id}
                  className={`${styles.levelCard} ${isPassed ? styles.completed : ''} ${isLocked ? styles.locked : ''}`}
                  onClick={() => !isLocked && selectLevel(level)}
                >
                  {isLocked && (
                    <div className={styles.lockOverlay}>
                      <FaLock />
                    </div>
                  )}
                  
                  <div className={styles.levelIcon}>
                    {isPassed ? <FaCheckCircle /> : <FaCode />}
                    <span className={styles.levelNumber}>{index + 1}</span>
                  </div>
                  
                  <div className={styles.levelInfo}>
                    <h3>{level.title}</h3>
                    <p>{level.description}</p>
                    
                    <div className={styles.levelMeta}>
                      <span className={styles.difficulty} data-dan={level.difficulty}>
                        {level.difficulty} Дан
                      </span>
                      <span className={styles.points}>+{level.points_reward} очков</span>
                    </div>
                    
                    {isPassed && (
                      <div className={styles.completedBadge}>
                        <FaCheck /> Решено
                        {level.points_awarded > 0 && ` (+${level.points_awarded})`}
                      </div>
                    )}
                    
                    {level.user_attempts > 0 && !isPassed && (
                      <div className={styles.attemptsBadge}>
                        Попыток: {level.user_attempts}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Экран игры
  const hints = selectedLevel?.hints || [];
  
  return (
    <div className={styles.gameContainer}>
      {/* Верхняя панель */}
      <div className={styles.toolbar}>
        <button onClick={() => setSelectedLevel(null)} className={styles.backBtn}>
          <FaArrowLeft /> К уровням
        </button>
        
        <div className={styles.levelTitle}>
          <h2>{selectedLevel.title}</h2>
          <span className={styles.levelDifficulty} data-dan={selectedLevel.difficulty}>
            {selectedLevel.difficulty} Дан
          </span>
        </div>
        
        <div className={styles.toolbarActions}>
          {hints.length > 0 && (
            <button 
              onClick={showNextHint}
              className={styles.hintBtn}
              disabled={currentHint >= hints.length}
            >
              <FaLightbulb /> 
              Подсказка {currentHint > 0 ? `(${currentHint}/${hints.length})` : ''}
            </button>
          )}
          
          <button 
            onClick={runCode} 
            className={styles.runBtn}
            disabled={isRunning}
          >
            {isRunning ? (
              <>Выполнение...</>
            ) : (
              <><FaPlay /> Запустить</>
            )}
          </button>
        </div>
      </div>

      {/* Основное содержимое */}
      <div className={styles.workspace}>
        {/* Левая панель - Задание */}
        <div className={styles.taskPanel}>
          <div className={styles.panelHeader}>
            <FaBook /> Задание
          </div>
          <div className={styles.taskContent}>
            <div 
              className={styles.taskDescription}
              dangerouslySetInnerHTML={{ __html: selectedLevel.task_description.replace(/\n/g, '<br/>') }}
            />
            
            {/* Подсказки */}
            {showHints && currentHint > 0 && (
              <div className={styles.hintsSection}>
                <h4><FaLightbulb /> Подсказки</h4>
                {hints.slice(0, currentHint).map((hint, i) => (
                  <div key={i} className={styles.hint}>
                    <span className={styles.hintNumber}>{i + 1}</span>
                    {hint}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Центр - Редактор */}
        <div className={styles.editorPanel}>
          <div className={styles.panelHeader}>
            <FaTerminal /> Редактор
            <span className={styles.testsInfo}>
              Тестов: {selectedLevel.tests_count}
            </span>
          </div>
          <div className={styles.editorWrapper}>
            <div ref={highlightRef} className={styles.highlightContainer}>
              <CodeHighlight code={code} />
            </div>
            <textarea
              ref={editorRef}
              className={styles.codeEditor}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onScroll={syncScroll}
              placeholder="// Напишите ваше решение здесь"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Правая панель - Результаты */}
        <div className={styles.resultsPanel}>
          <div className={styles.panelHeader}>
            <FaTerminal /> Результаты
          </div>
          <div className={styles.resultsContent}>
            {!results ? (
              <div className={styles.resultsEmpty}>
                <FaRocket className={styles.resultsEmptyIcon} />
                <p>Нажмите "Запустить" чтобы проверить ваш код</p>
              </div>
            ) : (
              <>
                {/* Общий результат */}
                <div className={`${styles.resultsSummary} ${results.success ? styles.success : styles.failed}`}>
                  {results.success ? (
                    <>
                      <FaCheckCircle /> Все тесты пройдены!
                      {results.pointsAwarded > 0 && (
                        <span className={styles.pointsEarned}>+{results.pointsAwarded} очков</span>
                      )}
                    </>
                  ) : (
                    <>
                      <FaTimesCircle /> Пройдено {results.passedCount} из {results.totalCount}
                    </>
                  )}
                </div>

                {/* Детали тестов */}
                <div className={styles.testsList}>
                  {results.results.map((test, i) => (
                    <div 
                      key={i} 
                      className={`${styles.testItem} ${test.passed ? styles.passed : styles.failed}`}
                    >
                      <div className={styles.testHeader}>
                        {test.passed ? <FaCheckCircle /> : <FaTimesCircle />}
                        <span>Тест #{test.testIndex}</span>
                        <span className={styles.testTime}>{test.executionTime}ms</span>
                      </div>
                      
                      <div className={styles.testDetails}>
                        <div className={styles.testRow}>
                          <span className={styles.testLabel}>Вход:</span>
                          <code>{JSON.stringify(test.input)}</code>
                        </div>
                        <div className={styles.testRow}>
                          <span className={styles.testLabel}>Ожидалось:</span>
                          <code>{JSON.stringify(test.expected)}</code>
                        </div>
                        <div className={styles.testRow}>
                          <span className={styles.testLabel}>Получено:</span>
                          <code className={test.passed ? styles.correct : styles.wrong}>
                            {test.error ? `Ошибка: ${test.error}` : JSON.stringify(test.actual)}
                          </code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default JSGame;
