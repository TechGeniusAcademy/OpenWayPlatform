import { useState, useEffect } from 'react';
import api from '../utils/api';
import { AiOutlineHistory, AiOutlineClose } from 'react-icons/ai';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import styles from './PointsHistory.module.css';

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
    <div className={styles.points-history-overlay} onClick={onClose}>
      <div className={styles.points-history-modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.points-history-header}>
          <div className={styles.header-title}>
            <AiOutlineHistory className={styles.header-icon} />
            <h2>История транзакций</h2>
          </div>
          <button className={styles.close-btn} onClick={onClose}>
            <AiOutlineClose />
          </button>
        </div>

        <div className={styles.points-history-content}>
          {loading ? (
            <div className={styles.loading-state}>
              <div className={styles.spinner}></div>
              <p>Загрузка истории...</p>
            </div>
          ) : history.length === 0 ? (
            <div className={styles.empty-state}>
              <AiOutlineHistory className={styles.empty-icon} />
              <p>История транзакций пуста</p>
            </div>
          ) : (
            <div className={styles.history-list}>
              {history.map((item) => (
                <div 
                  key={item.id} 
                  className={`history-item ${item.points_change > 0 ? 'positive' : 'negative'}`}
                >
                  <div className={styles.item-icon}>
                    {item.points_change > 0 ? (
                      <FiArrowUp className={styles.icon-up} />
                    ) : (
                      <FiArrowDown className={styles.icon-down} />
                    )}
                  </div>
                  
                  <div className={styles.item-details}>
                    <div className={styles.item-reason}>{item.reason}</div>
                    <div className={styles.item-meta}>
                      {item.admin_id && (
                        <span className={styles.admin-badge}>
                          Админ: {item.admin_name || item.admin_username}
                        </span>
                      )}
                      <span className={styles.item-date}>
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
