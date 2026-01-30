import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaClock, FaGraduationCap, FaArrowRight } from 'react-icons/fa';
import api, { BASE_URL } from '../../utils/api';
import styles from './StudentCourses.module.css';

function StudentCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await api.get('/courses?published=true');
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Ошибка загрузки курсов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCourse = (courseId) => {
    navigate(`/student/courses/${courseId}`);
  };

  const getDifficultyLabel = (level) => {
    const labels = {
      beginner: 'Начальный',
      intermediate: 'Средний',
      advanced: 'Продвинутый'
    };
    return labels[level] || level;
  };

  if (loading) {
    return <div className={styles.coursesPage}>Загрузка...</div>;
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
            <div 
              key={course.id} 
              className={styles.courseCard}
              onClick={() => handleOpenCourse(course.id)}
            >
              <div className={styles.courseThumbnail}>
                {course.thumbnail_url ? (
                  <img src={`${BASE_URL}${course.thumbnail_url}`} alt={course.title} />
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
                    handleOpenCourse(course.id);
                  }}
                >
                  Открыть курс <FaArrowRight />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentCourses;
