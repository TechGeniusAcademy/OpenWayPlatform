import { useState, useEffect, useMemo, useCallback } from "react";
import {
  FiUsers, FiEdit2, FiTrash2, FiPlus, FiUserPlus,
  FiX, FiCheck, FiAlertCircle, FiSearch, FiUserMinus,
  FiClock, FiUser, FiCheckSquare, FiSquare,
} from "react-icons/fi";
import { HiUserGroup } from "react-icons/hi";
import api from "../utils/api";
import styles from "./GroupsManagement.module.css";

/* ── Toast ── */
let _toastTimer;
function Toast({ msg, type, onClose }) {
  useEffect(() => {
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(onClose, 3500);
    return () => clearTimeout(_toastTimer);
  }, [msg]);
  if (!msg) return null;
  return (
    <div className={`${styles.toast} ${styles["toast-" + type]}`}>
      {type === "success" ? <FiCheck /> : <FiAlertCircle />}
      <span>{msg}</span>
      <button className={styles.toastClose} onClick={onClose}><FiX /></button>
    </div>
  );
}

/* ── ConfirmModal ── */
function ConfirmModal({ msg, onConfirm, onCancel }) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={`${styles.modal} ${styles.modalSm}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <div className={styles.modalTitle}>
            <FiAlertCircle style={{ color: "#ef4444", fontSize: 20 }} />
            <h2>Подтверждение</h2>
          </div>
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

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */
function GroupsManagement() {
  const [groups,   setGroups]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState(null);
  const [confirm,  setConfirm]  = useState(null);
  const [search,   setSearch]   = useState("");

  /* ── Create / Edit modal ── */
  const [editModal, setEditModal] = useState(null); // null | "create" | group
  const [form,      setForm]      = useState({ name: "", description: "" });
  const [formErr,   setFormErr]   = useState("");

  /* ── Manage students modal ── */
  const [manageGroup, setManageGroup]         = useState(null);   // full group obj with .students
  const [manageLoading, setManageLoading]     = useState(false);
  const [available, setAvailable]             = useState([]);
  const [avLoading, setAvLoading]             = useState(false);
  const [selected,  setSelected]              = useState([]);     // student IDs to add
  const [inSearch,  setInSearch]              = useState("");     // search in current students
  const [avSearch,  setAvSearch]              = useState("");     // search in available

  /* ── stats ── */
  const stats = useMemo(() => ({
    total:    groups.length,
    students: groups.reduce((s, g) => s + (g.student_count || 0), 0),
    maxGroup: groups.reduce((m, g) => (g.student_count || 0) > (m.student_count || 0) ? g : m, groups[0] || null),
  }), [groups]);

  /* ── filtered groups ── */
  const displayed = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter(g =>
      g.name?.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q)
    );
  }, [groups, search]);

  /* ── load ── */
  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/groups");
      setGroups(data.groups);
    } catch {
      notify("error", "Ошибка загрузки групп");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { loadGroups(); }, [loadGroups]);

  const notify = (type, msg) => setToast({ type, msg });

  /* ── create/edit ── */
  const openCreate = () => {
    setForm({ name: "", description: "" });
    setFormErr("");
    setEditModal("create");
  };
  const openEdit = (g) => {
    setForm({ name: g.name, description: g.description || "" });
    setFormErr("");
    setEditModal(g);
  };
  const closeEdit = () => setEditModal(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErr("");
    try {
      if (editModal === "create") {
        await api.post("/groups", form);
        notify("success", "Группа создана");
      } else {
        await api.put(`/groups/${editModal.id}`, form);
        notify("success", "Группа обновлена");
      }
      closeEdit();
      loadGroups();
    } catch (err) {
      setFormErr(err.response?.data?.error || "Ошибка при сохранении");
    }
  };

  /* ── delete group ── */
  const askDelete = (g) =>
    setConfirm({
      msg: `Удалить группу «${g.name}»? Студенты останутся, только связь с группой будет удалена.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await api.delete(`/groups/${g.id}`);
          notify("success", "Группа удалена");
          loadGroups();
        } catch (err) {
          notify("error", err.response?.data?.error || "Ошибка при удалении");
        }
      },
    });

  /* ── manage students ── */
  const openManage = async (g) => {
    setManageGroup(null);
    setSelected([]);
    setInSearch("");
    setAvSearch("");
    setManageLoading(true);
    setAvLoading(true);
    try {
      const [gRes, avRes] = await Promise.all([
        api.get(`/groups/${g.id}`),
        api.get("/groups/students/available"),
      ]);
      setManageGroup(gRes.data.group);
      setAvailable(avRes.data.students);
    } catch {
      notify("error", "Ошибка загрузки данных группы");
    } finally {
      setManageLoading(false);
      setAvLoading(false);
    }
  };

  const refreshManage = async () => {
    if (!manageGroup) return;
    const [gRes, avRes] = await Promise.all([
      api.get(`/groups/${manageGroup.id}`),
      api.get("/groups/students/available"),
    ]);
    setManageGroup(gRes.data.group);
    setAvailable(avRes.data.students);
    loadGroups();
  };

  const closeManage = () => {
    setManageGroup(null);
    loadGroups();
  };

  /* ── add students ── */
  const handleAdd = async () => {
    if (selected.length === 0) { notify("error", "Выберите хотя бы одного студента"); return; }
    try {
      await api.post(`/groups/${manageGroup.id}/students`, { studentIds: selected });
      notify("success", `Добавлено: ${selected.length}`);
      setSelected([]);
      await refreshManage();
    } catch (err) {
      notify("error", err.response?.data?.error || "Ошибка добавления");
    }
  };

  /* ── remove student ── */
  const askRemove = (groupId, student) =>
    setConfirm({
      msg: `Удалить «${student.full_name || student.username}» из группы?`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await api.delete(`/groups/${groupId}/students/${student.id}`);
          notify("success", "Студент удалён из группы");
          await refreshManage();
        } catch (err) {
          notify("error", err.response?.data?.error || "Ошибка удаления");
        }
      },
    });

  /* ── select helpers ── */
  const toggle = (id) =>
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const toggleAll = (list) => {
    const ids = list.map(s => s.id);
    const all = ids.every(id => selected.includes(id));
    setSelected(all ? selected.filter(id => !ids.includes(id)) : [...new Set([...selected, ...ids])]);
  };

  /* ── filtered lists inside manage modal ── */
  const filteredIn = useMemo(() => {
    if (!manageGroup?.students) return [];
    const q = inSearch.toLowerCase();
    if (!q) return manageGroup.students;
    return manageGroup.students.filter(s =>
      (s.full_name || s.username || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q)
    );
  }, [manageGroup, inSearch]);

  const filteredAv = useMemo(() => {
    const q = avSearch.toLowerCase();
    if (!q) return available;
    return available.filter(s =>
      (s.full_name || s.username || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q)
    );
  }, [available, avSearch]);

  const allAvSelected = filteredAv.length > 0 && filteredAv.every(s => selected.includes(s.id));

  /* ─────────────────────── RENDER ── */
  return (
    <div className={styles.page}>
      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><HiUserGroup /></div>
          <div>
            <h1 className={styles.headerTitle}>Управление группами</h1>
            <p className={styles.headerSub}>Создание групп и распределение студентов</p>
          </div>
        </div>
        <button className={styles.btnPrimary} onClick={openCreate}>
          <FiPlus /><span>Создать группу</span>
        </button>
      </div>

      {/* ── Stats ── */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={`${styles.statIcon} ${styles.statIconGroups}`}><HiUserGroup /></div>
          <div>
            <div className={styles.statVal}>{stats.total}</div>
            <div className={styles.statLabel}>Групп</div>
          </div>
        </div>
        <div className={styles.stat}>
          <div className={`${styles.statIcon} ${styles.statIconStudents}`}><FiUsers /></div>
          <div>
            <div className={styles.statVal}>{stats.students}</div>
            <div className={styles.statLabel}>Студентов в группах</div>
          </div>
        </div>
        <div className={styles.stat}>
          <div className={`${styles.statIcon} ${styles.statIconMax}`}><FiUser /></div>
          <div>
            <div className={styles.statVal}>{stats.maxGroup?.student_count || 0}</div>
            <div className={styles.statLabel}>{stats.maxGroup ? `Макс: ${stats.maxGroup.name}` : "Нет групп"}</div>
          </div>
        </div>
        <div className={styles.stat}>
          <div className={`${styles.statIcon} ${styles.statIconTime}`}><FiClock /></div>
          <div>
            <div className={styles.statVal}>{stats.total > 0 ? Math.round(stats.students / stats.total) : 0}</div>
            <div className={styles.statLabel}>Среднее / группу</div>
          </div>
        </div>
      </div>

      {/* ── Search ── */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <FiSearch className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию или описанию..."
          />
          {search && <button className={styles.searchClear} onClick={() => setSearch("")}><FiX /></button>}
        </div>
        {search && <span className={styles.resultCount}>{displayed.length} из {groups.length}</span>}
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skTop} />
              <div className={styles.skLine} />
              <div className={styles.skLine} style={{ width: "60%" }} />
              <div className={styles.skFoot} />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><HiUserGroup /></div>
          <h3>{groups.length === 0 ? "Нет групп" : "Ничего не найдено"}</h3>
          <p>{groups.length === 0 ? "Создайте первую группу" : "Попробуйте изменить запрос"}</p>
          {groups.length === 0 && (
            <button className={styles.btnPrimary} onClick={openCreate} style={{ marginTop: 16 }}>
              <FiPlus /><span>Создать группу</span>
            </button>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {displayed.map(g => (
            <div key={g.id} className={styles.card}>
              {/* Card accent */}
              <div className={styles.cardAccent} />

              <div className={styles.cardHead}>
                <div className={styles.cardTitleRow}>
                  <div className={styles.cardLogoWrap}>
                    <div className={styles.cardLogo}>
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className={styles.cardTitleInfo}>
                    <h3 className={styles.cardTitle}>{g.name}</h3>
                    <span className={styles.cardId}>#{g.id}</span>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button className={`${styles.iconBtn} ${styles.iconBtnEdit}`}
                    onClick={e => { e.stopPropagation(); openEdit(g); }} title="Редактировать">
                    <FiEdit2 />
                  </button>
                  <button className={`${styles.iconBtn} ${styles.iconBtnDel}`}
                    onClick={e => { e.stopPropagation(); askDelete(g); }} title="Удалить">
                    <FiTrash2 />
                  </button>
                </div>
              </div>

              <p className={styles.cardDesc}>
                {g.description || <span className={styles.cardDescEmpty}>Нет описания</span>}
              </p>

              <div className={styles.cardFoot}>
                <div className={styles.cardCount}>
                  <FiUsers />
                  <span>{g.student_count ?? 0} студентов</span>
                </div>
                <button className={styles.manageBtn} onClick={() => openManage(g)}>
                  <FiUserPlus /><span>Управление</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════ CREATE / EDIT MODAL ════════ */}
      {editModal && (
        <div className={styles.overlay} onClick={closeEdit}>
          <div className={`${styles.modal} ${styles.modalSm}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}>
                <HiUserGroup className={styles.modalIcon} />
                <h2>{editModal === "create" ? "Новая группа" : "Редактировать группу"}</h2>
              </div>
              <button className={styles.closeBtn} onClick={closeEdit}><FiX /></button>
            </div>
            <form className={styles.modalForm} onSubmit={handleSubmit}>
              {formErr && (
                <div className={styles.inlineErr}><FiAlertCircle /><span>{formErr}</span></div>
              )}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Название группы *</label>
                <input
                  className={styles.formInput}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Например: Группа А"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Описание</label>
                <textarea
                  className={styles.formInput}
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Необязательное описание группы"
                />
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.btnSec} onClick={closeEdit}>Отмена</button>
                <button type="submit" className={styles.btnPrimary}>
                  <FiCheck /><span>{editModal === "create" ? "Создать" : "Сохранить"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════ MANAGE STUDENTS MODAL ════════ */}
      {(manageGroup !== null || manageLoading) && (
        <div className={styles.overlay} onClick={closeManage}>
          <div className={`${styles.modal} ${styles.modalLg}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}>
                <FiUsers className={styles.modalIcon} />
                <h2>
                  {manageLoading ? "Загрузка..." : `${manageGroup?.name} · ${manageGroup?.students?.length ?? 0} студентов`}
                </h2>
              </div>
              <button className={styles.closeBtn} onClick={closeManage}><FiX /></button>
            </div>

            {manageLoading ? (
              <div className={styles.manageLoading}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={styles.skManageRow} />
                ))}
              </div>
            ) : manageGroup && (
              <div className={styles.manageBody}>
                {/* LEFT — current students */}
                <div className={styles.manageCol}>
                  <div className={styles.manageColHead}>
                    <span className={styles.manageColTitle}>В группе ({manageGroup.students?.length || 0})</span>
                    <div className={styles.searchWrapSm}>
                      <FiSearch />
                      <input
                        value={inSearch}
                        onChange={e => setInSearch(e.target.value)}
                        placeholder="Поиск..."
                        className={styles.searchInputSm}
                      />
                    </div>
                  </div>
                  <div className={styles.manageList}>
                    {filteredIn.length === 0 ? (
                      <div className={styles.manageEmpty}>
                        {manageGroup.students?.length === 0 ? "Группа пуста" : "Не найдено"}
                      </div>
                    ) : filteredIn.map(s => (
                      <div key={s.id} className={styles.studentRow}>
                        <div className={styles.studentAvatar}>
                          {(s.full_name || s.username || "?")[0].toUpperCase()}
                        </div>
                        <div className={styles.studentInfo}>
                          <span className={styles.studentName}>{s.full_name || s.username}</span>
                          <span className={styles.studentEmail}>{s.email}</span>
                        </div>
                        <button
                          className={`${styles.iconBtn} ${styles.iconBtnDel}`}
                          onClick={() => askRemove(manageGroup.id, s)}
                          title="Убрать из группы"
                        >
                          <FiUserMinus />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DIVIDER */}
                <div className={styles.manageDivider} />

                {/* RIGHT — available students */}
                <div className={styles.manageCol}>
                  <div className={styles.manageColHead}>
                    <span className={styles.manageColTitle}>Без группы ({available.length})</span>
                    <div className={styles.searchWrapSm}>
                      <FiSearch />
                      <input
                        value={avSearch}
                        onChange={e => setAvSearch(e.target.value)}
                        placeholder="Поиск..."
                        className={styles.searchInputSm}
                      />
                    </div>
                  </div>

                  {avLoading ? (
                    <div className={styles.manageList}>
                      {Array.from({ length: 4 }).map((_, i) => <div key={i} className={styles.skManageRow} />)}
                    </div>
                  ) : filteredAv.length === 0 ? (
                    <div className={styles.manageEmpty}>
                      {available.length === 0 ? "Все студенты в группах" : "Не найдено"}
                    </div>
                  ) : (
                    <>
                      {/* Select all */}
                      <button
                        className={styles.selectAllBtn}
                        onClick={() => toggleAll(filteredAv)}
                      >
                        {allAvSelected ? <FiCheckSquare /> : <FiSquare />}
                        <span>{allAvSelected ? "Снять всё" : "Выбрать всё"} ({filteredAv.length})</span>
                      </button>
                      <div className={styles.manageList}>
                        {filteredAv.map(s => {
                          const checked = selected.includes(s.id);
                          return (
                            <div
                              key={s.id}
                              className={`${styles.studentRow} ${styles.studentRowCheck} ${checked ? styles.studentRowChecked : ""}`}
                              onClick={() => toggle(s.id)}
                            >
                              <div className={styles.checkBox}>
                                {checked ? <FiCheckSquare /> : <FiSquare />}
                              </div>
                              <div className={styles.studentAvatar}>
                                {(s.full_name || s.username || "?")[0].toUpperCase()}
                              </div>
                              <div className={styles.studentInfo}>
                                <span className={styles.studentName}>{s.full_name || s.username}</span>
                                <span className={styles.studentEmail}>{s.email}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {selected.length > 0 && (
                        <button className={styles.btnPrimary} style={{ marginTop: 10, width: "100%" }} onClick={handleAdd}>
                          <FiUserPlus /><span>Добавить выбранных ({selected.length})</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            <div className={styles.manageFooter}>
              <button className={styles.btnSec} onClick={closeManage}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ CONFIRM MODAL ════════ */}
      {confirm && (
        <ConfirmModal
          msg={confirm.msg}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

export default GroupsManagement;
