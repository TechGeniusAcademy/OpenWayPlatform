import { useState, useEffect } from 'react';
import api from '../utils/api';
import styles from './ScheduleManagement.module.css';
import { FiPlus, FiChevronLeft, FiChevronRight, FiClock, FiUsers, FiX, FiCheck, FiAlertCircle, FiMinusCircle, FiEdit, FiTrash2, FiMessageSquare, FiGift } from 'react-icons/fi';

const ScheduleManagement = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessons, setLessons] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Модальное окно создания урока
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    group_id: '',
    title: '',
    description: '',
    lesson_date: '',
    lesson_time: '',
    duration_minutes: 60,
    is_recurring: false,
    recurring_days: [],
    recurring_start_date: '',
    recurring_end_date: ''
  });
  const [editingLessonId, setEditingLessonId] = useState(null);

  // Модальное окно урока (посещаемость, примечания, награды)
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedLessonDate, setSelectedLessonDate] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [rewards, setRewards] = useState([]);
  const [rewardForm, setRewardForm] = useState({ points: 0, experience: 0, reason: '' });

  const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const daysOfWeekFull = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    loadLessons();
  }, [currentDate, selectedGroup]);

  const loadGroups = async () => {
    try {
      const response = await api.get('/groups');
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadLessons = async () => {
    try {
      setLoading(true);
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const params = new URLSearchParams({
        start_date: startOfMonth.toISOString().split('T')[0],
        end_date: endOfMonth.toISOString().split('T')[0]
      });
      
      if (selectedGroup) {
        params.append('group_id', selectedGroup);
      }

      const response = await api.get(`/schedule/lessons/calendar?${params}`);
      setLessons(response.data);
    } catch (error) {
      console.error('Error loading lessons:', error);
      setError('Ошибка загрузки расписания');
    } finally {
      setLoading(false);
    }
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    const startPadding = firstDay.getDay();
    
    // Добавляем пустые ячейки для начала месяца
    for (let i = 0; i < startPadding; i++) {
      days.push({ day: null, date: null });
    }
    
    // Добавляем дни месяца
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

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const openCreateModal = (date = null) => {
    setLessonForm({
      group_id: selectedGroup || '',
      title: '',
      description: '',
      lesson_date: date || '',
      lesson_time: '10:00',
      duration_minutes: 60,
      is_recurring: false,
      recurring_days: [],
      recurring_start_date: date || '',
      recurring_end_date: ''
    });
    setEditingLessonId(null);
    setShowCreateModal(true);
  };

  const openEditModal = (lesson) => {
    setLessonForm({
      group_id: lesson.group_id,
      title: lesson.title,
      description: lesson.description || '',
      lesson_date: lesson.lesson_date || '',
      lesson_time: lesson.lesson_time?.substring(0, 5) || '',
      duration_minutes: lesson.duration_minutes || 60,
      is_recurring: lesson.is_recurring,
      recurring_days: lesson.recurring_days || [],
      recurring_start_date: lesson.recurring_start_date || '',
      recurring_end_date: lesson.recurring_end_date || ''
    });
    setEditingLessonId(lesson.id);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setEditingLessonId(null);
  };

  const handleFormChange = (field, value) => {
    setLessonForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleRecurringDay = (day) => {
    setLessonForm(prev => {
      const days = prev.recurring_days.includes(day)
        ? prev.recurring_days.filter(d => d !== day)
        : [...prev.recurring_days, day];
      return { ...prev, recurring_days: days };
    });
  };

  const handleSaveLesson = async () => {
    try {
      if (!lessonForm.group_id || !lessonForm.title || !lessonForm.lesson_time) {
        setError('Заполните все обязательные поля');
        return;
      }

      if (editingLessonId) {
        await api.put(`/schedule/lessons/${editingLessonId}`, lessonForm);
        setSuccess('Урок обновлён');
      } else {
        await api.post('/schedule/lessons', lessonForm);
        setSuccess('Урок создан');
      }

      closeCreateModal();
      loadLessons();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Ошибка сохранения урока');
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!confirm('Удалить урок?')) return;
    
    try {
      await api.delete(`/schedule/lessons/${lessonId}`);
      setSuccess('Урок удалён');
      loadLessons();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Ошибка удаления урока');
    }
  };

  // ===== МОДАЛЬНОЕ ОКНО УРОКА =====

  const openLessonModal = async (lesson, date) => {
    setSelectedLesson(lesson);
    setSelectedLessonDate(date);
    setSelectedStudent(null);
    setShowLessonModal(true);
    
    try {
      const response = await api.get(`/schedule/attendance/${lesson.id}/${date}`);
      setStudents(response.data.students);
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  const closeLessonModal = () => {
    setShowLessonModal(false);
    setSelectedLesson(null);
    setSelectedStudent(null);
    setNotes([]);
    setRewards([]);
  };

  const selectStudent = async (student) => {
    setSelectedStudent(student);
    await loadStudentData(student.id);
  };

  const loadStudentData = async (studentId) => {
    if (!selectedLesson) return;
    
    try {
      const [notesRes, rewardsRes] = await Promise.all([
        api.get(`/schedule/notes/${selectedLesson.id}/${selectedLessonDate}?student_id=${studentId}`),
        api.get(`/schedule/rewards/${selectedLesson.id}/${selectedLessonDate}?student_id=${studentId}`)
      ]);
      setNotes(notesRes.data);
      setRewards(rewardsRes.data);
    } catch (error) {
      console.error('Error loading student data:', error);
    }
  };

  const updateAttendance = async (studentId, status, reason = '') => {
    try {
      await api.post('/schedule/attendance', {
        lesson_id: selectedLesson.id,
        student_id: studentId,
        lesson_date: selectedLessonDate,
        status,
        reason
      });

      setStudents(prev => prev.map(s => 
        s.id === studentId 
          ? { ...s, attendance: { status, reason } }
          : s
      ));
      setSuccess('Статус обновлён');
      setTimeout(() => setSuccess(''), 2000);
    } catch (error) {
      setError('Ошибка обновления статуса');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedStudent) return;

    try {
      await api.post('/schedule/notes', {
        lesson_id: selectedLesson.id,
        student_id: selectedStudent.id,
        lesson_date: selectedLessonDate,
        note: newNote
      });

      setNewNote('');
      await loadStudentData(selectedStudent.id);
      setSuccess('Примечание добавлено');
      setTimeout(() => setSuccess(''), 2000);
    } catch (error) {
      setError('Ошибка добавления примечания');
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await api.delete(`/schedule/notes/${noteId}`);
      await loadStudentData(selectedStudent.id);
    } catch (error) {
      setError('Ошибка удаления примечания');
    }
  };

  const handleAddReward = async () => {
    if (!selectedStudent) return;
    if (!rewardForm.points && !rewardForm.experience) {
      setError('Укажите баллы или опыт');
      return;
    }

    try {
      await api.post('/schedule/rewards', {
        lesson_id: selectedLesson.id,
        student_id: selectedStudent.id,
        lesson_date: selectedLessonDate,
        points_amount: parseInt(rewardForm.points) || 0,
        experience_amount: parseInt(rewardForm.experience) || 0,
        reason: rewardForm.reason
      });

      setRewardForm({ points: 0, experience: 0, reason: '' });
      await loadStudentData(selectedStudent.id);
      setSuccess('Награда выдана');
      setTimeout(() => setSuccess(''), 2000);
    } catch (error) {
      setError('Ошибка выдачи награды');
    }
  };

  const getAttendanceIcon = (status) => {
    switch (status) {
      case 'present': return <FiCheck className={styles.iconPresent} />;
      case 'absent': return <FiX className={styles.iconAbsent} />;
      case 'late': return <FiAlertCircle className={styles.iconLate} />;
      case 'excused': return <FiMinusCircle className={styles.iconExcused} />;
      default: return null;
    }
  };

  const getAttendanceLabel = (status) => {
    switch (status) {
      case 'present': return 'Пришёл';
      case 'absent': return 'Не пришёл';
      case 'late': return 'Опоздал';
      case 'excused': return 'Не придёт';
      default: return 'Не отмечен';
    }
  };

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Расписание</h1>
        <div className={styles.headerActions}>
          <select 
            value={selectedGroup} 
            onChange={(e) => setSelectedGroup(e.target.value)}
            className={styles.groupSelect}
          >
            <option value="">Все группы</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <button className={styles.btnCreate} onClick={() => openCreateModal()}>
            <FiPlus /> Добавить урок
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.calendar}>
        <div className={styles.calendarHeader}>
          <button onClick={() => navigateMonth(-1)} className={styles.navBtn}>
            <FiChevronLeft />
          </button>
          <span className={styles.monthTitle}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button onClick={() => navigateMonth(1)} className={styles.navBtn}>
            <FiChevronRight />
          </button>
        </div>

        <div className={styles.calendarGrid}>
          {daysOfWeek.map(day => (
            <div key={day} className={styles.dayHeader}>{day}</div>
          ))}
          
          {getCalendarDays().map((dayData, index) => (
            <div 
              key={index} 
              className={`${styles.dayCell} ${dayData.isToday ? styles.today : ''} ${!dayData.day ? styles.empty : ''}`}
              onClick={() => dayData.date && openCreateModal(dayData.date)}
            >
              {dayData.day && (
                <>
                  <span className={styles.dayNumber}>{dayData.day}</span>
                  <div className={styles.dayLessons}>
                    {getLessonsForDate(dayData.date).map(lesson => (
                      <div 
                        key={`${lesson.id}-${lesson.event_date}`}
                        className={`${styles.lessonItem} ${lesson.is_recurring ? styles.recurring : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openLessonModal(lesson, dayData.date);
                        }}
                      >
                        <span className={styles.lessonTime}>
                          {lesson.lesson_time?.substring(0, 5)}
                        </span>
                        <span className={styles.lessonTitle}>{lesson.title}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Модальное окно создания/редактирования урока */}
      {showCreateModal && (
        <div className={styles.modal} onClick={closeCreateModal}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingLessonId ? 'Редактировать урок' : 'Создать урок'}</h2>
              <button onClick={closeCreateModal} className={styles.closeBtn}><FiX /></button>
            </div>

            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label>Группа *</label>
                <select 
                  value={lessonForm.group_id} 
                  onChange={(e) => handleFormChange('group_id', e.target.value)}
                >
                  <option value="">Выберите группу</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Название урока *</label>
                <input 
                  type="text"
                  value={lessonForm.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  placeholder="Например: Урок Python"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Описание</label>
                <textarea 
                  value={lessonForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Описание урока..."
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Время начала *</label>
                  <input 
                    type="time"
                    value={lessonForm.lesson_time}
                    onChange={(e) => handleFormChange('lesson_time', e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Длительность (мин)</label>
                  <input 
                    type="number"
                    value={lessonForm.duration_minutes}
                    onChange={(e) => handleFormChange('duration_minutes', parseInt(e.target.value))}
                    min="15"
                    step="15"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox"
                    checked={lessonForm.is_recurring}
                    onChange={(e) => handleFormChange('is_recurring', e.target.checked)}
                  />
                  Повторяющийся урок
                </label>
              </div>

              {lessonForm.is_recurring ? (
                <>
                  <div className={styles.formGroup}>
                    <label>Дни недели</label>
                    <div className={styles.daysSelector}>
                      {daysOfWeekFull.map((day, index) => (
                        <button
                          key={index}
                          type="button"
                          className={`${styles.dayBtn} ${lessonForm.recurring_days.includes(index) ? styles.active : ''}`}
                          onClick={() => toggleRecurringDay(index)}
                        >
                          {daysOfWeek[index]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Дата начала</label>
                      <input 
                        type="date"
                        value={lessonForm.recurring_start_date}
                        onChange={(e) => handleFormChange('recurring_start_date', e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Дата окончания</label>
                      <input 
                        type="date"
                        value={lessonForm.recurring_end_date}
                        onChange={(e) => handleFormChange('recurring_end_date', e.target.value)}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.formGroup}>
                  <label>Дата урока *</label>
                  <input 
                    type="date"
                    value={lessonForm.lesson_date}
                    onChange={(e) => handleFormChange('lesson_date', e.target.value)}
                  />
                </div>
              )}

              <div className={styles.formActions}>
                <button onClick={closeCreateModal} className={styles.btnCancel}>Отмена</button>
                <button onClick={handleSaveLesson} className={styles.btnSave}>
                  {editingLessonId ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно урока */}
      {showLessonModal && selectedLesson && (
        <div className={styles.modal} onClick={closeLessonModal}>
          <div className={styles.modalContentLarge} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{selectedLesson.title}</h2>
                <p className={styles.lessonInfo}>
                  <FiClock /> {selectedLesson.lesson_time?.substring(0, 5)} | 
                  <FiUsers /> {selectedLesson.group_name} | 
                  {new Date(selectedLessonDate).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <div className={styles.modalActions}>
                <button onClick={() => openEditModal(selectedLesson)} className={styles.btnIcon}>
                  <FiEdit />
                </button>
                <button onClick={() => { handleDeleteLesson(selectedLesson.id); closeLessonModal(); }} className={styles.btnIconDanger}>
                  <FiTrash2 />
                </button>
                <button onClick={closeLessonModal} className={styles.closeBtn}><FiX /></button>
              </div>
            </div>

            <div className={styles.lessonModalBody}>
              {/* Список учеников */}
              <div className={styles.studentsList}>
                <h3>Ученики</h3>
                {students.map(student => (
                  <div 
                    key={student.id}
                    className={`${styles.studentItem} ${selectedStudent?.id === student.id ? styles.selected : ''}`}
                    onClick={() => selectStudent(student)}
                  >
                    <div className={styles.studentInfo}>
                      <img 
                        src={student.avatar_url || '/default-avatar.png'} 
                        alt="" 
                        className={styles.studentAvatar}
                      />
                      <span>{student.full_name || student.username}</span>
                    </div>
                    <div className={styles.attendanceStatus}>
                      {getAttendanceIcon(student.attendance?.status)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Детали ученика */}
              {selectedStudent ? (
                <div className={styles.studentDetails}>
                  <h3>{selectedStudent.full_name || selectedStudent.username}</h3>

                  {/* Посещаемость */}
                  <div className={styles.section}>
                    <h4>Посещаемость</h4>
                    <div className={styles.attendanceButtons}>
                      <button 
                        className={`${styles.attendanceBtn} ${styles.present} ${selectedStudent.attendance?.status === 'present' ? styles.active : ''}`}
                        onClick={() => updateAttendance(selectedStudent.id, 'present')}
                      >
                        <FiCheck /> Пришёл
                      </button>
                      <button 
                        className={`${styles.attendanceBtn} ${styles.absent} ${selectedStudent.attendance?.status === 'absent' ? styles.active : ''}`}
                        onClick={() => updateAttendance(selectedStudent.id, 'absent')}
                      >
                        <FiX /> Не пришёл
                      </button>
                      <button 
                        className={`${styles.attendanceBtn} ${styles.late} ${selectedStudent.attendance?.status === 'late' ? styles.active : ''}`}
                        onClick={() => {
                          const reason = prompt('Причина опоздания:');
                          if (reason) updateAttendance(selectedStudent.id, 'late', reason);
                        }}
                      >
                        <FiAlertCircle /> Опоздал
                      </button>
                      <button 
                        className={`${styles.attendanceBtn} ${styles.excused} ${selectedStudent.attendance?.status === 'excused' ? styles.active : ''}`}
                        onClick={() => {
                          const reason = prompt('Причина отсутствия:');
                          if (reason) updateAttendance(selectedStudent.id, 'excused', reason);
                        }}
                      >
                        <FiMinusCircle /> Не придёт
                      </button>
                    </div>
                    {selectedStudent.attendance?.reason && (
                      <p className={styles.attendanceReason}>
                        Причина: {selectedStudent.attendance.reason}
                      </p>
                    )}
                  </div>

                  {/* Примечания */}
                  <div className={styles.section}>
                    <h4><FiMessageSquare /> Примечания</h4>
                    <div className={styles.notesList}>
                      {notes.map(note => (
                        <div key={note.id} className={styles.noteItem}>
                          <p>{note.note}</p>
                          <div className={styles.noteMeta}>
                            <span>{new Date(note.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                            <button onClick={() => handleDeleteNote(note.id)} className={styles.btnDeleteNote}>
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className={styles.addNote}>
                      <textarea 
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Добавить примечание..."
                      />
                      <button onClick={handleAddNote} disabled={!newNote.trim()}>
                        Добавить
                      </button>
                    </div>
                  </div>

                  {/* Награды */}
                  <div className={styles.section}>
                    <h4><FiGift /> Выдать баллы/опыт</h4>
                    <div className={styles.rewardForm}>
                      <div className={styles.rewardInputs}>
                        <div className={styles.rewardField}>
                          <label>Баллы</label>
                          <input 
                            type="number"
                            value={rewardForm.points}
                            onChange={(e) => setRewardForm(prev => ({ ...prev, points: e.target.value }))}
                            placeholder="0"
                          />
                        </div>
                        <div className={styles.rewardField}>
                          <label>Опыт</label>
                          <input 
                            type="number"
                            value={rewardForm.experience}
                            onChange={(e) => setRewardForm(prev => ({ ...prev, experience: e.target.value }))}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <input 
                        type="text"
                        value={rewardForm.reason}
                        onChange={(e) => setRewardForm(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="Причина выдачи..."
                        className={styles.rewardReason}
                      />
                      <button onClick={handleAddReward} className={styles.btnReward}>
                        Выдать
                      </button>
                    </div>
                    {rewards.length > 0 && (
                      <div className={styles.rewardsList}>
                        <h5>История выдачи:</h5>
                        {rewards.map(r => (
                          <div key={r.id} className={styles.rewardItem}>
                            {r.points_amount > 0 && <span className={styles.rewardPoints}>+{r.points_amount} баллов</span>}
                            {r.experience_amount > 0 && <span className={styles.rewardExp}>+{r.experience_amount} XP</span>}
                            {r.reason && <span className={styles.rewardReason}>{r.reason}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className={styles.selectStudentPrompt}>
                  Выберите ученика из списка слева
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleManagement;
