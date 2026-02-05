import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { BASE_URL } from '../../utils/api';
import styles from './StudentSchedule.module.css';
import { FiChevronLeft, FiChevronRight, FiClock, FiMapPin, FiX, FiUsers, FiFileText, FiMessageSquare } from 'react-icons/fi';

const StudentSchedule = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('week'); // 'week' или 'month'
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonDetails, setLessonDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const daysOfWeekFull = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  // Форматирование даты без проблем с часовыми поясами
  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    loadSchedule();
  }, [currentDate, viewMode]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      
      let startDate, endDate;
      
      if (viewMode === 'week') {
        const dayOfWeek = currentDate.getDay();
        const monday = new Date(currentDate);
        monday.setDate(currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
        
        startDate = formatLocalDate(monday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        endDate = formatLocalDate(sunday);
      } else {
        startDate = formatLocalDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
        endDate = formatLocalDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));
      }

      const response = await api.get(`/schedule/my-schedule?start_date=${startDate}&end_date=${endDate}`);
      setLessons(response.data);
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = () => {
    const dayOfWeek = currentDate.getDay();
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      days.push({
        date: formatLocalDate(date),
        dayName: daysOfWeek[date.getDay()],
        dayNumber: date.getDate(),
        isToday: new Date().toDateString() === date.toDateString()
      });
    }
    return days;
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    const startPadding = firstDay.getDay();
    
    for (let i = 0; i < startPadding; i++) {
      days.push({ day: null, date: null });
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({ 
        day: i, 
        date: formatLocalDate(date),
        isToday: new Date().toDateString() === date.toDateString()
      });
    }
    
    return days;
  };

  const getLessonsForDate = (dateStr) => {
    return lessons.filter(l => l.event_date === dateStr);
  };

  const navigate = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  const formatTime = (time) => {
    return time?.substring(0, 5) || '';
  };

  const openLessonModal = async (lesson) => {
    setSelectedLesson(lesson);
    setLoadingDetails(true);
    
    try {
      const response = await api.get(`/schedule/lesson-details/${lesson.id}/${lesson.event_date}`);
      setLessonDetails(response.data);
    } catch (error) {
      console.error('Error loading lesson details:', error);
      setLessonDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeLessonModal = () => {
    setSelectedLesson(null);
    setLessonDetails(null);
  };

  const getWeekRange = () => {
    const days = getWeekDays();
    const first = new Date(days[0].date);
    const last = new Date(days[6].date);
    
    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()} - ${last.getDate()} ${monthNames[first.getMonth()]}`;
    }
    return `${first.getDate()} ${monthNames[first.getMonth()].substring(0, 3)} - ${last.getDate()} ${monthNames[last.getMonth()].substring(0, 3)}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Расписание</h1>
        <div className={styles.viewToggle}>
          <button 
            className={`${styles.toggleBtn} ${viewMode === 'week' ? styles.active : ''}`}
            onClick={() => setViewMode('week')}
          >
            Неделя
          </button>
          <button 
            className={`${styles.toggleBtn} ${viewMode === 'month' ? styles.active : ''}`}
            onClick={() => setViewMode('month')}
          >
            Месяц
          </button>
        </div>
      </div>

      <div className={styles.navigation}>
        <button onClick={() => navigate(-1)} className={styles.navBtn}>
          <FiChevronLeft />
        </button>
        <span className={styles.dateTitle}>
          {viewMode === 'week' 
            ? getWeekRange()
            : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
          }
        </span>
        <button onClick={() => navigate(1)} className={styles.navBtn}>
          <FiChevronRight />
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Загрузка...</div>
      ) : viewMode === 'week' ? (
        <div className={styles.weekView}>
          {getWeekDays().map((day) => (
            <div key={day.date} className={`${styles.dayColumn} ${day.isToday ? styles.today : ''}`}>
              <div className={styles.dayHeader}>
                <span className={styles.dayName}>{day.dayName}</span>
                <span className={styles.dayNumber}>{day.dayNumber}</span>
              </div>
              <div className={styles.dayLessons}>
                {getLessonsForDate(day.date).length === 0 ? (
                  <div className={styles.noLessons}>Нет уроков</div>
                ) : (
                  getLessonsForDate(day.date).map(lesson => (
                    <div 
                      key={`${lesson.id}-${lesson.event_date}`} 
                      className={styles.lessonCard}
                      onClick={() => openLessonModal(lesson)}
                    >
                      <div className={styles.lessonTime}>
                        <FiClock />
                        <span>{formatTime(lesson.lesson_time)}</span>
                      </div>
                      <div className={styles.lessonTitle}>{lesson.title}</div>
                      {lesson.description && (
                        <div className={styles.lessonDesc}>
                          {lesson.description.length > 50 
                            ? lesson.description.substring(0, 50) + '...' 
                            : lesson.description}
                        </div>
                      )}
                      <div className={styles.lessonDuration}>
                        {lesson.duration_minutes} мин
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.monthView}>
          <div className={styles.monthGrid}>
            {daysOfWeek.map(day => (
              <div key={day} className={styles.monthDayHeader}>{day}</div>
            ))}
            
            {getMonthDays().map((dayData, index) => (
              <div 
                key={index} 
                className={`${styles.monthDayCell} ${dayData.isToday ? styles.today : ''} ${!dayData.day ? styles.empty : ''}`}
              >
                {dayData.day && (
                  <>
                    <span className={styles.monthDayNumber}>{dayData.day}</span>
                    <div className={styles.monthDayLessons}>
                      {getLessonsForDate(dayData.date).map(lesson => (
                        <div 
                          key={`${lesson.id}-${lesson.event_date}`} 
                          className={styles.monthLessonItem}
                          onClick={() => openLessonModal(lesson)}
                        >
                          <span className={styles.monthLessonTime}>{formatTime(lesson.lesson_time)}</span>
                          <span className={styles.monthLessonTitle}>{lesson.title}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!user?.group_id && (
        <div className={styles.noGroup}>
          Вы не состоите в группе. Обратитесь к администратору для назначения в группу.
        </div>
      )}

      {/* Модальное окно урока */}
      {selectedLesson && (
        <div className={styles.modalOverlay} onClick={closeLessonModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderInfo}>
                <h2>{selectedLesson.title}</h2>
                <div className={styles.modalMeta}>
                  <span className={styles.modalDate}>
                    <FiClock />
                    {new Date(selectedLesson.event_date).toLocaleDateString('ru-RU', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    })} в {formatTime(selectedLesson.lesson_time)}
                  </span>
                  <span className={styles.modalDuration}>
                    {selectedLesson.duration_minutes} мин
                  </span>
                </div>
              </div>
              <button className={styles.modalClose} onClick={closeLessonModal}>
                <FiX />
              </button>
            </div>

            <div className={styles.modalBody}>
              {loadingDetails ? (
                <div className={styles.modalLoading}>Загрузка...</div>
              ) : (
                <>
                  {/* Описание урока */}
                  {selectedLesson.description && (
                    <div className={styles.modalSection}>
                      <h3><FiFileText /> Описание урока</h3>
                      <p className={styles.modalDescription}>{selectedLesson.description}</p>
                    </div>
                  )}

                  {/* Список учеников группы */}
                  {lessonDetails?.students && lessonDetails.students.length > 0 && (
                    <div className={styles.modalSection}>
                      <h3><FiUsers /> Ученики группы ({lessonDetails.students.length})</h3>
                      <div className={styles.studentsList}>
                        {lessonDetails.students.map(student => (
                          <div key={student.id} className={styles.studentItem}>
                            {student.avatar_url ? (
                              <img 
                                src={`${BASE_URL}${student.avatar_url}`} 
                                alt={student.username}
                                className={styles.studentAvatar}
                              />
                            ) : (
                              <div className={styles.studentAvatarPlaceholder}>
                                {(student.full_name || student.username || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className={styles.studentName}>
                              {student.full_name || student.username}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Примечания к уроку для текущего ученика */}
                  {lessonDetails?.notes && lessonDetails.notes.length > 0 && (
                    <div className={styles.modalSection}>
                      <h3><FiMessageSquare /> Примечания для вас</h3>
                      <div className={styles.notesList}>
                        {lessonDetails.notes.map(note => (
                          <div key={note.id} className={styles.noteItem}>
                            <p>{note.note}</p>
                            <span className={styles.noteDate}>
                              {new Date(note.created_at).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Если нет примечаний */}
                  {lessonDetails && (!lessonDetails.notes || lessonDetails.notes.length === 0) && (
                    <div className={styles.noNotes}>
                      <FiMessageSquare />
                      <p>Примечаний к этому уроку нет</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentSchedule;
