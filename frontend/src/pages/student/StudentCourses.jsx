import { useState, useEffect, useCallback, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaBook, FaClock, FaGraduationCap, FaArrowRight, FaCoins,
  FaStar, FaLock, FaCheckCircle, FaUsers,
} from "react-icons/fa";
import { AiOutlineFileText, AiOutlineSearch } from "react-icons/ai";
import { MdOutlineSchool, MdOutlineLockOpen } from "react-icons/md";
import api, { BASE_URL } from "../../utils/api";
import styles from "./StudentCourses.module.css";

const DIFF_LABEL = { beginner: "Начальный", intermediate: "Средний", advanced: "Продвинутый" };
const DIFF_CLS   = { beginner: styles.diffEasy, intermediate: styles.diffMid, advanced: styles.diffHard };

const CourseCard = memo(({ course, onOpen, userLevel, userPoints }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isLocked   = course.required_level > 0 && userLevel < course.required_level;
  const canAfford  = !course.price || course.price === 0 || userPoints >= course.price;
  const isEnrolled = !!course.enrolled;

  let actionLabel;
  if (isLocked)        actionLabel = <><FaLock /> Уровень {course.required_level}</>;
  else if (isEnrolled) actionLabel = <>Продолжить <FaArrowRight /></>;
  else                 actionLabel = <>Приступить <FaArrowRight /></>;

  return (
    <div
      className={`${styles.courseCard} ${isLocked ? styles.cardLocked : ""} ${isEnrolled ? styles.cardEnrolled : ""}`}
      onClick={() => !isLocked && onOpen(course.id)}
    >
      <div className={styles.thumbnail}>
        {course.thumbnail_url && !imageError ? (
          <>
            {!imageLoaded && <div className={styles.thumbSkeleton} />}
            <img
              src={`${BASE_URL}${course.thumbnail_url}`}
              alt={course.title}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              style={{ opacity: imageLoaded ? 1 : 0 }}
            />
          </>
        ) : (
          <div className={styles.thumbFallback}><FaBook /></div>
        )}
        {isLocked && (
          <div className={styles.thumbOverlay}>
            <FaLock />
            <span>Уровень {course.required_level}</span>
          </div>
        )}
        {course.price > 0 && !isEnrolled && (
          <div className={`${styles.priceTag} ${!canAfford ? styles.priceTagCant : ""}`}>
            <FaCoins /> {course.price}
          </div>
        )}
        {isEnrolled && (
          <div className={styles.enrolledTag}><FaCheckCircle /> Записан</div>
        )}
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardBadges}>
          <span className={`${styles.diffBadge} ${DIFF_CLS[course.difficulty_level] || ""}`}>
            {DIFF_LABEL[course.difficulty_level] || course.difficulty_level}
          </span>
          {course.required_level > 0 && (
            <span className={`${styles.levelBadge} ${isLocked ? styles.levelBadgeLocked : ""}`}>
              <FaStar /> {course.required_level} ур.
            </span>
          )}
        </div>
        <h3 className={styles.cardTitle}>{course.title}</h3>
        <p className={styles.cardDesc}>{course.description}</p>
        <div className={styles.cardMeta}>
          <span><FaBook /> {course.lesson_count || 0} уроков</span>
          <span><FaClock /> {course.duration_hours || 0}ч</span>
          {course.enrolled_count > 0 && <span><FaUsers /> {course.enrolled_count}</span>}
        </div>
        <button
          className={`${styles.cardBtn} ${isLocked ? styles.cardBtnLocked : isEnrolled ? styles.cardBtnEnrolled : ""}`}
          onClick={e => { e.stopPropagation(); if (!isLocked) onOpen(course.id); }}
          disabled={isLocked}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
});

const SkeletonCard = () => (
  <div className={`${styles.courseCard} ${styles.skeletonCard}`}>
    <div className={styles.thumbnail}><div className={styles.thumbSkeleton} /></div>
    <div className={styles.cardBody}>
      <div className={`${styles.skeletonLine} ${styles.skW40}`} />
      <div className={`${styles.skeletonLine} ${styles.skW80}`} />
      <div className={`${styles.skeletonLine} ${styles.skW60}`} />
      <div className={`${styles.skeletonLine} ${styles.skW100}`} />
    </div>
  </div>
);

const FILTERS = [
  { key: "all",      label: "Все" },
  { key: "enrolled", label: "Записан" },
  { key: "free",     label: "Доступные" },
  { key: "locked",   label: "Заблокированные" },
];

function StudentCourses() {
  const [courses, setCourses]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [userLevel, setUserLevel] = useState(1);
  const [userPoints, setUserPoints] = useState(0);
  const [filter, setFilter]       = useState("all");
  const [search, setSearch]       = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Re-fetch every time the user navigates to this page (e.g. after buying a course)
  useEffect(() => { loadData(); }, [location.key]);

  const loadData = async () => {
    try {
      const [coursesRes, profileRes] = await Promise.all([
        api.get("/courses?published=true&limit=20"),
        api.get("/auth/me"),
      ]);
      const coursesList = coursesRes.data.courses || [];
      const user = profileRes.data.user || profileRes.data;
      const exp = user.experience || 0;
      setUserLevel(Math.floor(exp / 100) + 1);
      setUserPoints(user.points || 0);
      // enrolled field comes directly from the backend per-course query
      setCourses(coursesList.map(c => ({ ...c, enrolled: !!c.enrolled })));
    } catch (err) {
      console.error("Ошибка загрузки данных:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = useCallback(id => navigate(`/student/courses/${id}`), [navigate]);

  const filtered = courses.filter(c => {
    const isLocked  = c.required_level > 0 && userLevel < c.required_level;
    const matchF =
      filter === "all"      ? true :
      filter === "enrolled" ? !!c.enrolled :
      filter === "free"     ? !isLocked && !c.enrolled :
      filter === "locked"   ? isLocked : true;
    const matchS = !search || c.title.toLowerCase().includes(search.toLowerCase()) ||
                   (c.description || "").toLowerCase().includes(search.toLowerCase());
    return matchF && matchS;
  });

  const stats = {
    total:    courses.length,
    enrolled: courses.filter(c => c.enrolled).length,
    free:     courses.filter(c => !(c.required_level > 0 && userLevel < c.required_level) && !c.enrolled).length,
    locked:   courses.filter(c => c.required_level > 0 && userLevel < c.required_level).length,
  };

  return (
    <div className={styles.page}>

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderIcon}><MdOutlineSchool /></div>
        <div>
          <h1 className={styles.pageTitle}>Курсы</h1>
          <p className={styles.pageSub}>Учебные материалы и курсы</p>
        </div>
      </div>

      {/* Stat tiles */}
      <div className={styles.statsRow}>
        <div className={styles.statTile}>
          <span className={styles.statTileIcon}><FaBook /></span>
          <span className={styles.statTileVal}>{stats.total}</span>
          <span className={styles.statTileLabel}>Всего курсов</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statTileIcon}><FaCheckCircle /></span>
          <span className={styles.statTileVal}>{stats.enrolled}</span>
          <span className={styles.statTileLabel}>Записан</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statTileIcon}><MdOutlineLockOpen /></span>
          <span className={styles.statTileVal}>{stats.free}</span>
          <span className={styles.statTileLabel}>Доступно</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statTileIcon}><FaLock /></span>
          <span className={styles.statTileVal}>{stats.locked}</span>
          <span className={styles.statTileLabel}>Заблокировано</span>
        </div>
      </div>

      {/* Search + filters */}
      <div className={styles.controlsRow}>
        <div className={styles.searchWrap}>
          <AiOutlineSearch className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Поиск курсов..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className={styles.searchClear} onClick={() => setSearch("")}><FaTimes /></button>}
        </div>
        <div className={styles.filterBar}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`${styles.filterChip} ${filter === f.key ? styles.filterChipActive : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label} ({f.key === "all" ? stats.total : stats[f.key] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className={styles.coursesGrid}>
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <FaGraduationCap className={styles.emptyIcon} />
          <h3>{courses.length === 0 ? "Курсы пока недоступны" : "Нет совпадений"}</h3>
          <p>{courses.length === 0 ? "Курсы появятся здесь, когда преподаватели их добавят" : "Попробуйте изменить поиск или фильтр"}</p>
        </div>
      ) : (
        <div className={styles.coursesGrid}>
          {filtered.map(c => (
            <CourseCard
              key={c.id}
              course={c}
              onOpen={handleOpen}
              userLevel={userLevel}
              userPoints={userPoints}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentCourses;
