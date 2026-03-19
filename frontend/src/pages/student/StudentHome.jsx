import { useAuth } from "../../context/AuthContext";
import api, { BASE_URL } from "../../utils/api";
import { getFrameStyle } from "../../utils/frameUtils";
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
    <div className={styles.page}>

      {/* ===== LEFT: PROFILE CARD ===== */}
      <aside className={styles.profileCard}>
        <div
          className={styles.profileBanner}
          style={
            appliedBanner?.image_url
              ? { backgroundImage: `url(${BASE_URL}${appliedBanner.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        />
        <div className={styles.profileBody}>
          <div className={styles.avatarWrap}>
            {user?.avatar_url ? (
              <img
                className={styles.profileAvatar}
                src={`${BASE_URL}${user.avatar_url}`}
                alt={user.username}
              />
            ) : (
              <div
                className={styles.profileAvatar}
                style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {(user?.full_name || user?.username || "U").charAt(0).toUpperCase()}
              </div>
            )}
            {appliedFrame?.image_url && (
              <img
                className={styles.profileFrame}
                src={`${BASE_URL}${appliedFrame.image_url}`}
                alt="Frame"
                style={getFrameStyle(appliedFrame, "home")}
              />
            )}
          </div>

          <div className={styles.profileMeta}>
            <h2 className={styles.profileName}>{user?.full_name || user?.username}</h2>
            <p className={styles.profileEmail}>{user?.email}</p>
            {groupInfo?.name && (
              <span className={styles.groupBadge}>{t("inagroup")}: {groupInfo.name}</span>
            )}
          </div>

          <div className={styles.statsStack}>
            {/* Баллы */}
            <div className={styles.statRow}>
              <div className={styles.statIcon} style={{ background: "rgba(234,179,8,0.12)", color: "#ca8a04" }}>
                <FaBitcoin />
              </div>
              <div className={styles.statBody}>
                <span className={styles.statValue}>{user?.points ?? 0}</span>
                <span className={styles.statLabel}>{t("mypoints")}</span>
              </div>
            </div>

            {/* Уровень */}
            <div className={styles.statRow}>
              <div className={styles.statIcon} style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                {userLevel?.image_url ? (
                  <img
                    src={userLevel.image_url.startsWith("http") ? userLevel.image_url : `${BASE_URL}${userLevel.image_url}`}
                    alt="level"
                    style={{ width: 20, height: 20, objectFit: "contain" }}
                  />
                ) : (
                  <SiLevelsdotfyi />
                )}
              </div>
              <div className={styles.statBody}>
                <span className={styles.statValue}>{t("level")} {userLevel?.level_number ?? 1}</span>
                <span className={styles.statLabel}>{userExperience}{nextLevel ? ` / ${nextLevel.experience_required} XP` : ""}</span>
                {nextLevel && (
                  <div className={styles["xp-bar-wrap"]}>
                    <div className={styles["xp-bar-track"]}>
                      <div className={styles["xp-bar-fill"]} style={{ width: `${xpPercent}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Задания */}
            <div className={styles.statRow}>
              <div className={styles.statIcon} style={{ background: "rgba(16,185,129,0.12)", color: "#059669" }}>
                <FaTasks />
              </div>
              <div className={styles.statBody}>
                <span className={styles.statValue}>{pendingHW.length}</span>
                <span className={styles.statLabel}>{t("pending")}</span>
              </div>
            </div>

            {/* Время */}
            <div className={styles.statRow}>
              <div className={styles.statIcon} style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1" }}>
                <FaClock />
              </div>
              <div className={styles.statBody}>
                <span className={styles.statValue}>
                  {currentTime.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className={styles.statLabel}>
                  {currentTime.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ===== CENTER: QUICK ACTIONS + HOMEWORKS ===== */}
      <div className={styles.centerCol}>
        <div className={styles.widget}>
          <div className={styles["widget-header"]}>
            <span className={styles["widget-title"]}>{t("quickactions")}</span>
          </div>
          <div className={styles["quick-actions"]}>
            {quickActions.map(({ icon: Icon, label, path, color }) => (
              <button key={path} className={styles["action-card"]} onClick={() => navigate(path)}>
                <div className={styles["action-icon"]} style={{ color, background: `${color}18` }}>
                  <Icon />
                </div>
                <span className={styles["action-label"]}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.widget}>
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
            pendingHW.slice(0, 5).map(hw => (
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
      </div>

      {/* ===== RIGHT: CALENDAR + UPDATES ===== */}
      <div className={styles.rightCol}>
        <div className={styles.widget}>
          <div className={styles["widget-header"]}>
            <span className={styles["widget-title"]}><FaCalendarAlt /> {t("schedule")}</span>
            <button className={styles["view-all-btn"]} onClick={() => navigate("/student/schedule")}>
              {t("viewall")} <FaAngleRight />
            </button>
          </div>
          <DashboardCalendar />
        </div>

        <div className={styles.widget}>
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

    </div>
  );
}

export default StudentHome;
