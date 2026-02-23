import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  FiPlus, FiChevronLeft, FiChevronRight, FiClock, FiUsers, FiX, FiCheck,
  FiAlertCircle, FiEdit2, FiTrash2, FiCalendar, FiList, FiGift, FiRepeat,
  FiMessageSquare, FiUserCheck, FiUserX, FiAlertTriangle, FiMinusCircle,
  FiAward, FiStar, FiChevronDown, FiCheckSquare, FiZap, FiBook,
} from "react-icons/fi";
import { HiOutlineCalendar } from "react-icons/hi";
import api from "../utils/api";
import styles from "./ScheduleManagement.module.css";

/* ─── Toast ─── */
let _tt;
function Toast({ msg, type, onClose }) {
  useEffect(() => { clearTimeout(_tt); _tt = setTimeout(onClose, 3500); return () => clearTimeout(_tt); }, [msg]);
  if (!msg) return null;
  return (
    <div className={`${styles.toast} ${styles["toast-" + type]}`}>
      {type === "success" ? <FiCheck /> : <FiAlertCircle />}
      <span>{msg}</span>
      <button className={styles.toastClose} onClick={onClose}><FiX /></button>
    </div>
  );
}

/* ─── ConfirmModal ─── */
function ConfirmModal({ msg, onConfirm, onCancel }) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={`${styles.modal} ${styles.modalXs}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <div className={styles.modalTitle}><FiAlertTriangle style={{ color: "#ef4444" }} /><h2>Подтверждение</h2></div>
          <button className={styles.closeBtn} onClick={onCancel}><FiX /></button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.confirmText}>{msg}</p>
          <div className={styles.formActions}>
            <button className={styles.btnSec} onClick={onCancel}>Отмена</button>
            <button className={styles.btnDanger} onClick={onConfirm}><FiTrash2 /><span>Удалить</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── ReasonModal (replaces prompt()) ─── */
function ReasonModal({ title, onConfirm, onCancel }) {
  const [value, setValue] = useState("");
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={`${styles.modal} ${styles.modalXs}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <div className={styles.modalTitle}><FiMessageSquare style={{ color: "var(--accent)" }} /><h2>{title}</h2></div>
          <button className={styles.closeBtn} onClick={onCancel}><FiX /></button>
        </div>
        <div className={styles.modalBody}>
          <textarea
            className={styles.formInput}
            rows={3}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Введите причину..."
            autoFocus
          />
          <div className={styles.formActions} style={{ marginTop: 12 }}>
            <button className={styles.btnSec} onClick={onCancel}>Отмена</button>
            <button className={styles.btnPrimary} onClick={() => onConfirm(value)} disabled={!value.trim()}>
              <FiCheck /><span>Подтвердить</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Group color palette ─── */
const GROUP_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#0ea5e9","#10b981","#f59e0b","#ef4444","#14b8a6",
];
const getGroupColor = (groupId) => GROUP_COLORS[(groupId - 1) % GROUP_COLORS.length];

/* ═══════════════════════ MAIN ═══════════════════════ */
export default function ScheduleManagement() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode]       = useState("calendar"); // "calendar" | "list"
  const [lessons,   setLessons]       = useState([]);
  const [groups,    setGroups]        = useState([]);
  const [selGroup,  setSelGroup]      = useState("");
  const [loading,   setLoading]       = useState(false);

  const [toast,   setToast]   = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [reason,  setReason]  = useState(null); // { title, statusTarget, studentId }

  /* create/edit modal */
  const [editModal,   setEditModal]   = useState(null); // null | "create" | lesson
  const [form,        setForm]        = useState(defaultForm());
  const [formErr,     setFormErr]     = useState("");

  /* lesson detail modal */
  const [detailLesson,    setDetailLesson]    = useState(null); // { lesson, date }
  const [detailStudents,  setDetailStudents]  = useState([]);
  const [detailLoading,   setDetailLoading]   = useState(false);
  const [selStudent,      setSelStudent]      = useState(null);
  const [notes,           setNotes]           = useState([]);
  const [newNote,         setNewNote]         = useState("");
  const [rewards,         setRewards]         = useState([]);
  const [rewardForm,      setRewardForm]      = useState({ points: 0, experience: 0, reason: "" });

  function defaultForm(date = "") {
    return {
      group_id: "", title: "", description: "",
      lesson_date: date, lesson_time: "10:00", duration_minutes: 60,
      is_recurring: false, recurring_days: [],
      recurring_start_date: date, recurring_end_date: "",
    };
  }

  const fmtDate = (d) => {
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), dd = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${dd}`;
  };

  /* ── load groups ── */
  useEffect(() => {
    api.get("/groups").then(r => setGroups(r.data.groups || [])).catch(() => {});
  }, []);

  /* ── load lessons ── */
  const loadLessons = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end   = new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 0);
      const params = new URLSearchParams({ start_date: fmtDate(start), end_date: fmtDate(end) });
      if (selGroup) params.append("group_id", selGroup);
      const { data } = await api.get(`/schedule/lessons/calendar?${params}`);
      setLessons(Array.isArray(data) ? data : []);
    } catch { notify("error", "Ошибка загрузки расписания"); }
    finally { setLoading(false); }
  }, [currentDate, selGroup]);

  useEffect(() => { loadLessons(); }, [loadLessons]);

  const notify = (type, msg) => setToast({ type, msg });

  /* ── calendar helpers ── */
  const daysShort = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
  const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

  const calDays = useMemo(() => {
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    const first = new Date(year, month, 1), last = new Date(year, month+1, 0);
    const cells = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(year, month, d);
      cells.push({ day: d, date: fmtDate(date), isToday: fmtDate(new Date()) === fmtDate(date) });
    }
    return cells;
  }, [currentDate]);

  const getLessonsForDate = useCallback(
    (dateStr) => lessons.filter(l => l.event_date === dateStr),
    [lessons]
  );

  /* ── stats ── */
  const stats = useMemo(() => {
    const today = fmtDate(new Date());
    const todayLessons = lessons.filter(l => l.event_date === today);
    const uniqueGroups = new Set(lessons.map(l => l.group_id));
    const recurring = lessons.filter(l => l.is_recurring || l.is_instance).length;
    return {
      total: lessons.length,
      todayCount: todayLessons.length,
      groupsCovered: uniqueGroups.size,
      recurring,
    };
  }, [lessons]);

  /* ── list view ── */
  const groupedByDate = useMemo(() => {
    const map = {};
    lessons.forEach(l => {
      if (!map[l.event_date]) map[l.event_date] = [];
      map[l.event_date].push(l);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [lessons]);

  /* ── create / edit modal ── */
  const openCreate = (date = "") => {
    setForm(defaultForm(date));
    setFormErr("");
    setEditModal("create");
  };
  const openEdit = (lesson) => {
    setForm({
      group_id: lesson.group_id,
      title: lesson.title,
      description: lesson.description || "",
      lesson_date: lesson.lesson_date?.split("T")[0] || "",
      lesson_time: lesson.lesson_time?.substring(0,5) || "",
      duration_minutes: lesson.duration_minutes || 60,
      is_recurring: lesson.is_recurring,
      recurring_days: lesson.recurring_days || [],
      recurring_start_date: lesson.recurring_start_date?.split("T")[0] || "",
      recurring_end_date: lesson.recurring_end_date?.split("T")[0] || "",
    });
    setFormErr("");
    setEditModal(lesson);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setFormErr("");
    if (!form.group_id || !form.title || !form.lesson_time) {
      setFormErr("Заполните все обязательные поля (группа, название, время)");
      return;
    }
    if (!form.is_recurring && !form.lesson_date) {
      setFormErr("Укажите дату урока");
      return;
    }
    if (form.is_recurring && form.recurring_days.length === 0) {
      setFormErr("Выберите хотя бы один день недели");
      return;
    }
    try {
      if (editModal === "create") {
        await api.post("/schedule/lessons", form);
        notify("success", "Урок создан");
      } else {
        await api.put(`/schedule/lessons/${editModal.id}`, form);
        notify("success", "Урок обновлён");
      }
      setEditModal(null);
      loadLessons();
    } catch (err) {
      setFormErr(err.response?.data?.error || "Ошибка сохранения");
    }
  };

  const toggleRecurDay = (d) =>
    setForm(f => ({ ...f, recurring_days: f.recurring_days.includes(d)
      ? f.recurring_days.filter(x => x !== d)
      : [...f.recurring_days, d]
    }));

  /* ── delete ── */
  const askDelete = (lesson) => setConfirm({
    msg: `Удалить урок «${lesson.title}»? Данные посещаемости будут удалены.`,
    onConfirm: async () => {
      setConfirm(null);
      try {
        await api.delete(`/schedule/lessons/${lesson.id}`);
        notify("success", "Урок удалён");
        if (detailLesson?.lesson?.id === lesson.id) setDetailLesson(null);
        loadLessons();
      } catch { notify("error", "Ошибка удаления"); }
    },
  });

  /* ── lesson detail modal ── */
  const openDetail = async (lesson, date) => {
    setDetailLesson({ lesson, date });
    setSelStudent(null);
    setNotes([]); setRewards([]);
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/schedule/attendance/${lesson.id}/${date}`);
      setDetailStudents(data.students || []);
    } catch { notify("error", "Ошибка загрузки урока"); }
    finally { setDetailLoading(false); }
  };

  const closeDetail = () => { setDetailLesson(null); setSelStudent(null); setNotes([]); setRewards([]); };

  /* ── select student ── */
  const selectStudent = async (s) => {
    setSelStudent(s);
    if (!detailLesson) return;
    const { lesson, date } = detailLesson;
    const [nr, rr] = await Promise.all([
      api.get(`/schedule/notes/${lesson.id}/${date}?student_id=${s.id}`),
      api.get(`/schedule/rewards/${lesson.id}/${date}?student_id=${s.id}`),
    ]);
    setNotes(nr.data);
    setRewards(rr.data);
  };

  /* ── attendance ── */
  const setAttendance = async (studentId, status, reasonText = "") => {
    if (!detailLesson) return;
    const { lesson, date } = detailLesson;
    try {
      await api.post("/schedule/attendance", {
        lesson_id: lesson.id, student_id: studentId,
        lesson_date: date, status, reason: reasonText,
      });
      setDetailStudents(p => p.map(s =>
        s.id === studentId ? { ...s, attendance: { status, reason: reasonText } } : s
      ));
      if (selStudent?.id === studentId)
        setSelStudent(p => ({ ...p, attendance: { status, reason: reasonText } }));
      notify("success", "Статус обновлён");
    } catch { notify("error", "Ошибка обновления статуса"); }
  };

  const handleAttendanceClick = (studentId, status) => {
    if (status === "late") {
      setReason({ title: "Причина опоздания", statusTarget: status, studentId });
    } else if (status === "excused") {
      setReason({ title: "Причина отсутствия", statusTarget: status, studentId });
    } else {
      setAttendance(studentId, status);
    }
  };

  const markAllPresent = async () => {
    for (const s of detailStudents) {
      if (!s.attendance?.status || s.attendance.status === "unknown") {
        await setAttendance(s.id, "present");
      }
    }
  };

  /* ── notes ── */
  const addNote = async () => {
    if (!newNote.trim() || !selStudent || !detailLesson) return;
    try {
      await api.post("/schedule/notes", {
        lesson_id: detailLesson.lesson.id, student_id: selStudent.id,
        lesson_date: detailLesson.date, note: newNote,
      });
      setNewNote("");
      const { data } = await api.get(`/schedule/notes/${detailLesson.lesson.id}/${detailLesson.date}?student_id=${selStudent.id}`);
      setNotes(data);
      notify("success", "Примечание добавлено");
    } catch { notify("error", "Ошибка добавления примечания"); }
  };

  const deleteNote = async (noteId) => {
    try {
      await api.delete(`/schedule/notes/${noteId}`);
      setNotes(p => p.filter(n => n.id !== noteId));
    } catch { notify("error", "Ошибка удаления"); }
  };

  /* ── rewards ── */
  const addReward = async () => {
    if (!selStudent || !detailLesson) return;
    if (!rewardForm.points && !rewardForm.experience) { notify("error", "Укажите баллы или опыт"); return; }
    try {
      await api.post("/schedule/rewards", {
        lesson_id: detailLesson.lesson.id, student_id: selStudent.id,
        lesson_date: detailLesson.date, points_amount: +rewardForm.points || 0,
        experience_amount: +rewardForm.experience || 0, reason: rewardForm.reason,
      });
      setRewardForm({ points: 0, experience: 0, reason: "" });
      const { data } = await api.get(`/schedule/rewards/${detailLesson.lesson.id}/${detailLesson.date}?student_id=${selStudent.id}`);
      setRewards(data);
      notify("success", "Награда выдана!");
    } catch { notify("error", "Ошибка выдачи награды"); }
  };

  /* ── attendance helpers ── */
  const STATUS_CFG = {
    present:  { icon: <FiUserCheck />,  label: "Присутствует", cls: "statusPresent"  },
    absent:   { icon: <FiUserX />,      label: "Отсутствует",  cls: "statusAbsent"   },
    late:     { icon: <FiAlertCircle />,label: "Опоздал",      cls: "statusLate"     },
    excused:  { icon: <FiMinusCircle />,label: "Уважительная", cls: "statusExcused"  },
    unknown:  { icon: null,             label: "Не отмечен",   cls: "statusUnknown"  },
  };
  const getStatus = (s) => s.attendance?.status || "unknown";

  /* ── attendance summary ── */
  const attendanceSummary = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0, unknown: 0 };
    detailStudents.forEach(s => { const st = getStatus(s); counts[st] = (counts[st] || 0) + 1; });
    return counts;
  }, [detailStudents]);

  /* ─────────────── RENDER ─────────────── */
  return (
    <div className={styles.page}>
      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><HiOutlineCalendar /></div>
          <div>
            <h1 className={styles.headerTitle}>Расписание</h1>
            <p className={styles.headerSub}>Уроки, посещаемость, заметки и награды</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          {/* View toggle */}
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${viewMode === "calendar" ? styles.viewBtnActive : ""}`}
              onClick={() => setViewMode("calendar")}
            ><FiCalendar /><span>Календарь</span></button>
            <button
              className={`${styles.viewBtn} ${viewMode === "list" ? styles.viewBtnActive : ""}`}
              onClick={() => setViewMode("list")}
            ><FiList /><span>Список</span></button>
          </div>
          <select
            className={styles.groupSelect}
            value={selGroup}
            onChange={e => setSelGroup(e.target.value)}
          >
            <option value="">Все группы</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button className={styles.btnPrimary} onClick={() => openCreate()}>
            <FiPlus /><span>Добавить урок</span>
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={`${styles.statIcon} ${styles.statIconCal}`}><FiCalendar /></div>
          <div><div className={styles.statVal}>{stats.total}</div><div className={styles.statLabel}>Уроков в месяце</div></div>
        </div>
        <div className={styles.stat}>
          <div className={`${styles.statIcon} ${styles.statIconToday}`}><FiZap /></div>
          <div><div className={styles.statVal}>{stats.todayCount}</div><div className={styles.statLabel}>Сегодня</div></div>
        </div>
        <div className={styles.stat}>
          <div className={`${styles.statIcon} ${styles.statIconGroups}`}><FiUsers /></div>
          <div><div className={styles.statVal}>{stats.groupsCovered}</div><div className={styles.statLabel}>Групп охвачено</div></div>
        </div>
        <div className={styles.stat}>
          <div className={`${styles.statIcon} ${styles.statIconRecur}`}><FiRepeat /></div>
          <div><div className={styles.statVal}>{stats.recurring}</div><div className={styles.statLabel}>Повторяющихся</div></div>
        </div>
      </div>

      {/* ── Month nav ── */}
      <div className={styles.monthNav}>
        <button className={styles.navBtn} onClick={() => setCurrentDate(d => { const n = new Date(d); n.setMonth(d.getMonth()-1); return n; })}><FiChevronLeft /></button>
        <span className={styles.monthLabel}>{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
        <button className={styles.navBtn} onClick={() => setCurrentDate(d => { const n = new Date(d); n.setMonth(d.getMonth()+1); return n; })}><FiChevronRight /></button>
        <button className={styles.todayBtn} onClick={() => setCurrentDate(new Date())}>Сегодня</button>
        {loading && <span className={styles.loadingDot} />}
      </div>

      {/* ══════ CALENDAR VIEW ══════ */}
      {viewMode === "calendar" && (
        <div className={styles.calendarWrap}>
          <div className={styles.calendarGrid}>
            {daysShort.map(d => <div key={d} className={styles.dayHeader}>{d}</div>)}
            {calDays.map((cell, i) => {
              if (!cell) return <div key={`e-${i}`} className={styles.dayCellEmpty} />;
              const cellLessons = getLessonsForDate(cell.date);
              return (
                <div
                  key={cell.date}
                  className={`${styles.dayCell} ${cell.isToday ? styles.dayCellToday : ""}`}
                  onClick={() => openCreate(cell.date)}
                >
                  <span className={`${styles.dayNum} ${cell.isToday ? styles.dayNumToday : ""}`}>{cell.day}</span>
                  <div className={styles.cellLessons}>
                    {cellLessons.slice(0, 3).map(lesson => (
                      <div
                        key={`${lesson.id}-${lesson.event_date}`}
                        className={styles.lessonPill}
                        style={{ "--pill-color": getGroupColor(lesson.group_id) }}
                        onClick={e => { e.stopPropagation(); openDetail(lesson, cell.date); }}
                        title={`${lesson.lesson_time?.substring(0,5)} ${lesson.title} — ${lesson.group_name}`}
                      >
                        <span className={styles.pillTime}>{lesson.lesson_time?.substring(0,5)}</span>
                        <span className={styles.pillTitle}>{lesson.title}</span>
                        {lesson.is_recurring || lesson.is_instance ? <FiRepeat className={styles.pillRecur} /> : null}
                      </div>
                    ))}
                    {cellLessons.length > 3 && (
                      <div className={styles.moreChip}>+{cellLessons.length - 3} ещё</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════ LIST VIEW ══════ */}
      {viewMode === "list" && (
        <div className={styles.listWrap}>
          {groupedByDate.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}><FiCalendar /></div>
              <h3>Нет уроков в этом месяце</h3>
              <p>Создайте расписание для ваших групп</p>
              <button className={styles.btnPrimary} style={{ marginTop: 16 }} onClick={() => openCreate()}>
                <FiPlus /><span>Добавить урок</span>
              </button>
            </div>
          ) : groupedByDate.map(([date, dayLessons]) => {
            const dateObj = new Date(date + "T12:00:00");
            const label = dateObj.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
            const isToday = date === fmtDate(new Date());
            return (
              <div key={date} className={styles.listDateGroup}>
                <div className={`${styles.listDateHeader} ${isToday ? styles.listDateHeaderToday : ""}`}>
                  <FiCalendar />
                  <span>{label}</span>
                  {isToday && <span className={styles.todayBadge}>Сегодня</span>}
                </div>
                <div className={styles.listRows}>
                  {dayLessons.map(lesson => (
                    <div key={`${lesson.id}-${lesson.event_date}`} className={styles.listRow}>
                      <div className={styles.listRowAccent} style={{ background: getGroupColor(lesson.group_id) }} />
                      <div className={styles.listRowTime}>
                        <FiClock />
                        <span>{lesson.lesson_time?.substring(0,5)}</span>
                        <span className={styles.listRowDur}>{lesson.duration_minutes}м</span>
                      </div>
                      <div className={styles.listRowInfo}>
                        <span className={styles.listRowTitle}>{lesson.title}</span>
                        {lesson.description && <span className={styles.listRowDesc}>{lesson.description}</span>}
                      </div>
                      <div className={styles.listRowGroup} style={{ color: getGroupColor(lesson.group_id) }}>
                        <FiUsers />
                        <span>{lesson.group_name}</span>
                        {(lesson.is_recurring || lesson.is_instance) && <FiRepeat className={styles.recurIcon} />}
                      </div>
                      <div className={styles.listRowActions}>
                        <button className={`${styles.iconBtn} ${styles.iconBtnInfo}`}
                          onClick={() => openDetail(lesson, date)} title="Посещаемость">
                          <FiUserCheck />
                        </button>
                        <button className={`${styles.iconBtn} ${styles.iconBtnEdit}`}
                          onClick={() => openEdit(lesson)} title="Редактировать">
                          <FiEdit2 />
                        </button>
                        <button className={`${styles.iconBtn} ${styles.iconBtnDel}`}
                          onClick={() => askDelete(lesson)} title="Удалить">
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════ CREATE / EDIT MODAL ════════ */}
      {editModal && (
        <div className={styles.overlay} onClick={() => setEditModal(null)}>
          <div className={`${styles.modal} ${styles.modalMd}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}>
                <FiBook className={styles.modalIcon} />
                <h2>{editModal === "create" ? "Новый урок" : "Редактировать урок"}</h2>
              </div>
              <button className={styles.closeBtn} onClick={() => setEditModal(null)}><FiX /></button>
            </div>
            <form className={styles.modalForm} onSubmit={handleSave}>
              {formErr && <div className={styles.inlineErr}><FiAlertCircle /><span>{formErr}</span></div>}

              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.spanFull}`}>
                  <label className={styles.formLabel}>Группа *</label>
                  <select className={styles.formInput} value={form.group_id}
                    onChange={e => setForm(f => ({ ...f, group_id: e.target.value }))}>
                    <option value="">Выберите группу</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>

                <div className={`${styles.formGroup} ${styles.spanFull}`}>
                  <label className={styles.formLabel}>Название урока *</label>
                  <input className={styles.formInput} value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Например: Урок Python #3" />
                </div>

                <div className={`${styles.formGroup} ${styles.spanFull}`}>
                  <label className={styles.formLabel}>Описание</label>
                  <textarea className={styles.formInput} rows={2} value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Тема урока, что будут проходить..." />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Время начала *</label>
                  <input type="time" className={styles.formInput} value={form.lesson_time}
                    onChange={e => setForm(f => ({ ...f, lesson_time: e.target.value }))} />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Длительность (мин)</label>
                  <input type="number" className={styles.formInput} value={form.duration_minutes}
                    onChange={e => setForm(f => ({ ...f, duration_minutes: +e.target.value }))}
                    min="15" step="15" />
                </div>
              </div>

              {/* Recurring toggle */}
              <div className={styles.recurToggle}>
                <label className={styles.toggleLabel}>
                  <div className={`${styles.toggle} ${form.is_recurring ? styles.toggleOn : ""}`}
                    onClick={() => setForm(f => ({ ...f, is_recurring: !f.is_recurring }))}>
                    <div className={styles.toggleKnob} />
                  </div>
                  <span>Повторяющийся урок</span>
                  {form.is_recurring && <FiRepeat className={styles.recurBadge} />}
                </label>
              </div>

              {form.is_recurring ? (
                <div className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.spanFull}`}>
                    <label className={styles.formLabel}>Дни недели</label>
                    <div className={styles.daysRow}>
                      {daysShort.map((d, i) => (
                        <button type="button" key={i}
                          className={`${styles.dayBtn} ${form.recurring_days.includes(i) ? styles.dayBtnActive : ""}`}
                          onClick={() => toggleRecurDay(i)}>{d}</button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Начало периода</label>
                    <input type="date" className={styles.formInput} value={form.recurring_start_date}
                      onChange={e => setForm(f => ({ ...f, recurring_start_date: e.target.value }))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Конец периода</label>
                    <input type="date" className={styles.formInput} value={form.recurring_end_date}
                      onChange={e => setForm(f => ({ ...f, recurring_end_date: e.target.value }))} />
                  </div>
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Дата урока *</label>
                  <input type="date" className={styles.formInput} value={form.lesson_date}
                    onChange={e => setForm(f => ({ ...f, lesson_date: e.target.value }))} />
                </div>
              )}

              <div className={styles.formActions}>
                <button type="button" className={styles.btnSec} onClick={() => setEditModal(null)}>Отмена</button>
                <button type="submit" className={styles.btnPrimary}>
                  <FiCheck /><span>{editModal === "create" ? "Создать" : "Сохранить"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════ LESSON DETAIL MODAL ════════ */}
      {detailLesson && (
        <div className={styles.overlay} onClick={closeDetail}>
          <div className={`${styles.modal} ${styles.modalXl}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle} style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                <h2>{detailLesson.lesson.title}</h2>
                <div className={styles.detailMeta}>
                  <span><FiClock /> {detailLesson.lesson.lesson_time?.substring(0,5)}</span>
                  <span><FiUsers /> {detailLesson.lesson.group_name}</span>
                  <span><FiCalendar /> {new Date(detailLesson.date + "T12:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "short" })}</span>
                  {detailLesson.lesson.duration_minutes && <span><FiClock style={{ opacity: 0.6 }} /> {detailLesson.lesson.duration_minutes} мин</span>}
                </div>
              </div>
              <div className={styles.detailHeadActions}>
                <button className={`${styles.iconBtn} ${styles.iconBtnEdit}`} onClick={() => { closeDetail(); openEdit(detailLesson.lesson); }} title="Редактировать"><FiEdit2 /></button>
                <button className={`${styles.iconBtn} ${styles.iconBtnDel}`} onClick={() => askDelete(detailLesson.lesson)} title="Удалить"><FiTrash2 /></button>
                <button className={styles.closeBtn} onClick={closeDetail}><FiX /></button>
              </div>
            </div>

            {detailLoading ? (
              <div className={styles.detailLoading}>
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className={styles.skRow} />)}
              </div>
            ) : (
              <div className={styles.detailBody}>
                {/* LEFT — students list */}
                <div className={styles.studentsPanel}>
                  {/* attendance summary */}
                  <div className={styles.attendSummary}>
                    {[["present","#10b981"],["absent","#ef4444"],["late","#f59e0b"],["excused","#6b7280"],["unknown","#94a3b8"]].map(([st, clr]) => (
                      <div key={st} className={styles.attendDot} title={STATUS_CFG[st]?.label}>
                        <div className={styles.attendDotCircle} style={{ background: clr }} />
                        <span>{attendanceSummary[st] || 0}</span>
                      </div>
                    ))}
                    <button className={styles.markAllBtn} onClick={markAllPresent} title="Отметить всех неотмеченных как присутствующих">
                      <FiCheckSquare /><span>Все присутствуют</span>
                    </button>
                  </div>

                  <div className={styles.studentList}>
                    {detailStudents.length === 0 ? (
                      <div className={styles.noStudents}>Нет студентов в группе</div>
                    ) : detailStudents.map(s => {
                      const st = getStatus(s);
                      const cfg = STATUS_CFG[st];
                      return (
                        <div
                          key={s.id}
                          className={`${styles.studentRow} ${selStudent?.id === s.id ? styles.studentRowSel : ""}`}
                          onClick={() => selectStudent(s)}
                        >
                          <div className={styles.studentAv}>
                            {(s.full_name || s.username || "?")[0].toUpperCase()}
                          </div>
                          <div className={styles.studentMeta}>
                            <span className={styles.studentName}>{s.full_name || s.username}</span>
                            <span className={`${styles.studentStatus} ${styles[cfg.cls]}`}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </div>
                          <div className={styles.statusQuickBtns}>
                            {["present","absent","late","excused"].map(sta => (
                              <button key={sta}
                                className={`${styles.qBtn} ${styles["qBtn-" + sta]} ${st === sta ? styles.qBtnActive : ""}`}
                                onClick={e => { e.stopPropagation(); handleAttendanceClick(s.id, sta); }}
                                title={STATUS_CFG[sta].label}>
                                {STATUS_CFG[sta].icon}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT — student detail */}
                {selStudent ? (
                  <div className={styles.detailPanel}>
                    <div className={styles.detailPanelHead}>
                      <div className={styles.detailStudentAv}>
                        {(selStudent.full_name || selStudent.username || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <div className={styles.detailStudentName}>{selStudent.full_name || selStudent.username}</div>
                        {selStudent.attendance?.reason && (
                          <div className={styles.detailReason}>Причина: {selStudent.attendance.reason}</div>
                        )}
                      </div>
                    </div>

                    {/* Attendance buttons */}
                    <div className={styles.attendSection}>
                      <div className={styles.sectionTitle}><FiUserCheck /> Посещаемость</div>
                      <div className={styles.attendBtns}>
                        {["present","absent","late","excused"].map(sta => {
                          const cfg = STATUS_CFG[sta];
                          const active = getStatus(selStudent) === sta;
                          return (
                            <button key={sta}
                              className={`${styles.attendBtn} ${styles["attend-" + sta]} ${active ? styles.attendBtnActive : ""}`}
                              onClick={() => handleAttendanceClick(selStudent.id, sta)}>
                              {cfg.icon}<span>{cfg.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Notes */}
                    <div className={styles.notesSection}>
                      <div className={styles.sectionTitle}><FiMessageSquare /> Заметки ({notes.length})</div>
                      <div className={styles.notesList}>
                        {notes.length === 0 ? <p className={styles.emptyText}>Нет заметок</p> : notes.map(n => (
                          <div key={n.id} className={styles.noteItem}>
                            <p className={styles.noteText}>{n.note}</p>
                            <div className={styles.noteMeta}>
                              <span>{new Date(n.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                              <button className={styles.noteDelBtn} onClick={() => deleteNote(n.id)}><FiTrash2 /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className={styles.addNoteRow}>
                        <textarea className={styles.noteInput} rows={2} value={newNote}
                          onChange={e => setNewNote(e.target.value)} placeholder="Добавить заметку..." />
                        <button className={styles.btnPrimary} onClick={addNote} disabled={!newNote.trim()}>
                          <FiPlus />
                        </button>
                      </div>
                    </div>

                    {/* Rewards */}
                    <div className={styles.rewardsSection}>
                      <div className={styles.sectionTitle}><FiGift /> Награды</div>
                      <div className={styles.rewardInputRow}>
                        <div className={styles.rewardField}>
                          <label><FiStar /> Баллы</label>
                          <input type="number" className={styles.rewardInput} value={rewardForm.points}
                            onChange={e => setRewardForm(f => ({ ...f, points: e.target.value }))}
                            placeholder="0" min="0" />
                        </div>
                        <div className={styles.rewardField}>
                          <label><FiZap /> Опыт</label>
                          <input type="number" className={styles.rewardInput} value={rewardForm.experience}
                            onChange={e => setRewardForm(f => ({ ...f, experience: e.target.value }))}
                            placeholder="0" min="0" />
                        </div>
                      </div>
                      <input className={styles.formInput} value={rewardForm.reason}
                        onChange={e => setRewardForm(f => ({ ...f, reason: e.target.value }))}
                        placeholder="Причина выдачи (необязательно)" style={{ marginBottom: 8 }} />
                      <button className={styles.btnReward} onClick={addReward}>
                        <FiAward /><span>Выдать награду</span>
                      </button>
                      {rewards.length > 0 && (
                        <div className={styles.rewardHistory}>
                          <div className={styles.rewardHistTitle}>История урока:</div>
                          {rewards.map(r => (
                            <div key={r.id} className={styles.rewardRow}>
                              {r.points_amount > 0 && <span className={styles.rewardPoints}>+{r.points_amount} ★</span>}
                              {r.experience_amount > 0 && <span className={styles.rewardXp}>+{r.experience_amount} XP</span>}
                              {r.reason && <span className={styles.rewardReason}>{r.reason}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={styles.selectPrompt}>
                    <FiUserCheck />
                    <p>Выберите студента из списка</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ConfirmModal ── */}
      {confirm && (
        <ConfirmModal msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />
      )}

      {/* ── ReasonModal ── */}
      {reason && (
        <ReasonModal
          title={reason.title}
          onConfirm={(val) => {
            const { statusTarget, studentId } = reason;
            setReason(null);
            setAttendance(studentId, statusTarget, val);
          }}
          onCancel={() => setReason(null)}
        />
      )}
    </div>
  );
}
