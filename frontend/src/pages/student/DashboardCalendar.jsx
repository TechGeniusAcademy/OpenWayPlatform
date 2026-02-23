import { useState, useEffect, useCallback } from "react";
import api from "../../utils/api";
import styles from "../StudentDashboard.module.css";
import { FiChevronLeft, FiChevronRight, FiClock } from "react-icons/fi";

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь",
];

const fmt = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function DashboardCalendar() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState([]); // [{event_date, lesson_time, title, duration_minutes}]
  const [selected, setSelected] = useState(fmt(today));
  const [loading, setLoading] = useState(false);

  const fetchMonth = useCallback(async (year, month) => {
    setLoading(true);
    try {
      const start = fmt(new Date(year, month, 1));
      const end   = fmt(new Date(year, month + 1, 0)); // last day of month
      const res = await api.get(`/schedule/my-schedule?start_date=${start}&end_date=${end}`);
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonth(viewDate.getFullYear(), viewDate.getMonth());
  }, [viewDate, fetchMonth]);

  // ---- calendar grid helpers ----
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // day-of-week for 1st of month (Mon=0 … Sun=6)
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();

  // total cells (always 6 rows × 7 cols = 42)
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const offset = i - firstDow;
    if (offset < 0) {
      cells.push({ day: daysInPrev + offset + 1, cur: false });
    } else if (offset < daysInMonth) {
      cells.push({ day: offset + 1, cur: true });
    } else {
      cells.push({ day: offset - daysInMonth + 1, cur: false });
    }
  }

  const todayStr = fmt(today);

  // build a map: "YYYY-MM-DD" → true  (has events)
  const dotMap = {};
  events.forEach(e => { dotMap[e.event_date] = true; });

  const cellDate = (cell, row) => {
    const offset = row * 7 + cells.indexOf(cell) - firstDow + 1;
    if (!cell.cur) return null;
    return fmt(new Date(year, month, cell.day));
  };

  // selected day's lessons
  const dayLessons = events
    .filter(e => e.event_date === selected)
    .sort((a, b) => (a.lesson_time || "").localeCompare(b.lesson_time || ""));

  const goPrev = () => setViewDate(new Date(year, month - 1, 1));
  const goNext = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className={styles["cal-wrap"]}>
      {/* ---- header ---- */}
      <div className={styles["cal-header"]}>
        <button className={styles["cal-nav"]} onClick={goPrev}><FiChevronLeft /></button>
        <span className={styles["cal-month-label"]}>
          {MONTHS[month]} {year}
          {loading && <span className={styles["cal-loading"]} />}
        </span>
        <button className={styles["cal-nav"]} onClick={goNext}><FiChevronRight /></button>
      </div>

      {/* ---- day-of-week row ---- */}
      <div className={styles["cal-grid"]}>
        {DAYS.map(d => (
          <div key={d} className={styles["cal-dow"]}>{d}</div>
        ))}

        {/* ---- date cells ---- */}
        {cells.map((cell, i) => {
          const dateStr = cell.cur
            ? fmt(new Date(year, month, cell.day))
            : null;
          const isToday    = dateStr === todayStr;
          const isSelected = dateStr === selected;
          const hasDot     = dateStr && dotMap[dateStr];

          return (
            <button
              key={i}
              className={[
                styles["cal-cell"],
                !cell.cur   ? styles["cal-cell--out"]      : "",
                isToday     ? styles["cal-cell--today"]    : "",
                isSelected  ? styles["cal-cell--selected"] : "",
              ].join(" ")}
              onClick={() => dateStr && setSelected(dateStr)}
              disabled={!cell.cur}
            >
              {cell.day}
              {hasDot && <span className={styles["cal-dot"]} />}
            </button>
          );
        })}
      </div>

      {/* ---- lesson list for selected day ---- */}
      <div className={styles["cal-lessons"]}>
        {dayLessons.length === 0 ? (
          <div className={styles["cal-empty"]}>Нет занятий</div>
        ) : (
          dayLessons.map((l, i) => (
            <div key={i} className={styles["cal-lesson-row"]}>
              <div className={styles["cal-lesson-time"]}>
                <FiClock />
                {l.lesson_time?.slice(0, 5)}
              </div>
              <div className={styles["cal-lesson-title"]}>{l.title}</div>
              {l.duration_minutes && (
                <div className={styles["cal-lesson-dur"]}>{l.duration_minutes} мин</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
