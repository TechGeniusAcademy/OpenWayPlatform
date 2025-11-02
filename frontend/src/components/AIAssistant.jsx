import { useState } from 'react';
import { 
  AiOutlineRobot, 
  AiOutlineClose, 
  AiOutlineBulb, 
  AiOutlineThunderbolt,
  AiOutlineComment,
  AiOutlineBug,
  AiOutlineCode
} from 'react-icons/ai';
import { FaBook, FaWrench, FaCommentDots, FaFileCode, FaLightbulb } from 'react-icons/fa';
import { MdBolt, MdStar, MdClose } from 'react-icons/md';
import styles from './AIAssistant.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function AIAssistant({ isOpen, onClose, selectedCode, language, onInsertCode }) {
  const [activeTab, setActiveTab] = useState('actions');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [error, setError] = useState(null);

  const handleAction = async (action) => {
    if (!selectedCode && action !== 'generate') {
      setError('Сначала выделите код в редакторе');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

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
          if (!customPrompt.trim()) {
            setError('Введите описание того, что нужно создать');
            setLoading(false);
            return;
          }
          endpoint = '/ai/generate-code';
          body = { description: customPrompt, language };
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ошибка при обработке запроса');
      }

      setResult({ action, data });
    } catch (err) {
      console.error('AI Error:', err);
      setError(err.message || 'Произошла ошибка при обращении к AI');
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
          <button className={styles['ai-close-btn']} onClick={onClose}>
            <AiOutlineClose />
          </button>
        </div>

        <div className={styles['ai-assistant-tabs']}>
          <button
            className={`${styles['ai-tab']} ${activeTab === 'actions' ? styles['active'] : ''}`}
            onClick={() => setActiveTab('actions')}
          >
            Действия
          </button>
          <button
            className={`${styles['ai-tab']} ${activeTab === 'generate' ? styles['active'] : ''}`}
            onClick={() => setActiveTab('generate')}
          >
            Генерация
          </button>
        </div>

        <div className={styles['ai-assistant-content']}>
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

          {loading && (
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
