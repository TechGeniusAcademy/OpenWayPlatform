import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { BASE_URL } from '../../utils/api';
import styles from './StudentSchedule.module.css';
import {
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiX,
  FiUsers,
  FiFileText,
  FiMessageSquare,
  FiCalendar,
  FiList,
  FiBookOpen,
  FiActivity,
} from 'react-icons/fi';
import { AiOutlineClockCircle } from 'react-icons/ai';

const DAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTH_NAMES = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
];
const MONTH_NAMES_GEN = [
  'января','февраля','марта','апреля','мая','июня',
  'июля','августа','сентября','октября','ноября','декабря',
];

const formatLocalDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const fmt = (time) => time?.substring(0, 5) || '';

const todayStr = formatLocalDate(new Date());

const StudentSchedule = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonDetails, setLessonDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => { loadSchedule(); }, [currentDate]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const startDate = formatLocalDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
      const endDate   = formatLocalDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));
      const res = await api.get(`/schedule/my-schedule?start_date=${startDate}&end_date=${endDate}`);
      setLessons(res.data);
    } catch (err) {
      console.error('Error loading schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const monthDays = useMemo(() => {
    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    const cells = [];
    const startPad = (first.getDay() + 6) % 7;
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(formatLocalDate(new Date(year, month, d)));
    return cells;
  }, [currentDate]);

  const getLessonsForDate = (dateStr) => lessons.filter(l => l.event_date === dateStr);

  const stats = useMemo(() => {
    const totalLessons = lessons.length;
    const totalMinutes = lessons.reduce((s, l) => s + (l.duration_minutes || 0), 0);
    const totalHours   = Math.round(totalMinutes / 60 * 10) / 10;
    const lessonDays   = new Set(lessons.map(l => l.event_date)).size;
    return { totalLessons, totalHours, lessonDays };
  }, [lessons]);

  const upcomingLessons = useMemo(() => {
    const week = new Date(); week.setDate(week.getDate() + 7);
    return lessons
      .filter(l => l.event_date >= todayStr && l.event_date <= formatLocalDate(week))
      .sort((a, b) => a.event_date.localeCompare(b.event_date) || a.lesson_time.localeCompare(b.lesson_time));
  }, [lessons]);

  const navigate = (dir) => setCurrentDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + dir); return d; });

  const openLessonModal = async (lesson, e) => {
    e?.stopPropagation();
    setSelectedLesson(lesson);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/schedule/lesson-details/${lesson.id}/${lesson.event_date}`);
      setLessonDetails(res.data);
    } catch { setLessonDetails(null); }
    finally { setLoadingDetails(false); }
  };

  const closeLessonModal = () => { setSelectedLesson(null); setLessonDetails(null); };

  const formatDayLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    if (dateStr === todayStr) return 'Сегодня';
    const tom = new Date(); tom.setDate(tom.getDate() + 1);
    if (dateStr === formatLocalDate(tom)) return 'Завтра';
    return `${d.getDate()} ${MONTH_NAMES_GEN[d.getMonth()]}`;
  };

  const selectedLessons  = getLessonsForDate(selectedDate);
  const selectedDateObj  = selectedDate ? new Date(selectedDate + 'T00:00:00') : null;

  return (
    <div className={styles.page}>

      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderIcon}><FiCalendar /></div>
        <div>
          <h1 className={styles.pageTitle}>Расписание</h1>
          <p className={styles.pageSub}>{MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</p>
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statTile}>
          <span className={styles.statTileIcon}><FiBookOpen /></span>
          <span className={styles.statTileVal}>{stats.totalLessons}</span>
          <span className={styles.statTileLabel}>Уроков в месяце</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statTileIcon}><AiOutlineClockCircle /></span>
          <span className={styles.statTileVal}>{stats.totalHours}</span>
          <span className={styles.statTileLabel}>Часов обучения</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statTileIcon}><FiActivity /></span>
          <span className={styles.statTileVal}>{stats.lessonDays}</span>
          <span className={styles.statTileLabel}>Учебных дней</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statTileIcon}><FiList /></span>
          <span className={styles.statTileVal}>{upcomingLessons.length}</span>
          <span className={styles.statTileLabel}>Предстоит (7 дней)</span>
        </div>
      </div>

      <div className={styles.mainGrid}>

        <div className={styles.calendarCard}>
          <div className={styles.calNav}>
            <button className={styles.navBtn} onClick={() => navigate(-1)}><FiChevronLeft /></button>
            <span className={styles.calNavTitle}>{MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
            <button className={styles.navBtn} onClick={() => navigate(1)}><FiChevronRight /></button>
          </div>

          <div className={styles.calGrid}>
            {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
              <div key={d} className={styles.calDayHeader}>{d}</div>
            ))}

            {loading ? (
              <div className={styles.calLoading}><div className={styles.spinner} /></div>
            ) : (
              monthDays.map((dateStr, i) => {
                if (!dateStr) return <div key={`pad-${i}`} className={styles.calCellEmpty} />;
                const dayLessons = getLessonsForDate(dateStr);
                const isToday    = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const d          = new Date(dateStr + 'T00:00:00');
                const isWeekend  = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={dateStr}
                    className={[
                      styles.calCell,
                      isToday    ? styles.calCellToday    : '',
                      isSelected ? styles.calCellSelected : '',
                      isWeekend  ? styles.calCellWeekend  : '',
                    ].join(' ')}
                    onClick={() => setSelectedDate(dateStr)}
                  >
                    <span className={styles.calDayNum}>{d.getDate()}</span>
                    {dayLessons.length > 0 && (
                      <div className={styles.calDots}>
                        {dayLessons.slice(0, 3).map((_, idx) => <span key={idx} className={styles.calDot} />)}
                        {dayLessons.length > 3 && <span className={styles.calDotMore}>+{dayLessons.length - 3}</span>}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className={styles.dayPanel}>
          <div className={styles.dayPanelHeader}>
            <span className={styles.dayPanelIcon}><FiCalendar /></span>
            <span className={styles.dayPanelTitle}>
              {selectedDateObj
                ? `${DAYS_SHORT[selectedDateObj.getDay()]}, ${selectedDateObj.getDate()} ${MONTH_NAMES_GEN[selectedDateObj.getMonth()]}`
                : 'Выберите день'}
            </span>
            {selectedDate === todayStr && <span className={styles.todayChip}>Сегодня</span>}
          </div>

          {selectedLessons.length === 0 ? (
            <div className={styles.dayEmpty}>
              <FiCalendar className={styles.dayEmptyIcon} />
              <p>Уроков нет</p>
            </div>
          ) : (
            <ul className={styles.dayLessonList}>
              {[...selectedLessons]
                .sort((a, b) => a.lesson_time.localeCompare(b.lesson_time))
                .map(lesson => (
                  <li key={`${lesson.id}-${lesson.event_date}`} className={styles.dayLessonItem}
                      onClick={(e) => openLessonModal(lesson, e)}>
                    <div className={styles.dayLessonTime}>
                      <FiClock />{fmt(lesson.lesson_time)}
                    </div>
                    <div className={styles.dayLessonBody}>
                      <span className={styles.dayLessonTitle}>{lesson.title}</span>
                      {lesson.description && (
                        <span className={styles.dayLessonDesc}>
                          {lesson.description.length > 70 ? lesson.description.substring(0, 70) + '…' : lesson.description}
                        </span>
                      )}
                      <div className={styles.dayLessonMeta}><span><FiClock /> {lesson.duration_minutes} мин</span></div>
                    </div>
                    <FiChevronRight className={styles.dayLessonArrow} />
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>

      <div className={styles.upcomingCard}>
        <div className={styles.cardHeader}>
          <span className={styles.cardHeaderIcon}><FiList /></span>
          Предстоящие уроки — ближайшие 7 дней
          <span className={styles.upcomingCount}>{upcomingLessons.length}</span>
        </div>

        {upcomingLessons.length === 0 ? (
          <div className={styles.upcomingEmpty}><FiCalendar /><p>На ближайшие 7 дней уроков нет</p></div>
        ) : (
          <div className={styles.upcomingList}>
            {upcomingLessons.map((lesson, idx) => {
              const prev = upcomingLessons[idx - 1];
              const showDivider = idx === 0 || prev?.event_date !== lesson.event_date;
              return (
                <div key={`${lesson.id}-${lesson.event_date}`}>
                  {showDivider && (
                    <div className={styles.upcomingDateDivider}><span>{formatDayLabel(lesson.event_date)}</span></div>
                  )}
                  <div className={styles.upcomingItem} onClick={() => openLessonModal(lesson)}>
                    <div className={styles.upcomingTimeCol}>
                      <span className={styles.upcomingTime}>{fmt(lesson.lesson_time)}</span>
                      <span className={styles.upcomingDur}>{lesson.duration_minutes} мин</span>
                    </div>
                    <div className={styles.upcomingBar} />
                    <div className={styles.upcomingBody}>
                      <span className={styles.upcomingTitle}>{lesson.title}</span>
                      {lesson.description && (
                        <span className={styles.upcomingDesc}>
                          {lesson.description.length > 90 ? lesson.description.substring(0, 90) + '…' : lesson.description}
                        </span>
                      )}
                    </div>
                    <FiChevronRight className={styles.upcomingArrow} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedLesson && (
        <div className={styles.modalOverlay} onClick={closeLessonModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalBanner}>
              <div className={styles.modalBannerOverlay} />
              <button className={styles.modalClose} onClick={closeLessonModal}><FiX /></button>
            </div>
            <div className={styles.modalHead}>
              <div className={styles.modalTitleBlock}>
                <h2>{selectedLesson.title}</h2>
                <div className={styles.modalMeta}>
                  <span>
                    <FiClock />
                    {new Date(selectedLesson.event_date + 'T00:00:00').toLocaleDateString('ru-RU', {
                      weekday: 'long', day: 'numeric', month: 'long'
                    })} в {fmt(selectedLesson.lesson_time)}
                  </span>
                  <span className={styles.modalDurChip}>{selectedLesson.duration_minutes} мин</span>
                </div>
              </div>
            </div>
            <div className={styles.modalBody}>
              {loadingDetails ? (
                <div className={styles.modalLoading}><div className={styles.spinner} /></div>
              ) : (
                <>
                  {selectedLesson.description && (
                    <div className={styles.modalSection}>
                      <h3 className={styles.modalSectionTitle}><FiFileText /> Описание</h3>
                      <p className={styles.modalDesc}>{selectedLesson.description}</p>
                    </div>
                  )}
                  {lessonDetails?.students && lessonDetails.students.length > 0 && (
                    <div className={styles.modalSection}>
                      <h3 className={styles.modalSectionTitle}><FiUsers /> Ученики ({lessonDetails.students.length})</h3>
                      <div className={styles.modalStudents}>
                        {lessonDetails.students.map(s => (
                          <div key={s.id} className={styles.modalStudent}>
                            {s.avatar_url
                              ? <img src={`${BASE_URL}${s.avatar_url}`} alt={s.username} className={styles.modalStudentAv} />
                              : <div className={styles.modalStudentAvPh}>{(s.full_name || s.username || 'U').charAt(0).toUpperCase()}</div>
                            }
                            <span>{s.full_name || s.username}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {lessonDetails?.notes && lessonDetails.notes.length > 0 ? (
                    <div className={styles.modalSection}>
                      <h3 className={styles.modalSectionTitle}><FiMessageSquare /> Примечания</h3>
                      <div className={styles.modalNotes}>
                        {lessonDetails.notes.map(note => (
                          <div key={note.id} className={styles.modalNote}>
                            <p>{note.note}</p>
                            <span className={styles.modalNoteDate}>{new Date(note.created_at).toLocaleDateString('ru-RU')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : lessonDetails && (
                    <div className={styles.noNotes}><FiMessageSquare /><p>Примечаний нет</p></div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {!user?.group_id && (
        <div className={styles.noGroup}>Вы не состоите в группе. Обратитесь к администратору.</div>
      )}
    </div>
  );
};

export default StudentSchedule;
