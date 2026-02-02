import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaBook, 
  FaClock, 
  FaUsers, 
  FaGraduationCap,
  FaCheckCircle,
  FaVideo,
  FaFileAlt,
  FaCertificate,
  FaGlobe,
  FaUserTie,
  FaTag,
  FaListUl,
  FaLightbulb,
  FaBullseye,
  FaCoins,
  FaStar,
  FaLock,
  FaTimes
} from 'react-icons/fa';
import api, { BASE_URL } from '../../utils/api';
import styles from './CourseDetail.module.css';

function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [enrolled, setEnrolled] = useState(false);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [userLevel, setUserLevel] = useState(1);
  const [userPoints, setUserPoints] = useState(0);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadCourseDetails();
    loadUserData();
  }, [id]);

  const loadUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      const user = response.data.user || response.data;
      const exp = user.experience || 0;
      setUserLevel(Math.floor(exp / 100) + 1);
      setUserPoints(user.points || 0);
    } catch (error) {
      console.error('Ошибка загрузки данных пользователя:', error);
    }
  };

  const loadCourseDetails = async () => {
    try {
      const response = await api.get(`/courses/${id}`);
      setCourse(response.data.course);
      setLessons(response.data.lessons || []);
      setCategories(response.data.categories || []);
      setEnrolled(response.data.enrolled || false);
      setProgress(response.data.progress || []);
      
      // Автоматически раскрыть все категории
      const expanded = {};
      response.data.categories?.forEach(cat => {
        expanded[cat.id] = true;
      });
      setExpandedCategories(expanded);
    } catch (error) {
      console.error('Ошибка загрузки курса:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    // Проверяем требования по уровню
    if (course.required_level && userLevel < course.required_level) {
      alert(`Для этого курса требуется ${course.required_level} уровень. Ваш уровень: ${userLevel}`);
      return;
    }
    
    // Если курс платный - показываем модалку подтверждения
    if (course.price && course.price > 0) {
      setShowPurchaseModal(true);
      return;
    }
    
    // Бесплатный курс - сразу записываем
    await enrollToCourse();
  };

  const enrollToCourse = async () => {
    setPurchasing(true);
    try {
      const response = await api.post(`/courses/${id}/enroll`);
      setEnrolled(true);
      setShowPurchaseModal(false);
      
      if (response.data.new_balance !== undefined) {
        setUserPoints(response.data.new_balance);
      }
      
      alert(response.data.message || 'Вы успешно записались на курс!');
    } catch (error) {
      console.error('Ошибка записи на курс:', error);
      const errorMsg = error.response?.data?.error || 'Не удалось записаться на курс';
      alert(errorMsg);
    } finally {
      setPurchasing(false);
    }
  };

  const handleOpenLesson = (lessonId) => {
    if (!enrolled) {
      alert('Запишитесь на курс, чтобы просматривать уроки');
      return;
    }
    navigate(`/student/courses/${id}/lessons/${lessonId}`);
  };

  const getDifficultyLabel = (level) => {
    const labels = {
      beginner: 'Начальный',
      intermediate: 'Средний',
      advanced: 'Продвинутый'
    };
    return labels[level] || level;
  };

  const isLessonCompleted = (lessonId) => {
    return progress.some(p => p.lesson_id === lessonId && p.completed);
  };

  const calculateProgress = () => {
    if (lessons.length === 0) return 0;
    const completed = lessons.filter(l => isLessonCompleted(l.id)).length;
    return Math.round((completed / lessons.length) * 100);
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const getLessonsByCategory = (categoryId) => {
    return lessons.filter(l => l.category_id === categoryId);
  };

  const getLessonsWithoutCategory = () => {
    return lessons.filter(l => !l.category_id);
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (!course) {
    return (
      <div className={styles.courseDetail}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FaBook />
          </div>
          <h3>Курс не найден</h3>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.courseDetail}>
      <button className={styles.backButton} onClick={() => navigate('/student/courses')}>
        <FaArrowLeft /> Назад к курсам
      </button>

      <div className={styles.courseHeader}>
        <div className={styles.courseHeaderTop}>
          <div className={styles.courseHeaderContent}>
            <span className={`${styles.difficultyBadge} ${styles[course.difficulty_level]}`}>
              {getDifficultyLabel(course.difficulty_level)}
            </span>
            <h1 className={styles.courseTitle}>{course.title}</h1>
            <p className={styles.courseDescription}>{course.description}</p>
            <div className={styles.courseStats}>
              <div className={styles.courseStat}>
                <FaBook /> {lessons.length} уроков
              </div>
              <div className={styles.courseStat}>
                <FaClock /> {course.duration_hours}ч
              </div>
              <div className={styles.courseStat}>
                <FaUsers /> {course.enrolled_count || 0} студентов
              </div>
              {course.language && (
                <div className={styles.courseStat}>
                  <FaGlobe /> {course.language}
                </div>
              )}
              {course.certificate_available && (
                <div className={styles.courseStat}>
                  <FaCertificate /> Сертификат
                </div>
              )}
            </div>
            {course.instructor_name && (
              <div className={styles.instructorInfo}>
                <FaUserTie /> Преподаватель: <strong>{course.instructor_name}</strong>
              </div>
            )}
            {course.category && (
              <div className={styles.categoryInfo}>
                <FaTag /> Категория: <strong>{course.category}</strong>
              </div>
            )}
            
            {/* Требования к курсу */}
            {(course.required_level > 0 || course.price > 0) && !enrolled && (
              <div className={styles.courseRequirements}>
                {course.required_level > 0 && (
                  <div className={`${styles.requirementItem} ${userLevel >= course.required_level ? styles.met : styles.notMet}`}>
                    <FaStar /> 
                    <span>Требуемый уровень: {course.required_level}</span>
                    {userLevel >= course.required_level ? (
                      <FaCheckCircle className={styles.checkIcon} />
                    ) : (
                      <span className={styles.yourLevel}>(Ваш: {userLevel})</span>
                    )}
                  </div>
                )}
                {course.price > 0 && (
                  <div className={`${styles.requirementItem} ${userPoints >= course.price ? styles.met : styles.notMet}`}>
                    <FaCoins /> 
                    <span>Цена: {course.price} баллов</span>
                    {userPoints >= course.price ? (
                      <FaCheckCircle className={styles.checkIcon} />
                    ) : (
                      <span className={styles.yourLevel}>(У вас: {userPoints})</span>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {enrolled ? (
              <div className={styles.enrolledBadge}>
                <FaCheckCircle /> Вы записаны на курс
              </div>
            ) : course.required_level > 0 && userLevel < course.required_level ? (
              <button className={`${styles.enrollButton} ${styles.lockedButton}`} disabled>
                <FaLock /> Требуется {course.required_level} уровень
              </button>
            ) : (
              <button className={styles.enrollButton} onClick={handleEnroll}>
                {course.price > 0 ? (
                  <><FaCoins /> Купить за {course.price} баллов</>
                ) : (
                  <><FaGraduationCap /> Записаться на курс</>
                )}
              </button>
            )}
          </div>
          <div className={styles.courseThumbnail}>
            {course.thumbnail_url ? (
              <img src={`${BASE_URL}${course.thumbnail_url}`} alt={course.title} />
            ) : (
              <FaBook />
            )}
          </div>
        </div>
        
        {enrolled && lessons.length > 0 && (
          <div className={styles.progressBar}>
            <div className={styles.progressLabel}>
              <span>Прогресс прохождения</span>
              <span>{calculateProgress()}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${calculateProgress()}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.mainContent}>
          {course.detailed_description && (
            <div className={styles.detailedDescription}>
              <h2>О курсе</h2>
              <div 
                className="ql-editor"
                dangerouslySetInnerHTML={{ __html: course.detailed_description }}
              />
            </div>
          )}

          {course.learning_outcomes && (
            <div className={styles.infoSection}>
              <h2><FaLightbulb /> Чему вы научитесь</h2>
              <div className={styles.infoContent}>
                {course.learning_outcomes.split('\n').map((item, index) => (
                  item.trim() && <p key={index}>✓ {item}</p>
                ))}
              </div>
            </div>
          )}

          <div className={styles.lessonsSection}>
            <h2>Уроки курса</h2>
        {lessons.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <FaFileAlt />
            </div>
            <p>Уроки пока не добавлены</p>
          </div>
        ) : (
          <>
            {categories.length > 0 ? (
              <>
                {categories.map((category) => {
                  const categoryLessons = getLessonsByCategory(category.id);
                  if (categoryLessons.length === 0) return null;
                  
                  return (
                    <div key={category.id} className={styles.categorySection}>
                      <div 
                        className={styles.categoryHeader}
                        onClick={() => toggleCategory(category.id)}
                      >
                        <div className={styles.categoryTitle}>
                          <FaBook />
                          <h3>{category.title}</h3>
                          <span className={styles.categoryCount}>
                            {categoryLessons.length} {categoryLessons.length === 1 ? 'урок' : 'уроков'}
                          </span>
                        </div>
                        <button className={styles.toggleButton}>
                          {expandedCategories[category.id] ? '−' : '+'}
                        </button>
                      </div>
                      {category.description && (
                        <p className={styles.categoryDescription}>{category.description}</p>
                      )}
                      {expandedCategories[category.id] && (
                        <div className={styles.lessonsList}>
                          {categoryLessons.map((lesson, index) => (
                            <div 
                              key={lesson.id}
                              className={`${styles.lessonCard} ${isLessonCompleted(lesson.id) ? styles.completed : ''}`}
                              onClick={() => handleOpenLesson(lesson.id)}
                            >
                              <div className={styles.lessonNumber}>{index + 1}</div>
                              <div className={styles.lessonContent}>
                                <div className={styles.lessonTitle}>{lesson.title}</div>
                                {lesson.duration_minutes && (
                                  <div className={styles.lessonDuration}>
                                    <FaClock /> {lesson.duration_minutes} мин
                                  </div>
                                )}
                              </div>
                              <div className={styles.lessonIcon}>
                                {isLessonCompleted(lesson.id) ? (
                                  <FaCheckCircle />
                                ) : lesson.video_url ? (
                                  <FaVideo />
                                ) : (
                                  <FaFileAlt />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {getLessonsWithoutCategory().length > 0 && (
                  <div className={styles.categorySection}>
                    <div className={styles.categoryHeader}>
                      <div className={styles.categoryTitle}>
                        <FaBook />
                        <h3>Дополнительные уроки</h3>
                        <span className={styles.categoryCount}>
                          {getLessonsWithoutCategory().length} {getLessonsWithoutCategory().length === 1 ? 'урок' : 'уроков'}
                        </span>
                      </div>
                    </div>
                    <div className={styles.lessonsList}>
                      {getLessonsWithoutCategory().map((lesson, index) => (
                        <div 
                          key={lesson.id}
                          className={`${styles.lessonCard} ${isLessonCompleted(lesson.id) ? styles.completed : ''}`}
                          onClick={() => handleOpenLesson(lesson.id)}
                        >
                          <div className={styles.lessonNumber}>{index + 1}</div>
                          <div className={styles.lessonContent}>
                            <div className={styles.lessonTitle}>{lesson.title}</div>
                            {lesson.duration_minutes && (
                              <div className={styles.lessonDuration}>
                                <FaClock /> {lesson.duration_minutes} мин
                              </div>
                            )}
                          </div>
                          <div className={styles.lessonIcon}>
                            {isLessonCompleted(lesson.id) ? (
                              <FaCheckCircle />
                            ) : lesson.video_url ? (
                              <FaVideo />
                            ) : (
                              <FaFileAlt />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.lessonsList}>
                {lessons.map((lesson, index) => (
                  <div 
                    key={lesson.id}
                    className={`${styles.lessonCard} ${isLessonCompleted(lesson.id) ? styles.completed : ''}`}
                    onClick={() => handleOpenLesson(lesson.id)}
                  >
                    <div className={styles.lessonNumber}>{index + 1}</div>
                    <div className={styles.lessonContent}>
                      <div className={styles.lessonTitle}>{lesson.title}</div>
                      {lesson.duration_minutes && (
                        <div className={styles.lessonDuration}>
                          <FaClock /> {lesson.duration_minutes} мин
                        </div>
                      )}
                    </div>
                    <div className={styles.lessonIcon}>
                      {isLessonCompleted(lesson.id) ? (
                        <FaCheckCircle />
                      ) : lesson.video_url ? (
                        <FaVideo />
                      ) : (
                        <FaFileAlt />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
          </div>
        </div>

        <aside className={styles.sidebar}>
          {course.requirements && (
            <div className={styles.sidebarCard}>
              <h3><FaListUl /> Требования</h3>
              <div className={styles.sidebarContent}>
                {course.requirements.split('\n').map((item, index) => (
                  item.trim() && <p key={index}>• {item}</p>
                ))}
              </div>
            </div>
          )}

          {course.target_audience && (
            <div className={styles.sidebarCard}>
              <h3><FaBullseye /> Для кого этот курс</h3>
              <div className={styles.sidebarContent}>
                {course.target_audience.split('\n').map((item, index) => (
                  item.trim() && <p key={index}>→ {item}</p>
                ))}
              </div>
            </div>
          )}

          <div className={styles.sidebarCard}>
            <h3>Информация о курсе</h3>
            <div className={styles.courseInfo}>
              <div className={styles.infoItem}>
                <FaBook />
                <div>
                  <strong>Уроков</strong>
                  <p>{lessons.length}</p>
                </div>
              </div>
              <div className={styles.infoItem}>
                <FaClock />
                <div>
                  <strong>Длительность</strong>
                  <p>{course.duration_hours} часов</p>
                </div>
              </div>
              <div className={styles.infoItem}>
                <FaUsers />
                <div>
                  <strong>Студентов</strong>
                  <p>{course.enrolled_count || 0}</p>
                </div>
              </div>
              {course.language && (
                <div className={styles.infoItem}>
                  <FaGlobe />
                  <div>
                    <strong>Язык</strong>
                    <p>{course.language}</p>
                  </div>
                </div>
              )}
              {course.certificate_available && (
                <div className={styles.infoItem}>
                  <FaCertificate />
                  <div>
                    <strong>Сертификат</strong>
                    <p>Доступен</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Модалка подтверждения покупки */}
      {showPurchaseModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPurchaseModal(false)}>
          <div className={styles.purchaseModal} onClick={e => e.stopPropagation()}>
            <button className={styles.closeModal} onClick={() => setShowPurchaseModal(false)}>
              <FaTimes />
            </button>
            <div className={styles.modalIcon}>
              <FaGraduationCap />
            </div>
            <h2>Покупка курса</h2>
            <p className={styles.modalCourseTitle}>{course.title}</p>
            
            <div className={styles.purchaseDetails}>
              <div className={styles.purchaseRow}>
                <span>Стоимость курса:</span>
                <span className={styles.priceValue}><FaCoins /> {course.price}</span>
              </div>
              <div className={styles.purchaseRow}>
                <span>Ваш баланс:</span>
                <span className={userPoints >= course.price ? styles.balanceOk : styles.balanceNot}>
                  <FaCoins /> {userPoints}
                </span>
              </div>
              <div className={styles.purchaseRow}>
                <span>После покупки:</span>
                <span><FaCoins /> {userPoints - course.price}</span>
              </div>
            </div>
            
            {userPoints < course.price ? (
              <div className={styles.notEnoughPoints}>
                <FaLock /> Недостаточно баллов
                <p>Вам не хватает {course.price - userPoints} баллов</p>
              </div>
            ) : (
              <button 
                className={styles.confirmPurchase}
                onClick={enrollToCourse}
                disabled={purchasing}
              >
                {purchasing ? 'Покупка...' : `Купить за ${course.price} баллов`}
              </button>
            )}
            
            <button className={styles.cancelPurchase} onClick={() => setShowPurchaseModal(false)}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseDetail;