import { useAuth } from "../../context/AuthContext";
import api, { BASE_URL } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { AiOutlineWallet, AiOutlineUsergroupAdd, AiOutlineBook, AiOutlineFileText, AiOutlineBarChart, AiOutlineStar, AiOutlineCode, AiOutlineMessage, AiOutlineShoppingCart, AiOutlineThunderbolt, AiOutlineCalendar, AiOutlineTrophy, AiOutlineFire, AiOutlineClockCircle, AiOutlineCheckCircle } from "react-icons/ai";
import { FaChess, FaGamepad, FaKeyboard } from "react-icons/fa";
import styles from "../StudentDashboard.module.css";

function StudentHome() {
  const { user } = useAuth();

  const [groupInfo, setGroupInfo] = useState(null);

  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  const [userLevel, setUserLevel] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const quickActions = [
    { icon: <AiOutlineCalendar />, label: "Расписание", path: "/student/schedule", color: "#332929" },
    { icon: <AiOutlineMessage />, label: "Чат", path: "/student/chat", color: "#332929" },
    { icon: <AiOutlineShoppingCart />, label: "Магазин", path: "/student/shop", color: "#332929" },
    { icon: <FaGamepad />, label: "Игры", path: "/student/games", color: "#332929" },
    { icon: <AiOutlineBook />, label: "База знаний", path: "/student/knowledge", color: "#332929" },
    { icon: <FaKeyboard />, label: "Тренажёр", path: "/student/typing", color: "#332929" },
  ];

  const recentActivity = [
    { icon: <AiOutlineCheckCircle />, text: "Выполнено заданий", count: 5, color: "#332929" },
    { icon: <AiOutlineTrophy />, text: "Получено наград", count: 3, color: "#332929" },
    { icon: <AiOutlineFire />, text: "Дней подряд", count: 7, color: "#332929" },
  ];

  const upcomingEvents = [
    { time: "10:00", title: "Лекция по JavaScript", type: "lecture" },
    { time: "14:30", title: "Дедлайн проекта", type: "deadline" },
    { time: "16:00", title: "Тестирование", type: "test" },
  ];

  const fetchUserLevel = async () => {
    try {
      if (!user?.id) return;

      const response = await api.get(`/user-levels/current/${user.id}`);

      setUserLevel(response.data.current_level);
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

  return (
    <div className={styles["student-page"]}>
      <div className={styles["dashboard-page-header"]}>
        <div>
          <h1>Привет, {user?.full_name || user?.username}! 👋</h1>
          <p>Добро пожаловать в систему обучения OpenWay</p>
        </div>
        <div className={styles["header-time"]}>
          <AiOutlineClockCircle />
          <span>{currentTime.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
        </div>
      </div>

      {/* Статистика */}
      <div className={styles["stats-banner"]}>
        <div className={styles["dashboard-stat-item"]}>
          <div className={styles["stat-icon"]}>
            <AiOutlineWallet />
          </div>
          <div className={styles["dashboard-stat-content"]}>
            <div className={styles["dashboard-stat-value"]}>{user?.points || 0}</div>
            <div className={styles["dashboard-stat-label"]}>Мои баллы</div>
          </div>
        </div>
        <div className={styles["dashboard-stat-item"]}>
          <div className={styles["stat-icon"]}>
            <AiOutlineUsergroupAdd />
          </div>
          <div className={styles["dashboard-stat-content"]}>
            <div className={styles["dashboard-stat-value"]}>{user?.group_id ? "В группе" : "Нет группы"}</div>
            <div className={styles["dashboard-stat-label"]}>{groupInfo?.name}</div>
          </div>
        </div>
        <div className={styles["dashboard-stat-item"]}>
          <div className={styles["stat-icon"]}>
            <AiOutlineThunderbolt />
          </div>
          {userLevel && (
            <div className={styles["dashboard-stat-content"]}>
              <div className={styles["dashboard-stat-value"]}>{userLevel.level_number}</div>
              <div className={styles["dashboard-stat-label"]}>Уровень</div>
            </div>
          )}
        </div>
      </div>

      {/* Быстрые действия */}
      <div className={styles["section-card"]}>
        <h2 className={styles["section-title"]}>
          <AiOutlineThunderbolt /> Быстрые действия
        </h2>
        <div className={styles["quick-actions-grid"]}>
          {quickActions.map((action, index) => (
            <div key={index} className={styles["quick-action-btn"]} onClick={() => navigate(action.path)} style={{ "--action-color": action.color }}>
              <div className={styles["quick-action-icon"]}>{action.icon}</div>
              <span>{action.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles["two-column-layout"]}>
        {/* Последняя активность */}
        <div className={styles["section-card"]}>
          <h2 className={styles["section-title"]}>
            <AiOutlineFire /> Твоя активность
          </h2>
          <div className={styles["activity-list"]}>
            {recentActivity.map((activity, index) => (
              <div key={index} className={styles["activity-item"]}>
                <div className={styles["activity-icon"]} style={{ color: activity.color }}>
                  {activity.icon}
                </div>
                <div className={styles["activity-content"]}>
                  <span className={styles["activity-text"]}>{activity.text}</span>
                  <span className={styles["activity-count"]}>{activity.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* События */}
        <div className={styles["section-card"]}>
          <h2 className={styles["section-title"]}>
            <AiOutlineCalendar /> Сегодня
          </h2>
          <div className={styles["events-list"]}>
            {upcomingEvents.map((event, index) => (
              <div key={index} className={styles["event-item"]}>
                <div className={styles["event-time"]}>{event.time}</div>
                <div className={styles["event-details"]}>
                  <span className={styles["event-title"]}>{event.title}</span>
                  <span className={`${styles["event-type"]} ${styles[event.type]}`}>
                    {event.type === "lecture" && "Лекция"}
                    {event.type === "deadline" && "Дедлайн"}
                    {event.type === "test" && "Тест"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentHome;
