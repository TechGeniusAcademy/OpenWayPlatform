import { useState } from 'react';
import api from '../../utils/api';
import { BsChatDots, BsPlay } from 'react-icons/bs';

function TesterChat() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState(null);

  const runChatStressTest = async () => {
    setTesting(true);
    setResults(null);

    try {
      const response = await api.post('/testing/chat-stress');
      setResults(response.data);
    } catch (error) {
      console.error('Ошибка стресс-теста:', error);
      alert('Ошибка выполнения теста');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="tester-users">
      <h1><BsChatDots /> Chat Testing</h1>
      
      <div style={{ padding: '20px' }}>
        <button 
          onClick={runChatStressTest}
          disabled={testing}
          className="action-btn stress"
          style={{ width: '100%', maxWidth: '400px' }}
        >
          <BsPlay />
          <span>{testing ? 'Выполняется...' : 'Запустить стресс-тест чата'}</span>
        </button>

        {results && (
          <div className="testing-tips" style={{ marginTop: '30px' }}>
            <h3>Результаты теста</h3>
            <ul>
              <li><strong>Отправлено сообщений:</strong> {results.messagesSent}</li>
              <li><strong>Время выполнения:</strong> {results.duration}ms</li>
              <li><strong>Средняя задержка:</strong> {results.avgLatency}ms</li>
              <li><strong>Ошибки:</strong> {results.errors}</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default TesterChat;
