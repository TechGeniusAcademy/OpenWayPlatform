import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaCheckCircle, 
  FaChevronLeft, 
  FaChevronRight,
  FaClock,
  FaVideo,
  FaBook,
  FaPlay
} from 'react-icons/fa';
import api, { BASE_URL } from '../../utils/api';
import styles from './LessonViewer.module.css';

function LessonViewer() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timecodes, setTimecodes] = useState([]);
  const videoRef = useRef(null);

  useEffect(() => {
    loadLesson();
  }, [courseId, lessonId]);

  const loadLesson = async () => {
    try {
      // Загружаем информацию о курсе с уроками и прогрессом
      const courseResponse = await api.get(`/courses/${courseId}`);
      const allLessons = courseResponse.data.lessons || [];
      const progress = courseResponse.data.progress || [];
      
      setLessons(allLessons);
      
      // Находим текущий урок
      const currentLesson = allLessons.find(l => l.id === parseInt(lessonId));
      setLesson(currentLesson);
      
      // Парсим таймкоды если есть
      if (currentLesson?.timecodes) {
        const parsedTimecodes = typeof currentLesson.timecodes === 'string' 
          ? JSON.parse(currentLesson.timecodes) 
          : currentLesson.timecodes;
        setTimecodes(parsedTimecodes || []);
      } else {
        setTimecodes([]);
      }
      
      // Проверяем, завершен ли урок
      const isCompleted = progress.some(
        p => p.lesson_id === parseInt(lessonId) && p.completed
      );
      setCompleted(isCompleted);
    } catch (error) {
      console.error('Ошибка загрузки урока:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      await api.post(`/courses/${courseId}/lessons/${lessonId}/complete`);
      setCompleted(true);
      alert('Урок отмечен как завершенный!');
    } catch (error) {
      console.error('Ошибка завершения урока:', error);
      alert('Не удалось отметить урок как завершенный');
    }
  };

  const getCurrentLessonIndex = () => {
    return lessons.findIndex(l => l.id === parseInt(lessonId));
  };

  const handlePreviousLesson = () => {
    const currentIndex = getCurrentLessonIndex();
    if (currentIndex > 0) {
      const prevLesson = lessons[currentIndex - 1];
      navigate(`/student/courses/${courseId}/lessons/${prevLesson.id}`);
    }
  };

  const handleNextLesson = () => {
    const currentIndex = getCurrentLessonIndex();
    if (currentIndex < lessons.length - 1) {
      const nextLesson = lessons[currentIndex + 1];
      navigate(`/student/courses/${courseId}/lessons/${nextLesson.id}`);
    }
  };

  const getVideoEmbedUrl = (url) => {
    if (!url) return null;
    
    // Если это локальный файл
    if (url.startsWith('/uploads/')) {
      return null; // Будем использовать <video> тег
    }
    
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    
    return url;
  };

  const isLocalVideo = (url) => {
    return url && url.startsWith('/uploads/');
  };

  const handleTimecodeClick = (time) => {
    if (!videoRef.current) return;
    
    // Конвертируем время в секунды
    const parts = time.split(':').reverse();
    let seconds = 0;
    
    if (parts[0]) seconds += parseInt(parts[0]); // секунды
    if (parts[1]) seconds += parseInt(parts[1]) * 60; // минуты
    if (parts[2]) seconds += parseInt(parts[2]) * 3600; // часы
    
    videoRef.current.currentTime = seconds;
    videoRef.current.play();
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (!lesson) {
    return (
      <div className={styles.lessonViewer}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FaBook />
          </div>
          <h3>Урок не найден</h3>
        </div>
      </div>
    );
  }

  const currentIndex = getCurrentLessonIndex();
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < lessons.length - 1;
  const embedUrl = getVideoEmbedUrl(lesson.video_url);

  return (
    <div className={styles.lessonViewer}>
      <div className={styles.lessonHeader}>
        <button 
          className={styles.backButton} 
          onClick={() => navigate(`/student/courses/${courseId}`)}
        >
          <FaArrowLeft /> К курсу
        </button>
        <div className={styles.headerActions}>
          {completed ? (
            <div className={styles.completedBadge}>
              <FaCheckCircle /> Урок завершен
            </div>
          ) : (
            <button 
              className={styles.completeButton} 
              onClick={handleComplete}
            >
              <FaCheckCircle /> Отметить завершенным
            </button>
          )}
        </div>
      </div>

      <div className={styles.lessonCard}>
        <div className={styles.lessonInfo}>
          <h1 className={styles.lessonTitle}>{lesson.title}</h1>
          <div className={styles.lessonMeta}>
            <span>
              <FaBook /> Урок {currentIndex + 1} из {lessons.length}
            </span>
            {lesson.duration_minutes && (
              <span>
                <FaClock /> {lesson.duration_minutes} минут
              </span>
            )}
            {lesson.video_url && (
              <span>
                <FaVideo /> Видеоурок
              </span>
            )}
          </div>
        </div>

        {lesson.video_url && (
          <div className={styles.videoSection}>
            <div className={styles.videoContainer}>
              {isLocalVideo(lesson.video_url) ? (
                <video ref={videoRef} controls className={styles.localVideo}>
                  <source src={`${BASE_URL}${lesson.video_url}`} type="video/mp4" />
                  Ваш браузер не поддерживает воспроизведение видео.
                </video>
              ) : embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={lesson.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : null}
            </div>

            {timecodes.length > 0 && isLocalVideo(lesson.video_url) && (
              <div className={styles.timecodesPanel}>
                <h3><FaClock /> Содержание видео</h3>
                <div className={styles.timecodesList}>
                  {timecodes.map((tc, index) => (
                    <div 
                      key={index} 
                      className={styles.timecodeItem}
                      onClick={() => handleTimecodeClick(tc.time)}
                    >
                      <div className={styles.timecodeTime}>
                        <FaPlay /> {tc.time}
                      </div>
                      <div className={styles.timecodeTitle}>{tc.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className={styles.lessonContent}>
          {lesson.content ? (
            <div 
              className="ql-editor"
              dangerouslySetInnerHTML={{ __html: lesson.content }}
            />
          ) : (
            <div className={styles.emptyState}>
              <p>Содержимое урока пока не добавлено</p>
            </div>
          )}
        </div>
      </div>

      <div className={styles.lessonNavigation}>
        <button 
          className={`${styles.navButton} ${styles.prev}`}
          onClick={handlePreviousLesson}
          disabled={!hasPrevious}
        >
          <FaChevronLeft /> Предыдущий урок
        </button>
        <div className={styles.navInfo}>
          Урок {currentIndex + 1} из {lessons.length}
        </div>
        <button 
          className={`${styles.navButton} ${styles.next}`}
          onClick={handleNextLesson}
          disabled={!hasNext}
        >
          Следующий урок <FaChevronRight />
        </button>
      </div>
    </div>
  );
}

export default LessonViewer;