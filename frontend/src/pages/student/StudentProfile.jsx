import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api, { BASE_URL } from "../../utils/api";
import styles from "./StudentProfile.module.css";
import { AiOutlineWallet, AiOutlineHistory, AiOutlineTrophy, AiOutlineFire, AiOutlineRise, AiOutlineCalendar, AiOutlineCode, AiOutlineCheckCircle, AiOutlineStar, AiOutlineThunderbolt, AiOutlineLineChart, AiOutlineClockCircle, AiOutlineExclamationCircle, AiOutlineArrowUp, AiOutlineArrowDown, AiOutlineClose, AiOutlineAppstore, AiOutlineEye, AiOutlineFileText, AiOutlineFileDone, AiOutlineReload, AiOutlineCheck, AiOutlineHeart, AiOutlineRocket, AiOutlineWarning, AiOutlineSchedule, AiOutlineFileProtect, AiOutlineDollar, AiOutlinePlayCircle, AiOutlineBook, AiOutlineRead, AiOutlineGlobal, AiOutlineRobot, AiOutlineCrown, AiOutlineFunction, AiOutlineFieldNumber, AiOutlineShopping, AiOutlineShoppingCart, AiOutlineBorder, AiOutlinePicture, AiOutlineCompass, AiOutlineOrderedList, AiOutlineLock } from "react-icons/ai";
import { FaMedal, FaCrown, FaGem, FaCode, FaLaptopCode, FaUserTie, FaKeyboard, FaHtml5, FaCss3Alt, FaCoins, FaGamepad, FaFire, FaShieldAlt, FaGraduationCap, FaUniversity, FaRocket, FaChess, FaChessKing, FaChessQueen, FaChessKnight, FaChild, FaUser, FaCalendarAlt } from "react-icons/fa";
import { SiJavascript, SiNamesilo } from "react-icons/si";
import { MdOutlineViewModule, MdOutlineQuiz, MdMail } from "react-icons/md";
import { BsGrid3X3Gap, BsGridFill, BsGrid1X2Fill, BsLightningChargeFill, BsMoonStars, BsSunrise, BsKeyboardFill } from "react-icons/bs";
import { GiBlackBelt, GiPokerHand, GiCardRandom, GiCardAceHearts, GiHearts, GiSpades, GiTwoCoins, GiPartyPopper } from "react-icons/gi";
import { IoGameController } from "react-icons/io5";
import { FaBrain } from "react-icons/fa6";
import { CiUser } from "react-icons/ci";
import "../../styles/UsernameStyles.css";
import PointsHistory from "../../components/PointsHistory";

function StudentProfile() {
  const { user, updateUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [userExperience, setUserExperience] = useState(0);
  const [appliedFrame, setAppliedFrame] = useState(null);
  const [appliedBanner, setAppliedBanner] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [userLevel, setUserLevel] = useState(null);
  const [nextLevel, setNextLevel] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [allActivity, setAllActivity] = useState([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [userStats, setUserStats] = useState({
    completedTasks: 0,
    totalProjects: 0,
    streak: 0,
    rank: 0,
  });
  const [achievements, setAchievements] = useState([]);
  const [achievementsTotal, setAchievementsTotal] = useState(0);
  const [achievementsEarned, setAchievementsEarned] = useState(0);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [lessonNotes, setLessonNotes] = useState([]);
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    fetchUserPoints();
    refreshUserData();
    fetchAppliedCosmetics();
    fetchUserStats();
    fetchUserLevel();
    fetchRecentActivity();
    fetchAchievements();
    fetchLessonNotes();
    fetchAttendance();
  }, []);

  useEffect(() => {
    fetchAppliedCosmetics();
  }, [user?.avatar_frame, user?.profile_banner]);

  const fetchUserPoints = async () => {
    try {
      const response = await api.get("/points/my");
      setUserPoints(response.data.totalPoints || 0);
    } catch (error) {
      console.error("Ошибка получения баллов:", error);
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

  const fetchUserStats = async () => {
    // В будущем это будет реальный API запрос
    // Пока используем моковые данные
    setUserStats({
      completedTasks: 42,
      totalProjects: 15,
      streak: 7,
      rank: 5,
    });
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await api.get("/points/activity?limit=5");
      setRecentActivity(response.data.activities || []);
    } catch (error) {
      console.error("Ошибка получения активности:", error);
    }
  };

  const fetchAchievements = async () => {
    try {
      setAchievementsLoading(true);

      // Сначала проверяем новые достижения
      await api.post("/achievements/check");

      // Затем загружаем все достижения
      const response = await api.get("/achievements");
      setAchievements(response.data.achievements || []);
      setAchievementsTotal(response.data.total || 0);
      setAchievementsEarned(response.data.earned || 0);
    } catch (error) {
      console.error("Ошибка получения достижений:", error);
    } finally {
      setAchievementsLoading(false);
    }
  };

  const fetchLessonNotes = async () => {
    try {
      const response = await api.get("/schedule/my-notes");
      setLessonNotes(response.data || []);
    } catch (error) {
      console.error("Ошибка получения примечаний:", error);
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await api.get("/schedule/my-attendance");
      setAttendance(response.data || []);
    } catch (error) {
      console.error("Ошибка получения посещаемости:", error);
    }
  };

  const getAttendanceStatusLabel = (status) => {
    switch (status) {
      case "present":
        return { label: "Присутствовал", color: "#22c55e" };
      case "absent":
        return { label: "Отсутствовал", color: "#ef4444" };
      case "late":
        return { label: "Опоздал", color: "#f59e0b" };
      case "excused":
        return { label: "Пропуск по причине", color: "#6b7280" };
      default:
        return { label: "Не отмечен", color: "#888" };
    }
  };

  // Маппинг иконок по имени
  const iconMap = {
    AiOutlineCheckCircle: <AiOutlineCheckCircle />,
    AiOutlineStar: <AiOutlineStar />,
    AiOutlineCrown: <AiOutlineCrown />,
    AiOutlineThunderbolt: <AiOutlineThunderbolt />,
    AiOutlineTrophy: <AiOutlineTrophy />,
    AiOutlineCheck: <AiOutlineCheck />,
    AiOutlineClockCircle: <AiOutlineClockCircle />,
    AiOutlineReload: <AiOutlineReload />,
    AiOutlineFileText: <AiOutlineFileText />,
    AiOutlineFileDone: <AiOutlineFileDone />,
    AiOutlineFileProtect: <AiOutlineFileProtect />,
    AiOutlineSchedule: <AiOutlineSchedule />,
    AiOutlineWarning: <AiOutlineWarning />,
    AiOutlineRocket: <AiOutlineRocket />,
    AiOutlinePlayCircle: <AiOutlinePlayCircle />,
    AiOutlineEye: <AiOutlineEye />,
    AiOutlineBook: <AiOutlineBook />,
    AiOutlineRead: <AiOutlineRead />,
    AiOutlineAppstore: <AiOutlineAppstore />,
    AiOutlineRobot: <AiOutlineRobot />,
    AiOutlineGlobal: <AiOutlineGlobal />,
    AiOutlineHeart: <AiOutlineHeart />,
    AiOutlineCode: <AiOutlineCode />,
    AiOutlineFunction: <AiOutlineFunction />,
    AiOutlineFire: <AiOutlineFire />,
    AiOutlineRise: <AiOutlineRise />,
    AiOutlineLineChart: <AiOutlineLineChart />,
    AiOutlineDollar: <AiOutlineDollar />,
    AiOutlineWallet: <AiOutlineWallet />,
    AiOutlineShoppingCart: <AiOutlineShoppingCart />,
    AiOutlineShopping: <AiOutlineShopping />,
    AiOutlineBorder: <AiOutlineBorder />,
    AiOutlinePicture: <AiOutlinePicture />,
    AiOutlineCalendar: <AiOutlineCalendar />,
    AiOutlineOrderedList: <AiOutlineOrderedList />,
    AiOutlineFieldNumber: <AiOutlineFieldNumber />,
    AiOutlineCompass: <AiOutlineCompass />,
    FaMedal: <FaMedal />,
    FaCrown: <FaCrown />,
    FaGem: <FaGem />,
    FaCode: <FaCode />,
    FaLaptopCode: <FaLaptopCode />,
    FaUserTie: <FaUserTie />,
    FaKeyboard: <FaKeyboard />,
    FaHtml5: <FaHtml5 />,
    FaCss3Alt: <FaCss3Alt />,
    FaCoins: <FaCoins />,
    FaGamepad: <FaGamepad />,
    FaFire: <FaFire />,
    FaShieldAlt: <FaShieldAlt />,
    FaGraduationCap: <FaGraduationCap />,
    FaUniversity: <FaUniversity />,
    FaRocket: <FaRocket />,
    FaChess: <FaChess />,
    FaChessKing: <FaChessKing />,
    FaChessQueen: <FaChessQueen />,
    FaChessKnight: <FaChessKnight />,
    FaChild: <FaChild />,
    FaTrophy: <FaMedal />,
    FaBrain: <FaBrain />,
    SiJavascript: <SiJavascript />,
    MdOutlineViewModule: <MdOutlineViewModule />,
    MdOutlineQuiz: <MdOutlineQuiz />,
    BsGrid3X3Gap: <BsGrid3X3Gap />,
    BsGridFill: <BsGridFill />,
    BsGrid1X2Fill: <BsGrid1X2Fill />,
    BsLightningChargeFill: <BsLightningChargeFill />,
    BsMoonStars: <BsMoonStars />,
    BsSunrise: <BsSunrise />,
    BsKeyboardFill: <BsKeyboardFill />,
    GiBlackBelt: <GiBlackBelt />,
    GiPokerHand: <GiPokerHand />,
    GiCardRandom: <GiCardRandom />,
    GiCardAceHearts: <GiCardAceHearts />,
    GiHearts: <GiHearts />,
    GiSpades: <GiSpades />,
    GiTwoCoins: <GiTwoCoins />,
    GiPartyPopper: <GiPartyPopper />,
    IoGameController: <IoGameController />,
  };

  const getAchievementIcon = (iconName) => {
    return iconMap[iconName] || <AiOutlineTrophy />;
  };

  const categories = [
    { id: "all", name: "Все", icon: <AiOutlineAppstore /> },
    { id: "tests", name: "Тесты", icon: <AiOutlineCheckCircle /> },
    { id: "homework", name: "Домашка", icon: <AiOutlineFileText /> },
    { id: "courses", name: "Курсы", icon: <AiOutlineBook /> },
    { id: "chess", name: "Шахматы", icon: <FaChess /> },
    { id: "flexchan", name: "FlexChan", icon: <BsGridFill /> },
    { id: "jsgame", name: "JavaScript", icon: <SiJavascript /> },
    { id: "layout", name: "Верстка", icon: <FaHtml5 /> },
    { id: "quiz", name: "Викторина", icon: <MdOutlineQuiz /> },
    { id: "poker", name: "Покер", icon: <GiPokerHand /> },
    { id: "typing", name: "Печать", icon: <FaKeyboard /> },
    { id: "shop", name: "Магазин", icon: <AiOutlineShoppingCart /> },
    { id: "economy", name: "Экономика", icon: <FaCoins /> },
    { id: "ranking", name: "Рейтинг", icon: <FaMedal /> },
    { id: "streak", name: "Серии", icon: <AiOutlineFire /> },
    { id: "games", name: "Игры", icon: <IoGameController /> },
    { id: "secret", name: "Секретные", icon: <AiOutlineLock /> },
  ];

  const getRarityStyle = (rarity) => {
    const rarityStyles = {
      common: { border: "2px solid #9e9e9e", boxShadow: "0 0 10px rgba(158,158,158,0.3)" },
      rare: { border: "2px solid #2196F3", boxShadow: "0 0 10px rgba(33,150,243,0.4)" },
      epic: { border: "2px solid #9C27B0", boxShadow: "0 0 15px rgba(156,39,176,0.5)" },
      legendary: { border: "2px solid #FFD700", boxShadow: "0 0 20px rgba(255,215,0,0.6)" },
      mythic: { border: "2px solid #E91E63", boxShadow: "0 0 25px rgba(233,30,99,0.7)", animation: "glow 2s ease-in-out infinite" },
    };
    return rarityStyles[rarity] || rarityStyles.common;
  };

  const getRarityLabel = (rarity) => {
    const labels = {
      common: "Обычное",
      rare: "Редкое",
      epic: "Эпическое",
      legendary: "Легендарное",
      mythic: "Мифическое",
    };
    return labels[rarity] || "Обычное";
  };

  const filteredAchievements = selectedCategory === "all" ? achievements : achievements.filter((a) => a.category === selectedCategory);

  const fetchAllActivity = async (page = 1) => {
    try {
      setLoadingActivity(true);
      const response = await api.get(`/points/activity?page=${page}&limit=10`);
      setAllActivity(response.data.activities || []);
      setActivityTotalPages(response.data.pagination?.totalPages || 1);
      setActivityPage(page);
    } catch (error) {
      console.error("Ошибка получения активности:", error);
    } finally {
      setLoadingActivity(false);
    }
  };

  const openActivityModal = () => {
    setShowActivityModal(true);
    fetchAllActivity(1);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "test":
        return <AiOutlineCheckCircle />;
      case "homework_done":
        return <AiOutlineCode />;
      case "homework_late":
        return <AiOutlineExclamationCircle />;
      case "flexchan":
        return <MdOutlineViewModule />;
      case "jsgame":
        return <SiJavascript />;
      case "rank_up":
        return <AiOutlineArrowUp />;
      case "rank_down":
        return <AiOutlineArrowDown />;
      default:
        return <AiOutlineCalendar />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case "test":
        return "#4CAF50";
      case "homework_done":
        return "#2196F3";
      case "homework_late":
        return "#f44336";
      case "flexchan":
        return "#9C27B0";
      case "jsgame":
        return "#F7DF1E";
      case "rank_up":
        return "#4CAF50";
      case "rank_down":
        return "#f44336";
      default:
        return "#667eea";
    }
  };

  const formatActivityDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Только что";
    if (minutes < 60) return `${minutes} мин. назад`;
    if (hours < 24) return `${hours} ч. назад`;
    if (days < 7) return `${days} дн. назад`;

    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const refreshUserData = async () => {
    try {
      const response = await api.get("/auth/me");
      if (response.data.user) {
        updateUser(response.data.user);
      }
    } catch (error) {
      console.error("Ошибка обновления данных пользователя:", error);
    }
  };

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

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Проверка типа файла
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        alert("Неверный формат файла. Разрешены только изображения (JPEG, PNG, GIF, WebP)");
        e.target.value = "";
        return;
      }

      // Проверка размера файла (5MB = 5 * 1024 * 1024 байт)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert("Размер файла слишком большой. Максимальный размер: 5 МБ");
        e.target.value = ""; // Сброс input
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("avatar", selectedFile);

      const response = await api.post("/users/me/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Обновляем данные пользователя в контексте
      const updatedUser = { ...user, avatar_url: response.data.avatar_url };
      updateUser(updatedUser);

      setPreview(null);
      setSelectedFile(null);
      alert("Аватар успешно обновлен!");
    } catch (error) {
      console.error("Ошибка загрузки аватара:", error);
      alert(error.response?.data?.error || "Ошибка загрузки аватара");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles["student-page"]}>
      <div className={styles["page-header"]}>
        <h1>Мой профиль</h1>
        <div className={styles["header-actions"]}>
          <button className={styles["history-btn"]} onClick={() => setShowHistory(true)} title="История транзакций">
            <AiOutlineHistory />
            <span>История баллов</span>
          </button>
          <div className={styles["user-points"]}>
            <span className={styles["points-icon"]}>
              <AiOutlineWallet />
            </span>
            <span className={styles["dashboard-points-value"]}>{userPoints}</span>
            <span className={styles["points-label"]}>баллов</span>
          </div>
        </div>
      </div>

      <div className={styles["profile-card"]}>
        <div
          className={styles["profile-avatar-section"]}
          style={{
            backgroundImage: appliedBanner?.image_url ? `url(${BASE_URL}${appliedBanner.image_url})` : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className={styles["avatar-wrapper"]}>
            {preview || user?.avatar_url ? <img src={preview || `${BASE_URL}${user.avatar_url}`} alt={user.username} className={styles["profile-avatar"]} /> : <div className={styles["profile-avatar-placeholder"]}>{(user?.full_name || user?.username || "U").charAt(0).toUpperCase()}</div>}
            {appliedFrame?.image_url && <img src={`${BASE_URL}${appliedFrame.image_url}`} alt="Frame" className={styles["avatar-frame-overlay"]} />}
          </div>

          <div className={styles["avatar-upload"]}>
            <label className={styles["avatar-upload-btn"]}>
              {uploading ? "Загрузка..." : "Выбрать фото"}
              <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploading} style={{ display: "none" }} />
            </label>
            {preview && (
              <button className={styles["avatar-upload-confirm"]} onClick={handleAvatarUpload} disabled={uploading}>
                Сохранить
              </button>
            )}
          </div>
        </div>

        <div className={styles["profile-flex-container"]}>
          <div className={styles["profile-info-section"]}>
            <h2 className={styles["section-title"]}>
              <CiUser /> Информация о профиле
            </h2>
            <div className={styles["profile-info-container"]}>
              <div className={styles["info-row"]}>
                <span className={styles["info-label"]}>
                  <FaUser /> Имя пользователя:
                </span>
                <span className={`${styles["info-value"]} styled-username ${user?.username_style || "username-none"}`}>{user?.username}</span>
              </div>
              <div className={styles["info-row"]}>
                <span className={styles["info-label"]}>
                  <MdMail /> Email:
                </span>
                <span className={styles["info-value"]}>{user?.email}</span>
              </div>
              <div className={styles["info-row"]}>
                <span className={styles["info-label"]}>
                  <SiNamesilo /> ФИО:
                </span>
                <span className={styles["info-value"]}>{user?.full_name || "Не указано"}</span>
              </div>
              <div className={styles["info-row"]}>
                <span className={styles["info-label"]}>
                  <FaCalendarAlt /> Дата рождения:
                </span>
                <span className={styles["info-value"]}>{new Date(user?.created_at).toLocaleDateString("ru-RU")}</span>
              </div>
            </div>
          </div>
          {/* Уровень и опыт */}
          <div className={styles["level-section"]}>
            <h2 className={styles["section-title"]}>
              <AiOutlineStar /> Уровень и опыт
            </h2>
            <div className={styles["level-card"]}>
              <div className={styles["level-info"]}>
                {userLevel?.image_url ? (
                  <img src={userLevel.image_url.startsWith("http") ? userLevel.image_url : `${BASE_URL}${userLevel.image_url}`} alt={`Уровень ${userLevel.level_number}`} className={styles["level-image"]} />
                ) : (
                  <div className={styles["level-number"]}>
                    <span className={styles["level-label"]}>Уровень</span>
                    <span className={styles["level-value"]}>{userLevel?.level_number || 1}</span>
                  </div>
                )}
                {userLevel?.rank_name && <div className={styles["rank-name"]}>{userLevel.rank_name}</div>}
              </div>

              <div className={styles["xp-section"]}>
                <div className={styles["xp-header"]}>
                  <span className={styles["xp-current"]}>{userExperience.toLocaleString()} XP</span>
                  {nextLevel && <span className={styles["xp-next"]}>/ {nextLevel.experience_required.toLocaleString()} XP</span>}
                </div>

                {nextLevel && (
                  <>
                    <div className={styles["xp-bar"]}>
                      <div
                        className={styles["xp-fill"]}
                        style={{
                          width: `${Math.min(100, (userExperience / nextLevel.experience_required) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className={styles["xp-remaining"]}>До следующего уровня: {(nextLevel.experience_required - userExperience).toLocaleString()} XP</div>
                  </>
                )}

                {!nextLevel && userLevel && <div className={styles["max-level"]}>Максимальный уровень достигнут! {userLevel?.level_number || 1}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Статистика профиля */}
      <div className={styles["stats-section"]}>
        <h2 className={styles["section-title"]}>
          <AiOutlineLineChart /> Моя статистика
        </h2>
        <div className={styles["stats-grid"]}>
          <div className={styles["stat-card"]}>
            <div className={styles["stat-icon"]} style={{ background: "linear-gradient(180deg, #332929 0%, #262121 50%, #210D0D 100%)" }}>
              <AiOutlineCheckCircle />
            </div>
            <div className={styles["stat-content"]}>
              <div className={styles["stat-value"]}>{userStats.completedTasks}</div>
              <div className={styles["stat-label"]}>Выполнено заданий</div>
            </div>
          </div>

          <div className={styles["stat-card"]}>
            <div className={styles["stat-icon"]} style={{ background: "linear-gradient(180deg, #332929 0%, #262121 50%, #210D0D 100%)" }}>
              <AiOutlineCode />
            </div>
            <div className={styles["stat-content"]}>
              <div className={styles["stat-value"]}>{userStats.totalProjects}</div>
              <div className={styles["stat-label"]}>Создано проектов</div>
            </div>
          </div>

          <div className={styles["stat-card"]}>
            <div className={styles["stat-icon"]} style={{ background: "linear-gradient(180deg, #332929 0%, #262121 50%, #210D0D 100%)" }}>
              <AiOutlineFire />
            </div>
            <div className={styles["stat-content"]}>
              <div className={styles["stat-value"]}>{userStats.streak}</div>
              <div className={styles["stat-label"]}>Дней подряд</div>
            </div>
          </div>

          <div className={styles["stat-card"]}>
            <div className={styles["stat-icon"]} style={{ background: "linear-gradient(180deg, #332929 0%, #262121 50%, #210D0D 100%)" }}>
              <AiOutlineRise />
            </div>
            <div className={styles["stat-content"]}>
              <div className={styles["stat-value"]}>#{userStats.rank}</div>
              <div className={styles["stat-label"]}>Место в рейтинге</div>
            </div>
          </div>
        </div>
      </div>

      {/* Достижения */}
      <div className={styles["achievements-section"]}>
        <div className={styles["achievements-header"]}>
          <h2 className={styles["section-title"]}>
            <AiOutlineTrophy /> Достижения
          </h2>
          <div className={styles["achievements-stats"]}>
            <span className={styles["achievements-count"]}>
              {achievementsEarned} / {achievementsTotal}
            </span>
            <span className={styles["achievements-label"]}>получено</span>
          </div>
        </div>

        <div className={styles["achievements-preview-grid"]}>
          {achievementsLoading ? (
            <div className={styles["achievements-loading"]}>
              <div className={styles["activity-spinner"]}></div>
              <p>Загрузка достижений...</p>
            </div>
          ) : achievements.filter((a) => a.earned).length > 0 ? (
            achievements
              .filter((a) => a.earned)
              .slice(0, 6)
              .map((achievement) => (
                <div key={achievement.id} className={styles["achievement-preview-card"]} style={getRarityStyle(achievement.rarity)}>
                  <div className={styles["achievement-icon"]} style={{ color: achievement.icon_color }}>
                    {getAchievementIcon(achievement.icon)}
                  </div>
                  <div className={styles["achievement-content"]}>
                    <h3 className={styles["achievement-title"]}>{achievement.title}</h3>
                    <span className={styles["achievement-rarity"]} data-rarity={achievement.rarity}>
                      {getRarityLabel(achievement.rarity)}
                    </span>
                  </div>
                </div>
              ))
          ) : (
            <div className={styles["no-achievements"]}>
              <AiOutlineTrophy />
              <p>У вас пока нет достижений</p>
              <span>Выполняйте задания, чтобы их получить!</span>
            </div>
          )}
        </div>

        <button className={styles["view-all-achievements-btn"]} onClick={() => setShowAchievementsModal(true)}>
          <AiOutlineAppstore /> Показать все достижения
        </button>
      </div>

      {/* Последняя активность */}
      <div className={styles["activity-section"]}>
        <h2 className={styles["section-title"]}>
          <AiOutlineCalendar /> Последняя активность
        </h2>
        <div className={styles["activity-timeline"]}>
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className={styles["activity-item"]}>
                <div className={styles["activity-icon-wrapper"]}>
                  <div className={styles["activity-type-icon"]} style={{ background: getActivityColor(activity.type) }}>
                    {getActivityIcon(activity.type)}
                  </div>
                </div>
                <div className={styles["activity-details"]}>
                  <div className={styles["activity-title"]}>{activity.message}</div>
                  <div className={styles["activity-meta"]}>
                    <span className={styles["activity-date"]}>
                      <AiOutlineClockCircle /> {formatActivityDate(activity.created_at)}
                    </span>
                    {(activity.points > 0 || activity.experience > 0) && (
                      <div className={styles["activity-rewards"]}>
                        {activity.points > 0 && <span className={styles["activity-points"]}>+{activity.points} баллов</span>}
                        {activity.experience > 0 && <span className={styles["activity-xp"]}>+{activity.experience} XP</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className={styles["no-activity"]}>
              <AiOutlineCalendar />
              <p>Пока нет активности</p>
            </div>
          )}
        </div>

        <button className={styles["view-all-activity-btn"]} onClick={openActivityModal}>
          Посмотреть всю активность
        </button>
      </div>

      {/* Секция примечаний с уроков */}
      <div className={styles["notes-section"]}>
        <h2 className={styles["section-title"]}>
          <AiOutlineFileText /> Примечания с уроков
        </h2>

        <div className={styles["notes-list"]}>
          {lessonNotes.length > 0 ? (
            lessonNotes.slice(0, 10).map((note) => (
              <div key={note.id} className={styles["note-item"]}>
                <div className={styles["note-header"]}>
                  <div className={styles["note-lesson"]}>
                    <span className={styles["note-title"]}>{note.lesson_title}</span>
                    <span className={styles["note-date"]}>
                      {new Date(note.lesson_date).toLocaleDateString("ru-RU")} в {note.lesson_time?.substring(0, 5)}
                    </span>
                  </div>
                  {note.attendance_status && (
                    <span className={styles["note-attendance"]} style={{ color: getAttendanceStatusLabel(note.attendance_status).color }}>
                      {getAttendanceStatusLabel(note.attendance_status).label}
                      {note.attendance_reason && `: ${note.attendance_reason}`}
                    </span>
                  )}
                </div>
                <p className={styles["note-text"]}>{note.note}</p>
              </div>
            ))
          ) : (
            <div className={styles["no-notes"]}>
              <AiOutlineFileText />
              <p>Примечаний пока нет</p>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно всей активности */}
      {showActivityModal && (
        <div className={styles["activity-modal-overlay"]} onClick={() => setShowActivityModal(false)}>
          <div className={styles["activity-modal"]} onClick={(e) => e.stopPropagation()}>
            <div className={styles["activity-modal-header"]}>
              <h2>
                <AiOutlineHistory /> История активности
              </h2>
              <button className={styles["modal-close-btn"]} onClick={() => setShowActivityModal(false)}>
                <AiOutlineClose />
              </button>
            </div>

            <div className={styles["activity-modal-content"]}>
              {loadingActivity ? (
                <div className={styles["activity-loading"]}>
                  <div className={styles["activity-spinner"]}></div>
                  <p>Загрузка...</p>
                </div>
              ) : allActivity.length > 0 ? (
                <>
                  <div className={styles["activity-list"]}>
                    {allActivity.map((activity, index) => (
                      <div key={index} className={styles["activity-modal-item"]}>
                        <div className={styles["activity-modal-icon"]} style={{ background: getActivityColor(activity.type) }}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className={styles["activity-modal-info"]}>
                          <div className={styles["activity-modal-message"]}>{activity.message}</div>
                          <div className={styles["activity-modal-meta"]}>
                            <span className={styles["activity-modal-date"]}>{formatActivityDate(activity.created_at)}</span>
                            {(activity.points > 0 || activity.experience > 0) && (
                              <div className={styles["activity-modal-rewards"]}>
                                {activity.points > 0 && <span className={styles["reward-badge-points"]}>+{activity.points}</span>}
                                {activity.experience > 0 && <span className={styles["reward-badge-xp"]}>+{activity.experience} XP</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Пагинация */}
                  {activityTotalPages > 1 && (
                    <div className={styles["activity-pagination"]}>
                      <button className={styles["pagination-btn"]} onClick={() => fetchAllActivity(activityPage - 1)} disabled={activityPage <= 1}>
                        ← Назад
                      </button>
                      <span className={styles["pagination-info"]}>
                        Страница {activityPage} из {activityTotalPages}
                      </span>
                      <button className={styles["pagination-btn"]} onClick={() => fetchAllActivity(activityPage + 1)} disabled={activityPage >= activityTotalPages}>
                        Вперед →
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles["no-activity-modal"]}>
                  <AiOutlineCalendar />
                  <p>История активности пуста</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно всех достижений */}
      {showAchievementsModal && (
        <div className={styles["achievements-modal-overlay"]} onClick={() => setShowAchievementsModal(false)}>
          <div className={styles["achievements-modal"]} onClick={(e) => e.stopPropagation()}>
            <div className={styles["achievements-modal-header"]}>
              <h2>
                <AiOutlineTrophy /> Все достижения
              </h2>
              <div className={styles["achievements-modal-stats"]}>
                <span className={styles["earned-badge"]}>{achievementsEarned}</span>
                <span>/</span>
                <span>{achievementsTotal}</span>
              </div>
              <button className={styles["modal-close-btn"]} onClick={() => setShowAchievementsModal(false)}>
                <AiOutlineClose />
              </button>
            </div>

            <div className={styles["achievements-categories"]}>
              {categories.map((cat) => (
                <button key={cat.id} className={`${styles["category-btn"]} ${selectedCategory === cat.id ? styles["active"] : ""}`} onClick={() => setSelectedCategory(cat.id)}>
                  {cat.icon}
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>

            <div className={styles["achievements-modal-content"]}>
              <div className={styles["achievements-full-grid"]}>
                {filteredAchievements.map((achievement) => (
                  <div key={achievement.id} className={`${styles["achievement-full-card"]} ${achievement.earned ? styles["earned"] : styles["locked"]}`} style={achievement.earned ? getRarityStyle(achievement.rarity) : {}}>
                    <div
                      className={styles["achievement-full-icon"]}
                      style={{
                        color: achievement.earned ? achievement.icon_color : "#555",
                        opacity: achievement.earned ? 1 : 0.4,
                      }}
                    >
                      {achievement.is_secret && !achievement.earned ? <AiOutlineLock /> : getAchievementIcon(achievement.icon)}
                    </div>
                    <div className={styles["achievement-full-content"]}>
                      <h3 className={styles["achievement-full-title"]}>{achievement.is_secret && !achievement.earned ? "???" : achievement.title}</h3>
                      <p className={styles["achievement-full-description"]}>{achievement.is_secret && !achievement.earned ? "Секретное достижение" : achievement.description}</p>
                      <div className={styles["achievement-full-meta"]}>
                        <span className={styles["achievement-full-rarity"]} data-rarity={achievement.rarity}>
                          {getRarityLabel(achievement.rarity)}
                        </span>
                        <div className={styles["achievement-full-rewards"]}>
                          {achievement.points_reward > 0 && <span className={styles["reward-points"]}>+{achievement.points_reward}</span>}
                          {achievement.experience_reward > 0 && <span className={styles["reward-xp"]}>+{achievement.experience_reward} XP</span>}
                        </div>
                      </div>
                      {achievement.earned && achievement.earned_at && <div className={styles["achievement-earned-date"]}>Получено: {new Date(achievement.earned_at).toLocaleDateString("ru-RU")}</div>}
                    </div>
                    {achievement.earned && <div className={styles["achievement-earned-badge"]}>✓</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <PointsHistory isOpen={showHistory} onClose={() => setShowHistory(false)} />
    </div>
  );
}

export default StudentProfile;
