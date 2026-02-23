import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft, FaArrowRight, FaBook, FaClock, FaUsers, FaGraduationCap, FaCheckCircle,
  FaVideo, FaFileAlt, FaCertificate, FaGlobe, FaUserTie, FaTag,
  FaListUl, FaLightbulb, FaBullseye, FaCoins, FaStar, FaLock, FaTimes,
  FaChevronDown, FaChevronRight,
} from "react-icons/fa";
import { MdOutlineSchool } from "react-icons/md";
import { AiOutlineArrowLeft } from "react-icons/ai";
import api, { BASE_URL } from "../../utils/api";
import styles from "./CourseDetail.module.css";

function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse]   = useState(null);
  const [lessons, setLessons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [enrolled, setEnrolled]     = useState(false);
  const [progress, setProgress]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [expandedCats, setExpandedCats] = useState({});
  const [userLevel, setUserLevel]   = useState(1);
  const [userPoints, setUserPoints] = useState(0);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadCourseDetails();
    loadUserData();
  }, [id]);

  const loadUserData = async () => {
    try {
      const res = await api.get("/auth/me");
      const user = res.data.user || res.data;
      setUserLevel(Math.floor((user.experience || 0) / 100) + 1);
      setUserPoints(user.points || 0);
    } catch {}
  };

  const loadCourseDetails = async () => {
    try {
      const res = await api.get(`/courses/${id}`);
      setCourse(res.data.course);
      setLessons(res.data.lessons || []);
      setCategories(res.data.categories || []);
      setEnrolled(res.data.enrolled || false);
      setProgress(res.data.progress || []);
      const exp = {};
      res.data.categories?.forEach(c => { exp[c.id] = true; });
      setExpandedCats(exp);
    } catch (err) {
      console.error("Ошибка загрузки курса:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (course.required_level && userLevel < course.required_level) {
      alert(`Требуется уровень ${course.required_level}. Ваш уровень: ${userLevel}`);
      return;
    }
    if (course.price > 0) { setShowPurchaseModal(true); return; }
    await enrollToCourse();
  };

  const enrollToCourse = async () => {
    setPurchasing(true);
    try {
      const res = await api.post(`/courses/${id}/enroll`);
      if (res.data.new_balance !== undefined) setUserPoints(res.data.new_balance);
      setShowPurchaseModal(false);
      // Re-fetch course data so enrolled state is always in sync with server
      await refreshEnrollment();
    } catch (err) {
      const msg = err.response?.data?.error || "";
      // If already enrolled (e.g. previous purchase went through), just refresh UI
      if (msg.includes("уже записаны") || msg.includes("already enrolled")) {
        setShowPurchaseModal(false);
        await refreshEnrollment();
      } else {
        alert(msg || "Не удалось записаться на курс");
      }
    } finally {
      setPurchasing(false);
    }
  };

  const refreshEnrollment = async () => {
    try {
      const res = await api.get(`/courses/${id}`);
      setEnrolled(res.data.enrolled || false);
      setProgress(res.data.progress || []);
      if (res.data.course) setCourse(res.data.course);
    } catch {}
  };

  const handleOpenLesson = (lessonId) => {
    if (!enrolled) { alert("Запишитесь на курс, чтобы просматривать уроки"); return; }
    navigate(`/student/courses/${id}/lessons/${lessonId}`);
  };

  const getDiffLabel = (l) =>
    ({ beginner: "Начальный", intermediate: "Средний", advanced: "Продвинутый" }[l] || l);

  const isCompleted = (lessonId) => progress.some(p => p.lesson_id === lessonId && p.completed);

  const calcProgress = () => {
    if (!lessons.length) return 0;
    return Math.round(lessons.filter(l => isCompleted(l.id)).length / lessons.length * 100);
  };

  const getLessonsByCat = (catId) => lessons.filter(l => l.category_id === catId);
  const getLessonsNoCat = () => lessons.filter(l => !l.category_id);

  const DIFF_CLS = { beginner: styles.diffEasy, intermediate: styles.diffMid, advanced: styles.diffHard };

  const renderLessonRow = (lesson, index) => (
    <div
      key={lesson.id}
      className={`${styles.lessonRow} ${isCompleted(lesson.id) ? styles.lessonCompleted : ""} ${!enrolled ? styles.lessonLocked : ""}`}
      onClick={() => handleOpenLesson(lesson.id)}
    >
      <div className={styles.lessonNum}>{index + 1}</div>
      <div className={styles.lessonInfo}>
        <span className={styles.lessonTitle}>{lesson.title}</span>
        {lesson.duration_minutes && (
          <span className={styles.lessonDur}><FaClock /> {lesson.duration_minutes} мин</span>
        )}
      </div>
      <div className={styles.lessonStatusIcon}>
        {isCompleted(lesson.id)
          ? <FaCheckCircle className={styles.iconDone} />
          : lesson.video_url ? <FaVideo /> : <FaFileAlt />}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.spinnerWrap}>
          <div className={styles.spinner} />
          <p>Загрузка курса...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className={styles.page}>
        <button className={styles.backBtn} onClick={() => navigate("/student/courses")}>
          <AiOutlineArrowLeft /> Назад к курсам
        </button>
        <div className={styles.emptyState}>
          <FaBook className={styles.emptyIcon} />
          <h3>Курс не найден</h3>
        </div>
      </div>
    );
  }

  const isLocked   = course.required_level > 0 && userLevel < course.required_level;
  const canAfford  = !course.price || userPoints >= course.price;
  const pct         = calcProgress();

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => navigate("/student/courses")}>
        <AiOutlineArrowLeft /> Назад к курсам
      </button>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.heroTopBadges}>
            <span className={`${styles.diffBadge} ${DIFF_CLS[course.difficulty_level] || ""}`}>
              {getDiffLabel(course.difficulty_level)}
            </span>
            {course.category && (
              <span className={styles.catBadge}><FaTag /> {course.category}</span>
            )}
          </div>
          <h1 className={styles.heroTitle}>{course.title}</h1>
          <p className={styles.heroDesc}>{course.description}</p>

          <div className={styles.heroStats}>
            <span><FaBook /> {lessons.length} уроков</span>
            <span><FaClock /> {course.duration_hours || 0}ч</span>
            <span><FaUsers /> {course.enrolled_count || 0} студентов</span>
            {course.language && <span><FaGlobe /> {course.language}</span>}
            {course.certificate_available && <span><FaCertificate /> Сертификат</span>}
          </div>

          {course.instructor_name && (
            <div className={styles.instructorRow}>
              <FaUserTie /> <span>Преподаватель: <strong>{course.instructor_name}</strong></span>
            </div>
          )}

          {/* Requirements */}
          {(isLocked || (course.price > 0 && !enrolled)) && (
            <div className={styles.reqRow}>
              {course.required_level > 0 && (
                <div className={`${styles.reqItem} ${userLevel >= course.required_level ? styles.reqMet : styles.reqNot}`}>
                  <FaStar />
                  <span>Уровень {course.required_level}</span>
                  {userLevel >= course.required_level
                    ? <FaCheckCircle />
                    : <span className={styles.reqYours}>(ваш: {userLevel})</span>}
                </div>
              )}
              {course.price > 0 && (
                <div className={`${styles.reqItem} ${canAfford ? styles.reqMet : styles.reqNot}`}>
                  <FaCoins />
                  <span>{course.price} баллов</span>
                  {canAfford
                    ? <FaCheckCircle />
                    : <span className={styles.reqYours}>(у вас: {userPoints})</span>}
                </div>
              )}
            </div>
          )}

          {/* Enroll button / status */}
          {enrolled ? (
            <div className={styles.enrolledBadge}><FaCheckCircle /> Вы записаны на курс</div>
          ) : isLocked ? (
            <button className={`${styles.enrollBtn} ${styles.enrollBtnLocked}`} disabled>
              <FaLock /> Требуется уровень {course.required_level}
            </button>
          ) : (
            <button className={styles.enrollBtn} onClick={handleEnroll}>
              {course.price > 0
                ? <><FaCoins /> Купить за {course.price} баллов</>
                : <><FaGraduationCap /> Записаться на курс</>}
            </button>
          )}
        </div>

        {/* Thumbnail */}
        <div className={styles.heroThumb}>
          {course.thumbnail_url ? (
            <img src={`${BASE_URL}${course.thumbnail_url}`} alt={course.title} />
          ) : (
            <div className={styles.heroThumbFallback}><FaBook /></div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {enrolled && lessons.length > 0 && (
        <div className={styles.progressCard}>
          <div className={styles.progressLbl}>
            <span>Прогресс прохождения</span>
            <span className={styles.progressPct}>{pct}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
          <div className={styles.progressSub}>
            {lessons.filter(l => isCompleted(l.id)).length} из {lessons.length} уроков пройдено
          </div>
        </div>
      )}

      {/* Main 2-col grid */}
      <div className={styles.mainGrid}>
        {/* Left: content */}
        <div className={styles.mainCol}>
          {course.detailed_description && (
            <div className={styles.contentCard}>
              <div className={styles.cardHeader}><MdOutlineSchool /> О курсе</div>
              <div
                className="ql-editor"
                dangerouslySetInnerHTML={{ __html: course.detailed_description }}
              />
            </div>
          )}

          {course.learning_outcomes && (
            <div className={styles.contentCard}>
              <div className={styles.cardHeader}><FaLightbulb /> Чему вы научитесь</div>
              <div className={styles.outcomesGrid}>
                {course.learning_outcomes.split("\n").filter(s => s.trim()).map((item, i) => (
                  <div key={i} className={styles.outcomeItem}>
                    <FaCheckCircle className={styles.outcomeCheck} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lessons */}
          <div className={styles.contentCard}>
            <div className={styles.cardHeader}><FaBook /> Уроки курса</div>
            {lessons.length === 0 ? (
              <div className={styles.emptyState}>
                <FaFileAlt className={styles.emptyIcon} />
                <p>Уроки пока не добавлены</p>
              </div>
            ) : categories.length > 0 ? (
              <>
                {categories.map(cat => {
                  const catLessons = getLessonsByCat(cat.id);
                  if (!catLessons.length) return null;
                  const open = expandedCats[cat.id];
                  return (
                    <div key={cat.id} className={styles.catSection}>
                      <div
                        className={styles.catHeader}
                        onClick={() => setExpandedCats(p => ({ ...p, [cat.id]: !p[cat.id] }))}
                      >
                        <div className={styles.catHeaderLeft}>
                          {open ? <FaChevronDown /> : <FaChevronRight />}
                          <strong>{cat.title}</strong>
                          <span className={styles.catCount}>{catLessons.length} уроков</span>
                        </div>
                      </div>
                      {cat.description && <p className={styles.catDesc}>{cat.description}</p>}
                      {open && (
                        <div className={styles.lessonsList}>
                          {catLessons.map((l, i) => renderLessonRow(l, i))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {getLessonsNoCat().length > 0 && (
                  <div className={styles.catSection}>
                    <div className={styles.catHeader} style={{ cursor: "default" }}>
                      <div className={styles.catHeaderLeft}>
                        <strong>Дополнительные уроки</strong>
                        <span className={styles.catCount}>{getLessonsNoCat().length} уроков</span>
                      </div>
                    </div>
                    <div className={styles.lessonsList}>
                      {getLessonsNoCat().map((l, i) => renderLessonRow(l, i))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.lessonsList}>
                {lessons.map((l, i) => renderLessonRow(l, i))}
              </div>
            )}
          </div>
        </div>

        {/* Right: sidebar */}
        <aside className={styles.sideCol}>
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>Информация о курсе</div>
            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <FaBook />
                <div><strong>Уроков</strong><p>{lessons.length}</p></div>
              </div>
              <div className={styles.infoRow}>
                <FaClock />
                <div><strong>Длительность</strong><p>{course.duration_hours} ч</p></div>
              </div>
              <div className={styles.infoRow}>
                <FaUsers />
                <div><strong>Студентов</strong><p>{course.enrolled_count || 0}</p></div>
              </div>
              {course.language && (
                <div className={styles.infoRow}>
                  <FaGlobe />
                  <div><strong>Язык</strong><p>{course.language}</p></div>
                </div>
              )}
              {course.certificate_available && (
                <div className={styles.infoRow}>
                  <FaCertificate />
                  <div><strong>Сертификат</strong><p>Доступен</p></div>
                </div>
              )}
            </div>
          </div>

          {course.requirements && (
            <div className={styles.infoCard}>
              <div className={styles.cardHeader}><FaListUl /> Требования</div>
              <div className={styles.sideList}>
                {course.requirements.split("\n").filter(s => s.trim()).map((item, i) => (
                  <p key={i} style={{display:'flex',alignItems:'flex-start',gap:'6px'}}><FaChevronRight style={{marginTop:'3px',flexShrink:0,color:'var(--accent)'}} />{item}</p>
                ))}
              </div>
            </div>
          )}

          {course.target_audience && (
            <div className={styles.infoCard}>
              <div className={styles.cardHeader}><FaBullseye /> Для кого курс</div>
              <div className={styles.sideList}>
                {course.target_audience.split("\n").filter(s => s.trim()).map((item, i) => (
                  <p key={i} style={{display:'flex',alignItems:'flex-start',gap:'6px'}}><FaArrowRight style={{marginTop:'3px',flexShrink:0,color:'var(--accent)'}} />{item}</p>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Purchase modal */}
      {showPurchaseModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPurchaseModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowPurchaseModal(false)}><FaTimes /></button>
            <div className={styles.modalIcon}><FaGraduationCap /></div>
            <h2 className={styles.modalTitle}>Покупка курса</h2>
            <p className={styles.modalCourseName}>{course.title}</p>
            <div className={styles.purchaseRows}>
              <div className={styles.purchaseRow}>
                <span>Стоимость курса</span>
                <span className={styles.purchaseVal}><FaCoins /> {course.price}</span>
              </div>
              <div className={styles.purchaseRow}>
                <span>Ваш баланс</span>
                <span className={canAfford ? styles.balOk : styles.balNot}><FaCoins /> {userPoints}</span>
              </div>
              <div className={`${styles.purchaseRow} ${styles.purchaseRowTotal}`}>
                <span>После покупки</span>
                <span><FaCoins /> {userPoints - course.price}</span>
              </div>
            </div>
            {!canAfford ? (
              <div className={styles.notEnough}>
                <FaLock /> Недостаточно баллов (не хватает {course.price - userPoints})
              </div>
            ) : (
              <button className={styles.confirmBtn} onClick={enrollToCourse} disabled={purchasing}>
                {purchasing ? "Покупка..." : `Купить за ${course.price} баллов`}
              </button>
            )}
            <button className={styles.cancelBtn} onClick={() => setShowPurchaseModal(false)}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseDetail;
