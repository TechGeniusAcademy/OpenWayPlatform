import { useAuth } from "../../context/AuthContext";
import api, { BASE_URL } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import styles from "../StudentDashboard.module.css";
import DashboardCalendar from "./DashboardCalendar";
import {
  FaBitcoin, FaBookOpen, FaCalendarAlt, FaClipboardList,
  FaFileAlt, FaShoppingBag, FaComments, FaBell,
  FaCheckCircle, FaClock, FaAngleRight, FaTasks, FaGamepad
} from "react-icons/fa";
import { SiLevelsdotfyi } from "react-icons/si";
import { useTranslation } from "react-i18next";

function StudentHome() {
  const { user } = useAuth();

  const [groupInfo, setGroupInfo] = useState(null);

  const [appliedFrame, setAppliedFrame] = useState(null);
  const [appliedBanner, setAppliedBanner] = useState(null);

  const { t } = useTranslation("student");

  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  const [userLevel, setUserLevel] = useState(null);
  const [nextLevel, setNextLevel] = useState(null);
  const [userExperience, setUserExperience] = useState(0);

  const [homeworks, setHomeworks] = useState([]);
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchUserLevel = async () => {
      try {
        const response = await api.get(`/user-levels/current/${user.id}`);
        setUserLevel(response.data.current_level);
        setNextLevel(response.data.next_level);
        setUserExperience(response.data.current_xp || 0);
      } catch (error) {
        console.error("Ошибка получения уровня:", error);
      }
    };

    fetchUserLevel();
  }, [user?.id]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchAppliedCosmetics();
  }, [user?.avatar_frame, user?.profile_banner]);

  const fetchAppliedCosmetics = async () => {
    try {
      const response = await api.get("/shop/items");
      const items = response.data.items;

      if (user?.avatar_frame && user.avatar_frame !== "none") {
        const frame = items.find((item) => item.item_key === user.avatar_frame);
        setAppliedFrame(frame);
      } else {
        setAppliedFrame(null);
      }

      if (user?.profile_banner && user.profile_banner !== "default") {
        const banner = items.find((item) => item.item_key === user.profile_banner);
        setAppliedBanner(banner);
      } else {
        setAppliedBanner(null);
      }
    } catch (error) {
      console.error("Ошибка загрузки косметики:", error);
    }
  };

  const fetchUserLevel = async () => {
    try {
      if (!user?.id) return;
      const response = await api.get(`/user-levels/current/${user.id}`);
      setUserLevel(response.data.current_level);
      setNextLevel(response.data.next_level);
      setUserExperience(response.data.current_xp || 0);
    } catch (error) {
      console.error("Ошибка получения уровня:", error);
    }
  };

  const fetchGroupInfo = async () => {
    try {
      if (!user?.group_id) return;

      const response = await api.get(`/groups/${user.group_id}`);
      setGroupInfo(response.data.group);
    } catch (error) {
      console.error("Ошибка получения группы:", error);
    }
  };

  useEffect(() => {
    fetchUserLevel();
  }, [user?.id]);

  useEffect(() => {
    fetchGroupInfo();
  }, [user]);

  useEffect(() => {
    const fetchHomeworks = async () => {
      try {
        const res = await api.get("/homeworks/student/assigned");
        setHomeworks(res.data.homeworks || []);
      } catch (e) {}
    };
    fetchHomeworks();
  }, []);

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        const res = await api.get("/updates");
        setUpdates(res.data.updates?.slice(0, 4) || []);
      } catch (e) {}
    };
    fetchUpdates();
  }, []);

  // XP progress percentage
  const xpPercent =
    nextLevel?.experience_required && userExperience >= 0
      ? Math.min(100, Math.round((userExperience / nextLevel.experience_required) * 100))
      : 100;

  const quickActions = [
    { icon: FaBookOpen,    label: t("courses"),   path: "/student/courses",   color: "#6366f1" },
    { icon: FaCalendarAlt, label: t("schedule"),  path: "/student/schedule",  color: "#0ea5e9" },
    { icon: FaClipboardList, label: t("tests"),   path: "/student/tests",     color: "#f59e0b" },
    { icon: FaTasks,       label: t("homeworks"), path: "/student/homeworks", color: "#10b981" },
    { icon: FaShoppingBag, label: t("shop"),      path: "/student/shop",      color: "#ec4899" },
    { icon: FaGamepad,     label: t("games"),     path: "/student/games",     color: "#8b5cf6" },
  ];

  const pendingHW = homeworks.filter(h => !h.submission_status || h.submission_status === "pending");

  return (
    <div className={styles["student-page"]}>
      {/* ===== БЛОК ПРОФИЛЯ ===== */}
      <div className={styles["student-info"]}>

        {/* --- Аватар + имя --- */}
        <div className={styles["student-info-first"]}>
          {user?.avatar_url ? (
            <img
              className={styles["dashboard-page-header-avatar"]}
              src={`${BASE_URL}${user.avatar_url}`}
              alt={user.username}
            />
          ) : (
            <div
              className={styles["dashboard-page-header-avatar"]}
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "clamp(28px, 3vw, 42px)",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              {(user?.full_name || user?.username || "U").charAt(0).toUpperCase()}
            </div>
          )}
          {appliedFrame?.image_url && (
            <img
              className={styles["dashboard-page-header-frame"]}
              src={`${BASE_URL}${appliedFrame.image_url}`}
              alt="Frame"
            />
          )}

          <div className={styles["dashboard-page-username"]}>
            <h1>{user?.full_name || user?.username}</h1>
            <p>{user?.email}</p>
            <p>{new Date(user?.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</p>
            {groupInfo?.name && (
              <span className={styles["username-badge"]}>
                {t("inagroup")}: {groupInfo.name}
              </span>
            )}
          </div>
        </div>

        {/* --- Баллы --- */}
        <div className={styles["dashboard-page-points"]}>
          <div className={styles["mini-stat"]}>
            <div className={styles["mini-stat-icon"]}><FaBitcoin /></div>
            <div className={styles["mini-stat-body"]}>
              <div className={styles["mini-stat-value"]}>{user?.points ?? 0}</div>
              <div className={styles["mini-stat-label"]}>{t("mypoints")}</div>
            </div>
          </div>
        </div>

        {/* --- Уровень --- */}
        <div className={styles["dashboard-page-level"]}>
          <div className={styles["mini-stat"]}>
            <div className={styles["mini-stat-icon"]}>
              {userLevel?.image_url ? (
                <img
                  src={userLevel.image_url.startsWith("http") ? userLevel.image_url : `${BASE_URL}${userLevel.image_url}`}
                  alt={`${t("level")} ${userLevel.level_number}`}
                  style={{ width: 28, height: 28, objectFit: "contain" }}
                />
              ) : (
                <SiLevelsdotfyi />
              )}
            </div>
            <div className={styles["mini-stat-body"]}>
              <div className={styles["mini-stat-value"]}>
                {t("level")} {userLevel?.level_number ?? 1}
              </div>
              <div className={styles["mini-stat-label"]}>
                {userExperience}{nextLevel ? ` / ${nextLevel.experience_required} XP` : ""}
              </div>
              {nextLevel && (
                <div className={styles["xp-bar-wrap"]}>
                  <div className={styles["xp-bar-track"]}>
                    <div
                      className={styles["xp-bar-fill"]}
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- Задани мини-стат --- */}
        <div className={styles["div1_4"]}>
          <div className={styles["mini-stat"]}>
            <div className={styles["mini-stat-icon"]}><FaTasks /></div>
            <div className={styles["mini-stat-body"]}>
              <div className={styles["mini-stat-value"]}>{pendingHW.length}</div>
              <div className={styles["mini-stat-label"]}>{t("pending")}</div>
            </div>
          </div>
        </div>

        {/* --- Время --- */}
        <div className={styles["div1_5"]}>
          <div className={styles["mini-stat"]}>
            <div className={styles["mini-stat-icon"]}><FaClock /></div>
            <div className={styles["mini-stat-body"]}>
              <div className={styles["mini-stat-value"]}>
                {currentTime.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className={styles["mini-stat-label"]}>
                {currentTime.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== БЫСТРЫЕ ДЕЙСТВИЯ ===== */}
      <div className={styles["div2"]}>
        <div className={styles["widget-header"]}>
          <span className={styles["widget-title"]}>{t("quickactions")}</span>
        </div>
        <div className={styles["quick-actions"]}>
          {quickActions.map(({ icon: Icon, label, path, color }) => (
            <button
              key={path}
              className={styles["action-card"]}
              onClick={() => navigate(path)}
            >
              <div className={styles["action-icon"]} style={{ color, background: `${color}18` }}>
                <Icon />
              </div>
              <span className={styles["action-label"]}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ===== ЗАДАНИЯ + РАСПИСАНИЕ ===== */}
      <div className={styles["div3"]}>
        {/* Домашние задания */}
        <div className={styles["section-col"]}>
          <div className={styles["widget-header"]}>
            <span className={styles["widget-title"]}><FaFileAlt /> {t("homeworks")}</span>
            <button className={styles["view-all-btn"]} onClick={() => navigate("/student/homeworks")}>
              {t("viewall")} <FaAngleRight />
            </button>
          </div>
          {pendingHW.length === 0 ? (
            <div className={styles["empty-state"]}>
              <FaCheckCircle />
              <span>{t("nohomeworks")}</span>
            </div>
          ) : (
            pendingHW.slice(0, 4).map(hw => (
              <div key={hw.id} className={styles["hw-item"]}>
                <div className={styles["hw-dot"]} />
                <div className={styles["hw-info"]}>
                  <div className={styles["hw-title"]}>{hw.title}</div>
                  {hw.deadline && (
                    <div className={styles["hw-due"]}>
                      <FaClock />
                      {new Date(hw.deadline).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                    </div>
                  )}
                </div>
                <div className={`${styles["hw-badge"]} ${styles[`hw-badge--${hw.submission_status || "pending"}`]}`}>
                  {hw.submission_status === "submitted" ? t("submitted")
                    : hw.submission_status === "checked" ? t("graded")
                    : t("pending")}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Календарь расписания */}
        <div className={styles["section-col"]}>
          <div className={styles["widget-header"]}>
            <span className={styles["widget-title"]}><FaCalendarAlt /> {t("schedule")}</span>
            <button className={styles["view-all-btn"]} onClick={() => navigate("/student/schedule")}>
              {t("viewall")} <FaAngleRight />
            </button>
          </div>
          <DashboardCalendar />
        </div>
      </div>

      {/* ===== ПОСЛЕДНИЕ ОБНОВЛЕНИЯ ===== */}
      <div className={styles["div4"]}>
        <div className={styles["widget-header"]}>
          <span className={styles["widget-title"]}><FaBell /> {t("recentupdates")}</span>
        </div>
        {updates.length === 0 ? (
          <div className={styles["empty-state"]}>
            <FaBell />
            <span>{t("noupdates")}</span>
          </div>
        ) : (
          updates.map(u => (
            <div key={u.id} className={styles["update-item"]}>
              <div className={styles["update-version"]}>v{u.version}</div>
              <div className={styles["update-info"]}>
                <div className={styles["update-title"]}>{u.title}</div>
                <div className={styles["update-date"]}>
                  {new Date(u.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default StudentHome;
