import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiAlertCircle, FiSearch,
  FiBook, FiUsers, FiClock, FiList, FiStar, FiDollarSign, FiUpload,
  FiGlobe, FiAward, FiCheckCircle, FiEye, FiEyeOff, FiImage,
  FiFilter, FiChevronLeft, FiChevronRight, FiBarChart2,
} from "react-icons/fi";
import { HiAcademicCap } from "react-icons/hi";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import api, { BASE_URL } from "../../utils/api";
import styles from "./AdminCourses.module.css";

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
          <div className={styles.modalTitle}><FiAlertCircle style={{ color: "#ef4444" }} /><h2>Подтверждение</h2></div>
          <button className={styles.closeBtn} onClick={onCancel}><FiX /></button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.confirmText}>{msg}</p>
          <div className={styles.formActions}><button className={styles.btnSec} onClick={onCancel}>Отмена</button><button className={styles.btnDanger} onClick={onConfirm}><FiTrash2 /><span>Удалить</span></button></div>
        </div>
      </div>
    </div>
  );
}

const DIFF_LABELS = { beginner: "Начальный", intermediate: "Средний", advanced: "Продвинутый" };
const DIFF_COLORS = { beginner: "diffBegin", intermediate: "diffMid", advanced: "diffAdv" };

const emptyForm = () => ({
  title: "", description: "", detailed_description: "", thumbnail_url: "",
  duration_hours: 0, difficulty_level: "beginner", is_published: false,
  requirements: "", learning_outcomes: "", target_audience: "",
  instructor_name: "", category: "", language: "Русский",
  certificate_available: false, required_level: 0, price: 0,
});

/* ═══════════════ MAIN ═══════════════ */
export default function AdminCourses() {
  const navigate = useNavigate();
  const [courses,   setCourses]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search,    setSearch]    = useState("");
  const [filterDiff, setFilterDiff] = useState("");
  const [filterPub,  setFilterPub]  = useState("");

  const [toast,   setToast]   = useState(null);
  const [confirm, setConfirm] = useState(null);

  const [editModal,    setEditModal]    = useState(null); // null | "create" | course
  const [form,         setForm]         = useState(emptyForm());
  const [formErr,      setFormErr]      = useState("");
  const [thumbnail,    setThumbnail]    = useState(null);
  const [thumbPreview, setThumbPreview] = useState("");
  const [uploading,    setUploading]    = useState(false);

  const thumbRef = useRef();
  const notify = (type, msg) => setToast({ type, msg });

  /* ── load ── */
  const loadCourses = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/courses?page=${p}&limit=12`);
      setCourses(data.courses || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.totalCount || 0);
    } catch { notify("error", "Ошибка загрузки курсов"); }
    finally { setLoading(false); }
  }, [page]);
  useEffect(() => { loadCourses(page); }, [page]);

  /* ── stats ── */
  const stats = useMemo(() => ({
    total:     totalCount,
    published: courses.filter(c => c.is_published).length,
    draft:     courses.filter(c => !c.is_published).length,
    enrolled:  courses.reduce((s, c) => s + (+c.enrolled_count || 0), 0),
  }), [courses, totalCount]);

  /* ── filtered (client-side search on loaded page) ── */
  const filtered = useMemo(() => {
    let list = courses;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.instructor_name?.toLowerCase().includes(q)
      );
    }
    if (filterDiff) list = list.filter(c => c.difficulty_level === filterDiff);
    if (filterPub === "published") list = list.filter(c => c.is_published);
    if (filterPub === "draft")     list = list.filter(c => !c.is_published);
    return list;
  }, [courses, search, filterDiff, filterPub]);

  /* ── create / edit ── */
  const openCreate = () => { setForm(emptyForm()); setFormErr(""); setThumbnail(null); setThumbPreview(""); setEditModal("create"); };
  const openEdit   = (c) => {
    setForm({
      title: c.title || "", description: c.description || "",
      detailed_description: c.detailed_description || "", thumbnail_url: c.thumbnail_url || "",
      duration_hours: c.duration_hours || 0, difficulty_level: c.difficulty_level || "beginner",
      is_published: c.is_published || false, requirements: c.requirements || "",
      learning_outcomes: c.learning_outcomes || "", target_audience: c.target_audience || "",
      instructor_name: c.instructor_name || "", category: c.category || "",
      language: c.language || "Русский", certificate_available: c.certificate_available || false,
      required_level: c.required_level || 0, price: c.price || 0,
    });
    setFormErr(""); setThumbnail(null);
    setThumbPreview(c.thumbnail_url ? `${BASE_URL}${c.thumbnail_url}` : "");
    setEditModal(c);
  };

  const handleThumbChange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setThumbnail(file);
    const reader = new FileReader();
    reader.onloadend = () => setThumbPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setFormErr("");
    if (!form.title.trim() || !form.description.trim()) { setFormErr("Заполните название и описание"); return; }
    setUploading(true);
    try {
      let thumbnail_url = form.thumbnail_url;
      if (thumbnail) {
        const fd = new FormData(); fd.append("thumbnail", thumbnail);
        const { data } = await api.post("/courses/upload-thumbnail", fd, { headers: { "Content-Type": "multipart/form-data" } });
        thumbnail_url = data.thumbnail_url;
      }
      const payload = { ...form, thumbnail_url };
      if (editModal === "create") {
        await api.post("/courses", payload);
        notify("success", "Курс создан");
      } else {
        await api.put(`/courses/${editModal.id}`, payload);
        notify("success", "Курс обновлён");
      }
      setEditModal(null);
      loadCourses(page);
    } catch (err) { setFormErr(err.response?.data?.error || "Ошибка сохранения"); }
    finally { setUploading(false); }
  };

  /* ── quick publish toggle ── */
  const togglePublish = async (course) => {
    try {
      await api.put(`/courses/${course.id}`, { ...course, is_published: !course.is_published });
      notify("success", course.is_published ? "Курс снят с публикации" : "Курс опубликован");
      loadCourses(page);
    } catch { notify("error", "Ошибка обновления"); }
  };

  /* ── delete ── */
  const askDelete = (course) => setConfirm({
    msg: `Удалить курс «${course.title}»? Все уроки и прогресс будут удалены.`,
    onConfirm: async () => {
      setConfirm(null);
      try { await api.delete(`/courses/${course.id}`); notify("success", "Курс удалён"); loadCourses(page); }
      catch { notify("error", "Ошибка удаления"); }
    },
  });

  const QUILL_MODULES = { toolbar: [[{ header: [1,2,3,false] }],["bold","italic","underline","strike"],[{ list:"ordered" },{ list:"bullet" }],[{ color:[] },{ background:[] }],["link","image","video"],["clean"]] };

  /* ─── RENDER ─── */
  return (
    <div className={styles.page}>
      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><HiAcademicCap /></div>
          <div>
            <h1 className={styles.headerTitle}>Управление курсами</h1>
            <p className={styles.headerSub}>Создание, редактирование и управление учебными курсами</p>
          </div>
        </div>
        <button className={styles.btnPrimary} onClick={openCreate}><FiPlus /><span>Создать курс</span></button>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}><div className={`${styles.statIcon} ${styles.statIconTotal}`}><HiAcademicCap /></div><div><div className={styles.statVal}>{stats.total}</div><div className={styles.statLabel}>Всего курсов</div></div></div>
        <div className={styles.stat}><div className={`${styles.statIcon} ${styles.statIconPub}`}><FiEye /></div><div><div className={styles.statVal}>{stats.published}</div><div className={styles.statLabel}>Опубликованных</div></div></div>
        <div className={styles.stat}><div className={`${styles.statIcon} ${styles.statIconDraft}`}><FiEyeOff /></div><div><div className={styles.statVal}>{stats.draft}</div><div className={styles.statLabel}>Черновиков</div></div></div>
        <div className={styles.stat}><div className={`${styles.statIcon} ${styles.statIconEnroll}`}><FiUsers /></div><div><div className={styles.statVal}>{stats.enrolled}</div><div className={styles.statLabel}>Записано (стр.)</div></div></div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <FiSearch className={styles.searchIcon} />
          <input className={styles.searchInput} value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по названию, категории, преподавателю..." />
          {search && <button className={styles.searchClear} onClick={() => setSearch("")}><FiX /></button>}
        </div>
        <select className={styles.filterSelect} value={filterDiff} onChange={e => setFilterDiff(e.target.value)}>
          <option value="">Все уровни</option>
          <option value="beginner">Начальный</option>
          <option value="intermediate">Средний</option>
          <option value="advanced">Продвинутый</option>
        </select>
        <select className={styles.filterSelect} value={filterPub} onChange={e => setFilterPub(e.target.value)}>
          <option value="">Все статусы</option>
          <option value="published">Опубликованные</option>
          <option value="draft">Черновики</option>
        </select>
        {(search || filterDiff || filterPub) && (
          <button className={styles.clearFilters} onClick={() => { setSearch(""); setFilterDiff(""); setFilterPub(""); }}>
            <FiX /> Сбросить
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skThumb} />
              <div className={styles.skBody}>
                <div className={styles.skLine} /><div className={styles.skLine} style={{ width: "60%" }} /><div className={styles.skLine} style={{ width: "80%" }} />
                <div className={styles.skFoot} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><HiAcademicCap /></div>
          <h3>{courses.length === 0 ? "Курсов нет" : "Ничего не найдено"}</h3>
          <p>{courses.length === 0 ? "Создайте первый учебный курс" : "Попробуйте изменить фильтры"}</p>
          {courses.length === 0 && <button className={styles.btnPrimary} style={{ marginTop: 16 }} onClick={openCreate}><FiPlus /><span>Создать курс</span></button>}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(course => (
            <div key={course.id} className={`${styles.card} ${course.is_published ? "" : styles.cardDraft}`}>
              {/* Thumbnail */}
              <div className={styles.cardThumb}>
                {course.thumbnail_url
                  ? <img src={`${BASE_URL}${course.thumbnail_url}`} alt={course.title} />
                  : <div className={styles.cardThumbFallback}><HiAcademicCap /></div>}
                {/* Status badge */}
                <span className={`${styles.statusBadge} ${course.is_published ? styles.statusPublished : styles.statusDraft}`}>
                  {course.is_published ? <><FiEye /> Опубликован</> : <><FiEyeOff /> Черновик</>}
                </span>
                {/* Difficulty badge */}
                <span className={`${styles.diffBadge} ${styles[DIFF_COLORS[course.difficulty_level] || "diffBegin"]}`}>
                  {DIFF_LABELS[course.difficulty_level] || course.difficulty_level}
                </span>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.cardTitleRow}>
                  <h3 className={styles.cardTitle}>{course.title}</h3>
                  {course.category && <span className={styles.catChip}>{course.category}</span>}
                </div>

                {course.instructor_name && (
                  <div className={styles.instructorRow}><FiUsers /><span>{course.instructor_name}</span></div>
                )}

                <p className={styles.cardDesc}>{course.description}</p>

                <div className={styles.cardMeta}>
                  <span><FiBook /> {course.lesson_count || 0} уроков</span>
                  <span><FiUsers /> {course.enrolled_count || 0}</span>
                  <span><FiClock /> {course.duration_hours || 0}ч</span>
                  {course.required_level > 0 && <span title="Требуемый уровень"><FiStar /> {course.required_level} ур.</span>}
                  {course.price > 0 && <span title="Цена в баллах"><FiDollarSign /> {course.price}</span>}
                  {course.certificate_available && <span title="Сертификат"><FiAward /> Серт.</span>}
                </div>
              </div>

              <div className={styles.cardFoot}>
                <button className={`${styles.iconBtn} ${course.is_published ? styles.iconBtnUnpub : styles.iconBtnPub}`}
                  onClick={() => togglePublish(course)} title={course.is_published ? "Снять с публикации" : "Опубликовать"}>
                  {course.is_published ? <FiEyeOff /> : <FiEye />}
                </button>
                <button className={`${styles.iconBtn} ${styles.iconBtnLessons}`}
                  onClick={() => navigate(`/admin/courses/${course.id}/lessons`)} title="Уроки">
                  <FiList />
                </button>
                <button className={`${styles.iconBtn} ${styles.iconBtnEdit}`}
                  onClick={() => openEdit(course)} title="Редактировать">
                  <FiEdit2 />
                </button>
                <button className={`${styles.iconBtn} ${styles.iconBtnDel}`}
                  onClick={() => askDelete(course)} title="Удалить">
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}><FiChevronLeft /></button>
          <span className={styles.pageInfo}>Страница {page} из {totalPages}</span>
          <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}><FiChevronRight /></button>
        </div>
      )}

      {/* ════ CREATE/EDIT MODAL ════ */}
      {editModal && (
        <div className={styles.overlay} onClick={() => setEditModal(null)}>
          <div className={`${styles.modal} ${styles.modalLg}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}><HiAcademicCap className={styles.modalIcon} /><h2>{editModal === "create" ? "Новый курс" : "Редактировать курс"}</h2></div>
              <button className={styles.closeBtn} onClick={() => setEditModal(null)}><FiX /></button>
            </div>
            <form className={styles.modalForm} onSubmit={handleSubmit}>
              {formErr && <div className={styles.inlineErr}><FiAlertCircle /><span>{formErr}</span></div>}

              {/* Thumbnail upload */}
              <div className={styles.thumbSection} onClick={() => thumbRef.current?.click()}>
                {thumbPreview
                  ? <img src={thumbPreview} alt="preview" className={styles.thumbImg} />
                  : <div className={styles.thumbPlaceholder}><FiImage /><span>Нажмите для загрузки изображения</span></div>}
                <input ref={thumbRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={handleThumbChange} />
              </div>

              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.spanFull}`}>
                  <label className={styles.formLabel}>Название курса *</label>
                  <input className={styles.formInput} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Например: Основы Python" required />
                </div>

                <div className={`${styles.formGroup} ${styles.spanFull}`}>
                  <label className={styles.formLabel}>Краткое описание *</label>
                  <textarea className={styles.formInput} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Краткое описание для карточки" required />
                </div>

                <div className={`${styles.formGroup} ${styles.spanFull}`}>
                  <label className={styles.formLabel}>Подробное описание</label>
                  <div className={styles.quillWrap}>
                    <ReactQuill value={form.detailed_description} onChange={v => setForm(f => ({ ...f, detailed_description: v }))} modules={QUILL_MODULES} />
                  </div>
                </div>

                <div className={`${styles.formGroup} ${styles.spanFull}`}>
                  <label className={styles.formLabel}>Требования к знаниям</label>
                  <textarea className={styles.formInput} rows={2} value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} placeholder="Что нужно знать до начала курса" />
                </div>

                <div className={`${styles.formGroup} ${styles.spanFull}`}>
                  <label className={styles.formLabel}>Чему научитесь</label>
                  <textarea className={styles.formInput} rows={2} value={form.learning_outcomes} onChange={e => setForm(f => ({ ...f, learning_outcomes: e.target.value }))} placeholder="Результаты обучения" />
                </div>

                <div className={`${styles.formGroup} ${styles.spanFull}`}>
                  <label className={styles.formLabel}>Целевая аудитория</label>
                  <textarea className={styles.formInput} rows={2} value={form.target_audience} onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))} placeholder="Для кого predназначен курс" />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Преподаватель</label>
                  <input className={styles.formInput} value={form.instructor_name} onChange={e => setForm(f => ({ ...f, instructor_name: e.target.value }))} placeholder="Имя преподавателя" />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Категория</label>
                  <input className={styles.formInput} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Программирование, Дизайн..." />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Язык</label>
                  <select className={styles.formInput} value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                    <option>Русский</option><option>Английский</option><option>Казахский</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Уровень сложности</label>
                  <select className={styles.formInput} value={form.difficulty_level} onChange={e => setForm(f => ({ ...f, difficulty_level: e.target.value }))}>
                    <option value="beginner">Начальный</option>
                    <option value="intermediate">Средний</option>
                    <option value="advanced">Продвинутый</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Длительность (часов)</label>
                  <input type="number" className={styles.formInput} value={form.duration_hours} onChange={e => setForm(f => ({ ...f, duration_hours: +e.target.value }))} min="0" />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}><FiStar style={{ color: "#f59e0b" }} /> Требуемый уровень</label>
                  <input type="number" className={styles.formInput} value={form.required_level} onChange={e => setForm(f => ({ ...f, required_level: +e.target.value }))} min="0" placeholder="0 = без ограничений" />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}><FiDollarSign style={{ color: "#10b981" }} /> Цена (баллы)</label>
                  <input type="number" className={styles.formInput} value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} min="0" placeholder="0 = бесплатно" />
                </div>

                <div className={`${styles.formGroup} ${styles.spanFull}`}>
                  <div className={styles.checkboxRow}>
                    <label className={styles.checkLabel}>
                      <div className={`${styles.toggle} ${form.certificate_available ? styles.toggleOn : ""}`} onClick={() => setForm(f => ({ ...f, certificate_available: !f.certificate_available }))}>
                        <div className={styles.toggleKnob} />
                      </div>
                      <FiAward style={{ color: "#7c3aed" }} /><span>Выдаётся сертификат</span>
                    </label>
                    <label className={styles.checkLabel}>
                      <div className={`${styles.toggle} ${form.is_published ? styles.toggleOn : ""}`} onClick={() => setForm(f => ({ ...f, is_published: !f.is_published }))}>
                        <div className={styles.toggleKnob} />
                      </div>
                      <FiEye style={{ color: "#2563eb" }} /><span>Опубликовать</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btnSec} onClick={() => setEditModal(null)}>Отмена</button>
                <button type="submit" className={styles.btnPrimary} disabled={uploading}>
                  <FiCheck /><span>{uploading ? "Сохранение..." : (editModal === "create" ? "Создать курс" : "Сохранить")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirm && <ConfirmModal msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}
