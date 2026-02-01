import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaClock, FaGraduationCap, FaArrowRight } from 'react-icons/fa';
import api, { BASE_URL } from '../../utils/api';
import styles from './StudentCourses.module.css';

// Мемоизированная карточка курса для предотвращения лишних ре-рендеров
const CourseCard = memo(({ course, onOpen, getDifficultyLabel }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div 
      className={styles.courseCard}
      onClick={() => onOpen(course.id)}
    >
      <div className={styles.courseThumbnail}>
        {course.thumbnail_url && !imageError ? (
          <>
            {!imageLoaded && <div className={styles.imageSkeleton} />}
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
          <FaBook />
        )}
      </div>
      <div className={styles.courseContent}>
        <span className={`${styles.difficultyBadge} ${styles[course.difficulty_level]}`}>
          {getDifficultyLabel(course.difficulty_level)}
        </span>
        <h3 className={styles.courseTitle}>{course.title}</h3>
        <p className={styles.courseDescription}>
          {course.description}
        </p>
        <div className={styles.courseStats}>
          <div className={styles.courseStat}>
            <FaBook /> {course.lesson_count || 0} уроков
          </div>
          <div className={styles.courseStat}>
            <FaClock /> {course.duration_hours || 0}ч
          </div>
        </div>
        <button 
          className={styles.openButton}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(course.id);
          }}
        >
          Открыть курс <FaArrowRight />
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
  const navigate = useNavigate();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await api.get('/courses?published=true&limit=20');
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Ошибка загрузки курсов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCourse = useCallback((courseId) => {
    navigate(`/student/courses/${courseId}`);
  }, [navigate]);

  const getDifficultyLabel = useCallback((level) => {
    const labels = {
      beginner: 'Начальный',
      intermediate: 'Средний',
      advanced: 'Продвинутый'
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
          {courses.map(course => (
            <CourseCard 
              key={course.id}
              course={course}
              onOpen={handleOpenCourse}
              getDifficultyLabel={getDifficultyLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentCourses;
