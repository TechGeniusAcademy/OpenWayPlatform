import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api, { BASE_URL } from '../../utils/api';
import styles from './StarostaDashboard.module.css';
import {
  AiOutlineCrown,
  AiOutlineTeam,
  AiOutlineLineChart,
  AiOutlineCalendar,
  AiOutlineMail,
  AiOutlinePhone,
  AiOutlineStar,
  AiOutlineWallet,
  AiOutlineCopy,
  AiOutlineCheck,
  AiOutlineSearch,
  AiOutlineLeft,
  AiOutlineCheckCircle,
  AiOutlineCloseCircle,
  AiOutlineClockCircle,
  AiOutlineQuestionCircle,
  AiOutlineFileText,
} from 'react-icons/ai';
import { FaMedal, FaUsers } from 'react-icons/fa';
import { GiStarMedal } from 'react-icons/gi';
import { MdOutlineAssignment, MdOutlineHowToVote } from 'react-icons/md';

const TABS = [
  { key: 'contacts',   label: 'Участники',          icon: <AiOutlineTeam /> },
  { key: 'attendance', label: 'Посещаемость',         icon: <MdOutlineHowToVote /> },
  { key: 'homeworks',  label: 'Домашние задания',     icon: <MdOutlineAssignment /> },
  { key: 'stats',      label: 'Статистика',           icon: <AiOutlineLineChart /> },
  { key: 'schedule',   label: 'Расписание',           icon: <AiOutlineCalendar /> },
];

function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }

function AttendanceBar({ present, absent, late, total }) {
  if (total === 0) return <span className={styles.noData}>Нет данных</span>;
  const p = pct(present, total), a = pct(absent, total), l = pct(late, total);
  return (
    <div className={styles.attBar} title={`Присутствовал: ${present}, Отс.: ${absent}, Опоздал: ${late}`}>
      {p > 0 && <div className={styles.attBarPresent} style={{ width: `${p}%` }} />}
      {l > 0 && <div className={styles.attBarLate}    style={{ width: `${l}%` }} />}
      {a > 0 && <div className={styles.attBarAbsent}  style={{ width: `${a}%` }} />}
    </div>
  );
}

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTH_NAMES = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
];

// ─── Attendance tab ──────────────────────────────────────────
function AttendanceTab({ groupId }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView]     = useState('students');

  useEffect(() => {
    if (!groupId) return;
    api.get(`/groups/${groupId}/starosta/attendance`)
      .then(r => setData(r.data))
      .catch(() => setData({ students: [], lessons: [] }))
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) return <div className={styles.loadingWrap}><div className={styles.spinner} /><span>Загрузка...</span></div>;

  const { students = [], lessons = [] } = data || {};

  return (
    <div className={styles.tabContent}>
      <div className={styles.exclusiveBadge}>
        <AiOutlineCrown />
        <span>Эксклюзивно для старосты — посещаемость участников группы</span>
      </div>
      <div className={styles.viewToggle}>
        <button className={`${styles.toggleBtn} ${view === 'students' ? styles.toggleBtnActive : ''}`} onClick={() => setView('students')}>
          <FaUsers /> По участникам
        </button>
        <button className={`${styles.toggleBtn} ${view === 'lessons' ? styles.toggleBtnActive : ''}`} onClick={() => setView('lessons')}>
          <AiOutlineCalendar /> По занятиям
        </button>
      </div>

      {view === 'students' && (
        students.length === 0
          ? <div className={styles.emptyState}><AiOutlineQuestionCircle className={styles.emptyIcon} /><p>Данные посещаемости ещё не заполнены</p></div>
          : <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr>
                  <th>Участник</th>
                  <th style={{ color: '#22c55e' }}>Присутствовал</th>
                  <th style={{ color: '#ef4444' }}>Пропустил</th>
                  <th style={{ color: '#f59e0b' }}>Опоздал</th>
                  <th>Посещаемость</th>
                </tr></thead>
                <tbody>
                  {students.map(s => {
                    const total   = +s.total_marked;
                    const present = +s.present_count;
                    const absent  = +s.absent_count;
                    const late    = +s.late_count;
                    const rate    = total > 0 ? pct(present + late, total) : null;
                    return (
                      <tr key={s.id} className={absent > 2 ? styles.rowDanger : ''}>
                        <td>
                          <div className={styles.memberCell}>
                            <div className={styles.memberAvatar}>
                              {s.avatar_url ? <img src={`${BASE_URL}${s.avatar_url}`} alt={s.username} /> : (s.full_name || s.username || '?')[0].toUpperCase()}
                            </div>
                            <span className={styles.memberName}>{s.full_name || s.username}</span>
                          </div>
                        </td>
                        <td className={styles.attCell}><span className={styles.attPresent}>{present}</span></td>
                        <td className={styles.attCell}><span className={styles.attAbsent}>{absent}</span></td>
                        <td className={styles.attCell}><span className={styles.attLate}>{late}</span></td>
                        <td>
                          {rate !== null
                            ? <div className={styles.attRateWrap}>
                                <AttendanceBar present={present} absent={absent} late={late} total={total} />
                                <span className={styles.attRate}>{rate}%</span>
                              </div>
                            : <span className={styles.noData}>Нет данных</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
      )}

      {view === 'lessons' && (
        lessons.length === 0
          ? <div className={styles.emptyState}><AiOutlineQuestionCircle className={styles.emptyIcon} /><p>Данные по занятиям ещё не заполнены</p></div>
          : <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr>
                  <th>Занятие</th>
                  <th>Дата</th>
                  <th style={{ color: '#22c55e' }}>Пришли</th>
                  <th style={{ color: '#ef4444' }}>Не пришли</th>
                  <th style={{ color: '#f59e0b' }}>Опоздали</th>
                </tr></thead>
                <tbody>
                  {lessons.map((l, i) => (
                    <tr key={i}>
                      <td className={styles.memberName}>{l.title}</td>
                      <td className={styles.noData}>{l.lesson_date ? new Date(l.lesson_date).toLocaleDateString('ru-RU') : '—'}</td>
                      <td className={styles.attCell}><span className={styles.attPresent}>{+l.present_count}</span></td>
                      <td className={styles.attCell}><span className={styles.attAbsent}>{+l.absent_count}</span></td>
                      <td className={styles.attCell}><span className={styles.attLate}>{+l.late_count}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      )}
    </div>
  );
}

// ─── Homeworks tab ────────────────────────────────────────────
function HomeworksTab({ groupId }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView]       = useState('homeworks');

  useEffect(() => {
    if (!groupId) return;
    api.get(`/groups/${groupId}/starosta/homeworks`)
      .then(r => setData(r.data))
      .catch(() => setData({ homeworks: [], students: [] }))
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) return <div className={styles.loadingWrap}><div className={styles.spinner} /><span>Загрузка...</span></div>;

  const { homeworks = [], students = [] } = data || {};
  const statusLabel = { open: 'Открыто', closed: 'Закрыто', expired: 'Просрочено' };
  const statusClass = { open: styles.statusOpen, closed: styles.statusClosed, expired: styles.statusExpired };

  return (
    <div className={styles.tabContent}>
      <div className={styles.exclusiveBadge}>
        <AiOutlineCrown />
        <span>Эксклюзивно — статус сдачи ДЗ всеми участниками группы</span>
      </div>
      <div className={styles.viewToggle}>
        <button className={`${styles.toggleBtn} ${view === 'homeworks' ? styles.toggleBtnActive : ''}`} onClick={() => setView('homeworks')}>
          <AiOutlineFileText /> По заданиям
        </button>
        <button className={`${styles.toggleBtn} ${view === 'students' ? styles.toggleBtnActive : ''}`} onClick={() => setView('students')}>
          <FaUsers /> По участникам
        </button>
      </div>

      {view === 'homeworks' && (
        homeworks.length === 0
          ? <div className={styles.emptyState}><AiOutlineFileText className={styles.emptyIcon} /><p>Домашних заданий ещё нет</p></div>
          : <div className={styles.hwList}>
              {homeworks.map(hw => {
                const total     = +hw.total_students;
                const submitted = +hw.submitted_count;
                const approved  = +hw.approved_count;
                const missing   = total - submitted;
                const rate      = pct(submitted, total);
                return (
                  <div key={hw.id} className={styles.hwCard}>
                    <div className={styles.hwCardHead}>
                      <div className={styles.hwCardTitle}>
                        <AiOutlineFileText className={styles.hwTitleIcon} />
                        <span>{hw.title}</span>
                      </div>
                      <span className={`${styles.hwStatus} ${statusClass[hw.status] || ''}`}>
                        {statusLabel[hw.status] || hw.status}
                      </span>
                    </div>
                    {hw.deadline && (
                      <div className={styles.hwDeadline}>
                        <AiOutlineClockCircle /> Дедлайн: {new Date(hw.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    )}
                    <div className={styles.hwStats}>
                      <div className={styles.hwStat}><span className={styles.hwStatVal} style={{ color: '#22c55e' }}>{submitted}</span><span className={styles.hwStatLabel}>Сдали</span></div>
                      <div className={styles.hwStat}><span className={styles.hwStatVal} style={{ color: '#6366f1' }}>{approved}</span><span className={styles.hwStatLabel}>Зачтено</span></div>
                      <div className={styles.hwStat}><span className={styles.hwStatVal} style={{ color: '#ef4444' }}>{missing}</span><span className={styles.hwStatLabel}>Не сдали</span></div>
                      <div className={styles.hwStat}><span className={styles.hwStatVal}>{total}</span><span className={styles.hwStatLabel}>Всего</span></div>
                    </div>
                    <div className={styles.hwProgress}>
                      <div className={styles.hwProgressBar}>
                        <div className={styles.hwProgressApproved} style={{ width: `${pct(approved, total)}%` }} />
                        <div className={styles.hwProgressSubmitted} style={{ width: `${pct(submitted - approved, total)}%` }} />
                      </div>
                      <span className={styles.hwProgressLabel}>{rate}% сдано</span>
                    </div>
                  </div>
                );
              })}
            </div>
      )}

      {view === 'students' && (
        students.length === 0
          ? <div className={styles.emptyState}><FaUsers className={styles.emptyIcon} /><p>Нет данных</p></div>
          : <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr>
                  <th>#</th>
                  <th>Участник</th>
                  <th>Сдано / Всего</th>
                  <th>Прогресс</th>
                </tr></thead>
                <tbody>
                  {students.map((s, i) => {
                    const total     = +s.total_hw;
                    const submitted = +s.submitted_count;
                    const missing   = total - submitted;
                    const rate      = pct(submitted, total);
                    return (
                      <tr key={s.id} className={missing > 0 ? styles.rowWarn : ''}>
                        <td className={styles.rankCell}><span className={styles.rankNum}>{i + 1}</span></td>
                        <td>
                          <div className={styles.memberCell}>
                            <div className={styles.memberAvatar}>
                              {s.avatar_url ? <img src={`${BASE_URL}${s.avatar_url}`} alt={s.username} /> : (s.full_name || s.username || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <div className={styles.memberName}>{s.full_name || s.username}</div>
                              {missing > 0 && <div className={styles.missLabel}>Не сдано: {missing}</div>}
                            </div>
                          </div>
                        </td>
                        <td className={styles.hwRatio}>
                          <span style={{ color: '#22c55e', fontWeight: 700 }}>{submitted}</span>
                          <span> / {total}</span>
                        </td>
                        <td>
                          <div className={styles.attRateWrap}>
                            <div className={styles.hwProgressBar} style={{ flex: 1 }}>
                              <div className={styles.hwProgressApproved} style={{ width: `${rate}%` }} />
                            </div>
                            <span className={styles.attRate}>{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
      )}
    </div>
  );
}

// ─── Contacts tab ─────────────────────────────────────────────
function ContactsTab({ students }) {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return students;
    return students.filter(s =>
      (s.full_name || s.username || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q)
    );
  }, [students, search]);

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const exportCSV = () => {
    const header = 'ФИО,Username,Email,Телефон,Баллы,Уровень';
    const rows = students.map(s =>
      `"${s.full_name || s.username}","${s.username}","${s.email || ''}","${s.phone || ''}",${s.points || 0},${s.level || 1}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'group_contacts.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.exclusiveBadge}>
        <AiOutlineCrown />
        <span>Эксклюзивно для старосты — полные контакты участников группы</span>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <AiOutlineSearch className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени, email или телефону..."
          />
        </div>
        <button className={styles.btnSec} onClick={exportCSV} title="Экспорт в CSV">
          📥 Экспорт CSV
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Участник</th>
              <th>Email</th>
              <th>Телефон</th>
              <th>Баллы</th>
              <th>Уровень</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className={styles.emptyCell}>Ничего не найдено</td></tr>
            ) : filtered.map((s, i) => (
              <tr key={s.id} className={s.is_group_leader ? styles.leaderRow : ''}>
                <td className={styles.rankCell}>
                  {s.is_group_leader
                    ? <GiStarMedal style={{ color: '#f59e0b', fontSize: 18 }} />
                    : <span className={styles.rankNum}>{i + 1}</span>
                  }
                </td>
                <td>
                  <div className={styles.memberCell}>
                    <div className={styles.memberAvatar}>
                      {s.avatar_url
                        ? <img src={`${BASE_URL}${s.avatar_url}`} alt={s.username} />
                        : (s.full_name || s.username || '?')[0].toUpperCase()
                      }
                    </div>
                    <div>
                      <div className={styles.memberName}>{s.full_name || s.username}</div>
                      <div className={styles.memberAt}>@{s.username}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className={styles.contactCell}>
                    <span>{s.email || '—'}</span>
                    {s.email && (
                      <button
                        className={styles.copyBtn}
                        onClick={() => copyText(s.email, `email-${s.id}`)}
                        title="Скопировать"
                      >
                        {copied === `email-${s.id}` ? <AiOutlineCheck style={{ color: '#22c55e' }} /> : <AiOutlineCopy />}
                      </button>
                    )}
                  </div>
                </td>
                <td>
                  <div className={styles.contactCell}>
                    <span>{s.phone || '—'}</span>
                    {s.phone && (
                      <button
                        className={styles.copyBtn}
                        onClick={() => copyText(s.phone, `phone-${s.id}`)}
                        title="Скопировать"
                      >
                        {copied === `phone-${s.id}` ? <AiOutlineCheck style={{ color: '#22c55e' }} /> : <AiOutlineCopy />}
                      </button>
                    )}
                  </div>
                </td>
                <td><span className={styles.pointsBadge}><AiOutlineWallet />{(s.points || 0).toLocaleString()}</span></td>
                <td><span className={styles.levelBadge}><AiOutlineStar />{s.level || 1}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Stats tab ────────────────────────────────────────────────
function StatsTab({ students, groupName }) {
  const sorted = useMemo(
    () => [...students].sort((a, b) => (b.points || 0) - (a.points || 0)),
    [students]
  );

  const totalPoints  = students.reduce((s, m) => s + (m.points || 0), 0);
  const avgPoints    = students.length ? Math.round(totalPoints / students.length) : 0;
  const avgLevel     = students.length
    ? Math.round(students.reduce((s, m) => s + (m.level || 1), 0) / students.length)
    : 0;
  const maxPoints    = sorted[0]?.points || 0;
  const rankColors   = ['#FFD700', '#C0C0C0', '#CD7F32'];

  // Распределение по уровням
  const levelMap = {};
  students.forEach(s => {
    const lv = s.level || 1;
    levelMap[lv] = (levelMap[lv] || 0) + 1;
  });
  const levels = Object.entries(levelMap).sort((a, b) => Number(a[0]) - Number(b[0]));

  return (
    <div className={styles.tabContent}>
      {/* Summary cards */}
      <div className={styles.statCards}>
        <div className={styles.statCard}>
          <div className={styles.statCardIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
            <AiOutlineWallet />
          </div>
          <div className={styles.statCardVal}>{totalPoints.toLocaleString()}</div>
          <div className={styles.statCardLabel}>Всего баллов</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardIcon} style={{ background: '#ede9fe', color: '#7c3aed' }}>
            <AiOutlineLineChart />
          </div>
          <div className={styles.statCardVal}>{avgPoints.toLocaleString()}</div>
          <div className={styles.statCardLabel}>Среднее баллов</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardIcon} style={{ background: '#dcfce7', color: '#16a34a' }}>
            <AiOutlineStar />
          </div>
          <div className={styles.statCardVal}>{avgLevel}</div>
          <div className={styles.statCardLabel}>Средний уровень</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardIcon} style={{ background: '#fee2e2', color: '#dc2626' }}>
            <FaUsers />
          </div>
          <div className={styles.statCardVal}>{students.length}</div>
          <div className={styles.statCardLabel}>Участников</div>
        </div>
      </div>

      <div className={styles.statsGrid}>
        {/* Топ участников */}
        <div className={styles.statsCard}>
          <h3 className={styles.statsCardTitle}><FaMedal style={{ color: '#f59e0b' }} /> Рейтинг участников</h3>
          <div className={styles.rankList}>
            {sorted.map((s, i) => {
              const pct = maxPoints > 0 ? Math.round(((s.points || 0) / maxPoints) * 100) : 0;
              return (
                <div key={s.id} className={styles.rankRow}>
                  <span className={styles.rankPos} style={{ color: i < 3 ? rankColors[i] : 'var(--text-secondary)' }}>
                    {i < 3 ? <FaMedal /> : `#${i + 1}`}
                  </span>
                  <div className={styles.rankAvatar}>
                    {s.avatar_url
                      ? <img src={`${BASE_URL}${s.avatar_url}`} alt={s.username} />
                      : (s.full_name || s.username || '?')[0].toUpperCase()
                    }
                  </div>
                  <div className={styles.rankInfo}>
                    <div className={styles.rankName}>
                      {s.full_name || s.username}
                      {s.is_group_leader && <GiStarMedal style={{ color: '#f59e0b', marginLeft: 5 }} />}
                    </div>
                    <div className={styles.rankBar}>
                      <div className={styles.rankBarFill} style={{ width: `${pct}%`, background: i < 3 ? rankColors[i] : 'var(--accent)' }} />
                    </div>
                  </div>
                  <span className={styles.rankPts}>{(s.points || 0).toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Распределение по уровням */}
        <div className={styles.statsCard}>
          <h3 className={styles.statsCardTitle}><AiOutlineStar style={{ color: '#7c3aed' }} /> Распределение по уровням</h3>
          {levels.length === 0 ? (
            <p className={styles.emptyText}>Нет данных</p>
          ) : (
            <div className={styles.levelBars}>
              {levels.map(([lv, count]) => {
                const pct = Math.round((count / students.length) * 100);
                return (
                  <div key={lv} className={styles.levelBarRow}>
                    <span className={styles.levelBarLabel}>Ур. {lv}</span>
                    <div className={styles.levelBarTrack}>
                      <div
                        className={styles.levelBarFill}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={styles.levelBarVal}>{count} чел. ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Сводная таблица */}
          <h3 className={styles.statsCardTitle} style={{ marginTop: 24 }}>
            <AiOutlineTeam style={{ color: '#0891b2' }} /> Сводка по участникам
          </h3>
          <div className={styles.summaryTable}>
            <div className={styles.summaryRow}>
              <span>Лидер по баллам</span>
              <strong>{sorted[0]?.full_name || sorted[0]?.username || '—'}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Макс. баллов</span>
              <strong>{(sorted[0]?.points || 0).toLocaleString()}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Мин. баллов</span>
              <strong>{(sorted[sorted.length - 1]?.points || 0).toLocaleString()}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Макс. уровень</span>
              <strong>{Math.max(...students.map(s => s.level || 1))}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule tab ─────────────────────────────────────────────
function ScheduleTab({ groupId }) {
  const [lessons, setLessons]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    if (!groupId) return;
    const load = async () => {
      setLoading(true);
      try {
        // Загрузить уроки на 60 дней вперёд
        const start = new Date();
        start.setDate(start.getDate() - 7);
        const end = new Date();
        end.setDate(end.getDate() + 53);
        const fmt = d => d.toISOString().split('T')[0];
        const { data } = await api.get(
          `/schedule/lessons/calendar?group_id=${groupId}&start_date=${fmt(start)}&end_date=${fmt(end)}`
        );
        setLessons(data);
      } catch {
        setLessons([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId]);

  // Уроки в выбранном месяце
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthLessons = useMemo(() => {
    const map = {};
    lessons.forEach(l => {
      const day = l.event_date || l.lesson_date?.split('T')[0];
      if (!day) return;
      const d = new Date(day);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const k = d.getDate();
        if (!map[k]) map[k] = [];
        map[k].push(l);
      }
    });
    return map;
  }, [lessons, year, month]);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const today = new Date();

  return (
    <div className={styles.tabContent}>
      {/* Priority notice */}
      <div className={styles.priorityNotice}>
        <AiOutlineCrown className={styles.priorityIcon} />
        <div>
          <strong>Приоритет в расписании</strong>
          <span>Как староста вы видите полное расписание группы и получаете первый доступ при распределении времени занятий.</span>
        </div>
      </div>

      {/* Calendar nav */}
      <div className={styles.calNav}>
        <button className={styles.calNavBtn} onClick={prevMonth}><AiOutlineLeft /></button>
        <span className={styles.calNavTitle}>{MONTH_NAMES[month]} {year}</span>
        <button className={styles.calNavBtn} onClick={nextMonth} style={{ transform: 'rotate(180deg)' }}><AiOutlineLeft /></button>
      </div>

      {loading ? (
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
          <span>Загрузка расписания...</span>
        </div>
      ) : (
        <>
          {/* Calendar grid */}
          <div className={styles.calGrid}>
            {DAY_NAMES.map(d => (
              <div key={d} className={styles.calDayName}>{d}</div>
            ))}
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e${i}`} className={styles.calCell} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
              const dayLessons = monthLessons[day] || [];
              return (
                <div key={day} className={`${styles.calCell} ${styles.calCellActive} ${isToday ? styles.calCellToday : ''}`}>
                  <span className={styles.calDayNum}>{day}</span>
                  {dayLessons.slice(0, 2).map((l, idx) => (
                    <div key={idx} className={styles.calLesson} title={`${l.lesson_time?.slice(0, 5)} — ${l.title}`}>
                      <span className={styles.calLessonTime}>{l.lesson_time?.slice(0, 5)}</span>
                      <span className={styles.calLessonTitle}>{l.title}</span>
                    </div>
                  ))}
                  {dayLessons.length > 2 && (
                    <span className={styles.calMore}>+{dayLessons.length - 2}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Upcoming lessons list */}
          <h3 className={styles.upcomingTitle}>Ближайшие занятия</h3>
          {(() => {
            const todayStr = today.toISOString().split('T')[0];
            const upcoming = lessons
              .filter(l => (l.event_date || l.lesson_date?.split('T')[0]) >= todayStr)
              .slice(0, 10);
            if (upcoming.length === 0) return <p className={styles.emptyText}>Нет предстоящих занятий</p>;
            return (
              <div className={styles.upcomingList}>
                {upcoming.map((l, i) => {
                  const dateStr = l.event_date || l.lesson_date?.split('T')[0];
                  const d = new Date(dateStr);
                  return (
                    <div key={i} className={styles.upcomingItem}>
                      <div className={styles.upcomingDate}>
                        <span className={styles.upcomingDay}>{d.getDate()}</span>
                        <span className={styles.upcomingMonth}>{MONTH_NAMES[d.getMonth()].slice(0, 3)}</span>
                      </div>
                      <div className={styles.upcomingInfo}>
                        <div className={styles.upcomingName}>{l.title}</div>
                        <div className={styles.upcomingMeta}>
                          <AiOutlineCalendar />
                          {DAY_NAMES[d.getDay()]}, {l.lesson_time?.slice(0, 5)}
                          {l.duration_minutes ? ` · ${l.duration_minutes} мин` : ''}
                        </div>
                        {l.description && (
                          <div className={styles.upcomingDesc}>{l.description}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────
export default function StarostaDashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [tab, setTab]       = useState('contacts');
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading]    = useState(true);

  useEffect(() => {
    if (!user?.is_group_leader) {
      navigate('/student/group');
      return;
    }
    if (!user?.group_id) { setLoading(false); return; }
    api.get(`/groups/${user.group_id}`)
      .then(r => setGroupInfo(r.data.group))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user?.is_group_leader) return null;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}><div className={styles.spinner} /></div>
      </div>
    );
  }

  const students = groupInfo?.students || [];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/student/group')}>
          <AiOutlineLeft /> Моя группа
        </button>
        <div className={styles.headerMain}>
          <div className={styles.headerIcon}><AiOutlineCrown /></div>
          <div>
            <h1 className={styles.headerTitle}>Панель старосты</h1>
            <p className={styles.headerSub}>{groupInfo?.name || 'Группа'} · {students.length} участников</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'contacts'   && <ContactsTab   students={students} />}
      {tab === 'attendance'  && <AttendanceTab  groupId={user?.group_id} />}
      {tab === 'homeworks'   && <HomeworksTab   groupId={user?.group_id} />}
      {tab === 'stats'       && <StatsTab       students={students} groupName={groupInfo?.name} />}
      {tab === 'schedule'    && <ScheduleTab    groupId={user?.group_id} />}
    </div>
  );
}
