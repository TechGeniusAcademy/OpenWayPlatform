import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiPlus, FiArrowLeft, FiEdit2, FiTrash2, FiX, FiCheck, FiAlertCircle,
  FiClock, FiVideo, FiFileText, FiBook, FiFolder, FiFolderPlus, FiTag,
  FiHash, FiChevronDown, FiChevronUp, FiLink, FiUpload, FiBarChart2,
} from "react-icons/fi";
import { HiAcademicCap } from "react-icons/hi";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import api from "../../utils/api";
import styles from "./CourseLessons.module.css";

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

const emptyLesson = (order) => ({
  title: "", content: "", video_url: "", duration_minutes: 0,
  order_number: order, category_id: "", timecodes: [],
});
const emptyCategory = (order) => ({ title: "", description: "", order_number: order });

const QUILL_MODULES = {
  toolbar: [[{ header: [1,2,3,false] }],["bold","italic","underline","strike"],[{ list:"ordered" },{ list:"bullet" }],["blockquote","code-block"],["link","image","video"],[{ color:[] },{ background:[] }],["clean"]],
};

/* ═════════════ MAIN ═════════════ */
export default function CourseLessons() {
  const { courseId } = useParams();
  const navigate     = useNavigate();

  const [course,      setCourse]     = useState(null);
  const [lessons,     setLessons]    = useState([]);
  const [categories,  setCategories] = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [toast,       setToast]      = useState(null);
  const [confirm,     setConfirm]    = useState(null);

  /* lesson modal */
  const [lessonModal,   setLessonModal]   = useState(null); // null | "create" | lesson
  const [lessonForm,    setLessonForm]    = useState(emptyLesson(1));
  const [lessonErr,     setLessonErr]     = useState("");
  const [videoSrc,      setVideoSrc]      = useState("url"); // "url" | "file"
  const [videoFile,     setVideoFile]     = useState(null);
  const [uploading,     setUploading]     = useState(false);
  const [tcInput,       setTcInput]       = useState({ time: "", title: "" });

  /* category modal */
  const [catModal,  setCatModal]  = useState(null); // null | "create" | cat
  const [catForm,   setCatForm]   = useState(emptyCategory(1));
  const [catErr,    setCatErr]    = useState("");

  /* collapse category sections */
  const [collapsed, setCollapsed] = useState({});

  const notify = (type, msg) => setToast({ type, msg });

  /* ── load ── */
  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/courses/${courseId}`);
      setCourse(data.course);
      setLessons(data.lessons || []);
      setCategories(data.categories || []);
    } catch { notify("error", "Ошибка загрузки курса"); }
    finally { setLoading(false); }
  }, [courseId]);
  useEffect(() => { load(); }, [load]);

  /* ── stats ── */
  const stats = useMemo(() => ({
    total:    lessons.length,
    duration: lessons.reduce((s, l) => s + (+l.duration_minutes || 0), 0),
    withVideo: lessons.filter(l => l.video_url).length,
    uncateg:  lessons.filter(l => !l.category_id).length,
  }), [lessons]);

  /* ── lesson modal ── */
  const openCreateLesson = () => {
    setLessonForm(emptyLesson(lessons.length + 1));
    setLessonErr(""); setVideoFile(null); setVideoSrc("url");
    setTcInput({ time: "", title: "" });
    setLessonModal("create");
  };
  const openEditLesson = (l) => {
    setLessonForm({
      title: l.title, content: l.content || "",
      video_url: l.video_url || "", duration_minutes: l.duration_minutes || 0,
      order_number: l.order_number || 0, category_id: l.category_id || "",
      timecodes: l.timecodes ? (typeof l.timecodes === "string" ? JSON.parse(l.timecodes) : l.timecodes) : [],
    });
    setLessonErr(""); setVideoFile(null); setVideoSrc(l.video_url ? "url" : "file");
    setTcInput({ time: "", title: "" });
    setLessonModal(l);
  };

  const handleLessonSubmit = async (e) => {
    e.preventDefault(); setLessonErr("");
    if (!lessonForm.title.trim()) { setLessonErr("Введите название урока"); return; }
    setUploading(true);
    try {
      let video_url = lessonForm.video_url;
      if (videoSrc === "file" && videoFile) {
        const fd = new FormData(); fd.append("video", videoFile);
        const { data } = await api.post("/courses/upload-video", fd, { headers: { "Content-Type": "multipart/form-data" } });
        video_url = data.video_url;
      }
      const payload = { ...lessonForm, video_url, timecodes: JSON.stringify(lessonForm.timecodes) };
      if (lessonModal === "create") {
        await api.post(`/courses/${courseId}/lessons`, payload);
        notify("success", "Урок создан");
      } else {
        await api.put(`/courses/${courseId}/lessons/${lessonModal.id}`, payload);
        notify("success", "Урок обновлён");
      }
      setLessonModal(null); load();
    } catch (err) { setLessonErr(err.response?.data?.error || "Ошибка сохранения"); }
    finally { setUploading(false); }
  };

  const askDeleteLesson = (l) => setConfirm({
    msg: `Удалить урок «${l.title}»?`,
    onConfirm: async () => {
      setConfirm(null);
      try { await api.delete(`/courses/${courseId}/lessons/${l.id}`); notify("success", "Урок удалён"); load(); }
      catch { notify("error", "Ошибка удаления"); }
    },
  });

  /* ── timecodes ── */
  const addTimecode = () => {
    if (!tcInput.time || !tcInput.title) { notify("error", "Заполните время и название"); return; }
    const ok = /^(\d{1,2}:)?([0-5]?\d):([0-5]\d)$/.test(tcInput.time);
    if (!ok) { notify("error", "Формат: мм:сс или чч:мм:сс"); return; }
    setLessonForm(f => ({ ...f, timecodes: [...f.timecodes, { ...tcInput }] }));
    setTcInput({ time: "", title: "" });
  };

  /* ── category modal ── */
  const openCreateCat = () => { setCatForm(emptyCategory(categories.length + 1)); setCatErr(""); setCatModal("create"); };
  const openEditCat   = (c) => { setCatForm({ title: c.title, description: c.description || "", order_number: c.order_number || 0 }); setCatErr(""); setCatModal(c); };

  const handleCatSubmit = async (e) => {
    e.preventDefault(); setCatErr("");
    if (!catForm.title.trim()) { setCatErr("Введите название"); return; }
    try {
      if (catModal === "create") {
        await api.post(`/courses/${courseId}/categories`, catForm);
        notify("success", "Категория создана");
      } else {
        await api.put(`/courses/${courseId}/categories/${catModal.id}`, catForm);
        notify("success", "Категория обновлена");
      }
      setCatModal(null); load();
    } catch (err) { setCatErr(err.response?.data?.error || "Ошибка сохранения"); }
  };

  const askDeleteCat = (c) => setConfirm({
    msg: `Удалить категорию «${c.title}»? Уроки не будут удалены.`,
    onConfirm: async () => {
      setConfirm(null);
      try { await api.delete(`/courses/${courseId}/categories/${c.id}`); notify("success", "Категория удалена"); load(); }
      catch { notify("error", "Ошибка удаления"); }
    },
  });

  /* ── grouped lessons ── */
  const uncategorized = lessons.filter(l => !l.category_id);
  const grouped = categories.map(cat => ({
    cat,
    items: lessons.filter(l => l.category_id === cat.id),
  }));

  const toggleCollapsed = (key) => setCollapsed(p => ({ ...p, [key]: !p[key] }));

  /* ─── RENDER ─── */
  if (loading) return (
    <div className={styles.page}>
      <div className={styles.skeletonList}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className={styles.skRow} />)}</div>
    </div>
  );

  if (!course) return (
    <div className={styles.page}>
      <div className={styles.empty}><div className={styles.emptyIcon}><HiAcademicCap /></div><h3>Курс не найден</h3></div>
    </div>
  );

  return (
    <div className={styles.page}>
      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => navigate("/admin/courses")}><FiArrowLeft /><span>Курсы</span></button>
          <div>
            <h1 className={styles.headerTitle}>Управление уроками</h1>
            <p className={styles.headerSub}>{course.title}</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.btnSec} onClick={openCreateCat}><FiFolderPlus /><span>Разделы</span></button>
          <button className={styles.btnPrimary} onClick={openCreateLesson}><FiPlus /><span>Добавить урок</span></button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}><div className={`${styles.statIcon} ${styles.statIconTotal}`}><FiBook /></div><div><div className={styles.statVal}>{stats.total}</div><div className={styles.statLabel}>Уроков</div></div></div>
        <div className={styles.stat}><div className={`${styles.statIcon} ${styles.statIconDur}`}><FiClock /></div><div><div className={styles.statVal}>{stats.duration}</div><div className={styles.statLabel}>Минут</div></div></div>
        <div className={styles.stat}><div className={`${styles.statIcon} ${styles.statIconVideo}`}><FiVideo /></div><div><div className={styles.statVal}>{stats.withVideo}</div><div className={styles.statLabel}>С видео</div></div></div>
        <div className={styles.stat}><div className={`${styles.statIcon} ${styles.statIconCat}`}><FiFolder /></div><div><div className={styles.statVal}>{categories.length}</div><div className={styles.statLabel}>Разделов</div></div></div>
      </div>

      {lessons.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><FiFileText /></div>
          <h3>Уроков нет</h3><p>Добавьте первый урок к курсу</p>
          <button className={styles.btnPrimary} style={{ marginTop: 16 }} onClick={openCreateLesson}><FiPlus /><span>Добавить урок</span></button>
        </div>
      ) : (
        <div className={styles.lessonsWrap}>
          {/* Categorized groups */}
          {grouped.map(({ cat, items }) => (
            <div key={cat.id} className={styles.catGroup}>
              <div className={styles.catGroupHead} onClick={() => toggleCollapsed(`cat-${cat.id}`)}>
                <div className={styles.catGroupTitle}>
                  <FiFolder className={styles.catIcon} />
                  <span>{cat.title}</span>
                  <span className={styles.catCount}>{items.length}</span>
                </div>
                <div className={styles.catGroupActions}>
                  <button className={`${styles.iconBtn} ${styles.iconBtnEdit}`} onClick={e => { e.stopPropagation(); openEditCat(cat); }} title="Редактировать"><FiEdit2 /></button>
                  <button className={`${styles.iconBtn} ${styles.iconBtnDel}`} onClick={e => { e.stopPropagation(); askDeleteCat(cat); }} title="Удалить"><FiTrash2 /></button>
                  {collapsed[`cat-${cat.id}`] ? <FiChevronDown /> : <FiChevronUp />}
                </div>
              </div>
              {!collapsed[`cat-${cat.id}`] && (
                <div className={styles.catLessons}>
                  {items.length === 0 ? <p className={styles.emptyText}>Нет уроков в этом разделе</p> : items.map((l, idx) => (
                    <LessonRow key={l.id} lesson={l} index={idx + 1} onEdit={openEditLesson} onDelete={askDeleteLesson} styles={styles} />
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Uncategorized */}
          {uncategorized.length > 0 && (
            <div className={styles.catGroup}>
              <div className={styles.catGroupHead} onClick={() => toggleCollapsed("uncat")}>
                <div className={styles.catGroupTitle}>
                  <FiFileText className={styles.catIcon} style={{ color: "var(--text-secondary)" }} />
                  <span>Без раздела</span>
                  <span className={styles.catCount}>{uncategorized.length}</span>
                </div>
                <div className={styles.catGroupActions}>
                  {collapsed["uncat"] ? <FiChevronDown /> : <FiChevronUp />}
                </div>
              </div>
              {!collapsed["uncat"] && (
                <div className={styles.catLessons}>
                  {uncategorized.map((l, idx) => (
                    <LessonRow key={l.id} lesson={l} index={idx + 1} onEdit={openEditLesson} onDelete={askDeleteLesson} styles={styles} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════ LESSON MODAL ════ */}
      {lessonModal && (
        <div className={styles.overlay} onClick={() => setLessonModal(null)}>
          <div className={`${styles.modal} ${styles.modalLg}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}><FiBook className={styles.modalIcon} /><h2>{lessonModal === "create" ? "Новый урок" : "Редактировать урок"}</h2></div>
              <button className={styles.closeBtn} onClick={() => setLessonModal(null)}><FiX /></button>
            </div>
            <form className={styles.modalForm} onSubmit={handleLessonSubmit}>
              {lessonErr && <div className={styles.inlineErr}><FiAlertCircle /><span>{lessonErr}</span></div>}

              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.spanFull}`}>
                  <label className={styles.formLabel}>Название урока *</label>
                  <input className={styles.formInput} value={lessonForm.title} onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))} placeholder="Название урока" required />
                </div>

                {categories.length > 0 && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Раздел</label>
                    <select className={styles.formInput} value={lessonForm.category_id} onChange={e => setLessonForm(f => ({ ...f, category_id: e.target.value }))}>
                      <option value="">Без раздела</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Порядковый номер</label>
                  <input type="number" className={styles.formInput} value={lessonForm.order_number} onChange={e => setLessonForm(f => ({ ...f, order_number: +e.target.value }))} min="1" />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}><FiClock /> Длительность (мин)</label>
                  <input type="number" className={styles.formInput} value={lessonForm.duration_minutes} onChange={e => setLessonForm(f => ({ ...f, duration_minutes: +e.target.value }))} min="0" />
                </div>

                <div className={`${styles.formGroup} ${styles.spanFull}`}>
                  <label className={styles.formLabel}>Содержание урока</label>
                  <div className={styles.quillWrap}>
                    <ReactQuill value={lessonForm.content} onChange={v => setLessonForm(f => ({ ...f, content: v }))} modules={QUILL_MODULES} />
                  </div>
                </div>

                {/* Video section */}
                <div className={`${styles.formGroup} ${styles.spanFull}`}>
                  <label className={styles.formLabel}>Видео</label>
                  <div className={styles.videoTabs}>
                    <button type="button" className={`${styles.videoTab} ${videoSrc === "url" ? styles.videoTabActive : ""}`} onClick={() => setVideoSrc("url")}><FiLink /> Ссылка</button>
                    <button type="button" className={`${styles.videoTab} ${videoSrc === "file" ? styles.videoTabActive : ""}`} onClick={() => setVideoSrc("file")}><FiUpload /> Файл</button>
                  </div>
                  {videoSrc === "url" ? (
                    <input className={styles.formInput} type="url" value={lessonForm.video_url} onChange={e => setLessonForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." />
                  ) : (
                    <div className={styles.fileUploadArea}>
                      <input type="file" accept="video/*" className={styles.hiddenInput} id="videoFile" onChange={e => { const f = e.target.files[0]; if (f) setVideoFile(f); }} />
                      <label htmlFor="videoFile" className={styles.fileUploadLabel}>
                        <FiUpload className={styles.fileUploadIcon} />
                        <span>{videoFile ? videoFile.name : "Выберите видео файл"}</span>
                        <small>MP4, MOV, AVI, WebM</small>
                      </label>
                    </div>
                  )}
                </div>

                {/* Timecodes */}
                <div className={`${styles.formGroup} ${styles.spanFull}`}>
                  <label className={styles.formLabel}>Таймкоды</label>
                  <div className={styles.tcRow}>
                    <input className={styles.formInput} value={tcInput.time} onChange={e => setTcInput(p => ({ ...p, time: e.target.value }))} placeholder="00:00" style={{ width: 100, flexShrink: 0 }} />
                    <input className={styles.formInput} value={tcInput.title} onChange={e => setTcInput(p => ({ ...p, title: e.target.value }))} placeholder="Название раздела" style={{ flex: 1 }} />
                    <button type="button" className={styles.btnSec} onClick={addTimecode}><FiPlus /></button>
                  </div>
                  {lessonForm.timecodes.length > 0 && (
                    <div className={styles.tcList}>
                      {lessonForm.timecodes.map((tc, i) => (
                        <div key={i} className={styles.tcItem}>
                          <span className={styles.tcTime}>{tc.time}</span>
                          <span className={styles.tcTitle}>{tc.title}</span>
                          <button type="button" className={styles.tcDel} onClick={() => setLessonForm(f => ({ ...f, timecodes: f.timecodes.filter((_, j) => j !== i) }))}><FiX /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btnSec} onClick={() => setLessonModal(null)}>Отмена</button>
                <button type="submit" className={styles.btnPrimary} disabled={uploading}>
                  <FiCheck /><span>{uploading ? "Загрузка..." : (lessonModal === "create" ? "Создать" : "Сохранить")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════ CATEGORY MODAL ════ */}
      {catModal && (
        <div className={styles.overlay} onClick={() => setCatModal(null)}>
          <div className={`${styles.modal} ${styles.modalSm}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}><FiFolder className={styles.modalIcon} /><h2>{catModal === "create" ? "Новый раздел" : "Редактировать раздел"}</h2></div>
              <button className={styles.closeBtn} onClick={() => setCatModal(null)}><FiX /></button>
            </div>
            <form className={styles.modalForm} onSubmit={handleCatSubmit}>
              {catErr && <div className={styles.inlineErr}><FiAlertCircle /><span>{catErr}</span></div>}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Название *</label>
                <input className={styles.formInput} value={catForm.title} onChange={e => setCatForm(f => ({ ...f, title: e.target.value }))} placeholder="Например: Основы HTML" required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Описание</label>
                <textarea className={styles.formInput} rows={2} value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} placeholder="Краткое описание раздела" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Порядок</label>
                <input type="number" className={styles.formInput} value={catForm.order_number} onChange={e => setCatForm(f => ({ ...f, order_number: +e.target.value }))} min="0" />
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.btnSec} onClick={() => setCatModal(null)}>Отмена</button>
                <button type="submit" className={styles.btnPrimary}><FiCheck /><span>{catModal === "create" ? "Создать" : "Сохранить"}</span></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirm && <ConfirmModal msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

/* ─── LessonRow component ─── */
function LessonRow({ lesson, index, onEdit, onDelete, styles }) {
  return (
    <div className={styles.lessonRow}>
      <div className={styles.lessonNum}>{lesson.order_number || index}</div>
      <div className={styles.lessonInfo}>
        <span className={styles.lessonTitle}>{lesson.title}</span>
        <div className={styles.lessonMeta}>
          {lesson.duration_minutes > 0 && <span><FiClock /> {lesson.duration_minutes} мин</span>}
          {lesson.video_url && <span className={styles.metaVideo}><FiVideo /> Видео</span>}
          {lesson.timecodes && (typeof lesson.timecodes === "string" ? JSON.parse(lesson.timecodes) : lesson.timecodes).length > 0 && (
            <span><FiHash /> {(typeof lesson.timecodes === "string" ? JSON.parse(lesson.timecodes) : lesson.timecodes).length} таймкодов</span>
          )}
        </div>
      </div>
      <div className={styles.lessonActions}>
        <button className={`${styles.iconBtn} ${styles.iconBtnEdit}`} onClick={() => onEdit(lesson)} title="Редактировать"><FiEdit2 /></button>
        <button className={`${styles.iconBtn} ${styles.iconBtnDel}`} onClick={() => onDelete(lesson)} title="Удалить"><FiTrash2 /></button>
      </div>
    </div>
  );
}
