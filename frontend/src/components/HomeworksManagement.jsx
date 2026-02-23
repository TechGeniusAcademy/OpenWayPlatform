import { useState, useEffect, useMemo, useCallback } from "react";
import {
  FiFileText, FiPlus, FiEdit2, FiTrash2, FiCheckSquare, FiClock,
  FiLock, FiUnlock, FiX, FiCheck, FiAlertCircle, FiRefreshCw,
  FiDownload, FiPaperclip, FiSearch, FiUsers, FiAward,
  FiInbox, FiFilter,
} from "react-icons/fi";
import { HiOutlineClipboardCheck } from "react-icons/hi";
import api from "../utils/api";
import QuillEditor from "./QuillEditor";
import styles from "./HomeworksManagement.module.css";

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
      <div className={`${styles.modal} ${styles.modalSm}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <div className={styles.modalTitle}><FiAlertCircle style={{ color: "var(--danger)" }} /><h2>Подтверждение</h2></div>
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

/* ─── helpers ─── */
const QUILL_MODULES = {
  toolbar: [[{ header: [1,2,3,4,5,6,false] }],[{ font: [] }],[{ size: [] }],["bold","italic","underline","strike","blockquote"],[{ list:"ordered"},{ list:"bullet"},{ indent:"-1"},{ indent:"+1"}],[{ color:[] },{ background:[] }],[{ align:[] }],["link","image","video"],["clean"]],
};

const parseAttachments = (a) => {
  if (!a) return [];
  if (typeof a === "string") { try { return JSON.parse(a); } catch { return []; } }
  return a;
};

const FILE_ICONS = { pdf:"📄", doc:"📝", docx:"📝", xls:"📊", xlsx:"📊", ppt:"📊", pptx:"📊", zip:"📦", rar:"📦", "7z":"📦", jpg:"🖼️", jpeg:"🖼️", png:"🖼️", gif:"🖼️", webp:"🖼️", html:"🌐", css:"🎨", js:"⚡", txt:"📃", json:"📋" };
const fileIcon = (name) => FILE_ICONS[name?.split(".").pop()?.toLowerCase()] || "📎";
const fmtSize  = (b) => { if (!b) return ""; const k=1024, s=["B","KB","MB","GB"], i=Math.floor(Math.log(b)/Math.log(k)); return (b/Math.pow(k,i)).toFixed(1)+" "+s[i]; };

const hwStatus = (hw) => {
  if (hw.is_closed || hw.manually_closed) return "closed";
  if (hw.deadline && new Date(hw.deadline) < new Date()) return "expired";
  return "active";
};

const emptyForm = () => ({ title: "", description: "", points: 0, deadline: "" });

/* ════════════════ MAIN ════════════════ */
export default function HomeworksManagement() {
  const [homeworks, setHomeworks]   = useState([]);
  const [groups,    setGroups]      = useState([]);
  const [loading,   setLoading]     = useState(true);
  const [toast,     setToast]       = useState(null);
  const [confirm,   setConfirm]     = useState(null);

  /* filters */
  const [search,     setSearch]     = useState("");
  const [filterSt,   setFilterSt]   = useState("all");

  /* hw form modal */
  const [editHw,  setEditHw]  = useState(null); // null | "new" | hw
  const [form,    setForm]    = useState(emptyForm());
  const [formErr, setFormErr] = useState("");
  const [saving,  setSaving]  = useState(false);

  /* assign modal */
  const [assignHw,  setAssignHw]  = useState(null);
  const [assignments, setAssigns] = useState([]);

  /* submissions modal */
  const [subsHw,  setSubsHw]  = useState(null);
  const [subs,    setSubs]    = useState([]);
  /* per-submission check state: { [id]: { points, reason } } */
  const [checkData, setCheckData] = useState({});

  const notify = (type, msg) => setToast({ type, msg });

  /* ── load ── */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [hwRes, grRes] = await Promise.all([api.get("/homeworks"), api.get("/groups")]);
      setHomeworks(hwRes.data.homeworks || []);
      setGroups(grRes.data.groups || []);
    } catch { notify("error", "Ошибка загрузки"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  /* ── stats ── */
  const stats = useMemo(() => ({
    total:   homeworks.length,
    active:  homeworks.filter(h => hwStatus(h) === "active").length,
    pending: homeworks.reduce((s,h) => s + (+h.pending_count||0), 0),
    closed:  homeworks.filter(h => hwStatus(h) !== "active").length,
  }), [homeworks]);

  /* ── filtered ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return homeworks.filter(h => {
      const ms = !q || h.title.toLowerCase().includes(q);
      const mst = filterSt === "all" || hwStatus(h) === filterSt;
      return ms && mst;
    });
  }, [homeworks, search, filterSt]);

  /* ── hw form ── */
  const openCreate = () => { setEditHw("new"); setForm(emptyForm()); setFormErr(""); };
  const openEdit   = (h) => {
    setEditHw(h);
    setForm({ title: h.title, description: h.description || "", points: h.points || 0, deadline: h.deadline ? new Date(h.deadline).toISOString().slice(0,16) : "" });
    setFormErr("");
  };
  const handleSubmit = async (e) => {
    e.preventDefault(); setFormErr("");
    if (!form.title.trim()) { setFormErr("Введите название задания"); return; }
    setSaving(true);
    try {
      const payload = { title: form.title, description: form.description, points: +form.points, deadline: form.deadline || null };
      if (editHw === "new") { await api.post("/homeworks", payload); notify("success", "Задание создано"); }
      else { await api.put(`/homeworks/${editHw.id}`, payload); notify("success", "Задание обновлено"); }
      setEditHw(null); load();
    } catch (err) { setFormErr(err.response?.data?.error || "Ошибка сохранения"); }
    finally { setSaving(false); }
  };

  /* ── delete ── */
  const askDelete = (h) => setConfirm({
    msg: `Удалить задание «${h.title}»? Это действие необратимо.`,
    onConfirm: async () => {
      setConfirm(null);
      try { await api.delete(`/homeworks/${h.id}`); notify("success", "Задание удалено"); load(); }
      catch { notify("error", "Ошибка удаления"); }
    },
  });

  /* ── toggle closed ── */
  const toggleClosed = async (h) => {
    try {
      await api.patch(`/homeworks/${h.id}/toggle-closed`, { manually_closed: !h.manually_closed });
      notify("success", h.manually_closed ? "Задание открыто" : "Задание закрыто");
      load();
    } catch { notify("error", "Ошибка изменения статуса"); }
  };

  /* ── assign ── */
  const openAssign = async (h) => {
    setAssignHw(h);
    try { const { data } = await api.get(`/homeworks/${h.id}/assignments`); setAssigns(data.assignments || []); }
    catch { notify("error", "Ошибка загрузки назначений"); }
  };
  const handleAssign   = async (gid) => {
    try { await api.post(`/homeworks/${assignHw.id}/assign`, { groupId: gid }); await openAssign(assignHw); notify("success","Назначено"); }
    catch { notify("error","Ошибка назначения"); }
  };
  const handleUnassign = async (gid) => {
    try { await api.delete(`/homeworks/${assignHw.id}/assign/${gid}`); await openAssign(assignHw); notify("success","Назначение отменено"); }
    catch { notify("error","Ошибка"); }
  };

  /* ── submissions ── */
  const openSubs = async (h) => {
    setSubsHw(h);
    try {
      const { data } = await api.get(`/homeworks/${h.id}/submissions`);
      const list = data.submissions || [];
      setSubs(list);
      const init = {};
      list.forEach(s => { init[s.id] = { points: h.points || 0, reason: "" }; });
      setCheckData(init);
    } catch { notify("error","Ошибка загрузки сдач"); }
  };
  const handleCheck = async (subId, status) => {
    const cd = checkData[subId] || {};
    try {
      await api.post(`/homeworks/submission/${subId}/check`, { status, reason: cd.reason || "", pointsEarned: status === "accepted" ? +cd.points : 0 });
      notify("success", status === "accepted" ? "Принято" : "Отклонено");
      await openSubs(subsHw);
    } catch { notify("error","Ошибка проверки"); }
  };
  const updCheck = (id, field, val) => setCheckData(p => ({ ...p, [id]: { ...p[id], [field]: val } }));

  /* ── status helpers ── */
  const StatusBadge = ({ hw }) => {
    const st = hwStatus(hw);
    if (st === "closed")  return <span className={`${styles.badge} ${styles.badgeClosed}`}><FiLock /><span>Закрыто</span></span>;
    if (st === "expired") return <span className={`${styles.badge} ${styles.badgeExpired}`}><FiClock /><span>Просрочено</span></span>;
    return <span className={`${styles.badge} ${styles.badgeActive}`}><FiCheck /><span>Активно</span></span>;
  };

  /* ─── SKELETON ─── */
  if (loading) return (
    <div className={styles.page}>
      <div className={styles.stats}>{[1,2,3,4].map(i => <div key={i} className={styles.skStat} />)}</div>
      <div className={styles.grid}>{[1,2,3,4,5,6].map(i => <div key={i} className={styles.skCard}><div className={styles.skHead}/><div className={styles.skBody}><div className={styles.skLine}/><div className={styles.skLine} style={{width:"60%"}}/></div></div>)}</div>
    </div>
  );

  return (
    <div className={styles.page}>
      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><HiOutlineClipboardCheck /></div>
          <div>
            <h1 className={styles.headerTitle}>Домашние задания</h1>
            <p className={styles.headerSub}>Создание, назначение и проверка домашних заданий</p>
          </div>
        </div>
        <button className={styles.btnPrimary} onClick={openCreate}><FiPlus /><span>Создать задание</span></button>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}><div className={`${styles.statIcon} ${styles.statIconTotal}`}><FiFileText /></div><div><div className={styles.statVal}>{stats.total}</div><div className={styles.statLabel}>Всего заданий</div></div></div>
        <div className={styles.stat}><div className={`${styles.statIcon} ${styles.statIconActive}`}><FiCheck /></div><div><div className={styles.statVal}>{stats.active}</div><div className={styles.statLabel}>Активных</div></div></div>
        <div className={styles.stat}><div className={`${styles.statIcon} ${styles.statIconPending}`}><FiInbox /></div><div><div className={styles.statVal}>{stats.pending}</div><div className={styles.statLabel}>На проверке</div></div></div>
        <div className={styles.stat}><div className={`${styles.statIcon} ${styles.statIconClosed}`}><FiLock /></div><div><div className={styles.statVal}>{stats.closed}</div><div className={styles.statLabel}>Закрытых</div></div></div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <FiSearch className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Поиск по названию..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className={styles.searchClear} onClick={() => setSearch("")}><FiX /></button>}
        </div>
        <select className={styles.filterSelect} value={filterSt} onChange={e => setFilterSt(e.target.value)}>
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="expired">Просроченные</option>
          <option value="closed">Закрытые</option>
        </select>
        {(search || filterSt !== "all") && (
          <button className={styles.clearFilters} onClick={() => { setSearch(""); setFilterSt("all"); }}><FiX /> Сбросить</button>
        )}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><FiFileText /></div>
          <h3>{homeworks.length === 0 ? "Нет заданий" : "Ничего не найдено"}</h3>
          <p>{homeworks.length === 0 ? "Создайте первое задание" : "Попробуйте изменить параметры поиска"}</p>
          {homeworks.length === 0 && <button className={styles.btnPrimary} style={{marginTop:16}} onClick={openCreate}><FiPlus /><span>Создать задание</span></button>}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(h => {
            const st = hwStatus(h);
            return (
              <div key={h.id} className={`${styles.card} ${st !== "active" ? styles.cardInactive : ""}`}>
                <div className={styles.cardHead}>
                  <StatusBadge hw={h} />
                  {(+h.pending_count > 0) && (
                    <span className={styles.pendingChip}><FiInbox /> {h.pending_count} на провер.</span>
                  )}
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{h.title}</h3>
                  <div className={styles.cardMeta}>
                    <span><FiAward /> {h.points} баллов</span>
                    <span><FiClock /> {h.deadline ? new Date(h.deadline).toLocaleString("ru-RU", {day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "Без срока"}</span>
                    <span><FiUsers /> {h.assigned_groups_count || 0} групп</span>
                  </div>
                </div>
                <div className={styles.cardFoot}>
                  <button className={`${styles.iconBtn} ${styles.iconBtnEdit}`} onClick={() => openEdit(h)} title="Редактировать"><FiEdit2 /></button>
                  <button className={`${styles.iconBtn} ${styles.iconBtnAssign}`} onClick={() => openAssign(h)} title="Назначить группам"><FiUsers /></button>
                  <button className={`${styles.iconBtn} ${styles.iconBtnSubs}`} onClick={() => openSubs(h)} title="Просмотреть сдачи"><FiFileText /></button>
                  <button className={`${styles.iconBtn} ${h.manually_closed ? styles.iconBtnUnlock : styles.iconBtnLock}`} onClick={() => toggleClosed(h)} title={h.manually_closed ? "Открыть" : "Закрыть"}>
                    {h.manually_closed ? <FiUnlock /> : <FiLock />}
                  </button>
                  <button className={`${styles.iconBtn} ${styles.iconBtnDel}`} onClick={() => askDelete(h)} title="Удалить"><FiTrash2 /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════ FORM MODAL ════ */}
      {editHw != null && (
        <div className={styles.overlay} onClick={() => setEditHw(null)}>
          <div className={`${styles.modal} ${styles.modalLg}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}>
                <HiOutlineClipboardCheck className={styles.modalIcon} />
                <h2>{editHw === "new" ? "Новое задание" : "Редактировать задание"}</h2>
              </div>
              <button className={styles.closeBtn} onClick={() => setEditHw(null)}><FiX /></button>
            </div>
            <form className={styles.modalForm} onSubmit={handleSubmit}>
              {formErr && <div className={styles.inlineErr}><FiAlertCircle /><span>{formErr}</span></div>}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Название задания *</label>
                <input className={styles.formInput} value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="Название задания" required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Описание (поддерживает форматирование)</label>
                <div className={styles.quillWrap}>
                  <QuillEditor value={form.description} onChange={v => setForm(f=>({...f,description:v}))} modules={QUILL_MODULES} placeholder="Подробное описание задания..." />
                </div>
              </div>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}><FiAward /> Баллы за выполнение</label>
                  <input type="number" className={styles.formInput} value={form.points} onChange={e => setForm(f=>({...f,points:e.target.value}))} min="0" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}><FiClock /> Дедлайн</label>
                  <input type="datetime-local" className={styles.formInput} value={form.deadline} onChange={e => setForm(f=>({...f,deadline:e.target.value}))} />
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.btnSec} onClick={() => setEditHw(null)}>Отмена</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}><FiCheck /><span>{saving ? "Сохранение..." : (editHw === "new" ? "Создать" : "Сохранить")}</span></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════ ASSIGN MODAL ════ */}
      {assignHw && (
        <div className={styles.overlay} onClick={() => setAssignHw(null)}>
          <div className={`${styles.modal} ${styles.modalSm}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}><FiUsers className={styles.modalIcon} /><h2>Назначение: {assignHw.title}</h2></div>
              <button className={styles.closeBtn} onClick={() => setAssignHw(null)}><FiX /></button>
            </div>
            <div className={styles.modalBody}>
              {groups.length === 0 ? <p className={styles.emptyText}>Нет групп</p> : (
                <div className={styles.assignList}>
                  {groups.map(g => {
                    const on = assignments.some(a => a.group_id === g.id);
                    return (
                      <div key={g.id} className={`${styles.assignRow} ${on ? styles.assignRowOn : ""}`}>
                        <div className={styles.assignGroupName}><FiUsers className={styles.assignIcon} /><span>{g.name}</span></div>
                        {on ? (
                          <button className={styles.btnUnassign} onClick={() => handleUnassign(g.id)}><FiX /><span>Отменить</span></button>
                        ) : (
                          <button className={styles.btnAssign} onClick={() => handleAssign(g.id)}><FiCheckSquare /><span>Назначить</span></button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className={styles.formActions} style={{marginTop:16}}>
                <button className={styles.btnSec} onClick={() => setAssignHw(null)}>Закрыть</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ SUBMISSIONS MODAL ════ */}
      {subsHw && (
        <div className={styles.overlay} onClick={() => setSubsHw(null)}>
          <div className={`${styles.modal} ${styles.modalXl}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}><FiInbox className={styles.modalIcon} /><h2>Сдачи: {subsHw.title}</h2></div>
              <button className={styles.closeBtn} onClick={() => setSubsHw(null)}><FiX /></button>
            </div>
            <div className={styles.modalBody}>
              {subs.length === 0 ? (
                <div className={styles.empty} style={{padding:"40px 0"}}>
                  <div className={styles.emptyIcon}><FiInbox /></div>
                  <h3>Никто ещё не сдал это задание</h3>
                </div>
              ) : (
                <div className={styles.subsList}>
                  {subs.map(s => {
                    const files = parseAttachments(s.attachments);
                    const cd = checkData[s.id] || { points: subsHw.points || 0, reason: "" };
                    return (
                      <div key={s.id} className={styles.subCard}>
                        <div className={styles.subCardHead}>
                          <div className={styles.subStudentInfo}>
                            <div className={styles.subAvatar}>{(s.full_name||"?")[0].toUpperCase()}</div>
                            <div>
                              <div className={styles.subStudentName}>{s.full_name}</div>
                              <div className={styles.subDate}>{new Date(s.submitted_at).toLocaleString("ru-RU")}</div>
                            </div>
                          </div>
                          <span className={`${styles.subStatus} ${styles["subStatus-"+s.status]}`}>
                            {s.status === "pending" ? <><FiClock /> На проверке</> : s.status === "accepted" ? <><FiCheck /> Принято</> : <><FiX /> Отклонено</>}
                          </span>
                        </div>

                        {s.submission_text && (
                          <div className={styles.subText} dangerouslySetInnerHTML={{ __html: s.submission_text }} />
                        )}

                        {files.length > 0 && (
                          <div className={styles.subFiles}>
                            <div className={styles.subFilesTitle}><FiPaperclip /> Прикреплённые файлы ({files.length})</div>
                            <div className={styles.filesGrid}>
                              {files.map((f,i) => (
                                <a key={i} href={`${import.meta.env.VITE_API_URL?.replace("/api","")}${f.path}`} target="_blank" rel="noopener noreferrer" className={styles.fileCard} download>
                                  <span className={styles.fileEmoji}>{fileIcon(f.originalName||f.filename)}</span>
                                  <div className={styles.fileInfo}>
                                    <span className={styles.fileName}>{f.originalName||f.filename}</span>
                                    <span className={styles.fileSize}>{fmtSize(f.size)}</span>
                                  </div>
                                  <FiDownload className={styles.fileDownload} />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {s.status !== "pending" && (
                          <div className={styles.subChecked}>
                            <span>Проверил: <strong>{s.checker_name}</strong></span>
                            {s.reason && <span>Причина: <em>{s.reason}</em></span>}
                            <span>Баллы: <strong>{s.points_earned}</strong></span>
                          </div>
                        )}

                        {s.status === "pending" && (
                          <div className={styles.subActions}>
                            <input type="number" className={styles.pointsInput} value={cd.points} onChange={e => updCheck(s.id,"points",e.target.value)} placeholder="Баллы" min="0" />
                            <input type="text" className={styles.reasonInput} value={cd.reason} onChange={e => updCheck(s.id,"reason",e.target.value)} placeholder="Причина (необязательно)" />
                            <button className={styles.btnAccept} onClick={() => handleCheck(s.id,"accepted")}><FiCheck /><span>Принять</span></button>
                            <button className={styles.btnReject} onClick={() => handleCheck(s.id,"rejected")}><FiX /><span>Отклонить</span></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className={styles.modalFoot}>
              <button className={styles.btnSec} onClick={() => setSubsHw(null)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {confirm && <ConfirmModal msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}
