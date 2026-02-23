import { useState, useEffect, useMemo, useCallback } from "react";
import {
  FiUsers, FiEdit2, FiTrash2, FiPlus, FiImage,
  FiUpload, FiX, FiCheck, FiAlertCircle, FiDollarSign,
  FiSearch, FiZap, FiChevronUp, FiChevronDown,
  FiShield, FiUser, FiBookOpen, FiFilter,
} from "react-icons/fi";
import api, { BASE_URL } from "../utils/api";
import styles from "./UsersManagement.module.css";

/* ── helpers ── */
const ROLE_META = {
  admin:      { label: "Администратор", color: "admin"  },
  student:    { label: "Ученик",        color: "student"},
  teacher:    { label: "Учитель",       color: "teacher"},
  tester:     { label: "Тестер",        color: "tester" },
  css_editor: { label: "CSS Редактор",  color: "css"    },
};
const roleName = (r) => ROLE_META[r]?.label ?? r;
const roleColor = (r) => ROLE_META[r]?.color ?? "student";

let toastTimer;

/* ── Toast component ── */
function Toast({ msg, type, onClose }) {
  useEffect(() => {
    clearTimeout(toastTimer);
    toastTimer = setTimeout(onClose, 3500);
    return () => clearTimeout(toastTimer);
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

/* ── Confirm modal ── */
function ConfirmModal({ msg, onConfirm, onCancel }) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={`${styles.modal} ${styles.modalSm}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <div className={styles.modalTitle}>
            <FiAlertCircle style={{ color: "var(--danger)" }} />
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

/* ════════════════════════════════════════════════════════ */
function UsersManagement() {
  const [users,    setUsers]   = useState([]);
  const [loading,  setLoading] = useState(true);
  const [toast,    setToast]   = useState(null); // {msg, type}

  /* modals */
  const [editModal,    setEditModal]    = useState(null); // null | "create" | user object
  const [pointsModal,  setPointsModal]  = useState(null); // null | user
  const [expModal,     setExpModal]     = useState(null); // null | user
  const [avatarModal,  setAvatarModal]  = useState(null); // null | user
  const [confirmModal, setConfirmModal] = useState(null); // null | {msg, onConfirm}

  /* edit form */
  const [form, setForm] = useState({ username:"", email:"", password:"", role:"student", full_name:"" });
  const [formErr, setFormErr] = useState("");

  /* points / exp */
  const [pointsAmt, setPointsAmt] = useState(0);
  const [expAmt,    setExpAmt]    = useState(0);

  /* avatar */
  const [avatarFile,    setAvatarFile]    = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploading,     setUploading]     = useState(false);

  /* search / filter / sort */
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sort,       setSort]       = useState({ col: "id", dir: "asc" });

  /* ── load ── */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/users");
      setUsers(data.users);
    } catch {
      notify("error", "Ошибка загрузки пользователей");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── toast ── */
  const notify = (type, msg) => setToast({ type, msg });

  /* ── stats ── */
  const stats = useMemo(() => {
    const total    = users.length;
    const students = users.filter(u => u.role === "student").length;
    const teachers = users.filter(u => u.role === "teacher").length;
    const admins   = users.filter(u => u.role === "admin").length;
    return { total, students, teachers, admins };
  }, [users]);

  /* ── filtered + sorted ── */
  const displayed = useMemo(() => {
    let list = users;
    if (roleFilter !== "all") list = list.filter(u => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        [u.id?.toString(), u.username, u.email, u.full_name, u.role, u.group_name, u.points?.toString()]
          .some(f => f && f.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      let va = a[sort.col] ?? "";
      let vb = b[sort.col] ?? "";
      if (typeof va === "number") return sort.dir === "asc" ? va - vb : vb - va;
      va = String(va).toLowerCase();
      vb = String(vb).toLowerCase();
      return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [users, search, roleFilter, sort]);

  const toggleSort = (col) =>
    setSort(s => s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" });

  const SortIcon = ({ col }) => {
    if (sort.col !== col) return <FiChevronUp style={{ opacity: 0.2 }} />;
    return sort.dir === "asc" ? <FiChevronUp /> : <FiChevronDown />;
  };

  /* ── create / edit ── */
  const openCreate = () => {
    setForm({ username:"", email:"", password:"", role:"student", full_name:"" });
    setFormErr("");
    setEditModal("create");
  };
  const openEdit = (user) => {
    setForm({ username: user.username, email: user.email, password:"", role: user.role, full_name: user.full_name || "" });
    setFormErr("");
    setEditModal(user);
  };
  const closeEdit = () => setEditModal(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErr("");
    try {
      if (editModal === "create") {
        await api.post("/users", form);
        notify("success", "Пользователь успешно создан");
      } else {
        await api.put(`/users/${editModal.id}`, form);
        notify("success", "Пользователь успешно обновлён");
      }
      closeEdit();
      load();
    } catch (err) {
      setFormErr(err.response?.data?.error || "Ошибка при сохранении");
    }
  };

  /* ── delete ── */
  const askDelete = (user) => {
    setConfirmModal({
      msg: `Удалить пользователя «${user.full_name || user.username}»? Это действие нельзя отменить.`,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await api.delete(`/users/${user.id}`);
          notify("success", "Пользователь удалён");
          load();
        } catch (err) {
          notify("error", err.response?.data?.error || "Ошибка при удалении");
        }
      },
    });
  };

  /* ── points ── */
  const handlePoints = async () => {
    if (!pointsAmt || pointsAmt === 0) { notify("error", "Введите количество баллов"); return; }
    try {
      await api.post("/points/add", { userId: pointsModal.id, points: parseInt(pointsAmt) });
      notify("success", `Баллы ${pointsAmt > 0 ? "добавлены" : "списаны"}`);
      setPointsModal(null);
      load();
    } catch (err) { notify("error", err.response?.data?.error || "Ошибка"); }
  };

  /* ── exp ── */
  const handleExp = async () => {
    if (!expAmt || expAmt === 0) { notify("error", "Введите количество опыта"); return; }
    try {
      await api.post("/users/add-experience", { userId: expModal.id, experience: parseInt(expAmt) });
      notify("success", `Опыт ${expAmt > 0 ? "добавлен" : "списан"}`);
      setExpModal(null);
      load();
    } catch (err) { notify("error", err.response?.data?.error || "Ошибка"); }
  };

  /* ── avatar ── */
  const openAvatar = (user) => {
    setAvatarModal(user);
    setAvatarFile(null);
    setAvatarPreview(user.avatar_url ? `${BASE_URL}${user.avatar_url}` : null);
  };
  const closeAvatar = () => { setAvatarModal(null); setAvatarFile(null); setAvatarPreview(null); };

  const handleAvatarFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setAvatarFile(f);
    const r = new FileReader();
    r.onloadend = () => setAvatarPreview(r.result);
    r.readAsDataURL(f);
  };

  const handleUpload = async () => {
    if (!avatarFile) { notify("error", "Выберите изображение"); return; }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("avatar", avatarFile);
      await api.post(`/users/${avatarModal.id}/avatar`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      notify("success", "Аватарка обновлена");
      closeAvatar();
      load();
    } catch (err) { notify("error", err.response?.data?.error || "Ошибка загрузки"); }
    finally { setUploading(false); }
  };

  const askDeleteAvatar = (user) => {
    closeAvatar();
    setConfirmModal({
      msg: `Удалить аватарку пользователя «${user.full_name || user.username}»?`,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await api.delete(`/users/${user.id}/avatar`);
          notify("success", "Аватарка удалена");
          load();
        } catch (err) { notify("error", err.response?.data?.error || "Ошибка"); }
      },
    });
  };

  /* ─────────────────────────────── RENDER ── */
  return (
    <div className={styles.page}>
      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><FiUsers /></div>
          <div>
            <h1 className={styles.headerTitle}>Управление пользователями</h1>
            <p className={styles.headerSub}>Учётные записи, роли, баллы и аватарки</p>
          </div>
        </div>
        <button className={styles.btnPrimary} onClick={openCreate}>
          <FiPlus /><span>Добавить</span>
        </button>
      </div>

      {/* ── Stats ── */}
      <div className={styles.stats}>
        {[
          { icon: <FiUsers />,    label: "Всего",    val: stats.total,    col: "total"   },
          { icon: <FiUser />,     label: "Ученики",  val: stats.students, col: "student" },
          { icon: <FiBookOpen />, label: "Учители",  val: stats.teachers, col: "teacher" },
          { icon: <FiShield />,   label: "Админы",   val: stats.admins,   col: "admin"   },
        ].map(s => (
          <div
            key={s.col}
            className={`${styles.stat} ${roleFilter === s.col || (s.col === "total" && roleFilter === "all") ? styles.statActive : ""}`}
            onClick={() => setRoleFilter(s.col === "total" ? "all" : s.col)}
          >
            <div className={`${styles.statIcon} ${styles["statIcon-" + s.col]}`}>{s.icon}</div>
            <div>
              <div className={styles.statVal}>{s.val}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <FiSearch className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по ID, имени, email, ФИО, роли, группе..."
          />
          {search && (
            <button className={styles.searchClear} onClick={() => setSearch("")}><FiX /></button>
          )}
        </div>

        <div className={styles.filterGroup}>
          <FiFilter className={styles.filterIcon} />
          <select className={styles.filterSelect} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="all">Все роли</option>
            {Object.entries(ROLE_META).map(([v, m]) => (
              <option key={v} value={v}>{m.label}</option>
            ))}
          </select>
        </div>

        {(search || roleFilter !== "all") && (
          <span className={styles.resultCount}>{displayed.length} из {users.length}</span>
        )}
      </div>

      {/* ── Table ── */}
      <div className={styles.tableWrap}>
        {loading ? (
          <div className={styles.skeleton}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skeletonRow}>
                <div className={styles.skeletonCell} style={{ width: 32 }} />
                <div className={styles.skeletonAvatar} />
                <div className={styles.skeletonCell} style={{ flex: 1 }} />
                <div className={styles.skeletonCell} style={{ flex: 1.5 }} />
                <div className={styles.skeletonCell} style={{ flex: 1 }} />
                <div className={styles.skeletonCell} style={{ width: 80 }} />
                <div className={styles.skeletonCell} style={{ width: 60 }} />
                <div className={styles.skeletonCell} style={{ width: 56 }} />
                <div className={styles.skeletonCell} style={{ width: 90 }} />
                <div className={styles.skeletonCell} style={{ width: 130 }} />
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}><FiUsers /></div>
            <h3>{users.length === 0 ? "Нет пользователей" : "Ничего не найдено"}</h3>
            <p>{users.length === 0
              ? "Создайте первого пользователя"
              : "Попробуйте изменить поисковой запрос или фильтры"}
            </p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                {[
                  { col: "id",         label: "ID"      },
                  { col: null,         label: "Аватар"  },
                  { col: "username",   label: "Логин"   },
                  { col: "email",      label: "Email"   },
                  { col: "full_name",  label: "ФИО"     },
                  { col: "role",       label: "Роль"    },
                  { col: "group_name", label: "Группа"  },
                  { col: "points",     label: "Баллы"   },
                  { col: "created_at", label: "Дата"    },
                  { col: null,         label: "Действия"},
                ].map((h, i) => (
                  <th
                    key={i}
                    className={h.col ? styles.sortable : ""}
                    onClick={h.col ? () => toggleSort(h.col) : undefined}
                  >
                    <span>{h.label}</span>
                    {h.col && <SortIcon col={h.col} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(user => (
                <tr key={user.id}>
                  <td className={styles.tdId}>{user.id}</td>
                  <td>
                    <div className={styles.avatarCell}>
                      {user.avatar_url ? (
                        <img src={`${BASE_URL}${user.avatar_url}`} alt={user.username} className={styles.avatar} />
                      ) : (
                        <div className={`${styles.avatarFallback} ${styles["avatarRole-" + roleColor(user.role)]}`}>
                          {(user.full_name || user.username || "?")[0].toUpperCase()}
                        </div>
                      )}
                      {user.is_online && <span className={styles.onlineDot} />}
                    </div>
                  </td>
                  <td className={styles.tdBold} data-label="Логин">{user.username}</td>
                  <td className={styles.tdMuted} data-label="Email">{user.email}</td>
                  <td data-label="ФИО">{user.full_name || <span className={styles.dash}>—</span>}</td>
                  <td data-label="Роль">
                    <span className={`${styles.roleBadge} ${styles["role-" + roleColor(user.role)]}`}>
                      {roleName(user.role)}
                    </span>
                  </td>
                  <td data-label="Группа">{user.group_name || <span className={styles.dash}>—</span>}</td>
                  <td data-label="Баллы">
                    <span className={styles.pointsBadge}>{user.points ?? 0} <small>pts</small></span>
                  </td>
                  <td className={styles.tdMuted} data-label="Дата">
                    {new Date(user.created_at).toLocaleDateString("ru-RU")}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {["student","teacher"].includes(user.role) && (
                        <>
                          <button className={`${styles.iconBtn} ${styles.iconBtnAvatar}`} onClick={() => openAvatar(user)} title="Аватарка"><FiImage /></button>
                          <button className={`${styles.iconBtn} ${styles.iconBtnExp}`}    onClick={() => { setExpModal(user); setExpAmt(0); }} title="Опыт"><FiZap /></button>
                          <button className={`${styles.iconBtn} ${styles.iconBtnPoints}`} onClick={() => { setPointsModal(user); setPointsAmt(0); }} title="Баллы"><FiDollarSign /></button>
                        </>
                      )}
                      <button className={`${styles.iconBtn} ${styles.iconBtnEdit}`}   onClick={() => openEdit(user)} title="Редактировать"><FiEdit2 /></button>
                      <button className={`${styles.iconBtn} ${styles.iconBtnDelete}`} onClick={() => askDelete(user)} title="Удалить"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ══════════ EDIT / CREATE MODAL ══════════ */}
      {editModal && (
        <div className={styles.overlay} onClick={closeEdit}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}>
                <FiUser className={styles.modalIcon} />
                <h2>{editModal === "create" ? "Новый пользователь" : "Редактировать пользователя"}</h2>
              </div>
              <button className={styles.closeBtn} onClick={closeEdit}><FiX /></button>
            </div>
            <form className={styles.modalForm} onSubmit={handleSubmit}>
              {formErr && (
                <div className={styles.inlineErr}><FiAlertCircle /><span>{formErr}</span></div>
              )}
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Логин *</label>
                  <input className={styles.formInput} name="username" value={form.username} onChange={e => setForm(f=>({...f,username:e.target.value}))} required />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Email *</label>
                  <input className={styles.formInput} type="email" name="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} required />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>ФИО</label>
                  <input className={styles.formInput} name="full_name" value={form.full_name} onChange={e => setForm(f=>({...f,full_name:e.target.value}))} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Роль *</label>
                  <select className={styles.formSelect} value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))} required>
                    {Object.entries(ROLE_META).map(([v,m]) => <option key={v} value={v}>{m.label}</option>)}
                  </select>
                </div>
                <div className={`${styles.formGroup} ${styles.spanFull}`}>
                  <label className={styles.formLabel}>
                    Пароль {editModal !== "create" && <span className={styles.formHint2}>(оставьте пустым чтобы не менять)</span>}
                    {editModal === "create" && " *"}
                  </label>
                  <input className={styles.formInput} type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} required={editModal === "create"} />
                </div>
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

      {/* ══════════ POINTS MODAL ══════════ */}
      {pointsModal && (
        <div className={styles.overlay} onClick={() => setPointsModal(null)}>
          <div className={`${styles.modal} ${styles.modalSm}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}>
                <FiDollarSign className={styles.modalIcon} style={{ color: "#f59e0b" }} />
                <h2>Баллы</h2>
              </div>
              <button className={styles.closeBtn} onClick={() => setPointsModal(null)}><FiX /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.userInfoBox}>
                <div className={`${styles.avatarFallback} ${styles["avatarRole-" + roleColor(pointsModal.role)]}`} style={{ width:44,height:44,fontSize:18 }}>
                  {(pointsModal.full_name || pointsModal.username)[0].toUpperCase()}
                </div>
                <div>
                  <div className={styles.uibName}>{pointsModal.full_name || pointsModal.username}</div>
                  <div className={styles.uibSub}>Текущие баллы: <b>{pointsModal.points ?? 0}</b> pts</div>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Количество баллов</label>
                <input className={styles.formInput} type="number" value={pointsAmt} onChange={e => setPointsAmt(e.target.value)} placeholder="+ добавить / - списать" />
                <small className={styles.formHint}>Отрицательное число для списания</small>
              </div>
              <div className={styles.quickBtns}>
                {[5,10,25,50].map(n => <button key={n} className={styles.qBtn} onClick={() => setPointsAmt(n)}>+{n}</button>)}
                <button className={`${styles.qBtn} ${styles.qBtnNeg}`} onClick={() => setPointsAmt(-10)}>−10</button>
              </div>
              <div className={styles.formActions}>
                <button className={styles.btnSec} onClick={() => setPointsModal(null)}>Отмена</button>
                <button className={styles.btnPrimary} onClick={handlePoints}><FiCheck /><span>Применить</span></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ EXP MODAL ══════════ */}
      {expModal && (
        <div className={styles.overlay} onClick={() => setExpModal(null)}>
          <div className={`${styles.modal} ${styles.modalSm}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}>
                <FiZap className={styles.modalIcon} style={{ color: "#8b5cf6" }} />
                <h2>Опыт (XP)</h2>
              </div>
              <button className={styles.closeBtn} onClick={() => setExpModal(null)}><FiX /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.userInfoBox}>
                <div className={`${styles.avatarFallback} ${styles["avatarRole-" + roleColor(expModal.role)]}`} style={{ width:44,height:44,fontSize:18 }}>
                  {(expModal.full_name || expModal.username)[0].toUpperCase()}
                </div>
                <div>
                  <div className={styles.uibName}>{expModal.full_name || expModal.username}</div>
                  <div className={styles.uibSub}>Уровень {expModal.level ?? 1} · {expModal.experience ?? 0} XP</div>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Количество опыта</label>
                <input className={styles.formInput} type="number" value={expAmt} onChange={e => setExpAmt(e.target.value)} placeholder="+ добавить / - списать" />
                <small className={styles.formHint}>Отрицательное число для списания</small>
              </div>
              <div className={styles.quickBtns}>
                {[10,25,50,100].map(n => <button key={n} className={styles.qBtn} onClick={() => setExpAmt(n)}>+{n}</button>)}
                <button className={`${styles.qBtn} ${styles.qBtnNeg}`} onClick={() => setExpAmt(-25)}>−25</button>
              </div>
              <div className={styles.formActions}>
                <button className={styles.btnSec} onClick={() => setExpModal(null)}>Отмена</button>
                <button className={styles.btnPrimary} onClick={handleExp}><FiCheck /><span>Применить</span></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ AVATAR MODAL ══════════ */}
      {avatarModal && (
        <div className={styles.overlay} onClick={closeAvatar}>
          <div className={`${styles.modal} ${styles.modalSm}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}>
                <FiImage className={styles.modalIcon} style={{ color: "#0891b2" }} />
                <h2>Аватарка</h2>
              </div>
              <button className={styles.closeBtn} onClick={closeAvatar}><FiX /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.avatarUploadWrap}>
                <div className={styles.avatarLarge}>
                  {avatarPreview
                    ? <img src={avatarPreview} alt="preview" style={{ width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover" }} />
                    : <div className={`${styles.avatarFallback} ${styles["avatarRole-" + roleColor(avatarModal.role)]}`} style={{ width:"100%",height:"100%",fontSize:42 }}>
                        {(avatarModal.full_name || avatarModal.username)[0].toUpperCase()}
                      </div>
                  }
                </div>
                <label className={styles.avatarUploadBtn}>
                  <FiUpload /> Выбрать фото
                  <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleAvatarFile} hidden />
                </label>
                <small className={styles.formHint} style={{ textAlign:"center" }}>JPEG · PNG · GIF · WebP · до 5 МБ</small>
              </div>
              <div className={styles.formActions}>
                {avatarModal.avatar_url && (
                  <button className={styles.btnDanger} onClick={() => askDeleteAvatar(avatarModal)}>
                    <FiTrash2 /><span>Удалить</span>
                  </button>
                )}
                <button className={styles.btnSec} onClick={closeAvatar}>Отмена</button>
                <button className={styles.btnPrimary} onClick={handleUpload} disabled={!avatarFile || uploading}>
                  <FiUpload /><span>{uploading ? "Загружаю..." : "Загрузить"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ CONFIRM MODAL ══════════ */}
      {confirmModal && (
        <ConfirmModal
          msg={confirmModal.msg}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}

export default UsersManagement;
