import { useState, useEffect } from 'react';
import api from '../utils/api';
import { AiOutlineHistory, AiOutlineClose } from 'react-icons/ai';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import './PointsHistory.css';

function PointsHistory({ isOpen, onClose, userId = null }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, userId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const endpoint = userId ? `/points/history/${userId}` : '/points/history';
      const response = await api.get(endpoint);
      setHistory(response.data.history || []);
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="points-history-overlay" onClick={onClose}>
      <div className="points-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="points-history-header">
          <div className="header-title">
            <AiOutlineHistory className="header-icon" />
            <h2>История транзакций</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <AiOutlineClose />
          </button>
        </div>

        <div className="points-history-content">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Загрузка истории...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="empty-state">
              <AiOutlineHistory className="empty-icon" />
              <p>История транзакций пуста</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((item) => (
                <div 
                  key={item.id} 
                  className={`history-item ${item.points_change > 0 ? 'positive' : 'negative'}`}
                >
                  <div className="item-icon">
                    {item.points_change > 0 ? (
                      <FiArrowUp className="icon-up" />
                    ) : (
                      <FiArrowDown className="icon-down" />
                    )}
                  </div>
                  
                  <div className="item-details">
                    <div className="item-reason">{item.reason}</div>
                    <div className="item-meta">
                      {item.admin_id && (
                        <span className="admin-badge">
                          Админ: {item.admin_name || item.admin_username}
                        </span>
                      )}
                      <span className="item-date">
                        {new Date(item.created_at).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`item-amount ${item.points_change > 0 ? 'positive' : 'negative'}`}>
                    {item.points_change > 0 ? '+' : ''}{item.points_change}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PointsHistory;
