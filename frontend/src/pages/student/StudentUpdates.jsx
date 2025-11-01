import { useState, useEffect } from "react";
import api from "../../utils/api";
import styles from './StudentUpdates.module.css';
import { AiOutlineCalendar, AiOutlineDown, AiOutlineUp } from "react-icons/ai";
import { FaBullhorn } from "react-icons/fa";

function StudentUpdates() {
  const [updates, setUpdates] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      const response = await api.get("/updates");
      const sortedUpdates = response.data.updates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setUpdates(sortedUpdates);
      // Автоматически раскрываем первое (самое новое) обновление
      if (sortedUpdates.length > 0) {
        setExpandedId(sortedUpdates[0].id);
      }
    } catch (error) {
      console.error("Ошибка загрузки обновлений:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className={styles['student-page']}>
        <div className={styles['page-header']}>
          <h1>Обновления</h1>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['student-page']}>
      <div className={styles['page-header']}>
        <h1>Обновления платформы</h1>
        <p>История обновлений и новых функций</p>
      </div>

      {updates.length === 0 ? (
        <div className={styles['empty-state']}>
          <div className={styles['empty-state-icon']}><FaBullhorn /></div>
          <h3>Нет обновлений</h3>
          <p>Обновления ещё не опубликованы</p>
        </div>
      ) : (
        <div className={styles['dota-updates-list']}>
          {updates.map((update, index) => (
            <div key={update.id} className={`update-item ${expandedId === update.id ? "expanded" : ""} ${index === 0 ? "newest" : ""}`}>
              <div className={styles['update-item-header']} onClick={() => toggleExpand(update.id)}>
                <div className={styles['update-item-left']}>
                  <div className={styles['update-item-version']}>{update.version}</div>
                  <h3 className={styles['update-item-title']}>{update.title}</h3>
                  {update.description && !expandedId === update.id && <p className={styles['update-item-description']}>{update.description}</p>}
                </div>
                <div className={styles['update-item-right']}>
                  <div className={styles['update-item-date']}>
                    <AiOutlineCalendar />
                    <span>
                      {new Date(update.created_at).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <button className={styles['update-item-toggle']}>{expandedId === update.id ? <AiOutlineUp /> : <AiOutlineDown />}</button>
                </div>
              </div>

              {expandedId === update.id && (
                <div className={styles['update-item-content']}>
                  {update.description && <p className={styles['update-content-description']}>{update.description}</p>}
                  <div className={styles['update-content-html']} dangerouslySetInnerHTML={{ __html: update.content }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentUpdates;
