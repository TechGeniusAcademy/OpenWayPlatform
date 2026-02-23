import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api, { BASE_URL } from "../../utils/api";
import { getFrameStyle } from "../../utils/frameUtils";
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
    <div className={styles["profile-page"]}>

      {/* ── HERO BANNER ── */}
      <div
        className={styles["hero"]}
        style={{
          backgroundImage: appliedBanner?.image_url
            ? `url(${BASE_URL}${appliedBanner.image_url})`
            : undefined,
        }}
      >
        <div className={styles["hero-overlay"]} />
        <div className={styles["hero-body"]}>
          {/* Avatar */}
          <div className={styles["hero-avatar-wrap"]}>
            <div className={styles["hero-avatar"]}>
              {preview || user?.avatar_url
                ? <img src={preview || `${BASE_URL}${user.avatar_url}`} alt={user.username} />
                : <span>{(user?.full_name || user?.username || "U").charAt(0).toUpperCase()}</span>}
            </div>
            {appliedFrame?.image_url && (
              <img src={`${BASE_URL}${appliedFrame.image_url}`} alt="Frame"
                className={styles["hero-avatar-frame"]}
                style={getFrameStyle(appliedFrame, 'profile')} />
            )}
            <label className={styles["avatar-change-btn"]} title="Сменить фото">
              <AiOutlineFileText style={{ display: "none" }} />
              <FaUser style={{ fontSize: 13 }} />
              <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploading} style={{ display: "none" }} />
            </label>
          </div>

          {/* Identity */}
          <div className={styles["hero-identity"]}>
            <div className={styles["hero-name-row"]}>
              <span className={`styled-username ${user?.username_style || "username-none"}`}>
                {user?.username}
              </span>
              {userLevel?.rank_name && (
                <span className={styles["hero-rank-badge"]}>{userLevel.rank_name}</span>
              )}
            </div>
            <div className={styles["hero-fullname"]}>{user?.full_name || user?.email}</div>

            {/* XP bar inside hero */}
            <div className={styles["hero-xp-row"]}>
              <span className={styles["hero-level-chip"]}>
                {userLevel?.image_url
                  ? <img src={userLevel.image_url.startsWith("http") ? userLevel.image_url : `${BASE_URL}${userLevel.image_url}`} alt="" />
                  : <span>Ур. {userLevel?.level_number || 1}</span>}
              </span>
              <div className={styles["hero-xp-bar-wrap"]}>
                <div
                  className={styles["hero-xp-bar-fill"]}
                  style={{ width: nextLevel ? `${Math.min(100, (userExperience / nextLevel.experience_required) * 100)}%` : "100%" }}
                />
              </div>
              <span className={styles["hero-xp-text"]}>
                {userExperience.toLocaleString()} {nextLevel ? `/ ${nextLevel.experience_required.toLocaleString()}` : ""} XP
              </span>
            </div>
          </div>

          {/* Hero actions */}
          <div className={styles["hero-actions"]}>
            {preview && (
              <button className={styles["btn-save-avatar"]} onClick={handleAvatarUpload} disabled={uploading}>
                {uploading ? "Сохранение..." : "Сохранить фото"}
              </button>
            )}
            <button className={styles["btn-ghost"]} onClick={() => setShowHistory(true)}>
              <AiOutlineHistory /> История баллов
            </button>
            <div className={styles["hero-points-chip"]}>
              <AiOutlineWallet />
              <strong>{userPoints}</strong>
              <span>баллов</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className={styles["main-grid"]}>

        {/* LEFT COLUMN */}
        <div className={styles["left-col"]}>

          {/* Profile info card */}
          <div className={styles["card"]}>
            <div className={styles["card-header"]}>
              <FaUser className={styles["card-header-icon"]} />
              <h3>Информация</h3>
            </div>
            <div className={styles["info-list"]}>
              <div className={styles["info-row"]}>
                <span className={styles["info-key"]}><FaUser /> Ник</span>
                <span className={`${styles["info-val"]} styled-username ${user?.username_style || "username-none"}`}>{user?.username}</span>
              </div>
              <div className={styles["info-row"]}>
                <span className={styles["info-key"]}><MdMail /> Email</span>
                <span className={styles["info-val"]}>{user?.email}</span>
              </div>
              <div className={styles["info-row"]}>
                <span className={styles["info-key"]}><SiNamesilo /> ФИО</span>
                <span className={styles["info-val"]}>{user?.full_name || "Не указано"}</span>
              </div>
              <div className={styles["info-row"]}>
                <span className={styles["info-key"]}><FaCalendarAlt /> Дата регистрации</span>
                <span className={styles["info-val"]}>{new Date(user?.created_at).toLocaleDateString("ru-RU")}</span>
              </div>
            </div>
          </div>

          {/* Level card */}
          <div className={styles["card"]}>
            <div className={styles["card-header"]}>
              <AiOutlineStar className={styles["card-header-icon"]} />
              <h3>Уровень и опыт</h3>
            </div>
            <div className={styles["level-hero"]}>
              <div className={styles["level-badge"]}>
                {userLevel?.image_url
                  ? <img src={userLevel.image_url.startsWith("http") ? userLevel.image_url : `${BASE_URL}${userLevel.image_url}`} alt={`Уровень ${userLevel.level_number}`} />
                  : <span>{userLevel?.level_number || 1}</span>}
              </div>
              <div className={styles["level-info"]}>
                <div className={styles["level-name"]}>{userLevel?.rank_name || `Уровень ${userLevel?.level_number || 1}`}</div>
                <div className={styles["xp-numbers"]}>
                  <span className={styles["xp-current"]}>{userExperience.toLocaleString()} XP</span>
                  {nextLevel && <span className={styles["xp-next"]}>/ {nextLevel.experience_required.toLocaleString()} XP</span>}
                </div>
                {nextLevel && (
                  <div className={styles["xp-track"]}>
                    <div className={styles["xp-track-fill"]} style={{ width: `${Math.min(100, (userExperience / nextLevel.experience_required) * 100)}%` }} />
                  </div>
                )}
                {nextLevel
                  ? <div className={styles["xp-hint"]}>До следующего уровня: {(nextLevel.experience_required - userExperience).toLocaleString()} XP</div>
                  : <div className={styles["xp-hint"]}>Максимальный уровень достигнут!</div>}
              </div>
            </div>

            {nextLevel && (
              <div className={styles["next-level-preview"]}>
                <div className={styles["next-level-label"]}>Следующий уровень</div>
                <div className={styles["next-level-body"]}>
                  <div className={styles["next-level-badge"]}>
                    {nextLevel.image_url
                      ? <img src={nextLevel.image_url.startsWith("http") ? nextLevel.image_url : `${BASE_URL}${nextLevel.image_url}`} alt={`Уровень ${nextLevel.level_number}`} />
                      : <span>{nextLevel.level_number}</span>}
                  </div>
                  <div className={styles["next-level-info"]}>
                    <div className={styles["next-level-name"]}>{nextLevel.rank_name || `Уровень ${nextLevel.level_number}`}</div>
                    <div className={styles["next-level-req"]}>
                      Требуется <strong>{nextLevel.experience_required.toLocaleString()} XP</strong>
                    </div>
                    {(nextLevel.points_reward > 0 || nextLevel.experience_reward > 0) && (
                      <div className={styles["next-level-rewards"]}>
                        {nextLevel.points_reward > 0 && (
                          <span className={styles["chip-pts"]}>+{nextLevel.points_reward} баллов</span>
                        )}
                        {nextLevel.experience_reward > 0 && (
                          <span className={styles["chip-xp"]}>+{nextLevel.experience_reward} XP</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={styles["next-level-progress-wrap"]}>
                    <div className={styles["next-level-percent"]}>
                      {Math.round((userExperience / nextLevel.experience_required) * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className={styles["right-col"]}>

          {/* Stats row */}
          <div className={styles["stats-row"]}>
            {[
              { icon: <AiOutlineCheckCircle />, value: userStats.completedTasks, label: "Заданий", color: "#22c55e" },
              { icon: <AiOutlineCode />, value: userStats.totalProjects, label: "Проектов", color: "#3b82f6" },
              { icon: <AiOutlineFire />, value: userStats.streak, label: "Дней подряд", color: "#f97316" },
              { icon: <AiOutlineRise />, value: `#${userStats.rank}`, label: "Рейтинг", color: "#a855f7" },
            ].map((s, i) => (
              <div key={i} className={styles["stat-tile"]}>
                <div className={styles["stat-tile-icon"]} style={{ color: s.color, background: `${s.color}18` }}>{s.icon}</div>
                <div className={styles["stat-tile-val"]}>{s.value}</div>
                <div className={styles["stat-tile-label"]}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Recent activity */}
          <div className={styles["card"]}>
            <div className={styles["card-header"]}>
              <AiOutlineCalendar className={styles["card-header-icon"]} />
              <h3>Последняя активность</h3>
              <button className={styles["card-header-btn"]} onClick={openActivityModal}>Все →</button>
            </div>
            <div className={styles["activity-feed"]}>
              {recentActivity.length > 0 ? recentActivity.map((a, i) => (
                <div key={i} className={styles["feed-row"]}>
                  <div className={styles["feed-dot"]} style={{ background: getActivityColor(a.type) }}>
                    {getActivityIcon(a.type)}
                  </div>
                  <div className={styles["feed-body"]}>
                    <div className={styles["feed-msg"]}>{a.message}</div>
                    <div className={styles["feed-meta"]}>
                      <span><AiOutlineClockCircle /> {formatActivityDate(a.created_at)}</span>
                      {(a.points > 0 || a.experience > 0) && (
                        <span className={styles["feed-rewards"]}>
                          {a.points > 0 && <span className={styles["chip-pts"]}>+{a.points}</span>}
                          {a.experience > 0 && <span className={styles["chip-xp"]}>+{a.experience} XP</span>}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )) : (
                <div className={styles["empty-state"]}><AiOutlineCalendar /><p>Пока нет активности</p></div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── ACHIEVEMENTS ── */}
      <div className={`${styles["card"]} ${styles["card-full"]}`}>
        <div className={styles["card-header"]}>
          <AiOutlineTrophy className={styles["card-header-icon"]} />
          <h3>Достижения</h3>
          <span className={styles["achiev-count-badge"]}>{achievementsEarned} / {achievementsTotal}</span>
          <button className={styles["card-header-btn"]} onClick={() => setShowAchievementsModal(true)}>
            <AiOutlineAppstore /> Все
          </button>
        </div>
        <div className={styles["achiev-grid"]}>
          {achievementsLoading ? (
            <div className={styles["empty-state"]}><div className={styles["spinner"]} /><p>Загрузка...</p></div>
          ) : achievements.filter((a) => a.earned).length > 0 ? (
            achievements.filter((a) => a.earned).slice(0, 6).map((ach) => (
              <div key={ach.id} className={styles["achiev-tile"]} style={getRarityStyle(ach.rarity)}>
                <div className={styles["achiev-tile-icon"]} style={{ color: ach.icon_color }}>
                  {getAchievementIcon(ach.icon)}
                </div>
                <div className={styles["achiev-tile-name"]}>{ach.title}</div>
                <span className={styles["achiev-tile-rarity"]} data-rarity={ach.rarity}>{getRarityLabel(ach.rarity)}</span>
              </div>
            ))
          ) : (
            <div className={styles["empty-state"]} style={{ gridColumn: "1/-1" }}>
              <AiOutlineTrophy /><p>Выполняйте задания, чтобы получить достижения</p>
            </div>
          )}
        </div>
      </div>

      {/* ── LESSON NOTES ── */}
      <div className={`${styles["card"]} ${styles["card-full"]}`}>
        <div className={styles["card-header"]}>
          <AiOutlineFileText className={styles["card-header-icon"]} />
          <h3>Примечания с уроков</h3>
        </div>
        <div className={styles["notes-list"]}>
          {lessonNotes.length > 0 ? lessonNotes.slice(0, 10).map((note) => (
            <div key={note.id} className={styles["note-item"]}>
              <div className={styles["note-top"]}>
                <div>
                  <span className={styles["note-lesson-title"]}>{note.lesson_title}</span>
                  <span className={styles["note-date"]}>
                    {new Date(note.lesson_date).toLocaleDateString("ru-RU")} · {note.lesson_time?.substring(0, 5)}
                  </span>
                </div>
                {note.attendance_status && (
                  <span className={styles["note-status"]} style={{ color: getAttendanceStatusLabel(note.attendance_status).color }}>
                    {getAttendanceStatusLabel(note.attendance_status).label}
                    {note.attendance_reason && ` · ${note.attendance_reason}`}
                  </span>
                )}
              </div>
              <p className={styles["note-body"]}>{note.note}</p>
            </div>
          )) : (
            <div className={styles["empty-state"]}><AiOutlineFileText /><p>Примечаний пока нет</p></div>
          )}
        </div>
      </div>

      {/* ── ACTIVITY MODAL ── */}
      {showActivityModal && (
        <div className={styles["modal-overlay"]} onClick={() => setShowActivityModal(false)}>
          <div className={styles["modal"]} onClick={(e) => e.stopPropagation()}>
            <div className={styles["modal-head"]}>
              <h2><AiOutlineHistory /> История активности</h2>
              <button className={styles["modal-close"]} onClick={() => setShowActivityModal(false)}><AiOutlineClose /></button>
            </div>
            <div className={styles["modal-body"]}>
              {loadingActivity ? (
                <div className={styles["empty-state"]}><div className={styles["spinner"]} /><p>Загрузка...</p></div>
              ) : allActivity.length > 0 ? (
                <>
                  <div className={styles["activity-feed"]}>
                    {allActivity.map((a, i) => (
                      <div key={i} className={styles["feed-row"]}>
                        <div className={styles["feed-dot"]} style={{ background: getActivityColor(a.type) }}>
                          {getActivityIcon(a.type)}
                        </div>
                        <div className={styles["feed-body"]}>
                          <div className={styles["feed-msg"]}>{a.message}</div>
                          <div className={styles["feed-meta"]}>
                            <span>{formatActivityDate(a.created_at)}</span>
                            {(a.points > 0 || a.experience > 0) && (
                              <span className={styles["feed-rewards"]}>
                                {a.points > 0 && <span className={styles["chip-pts"]}>+{a.points}</span>}
                                {a.experience > 0 && <span className={styles["chip-xp"]}>+{a.experience} XP</span>}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {activityTotalPages > 1 && (
                    <div className={styles["pagination"]}>
                      <button className={styles["page-btn"]} onClick={() => fetchAllActivity(activityPage - 1)} disabled={activityPage <= 1}>← Назад</button>
                      <span>{activityPage} / {activityTotalPages}</span>
                      <button className={styles["page-btn"]} onClick={() => fetchAllActivity(activityPage + 1)} disabled={activityPage >= activityTotalPages}>Вперед →</button>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles["empty-state"]}><AiOutlineCalendar /><p>История пуста</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ACHIEVEMENTS MODAL ── */}
      {showAchievementsModal && (
        <div className={styles["modal-overlay"]} onClick={() => setShowAchievementsModal(false)}>
          <div className={styles["modal"]} style={{ maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles["modal-head"]}>
              <h2><AiOutlineTrophy /> Все достижения</h2>
              <span className={styles["achiev-count-badge"]}>{achievementsEarned} / {achievementsTotal}</span>
              <button className={styles["modal-close"]} onClick={() => setShowAchievementsModal(false)}><AiOutlineClose /></button>
            </div>
            <div className={styles["achiev-cats"]}>
              {categories.map((cat) => (
                <button key={cat.id} className={`${styles["cat-btn"]} ${selectedCategory === cat.id ? styles["cat-btn--active"] : ""}`} onClick={() => setSelectedCategory(cat.id)}>
                  {cat.icon}<span>{cat.name}</span>
                </button>
              ))}
            </div>
            <div className={styles["modal-body"]}>
              <div className={styles["achiev-full-grid"]}>
                {filteredAchievements.map((ach) => (
                  <div key={ach.id} className={`${styles["achiev-full-card"]} ${ach.earned ? styles["achiev-earned"] : styles["achiev-locked"]}`} style={ach.earned ? getRarityStyle(ach.rarity) : {}}>
                    <div className={styles["achiev-full-icon"]} style={{ color: ach.earned ? ach.icon_color : undefined, opacity: ach.earned ? 1 : 0.35 }}>
                      {ach.is_secret && !ach.earned ? <AiOutlineLock /> : getAchievementIcon(ach.icon)}
                    </div>
                    <div className={styles["achiev-full-info"]}>
                      <div className={styles["achiev-full-name"]}>{ach.is_secret && !ach.earned ? "???" : ach.title}</div>
                      <div className={styles["achiev-full-desc"]}>{ach.is_secret && !ach.earned ? "Секретное достижение" : ach.description}</div>
                      <div className={styles["achiev-full-meta"]}>
                        <span className={styles["achiev-tile-rarity"]} data-rarity={ach.rarity}>{getRarityLabel(ach.rarity)}</span>
                        <div>
                          {ach.points_reward > 0 && <span className={styles["chip-pts"]}>+{ach.points_reward}</span>}
                          {ach.experience_reward > 0 && <span className={styles["chip-xp"]}>+{ach.experience_reward} XP</span>}
                        </div>
                      </div>
                      {ach.earned && ach.earned_at && <div className={styles["achiev-earned-at"]}>Получено: {new Date(ach.earned_at).toLocaleDateString("ru-RU")}</div>}
                    </div>
                    {ach.earned && <div className={styles["achiev-check"]}>✓</div>}
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
