import { useState, useEffect, useRef } from 'react';
import { 
  AiOutlineRobot, 
  AiOutlineClose, 
  AiOutlineBulb, 
  AiOutlineThunderbolt,
  AiOutlineComment,
  AiOutlineBug,
  AiOutlineCode,
  AiOutlineSend
} from 'react-icons/ai';
import { FaBook, FaWrench, FaCommentDots, FaFileCode, FaLightbulb, FaCopy, FaCheck, FaHistory, FaTrash, FaTools, FaPalette, FaFlask, FaRecycle, FaBolt } from 'react-icons/fa';
import { MdBolt, MdStar, MdClose, MdDescription } from 'react-icons/md';
import { BiMessageSquareDetail } from 'react-icons/bi';
import { HiLightningBolt } from 'react-icons/hi';
import styles from './AIAssistant.module.css';

// Динамическое определение API URL на основе текущего хоста
const API_URL = `http://${window.location.hostname}:5000/api`;

// Предложенные промпты
const SUGGESTED_PROMPTS = [
  { icon: FaTools, text: 'Оптимизировать производительность', action: 'optimize' },
  { icon: MdDescription, text: 'Добавить JSDoc комментарии', action: 'comments' },
  { icon: AiOutlineBug, text: 'Найти и исправить баги', action: 'fix' },
  { icon: FaRecycle, text: 'Рефакторинг кода', prompt: 'Проведи рефакторинг этого кода, улучши читаемость и структуру' },
  { icon: FaPalette, text: 'Улучшить стиль кода', prompt: 'Улучши стиль и форматирование этого кода согласно best practices' },
  { icon: FaFlask, text: 'Создать unit-тесты', prompt: 'Создай unit-тесты для этого кода' },
  { icon: FaBook, text: 'Объяснить подробно', action: 'explain' },
  { icon: HiLightningBolt, text: 'Сделать асинхронным', prompt: 'Преобразуй этот код для использования async/await' }
];

function AIAssistant({ isOpen, onClose, selectedCode, language, onInsertCode }) {
  const [activeTab, setActiveTab] = useState('chat');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [error, setError] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Загрузка истории из localStorage
  useEffect(() => {
    if (isOpen) {
      const savedHistory = localStorage.getItem('ai_chat_history');
      if (savedHistory) {
        try {
          setChatHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error('Error loading chat history:', e);
        }
      }
      // Фокус на input при открытии
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);
  
  // Сохранение истории в localStorage
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem('ai_chat_history', JSON.stringify(chatHistory.slice(-50))); // Сохраняем последние 50 сообщений
    }
  }, [chatHistory]);
  
  // Автоскролл к последнему сообщению
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);
  
  const clearHistory = () => {
    setChatHistory([]);
    localStorage.removeItem('ai_chat_history');
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const handleSuggestedPrompt = (suggestion) => {
    if (suggestion.action) {
      handleAction(suggestion.action);
    } else if (suggestion.prompt) {
      setCustomPrompt(suggestion.prompt);
      setActiveTab('generate');
    }
  };

  const handleAction = async (action, customMessage = null) => {
    if (!selectedCode && action !== 'generate' && !customMessage) {
      setError('Сначала выделите код в редакторе');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    
    // Добавляем сообщение пользователя в чат
    const userMessage = customMessage || (action === 'generate' ? customPrompt : `${action === 'explain' ? 'Объясни' : action === 'fix' ? 'Исправь' : action === 'optimize' ? 'Оптимизируй' : 'Добавь комментарии к'} этому коду`);
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      code: selectedCode,
      timestamp: new Date().toISOString()
    };
    setChatHistory(prev => [...prev, newUserMessage]);

    try {
      const token = localStorage.getItem('token');
      let endpoint = '';
      let body = {};

      switch (action) {
        case 'explain':
          endpoint = '/ai/explain-code';
          body = { code: selectedCode, language };
          break;
        case 'fix':
          endpoint = '/ai/fix-code';
          body = { code: selectedCode, language, error: 'Анализ и исправление возможных проблем' };
          break;
        case 'optimize':
          endpoint = '/ai/optimize-code';
          body = { code: selectedCode, language };
          break;
        case 'comments':
          endpoint = '/ai/add-comments';
          body = { code: selectedCode, language };
          break;
        case 'generate':
          if (!customPrompt.trim() && !customMessage) {
            setError('Введите описание того, что нужно создать');
            setLoading(false);
            return;
          }
          endpoint = '/ai/generate-code';
          body = { description: customMessage || customPrompt, language };
          break;
        case 'chat':
          endpoint = '/ai/chat';
          // Преобразуем историю в формат для API (только role и content)
          const formattedHistory = chatHistory.slice(-10).map(msg => {
            if (msg.role === 'user') {
              return {
                role: 'user',
                content: msg.message || msg.content || ''
              };
            } else if (msg.role === 'assistant') {
              // Извлекаем текст ответа из разных форматов
              let content = '';
              if (msg.data?.response) {
                content = msg.data.response;
              } else if (msg.data?.explanation) {
                content = msg.data.explanation;
              } else if (msg.content) {
                content = msg.content;
              }
              return {
                role: 'assistant',
                content
              };
            }
            return null;
          }).filter(Boolean);
          
          body = { 
            message: customMessage,
            code: selectedCode,
            language,
            history: formattedHistory
          };
          break;
        default:
          break;
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Сервер вернул некорректный ответ');
      }

      if (!response.ok) {
        const errorMessage = data.message || data.error || `Ошибка ${response.status}`;
        console.error('Server error:', { status: response.status, data });
        throw new Error(errorMessage);
      }

      // Добавляем ответ AI в чат
      const aiMessage = {
        role: 'assistant',
        action,
        data,
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, aiMessage]);
      setResult({ action, data });
      setCustomPrompt('');
    } catch (err) {
      console.error('AI Error:', err);
      const errorMessage = err.message || 'Произошла ошибка при обращении к AI';
      setError(errorMessage);
      
      // Добавляем сообщение об ошибке в чат для видимости
      const errorMsg = {
        role: 'assistant',
        action: 'error',
        data: { response: `⚠️ Ошибка: ${errorMessage}` },
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev.slice(0, -1), errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleInsertCode = () => {
    if (!result) return;

    let codeToInsert = '';

    switch (result.action) {
      case 'explain':
        // Для объяснения не вставляем код
        return;
      case 'fix':
        codeToInsert = result.data.fixedCode;
        break;
      case 'optimize':
        codeToInsert = result.data.optimizedCode;
        break;
      case 'comments':
        codeToInsert = result.data.commentedCode;
        break;
      case 'generate':
        codeToInsert = result.data.code;
        break;
      default:
        break;
    }

    if (codeToInsert && onInsertCode) {
      onInsertCode(codeToInsert);
      setResult(null);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    const { action, data } = result;

    switch (action) {
      case 'explain':
        return (
          <div className={styles['ai-result']}>
            <h3><FaBook /> Объяснение кода:</h3>
            <div className={styles['ai-explanation']}>
              {data.explanation}
            </div>
          </div>
        );

      case 'fix':
        return (
          <div className={styles['ai-result']}>
            <h3><FaWrench /> Исправленный код:</h3>
            <pre className={styles['ai-code-block']}>
              <code>{data.fixedCode}</code>
            </pre>
            <h4><FaLightbulb /> Объяснение:</h4>
            <div className={styles['ai-explanation']}>
              {data.explanation}
            </div>
            <button className={styles['ai-insert-btn']} onClick={handleInsertCode}>
              Заменить код
            </button>
          </div>
        );

      case 'optimize':
        return (
          <div className={styles['ai-result']}>
            <h3><MdBolt /> Оптимизированный код:</h3>
            <pre className={styles['ai-code-block']}>
              <code>{data.optimizedCode}</code>
            </pre>
            <h4><MdStar /> Улучшения:</h4>
            <div className={styles['ai-explanation']}>
              {data.improvements}
            </div>
            <button className={styles['ai-insert-btn']} onClick={handleInsertCode}>
              Заменить код
            </button>
          </div>
        );

      case 'comments':
        return (
          <div className={styles['ai-result']}>
            <h3><FaCommentDots /> Код с комментариями:</h3>
            <pre className={styles['ai-code-block']}>
              <code>{data.commentedCode}</code>
            </pre>
            <button className={styles['ai-insert-btn']} onClick={handleInsertCode}>
              Заменить код
            </button>
          </div>
        );

      case 'generate':
        return (
          <div className={styles['ai-result']}>
            <h3><AiOutlineRobot /> Сгенерированный код:</h3>
            <pre className={styles['ai-code-block']}>
              <code>{data.code}</code>
            </pre>
            <h4><FaFileCode /> Объяснение:</h4>
            <div className={styles['ai-explanation']}>
              {data.explanation}
            </div>
            <button className={styles['ai-insert-btn']} onClick={handleInsertCode}>
              Вставить код
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles['ai-assistant-overlay']}>
      <div className={styles['ai-assistant-panel']}>
        <div className={styles['ai-assistant-header']}>
          <div className={styles['ai-header-left']}>
            <AiOutlineRobot className={styles['ai-robot-icon']} />
            <h2>AI Ассистент</h2>
          </div>
          <div className={styles['ai-header-actions']}>
            {chatHistory.length > 0 && (
              <button 
                className={styles['ai-clear-btn']} 
                onClick={clearHistory}
                title="Очистить историю"
              >
                <FaTrash />
              </button>
            )}
            <button className={styles['ai-close-btn']} onClick={onClose}>
              <AiOutlineClose />
            </button>
          </div>
        </div>

        <div className={styles['ai-assistant-tabs']}>
          <button
            className={`${styles['ai-tab']} ${activeTab === 'chat' ? styles['active'] : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <BiMessageSquareDetail />
            <span>Чат</span>
          </button>
          <button
            className={`${styles['ai-tab']} ${activeTab === 'actions' ? styles['active'] : ''}`}
            onClick={() => setActiveTab('actions')}
          >
            <MdBolt />
            <span>Действия</span>
          </button>
          <button
            className={`${styles['ai-tab']} ${activeTab === 'generate' ? styles['active'] : ''}`}
            onClick={() => setActiveTab('generate')}
          >
            <AiOutlineCode />
            <span>Генерация</span>
          </button>
        </div>

        <div className={styles['ai-assistant-content']}>
          {activeTab === 'chat' && (
            <>
              <div className={styles['ai-chat-container']}>
                {chatHistory.length === 0 ? (
                  <div className={styles['ai-chat-empty']}>
                    <AiOutlineRobot className={styles['ai-empty-icon']} />
                    <h3>Привет! Я твой AI помощник</h3>
                    <p>Выдели код и задай мне вопрос, или используй быстрые команды ниже</p>
                  </div>
                ) : (
                  <div className={styles['ai-chat-messages']}>
                    {chatHistory.map((message, index) => (
                      <div 
                        key={index} 
                        className={`${styles['ai-message']} ${styles[`ai-message-${message.role}`]}`}
                      >
                        <div className={styles['ai-message-header']}>
                          {message.role === 'user' ? '👤 Вы' : '🤖 AI'}
                          <span className={styles['ai-message-time']}>
                            {new Date(message.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={styles['ai-message-content']}>
                          {message.role === 'user' ? (
                            <>
                              <p>{message.content}</p>
                              {message.code && (
                                <pre className={styles['ai-code-snippet']}>
                                  <code>{message.code}</code>
                                </pre>
                              )}
                            </>
                          ) : (
                            <>
                              {message.action === 'chat' && message.data.response && (
                                <div className={styles['ai-explanation']}>
                                  {message.data.response}
                                </div>
                              )}
                              {message.action === 'explain' && (
                                <div className={styles['ai-explanation']}>
                                  {message.data.explanation}
                                </div>
                              )}
                              {(message.action === 'fix' || message.action === 'optimize' || message.action === 'comments' || message.action === 'generate') && (
                                <>
                                  <pre className={styles['ai-code-block']}>
                                    <button 
                                      className={styles['ai-copy-btn']}
                                      onClick={() => copyToClipboard(message.data.fixedCode || message.data.optimizedCode || message.data.commentedCode || message.data.code)}
                                      title="Копировать код"
                                    >
                                      {copiedCode === (message.data.fixedCode || message.data.optimizedCode || message.data.commentedCode || message.data.code) ? <FaCheck /> : <FaCopy />}
                                    </button>
                                    <code>{message.data.fixedCode || message.data.optimizedCode || message.data.commentedCode || message.data.code}</code>
                                  </pre>
                                  {(message.data.explanation || message.data.improvements) && (
                                    <div className={styles['ai-explanation']}>
                                      {message.data.explanation || message.data.improvements}
                                    </div>
                                  )}
                                  <button 
                                    className={styles['ai-insert-btn']} 
                                    onClick={() => {
                                      const code = message.data.fixedCode || message.data.optimizedCode || message.data.commentedCode || message.data.code;
                                      if (code && onInsertCode) {
                                        onInsertCode(code);
                                      }
                                    }}
                                  >
                                    {message.action === 'generate' ? 'Вставить код' : 'Заменить код'}
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>
              
              {/* Быстрые команды */}
              {chatHistory.length === 0 && (
                <div className={styles['ai-suggested-prompts']}>
                  <h4>Быстрые команды:</h4>
                  <div className={styles['ai-prompts-grid']}>
                    {SUGGESTED_PROMPTS.map((prompt, index) => {
                      const IconComponent = prompt.icon;
                      return (
                        <button
                          key={index}
                          className={styles['ai-prompt-btn']}
                          onClick={() => handleSuggestedPrompt(prompt)}
                          disabled={loading || (!selectedCode && prompt.action !== 'generate')}
                        >
                          <span className={styles['ai-prompt-icon']}>
                            <IconComponent />
                          </span>
                          <span className={styles['ai-prompt-text']}>{prompt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Поле ввода */}
              <div className={styles['ai-chat-input-container']}>
                <textarea
                  ref={inputRef}
                  className={styles['ai-chat-input']}
                  placeholder={selectedCode ? "Задай вопрос об этом коде..." : "Выдели код или напиши запрос..."}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (customPrompt.trim()) {
                        handleAction('chat', customPrompt);
                      }
                    }
                  }}
                  rows={2}
                />
                <button
                  className={styles['ai-send-btn']}
                  onClick={() => customPrompt.trim() && handleAction('chat', customPrompt)}
                  disabled={loading || !customPrompt.trim()}
                >
                  <AiOutlineSend />
                </button>
              </div>
            </>
          )}
          
          {activeTab === 'actions' && (
            <div className={styles['ai-actions-grid']}>
              <button
                className={styles['ai-action-btn']}
                onClick={() => handleAction('explain')}
                disabled={loading || !selectedCode}
              >
                <AiOutlineBulb />
                <span>Объяснить код</span>
              </button>

              <button
                className={styles['ai-action-btn']}
                onClick={() => handleAction('optimize')}
                disabled={loading || !selectedCode}
              >
                <AiOutlineThunderbolt />
                <span>Оптимизировать</span>
              </button>

              <button
                className={styles['ai-action-btn']}
                onClick={() => handleAction('comments')}
                disabled={loading || !selectedCode}
              >
                <AiOutlineComment />
                <span>Добавить комментарии</span>
              </button>

              <button
                className={styles['ai-action-btn']}
                onClick={() => handleAction('fix')}
                disabled={loading || !selectedCode}
              >
                <AiOutlineBug />
                <span>Исправить ошибки</span>
              </button>
            </div>
          )}

          {activeTab === 'generate' && (
            <div className={styles['ai-generate-section']}>
              <textarea
                className={styles['ai-prompt-input']}
                placeholder="Опишите что нужно создать... Например: 'Создай функцию для сортировки массива объектов по полю name'"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={4}
              />
              <button
                className={styles['ai-generate-btn']}
                onClick={() => handleAction('generate')}
                disabled={loading || !customPrompt.trim()}
              >
                <AiOutlineCode />
                Сгенерировать код
              </button>
            </div>
          )}

          {loading && activeTab !== 'chat' && (
            <div className={styles['ai-loading']}>
              <div className={styles['ai-spinner']}></div>
              <p>AI думает...</p>
            </div>
          )}

          {error && (
            <div className={styles['ai-error']}>
              <p><MdClose /> {error}</p>
            </div>
          )}

          {renderResult()}

          {!selectedCode && !loading && !result && activeTab === 'actions' && (
            <div className={styles['ai-hint']}>
              <p><FaLightbulb /> Выделите код в редакторе, чтобы использовать AI ассистента</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIAssistant;
