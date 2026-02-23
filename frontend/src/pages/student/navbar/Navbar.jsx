import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Navbar.module.css";
import { FaSun, FaMoon, FaSearch, FaTimes, FaUser, FaEnvelope, FaInbox, FaCog, FaSignOutAlt, FaBell } from "react-icons/fa";
import { AiOutlineRocket } from "react-icons/ai";
import i18n from "i18next";
import { MdLanguage } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../context/AuthContext";
import { BASE_URL } from "../../../utils/api";
import api from "../../../utils/api";

function Navbar() {
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notiLoading, setNotiLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const bellRef = useRef(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    // Use classList to avoid wiping other body classes
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const { t } = useTranslation("student");

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch notifications (updates)
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setNotiLoading(true);
      const res = await api.get("/updates");
      const sorted = (res.data.updates || []).slice(0, 5);
      setNotifications(sorted);
      // Compute unread: those newer than lastSeenId stored in localStorage
      const lastSeenId = parseInt(localStorage.getItem("lastSeenNotifId") || "0");
      const unread = sorted.filter((u) => u.id > lastSeenId).length;
      setUnreadCount(unread);
    } catch (e) {
      console.error("Ошибка загрузки уведомлений:", e);
    } finally {
      setNotiLoading(false);
    }
  };

  const openBell = () => {
    setBellOpen((v) => !v);
    setMenuOpen(false);
  };

  const markAllRead = () => {
    if (notifications.length === 0) return;
    const maxId = Math.max(...notifications.map((n) => n.id));
    localStorage.setItem("lastSeenNotifId", String(maxId));
    setUnreadCount(0);
  };

  const formatRelativeDate = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "только что";
    if (mins < 60) return `${mins} мин. назад`;
    if (hours < 24) return `${hours} ч. назад`;
    if (days < 7) return `${days} дн. назад`;
    return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  const handleMenuNav = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim() !== "") {
      navigate(`/search?query=${encodeURIComponent(query.trim())}`);
      setQuery("");
      inputRef.current?.blur();
    }
  };

  const clearSearch = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === "ru" ? "en" : "ru";
    i18n.changeLanguage(newLang);
  };

  const currentLang = i18n.language === "ru" ? "RU" : "EN";

  return (
    <header className={styles.Navbar}>
      {/* Логотип-заглушка слева (для отступа под сайдбар) */}
      <div className={styles.Brand} />

      {/* Поиск */}
      <form
        className={`${styles.SearchForm} ${searchFocused ? styles.SearchFormFocused : ""}`}
        onSubmit={handleSearch}
      >
        <span className={styles.SearchIcon}>
          <FaSearch />
        </span>
        <input
          ref={inputRef}
          type="text"
          placeholder={t("searchthesite")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className={styles.SearchInput}
        />
        {query && (
          <button
            type="button"
            className={styles.ClearButton}
            onClick={clearSearch}
            tabIndex={-1}
          >
            <FaTimes />
          </button>
        )}
      </form>

      {/* Управление */}
      <div className={styles.Control}>
        {/* Колокольчик */}
        <div className={styles.BellWrap} ref={bellRef}>
          <button
            className={`${styles.IconButton} ${bellOpen ? styles.IconButtonActive : ""}`}
            onClick={openBell}
            aria-label="Notifications"
            title="Уведомления"
          >
            <FaBell />
            {unreadCount > 0 && (
              <span className={styles.BellBadge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
            )}
          </button>

          {bellOpen && (
            <div className={styles.BellDropdown}>
              <div className={styles.BellDropdownHead}>
                <span className={styles.BellDropdownTitle}>Уведомления</span>
                {unreadCount > 0 && (
                  <button className={styles.MarkReadBtn} onClick={markAllRead}>
                    Отметить все
                  </button>
                )}
              </div>

              <div className={styles.BellDropdownBody}>
                {notiLoading ? (
                  <div className={styles.BellEmpty}>Загрузка...</div>
                ) : notifications.length === 0 ? (
                  <div className={styles.BellEmpty}>Нет уведомлений</div>
                ) : (
                  notifications.map((notif) => {
                    const lastSeenId = parseInt(localStorage.getItem("lastSeenNotifId") || "0");
                    const isNew = notif.id > lastSeenId;
                    return (
                      <button
                        key={notif.id}
                        className={`${styles.BellItem} ${isNew ? styles.BellItemNew : ""}`}
                        onClick={() => {
                          markAllRead();
                          setBellOpen(false);
                          navigate("/student/updates");
                        }}
                      >
                        <span className={styles.BellItemIcon}>
                          <AiOutlineRocket />
                        </span>
                        <span className={styles.BellItemContent}>
                          <span className={styles.BellItemTitle}>
                            {notif.version && <span className={styles.BellItemVersion}>v{notif.version}</span>}
                            {notif.title}
                          </span>
                          <span className={styles.BellItemDesc}>{notif.description}</span>
                          <span className={styles.BellItemDate}>{formatRelativeDate(notif.created_at)}</span>
                        </span>
                        {isNew && <span className={styles.BellItemDot} />}
                      </button>
                    );
                  })
                )}
              </div>

              <button
                className={styles.BellDropdownFooter}
                onClick={() => { setBellOpen(false); navigate("/student/updates"); }}
              >
                Все обновления
              </button>
            </div>
          )}
        </div>

        <button
          className={styles.IconButton}
          onClick={toggleTheme}
          title={theme === "light" ? t("enabledarktheme") : t("enablelighttheme")}
          aria-label="Toggle theme"
        >
          <span className={styles.IconWrap}>
            {theme === "light" ? <FaMoon /> : <FaSun />}
          </span>
        </button>

        <button
          onClick={toggleLanguage}
          className={`${styles.IconButton} ${styles.LangButton}`}
          title={t("changelang")}
          aria-label="Toggle language"
        >
          <MdLanguage className={styles.LangIcon} />
          <span className={styles.LangLabel}>{currentLang}</span>
        </button>

        {/* Аватарка + дропдаун */}
        <div className={styles.AvatarWrap} ref={menuRef}>
          <button
            className={`${styles.AvatarBtn} ${menuOpen ? styles.AvatarBtnActive : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="User menu"
          >
            {user?.avatar_url ? (
              <img
                src={`${BASE_URL}${user.avatar_url}`}
                alt={user.username}
                className={styles.AvatarImg}
              />
            ) : (
              <div className={styles.AvatarFallback}>
                {(user?.full_name || user?.username || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <span className={styles.AvatarOnline} />
          </button>

          {menuOpen && (
            <div className={styles.DropdownMenu}>
              {/* Шапка */}
              <div className={styles.DropdownHeader}>
                <div className={styles.DropdownAvatarSmall}>
                  {user?.avatar_url ? (
                    <img src={`${BASE_URL}${user.avatar_url}`} alt={user.username} />
                  ) : (
                    <span>{(user?.full_name || user?.username || "U").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className={styles.DropdownUserInfo}>
                  <span className={styles.DropdownName}>{user?.full_name || user?.username}</span>
                  <span className={styles.DropdownEmail}>{user?.email}</span>
                </div>
              </div>

              <div className={styles.DropdownDivider} />

              <button className={styles.DropdownItem} onClick={() => handleMenuNav("/student/profile")}>
                <FaUser className={styles.DropdownIcon} />
                Профиль
              </button>
              <button className={styles.DropdownItem} onClick={() => handleMenuNav("/student/chat")}>
                <FaEnvelope className={styles.DropdownIcon} />
                Сообщения
              </button>
              <button className={styles.DropdownItem} onClick={() => handleMenuNav("/student/chat")}>
                <FaInbox className={styles.DropdownIcon} />
                Входящие
              </button>
              <button className={styles.DropdownItem} onClick={() => handleMenuNav("/student/settings")}>
                <FaCog className={styles.DropdownIcon} />
                Настройки
              </button>

              <div className={styles.DropdownDivider} />

              <button className={`${styles.DropdownItem} ${styles.DropdownLogout}`} onClick={handleLogout}>
                <FaSignOutAlt className={styles.DropdownIcon} />
                Выйти
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
