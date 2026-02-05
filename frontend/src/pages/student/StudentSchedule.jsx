import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import styles from './StudentSchedule.module.css';
import { FiChevronLeft, FiChevronRight, FiClock, FiMapPin } from 'react-icons/fi';

const StudentSchedule = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('week'); // 'week' или 'month'

  const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const daysOfWeekFull = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

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
        
        startDate = monday.toISOString().split('T')[0];
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        endDate = sunday.toISOString().split('T')[0];
      } else {
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
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
        date: date.toISOString().split('T')[0],
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
        date: date.toISOString().split('T')[0],
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
                    <div key={`${lesson.id}-${lesson.event_date}`} className={styles.lessonCard}>
                      <div className={styles.lessonTime}>
                        <FiClock />
                        <span>{formatTime(lesson.lesson_time)}</span>
                      </div>
                      <div className={styles.lessonTitle}>{lesson.title}</div>
                      {lesson.description && (
                        <div className={styles.lessonDesc}>{lesson.description}</div>
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
                        <div key={`${lesson.id}-${lesson.event_date}`} className={styles.monthLessonItem}>
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
    </div>
  );
};

export default StudentSchedule;
