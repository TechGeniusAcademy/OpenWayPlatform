import { useState, useEffect } from "react";
import api from "../../utils/api";
import styles from './StudentUpdates.module.css';
import { 
  AiOutlineCalendar, 
  AiOutlineDown, 
  AiOutlineUp,
  AiOutlineRocket,
  AiOutlineThunderbolt,
  AiOutlineStar
} from "react-icons/ai";
import { FaBullhorn, FaRegNewspaper, FaHistory, FaCalendarAlt } from "react-icons/fa";
import { HiOutlineSparkles, HiOutlineDocumentText } from "react-icons/hi";
import { MdNewReleases } from "react-icons/md";

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

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getLatestVersion = () => {
    if (updates.length === 0) return '-';
    return updates[0].version;
  };

  const getThisYearCount = () => {
    const currentYear = new Date().getFullYear();
    return updates.filter(u => new Date(u.created_at).getFullYear() === currentYear).length;
  };

  if (loading) {
    return (
      <div className={styles.updatesPage}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <span className={styles.loadingText}>Загрузка обновлений...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.updatesPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          <AiOutlineRocket className={styles.pageTitleIcon} />
          Обновления платформы
        </h1>
        <p className={styles.pageSubtitle}>История изменений и новых функций OpenWay</p>
      </div>

      {/* Stats Bar */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <div className={`${styles.statIcon} ${styles.total}`}>
            <HiOutlineDocumentText />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{updates.length}</span>
            <span className={styles.statLabel}>Всего обновлений</span>
          </div>
        </div>
        <div className={styles.statItem}>
          <div className={`${styles.statIcon} ${styles.latest}`}>
            <MdNewReleases />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{getLatestVersion()}</span>
            <span className={styles.statLabel}>Последняя версия</span>
          </div>
        </div>
        <div className={styles.statItem}>
          <div className={`${styles.statIcon} ${styles.year}`}>
            <FaCalendarAlt />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{getThisYearCount()}</span>
            <span className={styles.statLabel}>В этом году</span>
          </div>
        </div>
      </div>

      {/* Updates List */}
      {updates.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FaBullhorn />
          </div>
          <h3 className={styles.emptyTitle}>Нет обновлений</h3>
          <p className={styles.emptyText}>Обновления ещё не опубликованы. Следите за новостями!</p>
        </div>
      ) : (
        <div className={styles.timelineContainer}>
          {updates.map((update, index) => (
            <div 
              key={update.id} 
              className={`${styles.updateCard} ${index === 0 ? styles.isLatest : ''}`}
            >
              {/* Timeline Dot */}
              <div className={styles.timelineDot}>
                {index === 0 ? <HiOutlineSparkles /> : <AiOutlineStar />}
              </div>

              {/* Card Header */}
              <div className={styles.cardHeader} onClick={() => toggleExpand(update.id)}>
                <div className={styles.cardMeta}>
                  <div className={styles.cardTopRow}>
                    <span className={styles.versionBadge}>
                      <AiOutlineThunderbolt />
                      {update.version}
                    </span>
                    {index === 0 && (
                      <span className={styles.latestTag}>
                        <MdNewReleases />
                        Новое
                      </span>
                    )}
                    <span className={styles.cardDate}>
                      <AiOutlineCalendar />
                      {formatDate(update.created_at)}
                    </span>
                  </div>
                  <h3 className={styles.cardTitle}>{update.title}</h3>
                </div>
                <div className={styles.cardActions}>
                  <button className={`${styles.expandBtn} ${expandedId === update.id ? styles.isExpanded : ''}`}>
                    <AiOutlineDown />
                  </button>
                </div>
              </div>

              {/* Card Content */}
              {expandedId === update.id && (
                <div className={styles.cardContent}>
                  {update.description && (
                    <p className={styles.contentDescription}>{update.description}</p>
                  )}
                  <div 
                    className={styles.contentBody} 
                    dangerouslySetInnerHTML={{ __html: update.content }} 
                  />
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
