import { useState, useEffect, useMemo, useCallback } from "react";
import {
  FiFileText, FiPlus, FiEdit2, FiTrash2, FiClock, FiCheckSquare,
  FiBarChart2, FiX, FiCheck, FiRefreshCw, FiUpload, FiSearch,
  FiAlertCircle, FiCode, FiList, FiUsers, FiFilter, FiHash,
  FiAward, FiRepeat,
} from "react-icons/fi";
import { HiOutlineClipboardList } from "react-icons/hi";
import api from "../utils/api";
import BulkTestEditor from "./BulkTestEditor";
import styles from "./TestsManagement.module.css";

/* ─── Toast ─── */
let _tt;
function Toast({ msg, type, onClose }) {
  useEffect(() => {
    clearTimeout(_tt);
    _tt = setTimeout(onClose, 3500);
    return () => clearTimeout(_tt);
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

/* ─── ConfirmModal ─── */
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
            <button className={styles.btnDanger} onClick={onConfirm}>
              <FiTrash2 /><span>Удалить</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const emptyForm = () => ({
  title: "", description: "", type: "choice", time_limit: 0,
  points_correct: 1, points_wrong: 0, can_retry: false,
});
const emptyQuestion = (type) => ({
  question_text: "", question_type: type,
  code_template: "", code_solution: "", code_language: "javascript",
  options: type === "choice" ? [{ option_text: "", is_correct: false }] : [],
});

/* ════════════════ MAIN ════════════════ */
export default function TestsManagement() {
  const [tests,   setTests]   = useState([]);
  const [groups,  setGroups]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState(null);
  const [confirm, setConfirm] = useState(null);

  /* search / filter */
  const [search,     setSearch]     = useState("");
  const [filterType, setFilterType] = useState("all");

  /* test form modal */
  const [editTest,   setEditTest]   = useState(null); // null = hidden, "new" = create, obj = edit
  const [form,       setForm]       = useState(emptyForm());
  const [questions,  setQuestions]  = useState([]);
  const [formErr,    setFormErr]    = useState("");
  const [saving,     setSaving]     = useState(false);

  /* assign modal */
  const [assignTest,  setAssignTest]  = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);

  /* history modal */
  const [histTest, setHistTest] = useState(null);
  const [history,  setHistory]  = useState([]);

  /* bulk editor */
  const [showBulk, setShowBulk] = useState(false);

  const notify = (type, msg) => setToast({ type, msg });

  /* ── load ── */
  const loadTests = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/tests");
      setTests(data.tests || []);
    } catch { notify("error", "Ошибка загрузки тестов"); }
    finally { setLoading(false); }
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      const { data } = await api.get("/groups");
      setGroups(data.groups || []);
    } catch {}
  }, []);

  useEffect(() => { loadTests(); loadGroups(); }, [loadTests, loadGroups]);

  /* ── stats ── */
  const stats = useMemo(() => ({
    total:   tests.length,
    choice:  tests.filter(t => t.type === "choice").length,
    code:    tests.filter(t => t.type === "code").length,
    qTotal:  tests.reduce((s, t) => s + (+t.questions_count || 0), 0),
  }), [tests]);

  /* ── filtered tests ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tests.filter(t => {
      const matchSearch = !q || t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
      const matchType   = filterType === "all" || t.type === filterType;
      return matchSearch && matchType;
    });
  }, [tests, search, filterType]);

  /* ── open test form ── */
  const openCreate = () => {
    setEditTest("new");
    setForm(emptyForm());
    setQuestions([]);
    setFormErr("");
  };
  const openEdit = async (t) => {
    setFormErr("");
    try {
      const { data } = await api.get(`/tests/${t.id}`);
      const full = data.test;
      setForm({
        title: full.title, description: full.description || "",
        type: full.type, time_limit: full.time_limit || 0,
        points_correct: full.points_correct, points_wrong: full.points_wrong,
        can_retry: full.can_retry,
      });
      setQuestions(full.questions?.map(q => ({
        id: q.id, question_text: q.question_text, question_type: q.question_type,
        code_template: q.code_template || "", code_solution: q.code_solution || "",
        code_language: q.code_language || "javascript",
        options: q.options?.map(o => ({ id: o.id, option_text: o.option_text, is_correct: o.is_correct })) || [],
      })) || []);
      setEditTest(full);
    } catch { notify("error", "Ошибка загрузки теста"); }
  };

  /* ── save test ── */
  const handleSubmit = async (e) => {
    e.preventDefault(); setFormErr("");
    if (!form.title.trim()) { setFormErr("Введите название теста"); return; }
    if (questions.length === 0) { setFormErr("Добавьте хотя бы один вопрос"); return; }
    setSaving(true);
    try {
      const payload = { test: { ...form, time_limit: +form.time_limit, points_correct: +form.points_correct, points_wrong: +form.points_wrong }, questions };
      if (editTest === "new") {
        await api.post("/tests", payload);
        notify("success", "Тест создан");
      } else {
        await api.put(`/tests/${editTest.id}`, payload);
        notify("success", "Тест обновлён");
      }
      setEditTest(null); loadTests();
    } catch (err) { setFormErr(err.response?.data?.error || "Ошибка сохранения"); }
    finally { setSaving(false); }
  };

  /* ── delete test ── */
  const askDelete = (t) => setConfirm({
    msg: `Удалить тест «${t.title}»? Это действие необратимо.`,
    onConfirm: async () => {
      setConfirm(null);
      try { await api.delete(`/tests/${t.id}`); notify("success", "Тест удалён"); loadTests(); }
      catch { notify("error", "Ошибка удаления"); }
    },
  });

  /* ── questions helpers ── */
  const addQuestion = () => setQuestions(q => [...q, emptyQuestion(form.type)]);
  const updateQ  = (i, field, val) => setQuestions(q => { const n=[...q]; n[i]={...n[i],[field]:val}; return n; });
  const removeQ  = (i) => setQuestions(q => q.filter((_,j)=>j!==i));
  const addOpt   = (qi)    => setQuestions(q => { const n=[...q]; n[qi].options=[...n[qi].options,{option_text:"",is_correct:false}]; return n; });
  const updateOpt= (qi,oi,field,val) => setQuestions(q => { const n=[...q]; n[qi].options=[...n[qi].options]; n[qi].options[oi]={...n[qi].options[oi],[field]:val}; return n; });
  const removeOpt= (qi,oi) => setQuestions(q => { const n=[...q]; n[qi].options=n[qi].options.filter((_,j)=>j!==oi); return n; });

  /* ── assign modal ── */
  const openAssign = async (t) => {
    setAssignTest(t); setAssignLoading(true);
    try {
      const { data } = await api.get(`/tests/${t.id}/assignments`);
      setAssignments(data.assignments || []);
    } catch { notify("error", "Ошибка загрузки назначений"); }
    finally { setAssignLoading(false); }
  };
  const handleAssign   = async (groupId) => {
    try { await api.post(`/tests/${assignTest.id}/assign`, { groupId }); await openAssign(assignTest); notify("success","Тест назначен"); }
    catch { notify("error","Ошибка назначения"); }
  };
  const handleUnassign = async (groupId) => {
    try { await api.delete(`/tests/${assignTest.id}/assign/${groupId}`); await openAssign(assignTest); notify("success","Назначение отменено"); }
    catch { notify("error","Ошибка"); }
  };

  /* ── history modal ── */
  const openHistory = async (t) => {
    setHistTest(t);
    try {
      const { data } = await api.get(`/tests/${t.id}/history`);
      setHistory(data.history || []);
    } catch { notify("error", "Ошибка загрузки истории"); }
  };
  const handleReassign = (userId) => setConfirm({
    msg: "Переназначить тест? Все предыдущие попытки будут аннулированы.",
    onConfirm: async () => {
      setConfirm(null);
      try { await api.post(`/tests/${histTest.id}/reassign/${userId}`); await openHistory(histTest); notify("success","Переназначено"); }
      catch { notify("error","Ошибка"); }
    },
  });

  /* ── bulk import ── */
  const handleBulkImport = async (testData) => {
    try {
      await api.post("/tests", {
        test: { title: testData.title, description: testData.description, type: testData.type, time_limit: testData.timeLimit, points_correct: testData.pointsCorrect, points_wrong: testData.pointsWrong, can_retry: testData.canRetry },
        questions: testData.questions,
      });
      setShowBulk(false); loadTests();
      notify("success", `Тест «${testData.title}» создан (${testData.questions.length} вопросов)`);
    } catch { notify("error", "Ошибка массового создания"); }
  };

  /* ─── SKELETON ─── */
  if (loading) return (
    <div className={styles.page}>
      <div className={styles.stats}>
        {[1,2,3,4].map(i => <div key={i} className={styles.skStat} />)}
      </div>
      <div className={styles.grid}>
        {[1,2,3,4,5,6].map(i => <div key={i} className={styles.skCard}><div className={styles.skHead} /><div className={styles.skBody}><div className={styles.skLine} /><div className={styles.skLine} style={{width:"60%"}} /></div></div>)}
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><HiOutlineClipboardList /></div>
          <div>
            <h1 className={styles.headerTitle}>Управление тестами</h1>
            <p className={styles.headerSub}>Создание, назначение и мониторинг тестов</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.btnSec} onClick={() => setShowBulk(true)}><FiUpload /><span>Массовое создание</span></button>
          <button className={styles.btnPrimary} onClick={openCreate}><FiPlus /><span>Создать тест</span></button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}><div className={`${styles.statIcon} ${styles.statIconTotal}`}><FiFileText /></div><div><div className={styles.statVal}>{stats.total}</div><div className={styles.statLabel}>Всего тестов</div></div></div>
        <div className={styles.stat}><div className={`${styles.statIcon} ${styles.statIconChoice}`}><FiList /></div><div><div className={styles.statVal}>{stats.choice}</div><div className={styles.statLabel}>С вариантами</div></div></div>
        <div className={styles.stat}><div className={`${styles.statIcon} ${styles.statIconCode}`}><FiCode /></div><div><div className={styles.statVal}>{stats.code}</div><div className={styles.statLabel}>С кодом</div></div></div>
        <div className={styles.stat}><div className={`${styles.statIcon} ${styles.statIconQ}`}><FiHash /></div><div><div className={styles.statVal}>{stats.qTotal}</div><div className={styles.statLabel}>Вопросов всего</div></div></div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <FiSearch className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Поиск по названию..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className={styles.searchClear} onClick={() => setSearch("")}><FiX /></button>}
        </div>
        <select className={styles.filterSelect} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">Все типы</option>
          <option value="choice">С вариантами</option>
          <option value="code">С кодом</option>
        </select>
        {(search || filterType !== "all") && (
          <button className={styles.clearFilters} onClick={() => { setSearch(""); setFilterType("all"); }}>
            <FiX /> Сбросить
          </button>
        )}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><FiFileText /></div>
          <h3>{tests.length === 0 ? "Нет тестов" : "Ничего не найдено"}</h3>
          <p>{tests.length === 0 ? "Создайте первый тест" : "Попробуйте изменить параметры поиска"}</p>
          {tests.length === 0 && <button className={styles.btnPrimary} style={{marginTop:16}} onClick={openCreate}><FiPlus /><span>Создать тест</span></button>}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(t => (
            <div key={t.id} className={styles.card}>
              <div className={styles.cardHead}>
                <div className={`${styles.typeBadge} ${t.type === "code" ? styles.typeBadgeCode : styles.typeBadgeChoice}`}>
                  {t.type === "code" ? <><FiCode /> С кодом</> : <><FiList /> С вариантами</>}
                </div>
                {t.can_retry && <div className={styles.retryBadge}><FiRepeat /> Повтор</div>}
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{t.title}</h3>
                {t.description && <p className={styles.cardDesc}>{t.description}</p>}
                <div className={styles.cardMeta}>
                  <span><FiHash /> {t.questions_count || 0} вопросов</span>
                  <span><FiClock /> {t.time_limit || "∞"} мин</span>
                  <span><FiAward /> +{t.points_correct} / {t.points_wrong}</span>
                </div>
              </div>
              <div className={styles.cardFoot}>
                <button className={`${styles.iconBtn} ${styles.iconBtnEdit}`} onClick={() => openEdit(t)} title="Редактировать"><FiEdit2 /></button>
                <button className={`${styles.iconBtn} ${styles.iconBtnAssign}`} onClick={() => openAssign(t)} title="Назначить группе"><FiUsers /></button>
                <button className={`${styles.iconBtn} ${styles.iconBtnHist}`} onClick={() => openHistory(t)} title="История прохождений"><FiBarChart2 /></button>
                <button className={`${styles.iconBtn} ${styles.iconBtnDel}`} onClick={() => askDelete(t)} title="Удалить"><FiTrash2 /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════ TEST FORM MODAL ════ */}
      {editTest != null && (
        <div className={styles.overlay} onClick={() => setEditTest(null)}>
          <div className={`${styles.modal} ${styles.modalXl}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}>
                <HiOutlineClipboardList className={styles.modalIcon} />
                <h2>{editTest === "new" ? "Новый тест" : "Редактировать тест"}</h2>
              </div>
              <button className={styles.closeBtn} onClick={() => setEditTest(null)}><FiX /></button>
            </div>
            <form className={styles.modalForm} onSubmit={handleSubmit}>
              {formErr && <div className={styles.inlineErr}><FiAlertCircle /><span>{formErr}</span></div>}

              {/* Basic info */}
              <div className={styles.formSection}>
                <h4 className={styles.sectionTitle}>Основная информация</h4>
                <div className={styles.formGrid}>
                  <div className={`${styles.formGroup} ${styles.spanFull}`}>
                    <label className={styles.formLabel}>Название теста *</label>
                    <input className={styles.formInput} value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="Название теста" required />
                  </div>
                  <div className={`${styles.formGroup} ${styles.spanFull}`}>
                    <label className={styles.formLabel}>Описание</label>
                    <textarea className={styles.formInput} rows={2} value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Краткое описание теста" />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Тип теста</label>
                    <select className={styles.formInput} value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))} disabled={editTest !== "new"}>
                      <option value="choice">С вариантами ответа</option>
                      <option value="code">С исправлением кода</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}><FiClock /> Лимит времени (мин, 0 = без лимита)</label>
                    <input type="number" className={styles.formInput} value={form.time_limit} onChange={e => setForm(f=>({...f,time_limit:e.target.value}))} min="0" />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}><FiAward /> Баллов за правильный</label>
                    <input type="number" className={styles.formInput} value={form.points_correct} onChange={e => setForm(f=>({...f,points_correct:e.target.value}))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}><FiAward /> Баллов за неправильный</label>
                    <input type="number" className={styles.formInput} value={form.points_wrong} onChange={e => setForm(f=>({...f,points_wrong:e.target.value}))} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Повторное прохождение</label>
                    <div className={styles.checkLabel}>
                      <div className={`${styles.toggle} ${form.can_retry ? styles.toggleOn : ""}`} onClick={() => setForm(f=>({...f,can_retry:!f.can_retry}))}>
                        <div className={styles.toggleKnob} />
                      </div>
                      <span>{form.can_retry ? "Разрешено" : "Запрещено"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Questions */}
              <div className={styles.formSection}>
                <div className={styles.sectionHead}>
                  <h4 className={styles.sectionTitle}>Вопросы ({questions.length})</h4>
                  <button type="button" className={styles.btnAddQ} onClick={addQuestion}><FiPlus /><span>Добавить вопрос</span></button>
                </div>
                {questions.length === 0 && (
                  <div className={styles.qEmpty}><FiFileText /><span>Нет вопросов — нажмите «Добавить вопрос»</span></div>
                )}
                {questions.map((q, qi) => (
                  <div key={qi} className={styles.questionBlock}>
                    <div className={styles.questionHead}>
                      <span className={styles.questionNum}>Вопрос {qi + 1}</span>
                      <button type="button" className={styles.qDelBtn} onClick={() => removeQ(qi)} title="Удалить вопрос"><FiTrash2 /></button>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Текст вопроса *</label>
                      <textarea className={styles.formInput} rows={2} value={q.question_text} onChange={e => updateQ(qi,"question_text",e.target.value)} required />
                    </div>

                    {form.type === "choice" ? (
                      <div className={styles.optionsBlock}>
                        <label className={styles.formLabel}>Варианты ответа:</label>
                        {q.options.map((opt, oi) => (
                          <div key={oi} className={styles.optionRow}>
                            <div className={`${styles.optChk} ${opt.is_correct ? styles.optChkOn : ""}`} onClick={() => updateOpt(qi,oi,"is_correct",!opt.is_correct)} title="Правильный ответ">
                              {opt.is_correct && <FiCheck />}
                            </div>
                            <input className={styles.formInput} value={opt.option_text} onChange={e => updateOpt(qi,oi,"option_text",e.target.value)} placeholder={`Вариант ${oi+1}`} style={{flex:1}} />
                            <button type="button" className={styles.optDelBtn} onClick={() => removeOpt(qi,oi)}><FiX /></button>
                          </div>
                        ))}
                        <button type="button" className={styles.btnAddOpt} onClick={() => addOpt(qi)}><FiPlus /><span>Добавить вариант</span></button>
                      </div>
                    ) : (
                      <div className={styles.codeBlock}>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>Язык</label>
                          <select className={styles.formInput} value={q.code_language} onChange={e => updateQ(qi,"code_language",e.target.value)}>
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="java">Java</option>
                            <option value="cpp">C++</option>
                          </select>
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>Шаблон кода (студент видит)</label>
                          <textarea className={`${styles.formInput} ${styles.codeArea}`} rows={4} value={q.code_template} onChange={e => updateQ(qi,"code_template",e.target.value)} placeholder="function solve() { }" />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>Правильное решение</label>
                          <textarea className={`${styles.formInput} ${styles.codeArea}`} rows={4} value={q.code_solution} onChange={e => updateQ(qi,"code_solution",e.target.value)} placeholder="function solve() { return 42; }" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btnSec} onClick={() => setEditTest(null)}>Отмена</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  <FiCheck /><span>{saving ? "Сохранение..." : (editTest === "new" ? "Создать тест" : "Сохранить")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════ ASSIGN MODAL ════ */}
      {assignTest && (
        <div className={styles.overlay} onClick={() => setAssignTest(null)}>
          <div className={`${styles.modal} ${styles.modalSm}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}>
                <FiUsers className={styles.modalIcon} />
                <h2>Назначение: {assignTest.title}</h2>
              </div>
              <button className={styles.closeBtn} onClick={() => setAssignTest(null)}><FiX /></button>
            </div>
            <div className={styles.modalBody}>
              {assignLoading ? (
                <div className={styles.spinWrap}><FiRefreshCw className={styles.spinner} /></div>
              ) : groups.length === 0 ? (
                <p className={styles.emptyText}>Нет групп</p>
              ) : (
                <div className={styles.assignList}>
                  {groups.map(g => {
                    const assigned = assignments.some(a => a.group_id === g.id);
                    return (
                      <div key={g.id} className={`${styles.assignRow} ${assigned ? styles.assignRowOn : ""}`}>
                        <div className={styles.assignGroupName}>
                          <FiUsers className={styles.assignIcon} />
                          <span>{g.name}</span>
                        </div>
                        {assigned ? (
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
                <button className={styles.btnSec} onClick={() => setAssignTest(null)}>Закрыть</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ HISTORY MODAL ════ */}
      {histTest && (
        <div className={styles.overlay} onClick={() => setHistTest(null)}>
          <div className={`${styles.modal} ${styles.modalLg}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}>
                <FiBarChart2 className={styles.modalIcon} />
                <h2>История: {histTest.title}</h2>
              </div>
              <button className={styles.closeBtn} onClick={() => setHistTest(null)}><FiX /></button>
            </div>
            <div className={styles.modalBody}>
              {history.length === 0 ? (
                <div className={styles.empty} style={{padding:"40px 0"}}>
                  <div className={styles.emptyIcon}><FiBarChart2 /></div>
                  <h3>Нет попыток</h3>
                  <p>Никто ещё не проходил этот тест</p>
                </div>
              ) : (
                <div className={styles.histTableWrap}>
                  <table className={styles.histTable}>
                    <thead>
                      <tr><th>Студент</th><th>Дата</th><th>Результат</th><th>Баллы</th><th>Статус</th><th></th></tr>
                    </thead>
                    <tbody>
                      {history.map(a => (
                        <tr key={a.id}>
                          <td className={styles.histName}>{a.full_name}</td>
                          <td>{new Date(a.started_at).toLocaleString("ru-RU")}</td>
                          <td><strong>{a.score}%</strong></td>
                          <td>{a.points_earned}</td>
                          <td>
                            <span className={`${styles.statusBadge} ${styles["status-" + a.status]}`}>
                              {a.status === "completed" ? <><FiCheck /> Завершён</> : a.status === "in_progress" ? <><FiClock /> В процессе</> : <><FiX /> Истёк</>}
                            </span>
                          </td>
                          <td>
                            <button className={`${styles.iconBtn} ${styles.iconBtnReassign}`} onClick={() => handleReassign(a.user_id)} title="Переназначить">
                              <FiRefreshCw />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className={styles.formActions} style={{marginTop:16}}>
                <button className={styles.btnSec} onClick={() => setHistTest(null)}>Закрыть</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirm && <ConfirmModal msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      {showBulk && <BulkTestEditor onImport={handleBulkImport} onClose={() => setShowBulk(false)} />}
    </div>
  );
}
