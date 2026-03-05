import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import api, { BASE_URL } from "../../../utils/api";
import styles from "./SearchResults.module.css";
import { FaSearch, FaBook, FaFileAlt, FaClipboardList, FaRocket, FaUser, FaLayerGroup } from "react-icons/fa";

const SECTION_META = {
  pages:     { label: "Страницы",         icon: <FaLayerGroup /> },
  courses:   { label: "Курсы",            icon: <FaBook /> },
  articles:  { label: "База знаний",      icon: <FaFileAlt /> },
  tests:     { label: "Тесты",            icon: <FaClipboardList /> },
  homeworks: { label: "Домашние задания", icon: <FaClipboardList /> },
  updates:   { label: "Обновления",       icon: <FaRocket /> },
  users:     { label: "Пользователи",     icon: <FaUser /> },
};

function highlight(text, query) {
  if (!text || !query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className={styles.hl}>{p}</mark>
      : p
  );
}

export default function SearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search).get("query") || "";

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchResults = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults({}); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(q)}`);
      setResults(res.data.results || {});
    } catch (e) {
      setError("Ошибка при поиске. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchResults(query); }, [query, fetchResults]);

  const totalCount = results
    ? Object.values(results).reduce((s, arr) => s + (arr?.length || 0), 0)
    : 0;

  const getLink = (section, item) => {
    switch (section) {
      case "courses":   return `/student/course/${item.id}`;
      case "articles":  return `/student/knowledge-base?article=${item.id}`;
      case "tests":     return `/student/tests`;
      case "homeworks": return `/student/homeworks`;
      case "updates":   return `/student/updates`;
      case "users":     return `/student/profile/${item.id}`;
      case "pages":     return item.link;
      default:          return "#";
    }
  };

  const getSubtitle = (section, item) => {
    switch (section) {
      case "courses":   return item.category || item.description?.slice(0, 80);
      case "articles":  return item.category_name ? `${item.category_name} · ${item.snippet?.slice(0, 80)}` : item.snippet?.slice(0, 80);
      case "tests":     return item.description?.slice(0, 80);
      case "homeworks": return item.description?.slice(0, 80);
      case "updates":   return item.description?.slice(0, 80);
      case "users":     return item.role;
      case "pages":     return item.description;
      default:          return "";
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerIcon}><FaSearch /></div>
        <div>
          <h1 className={styles.title}>
            Результаты поиска{query ? <>: <span className={styles.queryText}>«{query}»</span></> : ""}
          </h1>
          {results && !loading && (
            <p className={styles.subtitle}>
              {totalCount > 0 ? `Найдено ${totalCount} результатов` : "Ничего не найдено"}
            </p>
          )}
        </div>
      </div>

      {loading && (
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
          <span>Поиск...</span>
        </div>
      )}

      {error && <div className={styles.errorMsg}>{error}</div>}

      {!loading && results && totalCount === 0 && (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🔍</span>
          <p>По запросу «{query}» ничего не найдено</p>
          <p className={styles.emptyHint}>Попробуйте другие ключевые слова</p>
        </div>
      )}

      {!loading && results && totalCount > 0 && (
        <div className={styles.sections}>
          {Object.entries(SECTION_META).map(([section, meta]) => {
            const items = results[section];
            if (!items?.length) return null;
            return (
              <section key={section} className={styles.section}>
                <div className={styles.sectionHead}>
                  <span className={styles.sectionIcon}>{meta.icon}</span>
                  <h2 className={styles.sectionTitle}>{meta.label}</h2>
                  <span className={styles.sectionCount}>{items.length}</span>
                </div>
                <div className={styles.itemList}>
                  {items.map((item) => (
                    <Link
                      key={`${section}-${item.id || item.link}`}
                      to={getLink(section, item)}
                      className={styles.item}
                    >
                      {section === "courses" && item.thumbnail_url && (
                        <img
                          src={`${BASE_URL}${item.thumbnail_url}`}
                          alt=""
                          className={styles.itemThumb}
                          onError={e => { e.target.style.display = "none"; }}
                        />
                      )}
                      {section === "users" && (
                        <img
                          src={`${BASE_URL}${item.avatar_url || "/uploads/avatars/default-avatar.png"}`}
                          alt=""
                          className={styles.itemAvatar}
                          onError={e => { e.target.src = `${BASE_URL}/uploads/avatars/default-avatar.png`; }}
                        />
                      )}
                      {section === "pages" && (
                        <span className={styles.pageIcon}>{item.icon}</span>
                      )}
                      <div className={styles.itemBody}>
                        <span className={styles.itemTitle}>
                          {highlight(item.title || item.full_name || item.username, query)}
                        </span>
                        {getSubtitle(section, item) && (
                          <span className={styles.itemSub}>
                            {highlight(getSubtitle(section, item), query)}
                          </span>
                        )}
                      </div>
                      <span className={styles.itemArrow}>→</span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
