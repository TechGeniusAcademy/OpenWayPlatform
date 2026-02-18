import { useState, useEffect, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { FaBook, FaClock, FaGraduationCap, FaArrowRight, FaCoins, FaStar, FaLock } from "react-icons/fa";
import api, { BASE_URL } from "../../utils/api";
import styles from "./StudentCourses.module.css";

// Мемоизированная карточка курса для предотвращения лишних ре-рендеров
const CourseCard = memo(({ course, onOpen, getDifficultyLabel, userLevel, userPoints, enrolled }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isLocked = course.required_level > 0 && userLevel < course.required_level;
  const canAfford = !course.price || course.price === 0 || userPoints >= course.price;
  const isEnrolled = !!course.enrolled; // новое поле

  return (
    <div className={`${styles.courseCard} ${isLocked ? styles.locked : ""} ${isEnrolled ? styles.enrolled : ""}`} onClick={() => !isLocked && onOpen(course.id)}>
      <div className={styles.courseThumbnail}>
        {course.thumbnail_url && !imageError ? (
          <>
            {!imageLoaded && <div className={styles.imageSkeleton} />}
            <img src={`${BASE_URL}${course.thumbnail_url}`} alt={course.title} loading="lazy" onLoad={() => setImageLoaded(true)} onError={() => setImageError(true)} style={{ opacity: imageLoaded ? 1 : 0 }} />
          </>
        ) : (
          <FaBook />
        )}
        {isLocked && !isEnrolled && (
          <div className={styles.lockedOverlay}>
            <FaLock />
            <span>Уровень {course.required_level}</span>
          </div>
        )}
        {course.price > 0 && !isEnrolled && (
          <div className={`${styles.priceTag} ${!canAfford ? styles.cantAfford : ""}`}>
            <FaCoins /> {course.price}
          </div>
        )}
      </div>
      <div className={styles.courseContent}>
        <div className={styles.badgesRow}>
          <span className={`${styles.difficultyBadge} ${styles[course.difficulty_level]}`}>{getDifficultyLabel(course.difficulty_level)}</span>
          {course.required_level > 0 && (
            <span className={`${styles.levelBadge} ${isLocked ? styles.lockedBadge : ""}`}>
              <FaStar /> {course.required_level} ур.
            </span>
          )}
        </div>
        <h3 className={styles.courseTitle}>{course.title}</h3>
        <p className={styles.courseDescription}>{course.description}</p>
        <div className={styles.courseStats}>
          <div className={styles.courseStat}>
            <FaBook /> {course.lesson_count || 0} уроков
          </div>
          <div className={styles.courseStat}>
            <FaClock /> {course.duration_hours || 0}ч
          </div>
        </div>
        <button
          className={`${styles.openButton} ${isLocked ? styles.lockedBtn : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!isLocked) onOpen(course.id);
          }}
          disabled={isLocked}
        >
          {isLocked ? (
            <>Требуется {course.required_level} уровень</>
          ) : enrolled ? (
            <>
              Вы записаны <FaArrowRight />
            </>
          ) : course.price > 0 ? (
            <>
              <FaCoins /> Купить за {course.price}
            </>
          ) : (
            <>
              Открыть курс <FaArrowRight />
            </>
          )}
        </button>
      </div>
    </div>
  );
});

// Скелетон для загрузки
const SkeletonCard = () => (
  <div className={`${styles.courseCard} ${styles.skeleton}`}>
    <div className={styles.courseThumbnail}>
      <div className={styles.skeletonImage} />
    </div>
    <div className={styles.courseContent}>
      <div className={styles.skeletonBadge} />
      <div className={styles.skeletonTitle} />
      <div className={styles.skeletonDescription} />
      <div className={styles.skeletonStats} />
      <div className={styles.skeletonButton} />
    </div>
  </div>
);

function StudentCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState(1);
  const [userPoints, setUserPoints] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [coursesRes, profileRes] = await Promise.all([api.get("/courses?published=true&limit=20"), api.get("/auth/me")]);
      const coursesList = coursesRes.data.courses || [];

      const user = profileRes.data.user || profileRes.data;
      const exp = user.experience || 0;
      setUserLevel(Math.floor(exp / 100) + 1);
      setUserPoints(user.points || 0);

      // Приводим все ID к строкам
      const enrolledCourseIds = (user.enrolled_courses || []).map((id) => String(id));

      const coursesWithEnrollment = coursesList.map((course) => ({
        ...course,
        enrolled: enrolledCourseIds.includes(String(course.id)),
      }));

      console.log("coursesWithEnrollment:", coursesWithEnrollment); // Здесь!

      setCourses(coursesWithEnrollment);
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCourse = useCallback(
    (courseId) => {
      navigate(`/student/courses/${courseId}`);
    },
    [navigate],
  );

  const getDifficultyLabel = useCallback((level) => {
    const labels = {
      beginner: "Начальный",
      intermediate: "Средний",
      advanced: "Продвинутый",
    };
    return labels[level] || level;
  }, []);

  // Скелетон-загрузка
  if (loading) {
    return (
      <div className={styles.coursesPage}>
        <div className={styles.pageHeader}>
          <h1>Курсы</h1>
          <p>Учебные материалы и курсы</p>
        </div>
        <div className={styles.coursesGrid}>
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.coursesPage}>
      <div className={styles.pageHeader}>
        <h1>Курсы</h1>
        <p>Учебные материалы и курсы</p>
      </div>

      {courses.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FaGraduationCap />
          </div>
          <h3>Курсы пока недоступны</h3>
          <p>Курсы появятся здесь, когда преподаватели их добавят</p>
        </div>
      ) : (
        <div className={styles.coursesGrid}>
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onOpen={handleOpenCourse}
              getDifficultyLabel={getDifficultyLabel}
              userLevel={userLevel}
              userPoints={userPoints}
              enrolled={course.enrolled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentCourses;
