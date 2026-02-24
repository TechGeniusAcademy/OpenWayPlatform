import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import styles from './AdminQuizBattle.module.css';
import {
  FaPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaSave,
  FaSync, FaFilter, FaSearch, FaUsers, FaTrophy, FaEye,
} from 'react-icons/fa';
import { MdOutlineQuiz, MdCategory } from 'react-icons/md';
import { FiZap, FiClock, FiHelpCircle, FiTag } from 'react-icons/fi';

// ─── constants ───────────────────────────────────────────────
const DIFFICULTIES = [
  { id: 'easy',   label: 'Лёгкий',   color: '#4ade80' },
  { id: 'medium', label: 'Средний',  color: '#facc15' },
  { id: 'hard',   label: 'Сложный',  color: '#f87171' },
];
const TABS = [
  { id: 'categories', label: 'Категории',  Icon: MdCategory },
  { id: 'questions',  label: 'Вопросы',    Icon: FiHelpCircle },
  { id: 'battles',    label: 'Матчи',      Icon: FiZap },
];
const EMPTY_QUESTION = {
  category_id: '', question: '',
  option_a: '', option_b: '', option_c: '', option_d: '',
  correct_option: 'a', difficulty: 'medium',
};
const EMPTY_CATEGORY = { name: '', description: '' };

// ─── helpers ─────────────────────────────────────────────────
const statusColor = { waiting: '#facc15', in_progress: '#4ade80', finished: '#64748b' };
const statusLabel = { waiting: 'Ожидание', in_progress: 'Идёт игра', finished: 'Завершён' };

export default function AdminQuizBattle() {
  const [tab, setTab] = useState('categories');

  // ── categories ──────────────────────────────────────────────
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catForm, setCatForm] = useState(EMPTY_CATEGORY);
  const [catEditing, setCatEditing] = useState(null); // id being edited
  const [catShowForm, setCatShowForm] = useState(false);

  // ── questions ───────────────────────────────────────────────
  const [questions, setQuestions] = useState([]);
  const [qLoading, setQLoading] = useState(false);
  const [qForm, setQForm] = useState(EMPTY_QUESTION);
  const [qEditing, setQEditing] = useState(null);
  const [qShowForm, setQShowForm] = useState(false);
  const [qFilter, setQFilter] = useState({ category: '', difficulty: '', search: '' });

  // ── battles ─────────────────────────────────────────────────
  const [battles, setBattles] = useState([]);
  const [bLoading, setBLoading] = useState(false);

  // ── feedback ────────────────────────────────────────────────
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ════════════════════════════════════════════════════════════
  //  LOAD DATA
  // ════════════════════════════════════════════════════════════
  const loadCategories = useCallback(async () => {
    setCatLoading(true);
    try {
      const { data } = await api.get('/quiz-battle/categories');
      setCategories(Array.isArray(data) ? data : []);
    } catch { showToast('Ошибка загрузки категорий', 'error'); }
    finally { setCatLoading(false); }
  }, [showToast]);

  const loadQuestions = useCallback(async () => {
    setQLoading(true);
    try {
      const { data } = await api.get('/quiz-battle/questions');
      setQuestions(Array.isArray(data) ? data : []);
    } catch { showToast('Ошибка загрузки вопросов', 'error'); }
    finally { setQLoading(false); }
  }, [showToast]);

  const loadBattles = useCallback(async () => {
    setBLoading(true);
    try {
      const { data } = await api.get('/quiz-battle/all-battles');
      setBattles(Array.isArray(data) ? data : []);
    } catch { showToast('Ошибка загрузки матчей', 'error'); }
    finally { setBLoading(false); }
  }, [showToast]);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { if (tab === 'questions') loadQuestions(); }, [tab, loadQuestions]);
  useEffect(() => { if (tab === 'battles') loadBattles(); }, [tab, loadBattles]);

  // ════════════════════════════════════════════════════════════
  //  CATEGORY CRUD
  // ════════════════════════════════════════════════════════════
  const openCatCreate = () => { setCatForm(EMPTY_CATEGORY); setCatEditing(null); setCatShowForm(true); };
  const openCatEdit = (c) => { setCatForm({ name: c.name, description: c.description || '' }); setCatEditing(c.id); setCatShowForm(true); };
  const closeCatForm = () => { setCatShowForm(false); setCatEditing(null); };

  const saveCategory = async () => {
    if (!catForm.name.trim()) return showToast('Введите название категории', 'error');
    try {
      if (catEditing) {
        await api.put(`/quiz-battle/categories/${catEditing}`, catForm);
        showToast('Категория обновлена');
      } else {
        await api.post('/quiz-battle/categories', catForm);
        showToast('Категория создана');
      }
      closeCatForm();
      loadCategories();
    } catch { showToast('Ошибка сохранения', 'error'); }
  };

  const deleteCategory = async (id) => {
    if (!confirm('Удалить категорию? Все вопросы этой категории останутся без категории.')) return;
    try {
      await api.delete(`/quiz-battle/categories/${id}`);
      showToast('Категория удалена');
      loadCategories();
    } catch { showToast('Ошибка удаления', 'error'); }
  };

  // ════════════════════════════════════════════════════════════
  //  QUESTION CRUD
  // ════════════════════════════════════════════════════════════
  const openQCreate = () => { setQForm(EMPTY_QUESTION); setQEditing(null); setQShowForm(true); };
  const openQEdit = (q) => {
    setQForm({
      category_id: q.category_id || '',
      question: q.question,
      option_a: q.option_a, option_b: q.option_b,
      option_c: q.option_c, option_d: q.option_d,
      correct_option: q.correct_option,
      difficulty: q.difficulty || 'medium',
    });
    setQEditing(q.id);
    setQShowForm(true);
  };
  const closeQForm = () => { setQShowForm(false); setQEditing(null); };

  const saveQuestion = async () => {
    const { question, option_a, option_b, option_c, option_d } = qForm;
    if (!question.trim() || !option_a.trim() || !option_b.trim() || !option_c.trim() || !option_d.trim()) {
      return showToast('Заполните вопрос и все 4 варианта ответа', 'error');
    }
    try {
      const payload = { ...qForm, category_id: qForm.category_id || null };
      if (qEditing) {
        await api.put(`/quiz-battle/questions/${qEditing}`, payload);
        showToast('Вопрос обновлён');
      } else {
        await api.post('/quiz-battle/questions', payload);
        showToast('Вопрос добавлен');
      }
      closeQForm();
      loadQuestions();
    } catch { showToast('Ошибка сохранения', 'error'); }
  };

  const deleteQuestion = async (id) => {
    if (!confirm('Удалить вопрос?')) return;
    try {
      await api.delete(`/quiz-battle/questions/${id}`);
      showToast('Вопрос удалён');
      loadQuestions();
    } catch { showToast('Ошибка удаления', 'error'); }
  };

  // ─── filtered questions ──────────────────────────────────────
  const filteredQ = questions.filter(q => {
    if (qFilter.category && String(q.category_id) !== String(qFilter.category)) return false;
    if (qFilter.difficulty && q.difficulty !== qFilter.difficulty) return false;
    if (qFilter.search && !q.question.toLowerCase().includes(qFilter.search.toLowerCase())) return false;
    return true;
  });

  // ════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div className={styles.wrap}>
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>
          {toast.type === 'success' ? <FaCheck /> : <FaTimes />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <MdOutlineQuiz className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>Битва Знаний — Управление</h1>
            <p className={styles.subtitle}>Категории, вопросы и мониторинг матчей</p>
          </div>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <MdCategory className={styles.statIcon} />
            <span className={styles.statVal}>{categories.length}</span>
            <span className={styles.statLbl}>категорий</span>
          </div>
          <div className={styles.stat}>
            <FiHelpCircle className={styles.statIcon} />
            <span className={styles.statVal}>{questions.length}</span>
            <span className={styles.statLbl}>вопросов</span>
          </div>
          <div className={styles.stat}>
            <FiZap className={styles.statIcon} />
            <span className={styles.statVal}>{battles.filter(b => b.status === 'in_progress').length}</span>
            <span className={styles.statLbl}>активных</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon className={styles.tabIcon} />
            {label}
          </button>
        ))}
      </div>

      {/* ── CATEGORIES TAB ─────────────────────────────────── */}
      {tab === 'categories' && (
        <div className={styles.panel}>
          <div className={styles.panelBar}>
            <h2 className={styles.panelTitle}>Категории вопросов</h2>
            <div className={styles.panelActions}>
              <button className={styles.btnRefresh} onClick={loadCategories} title="Обновить">
                <FaSync />
              </button>
              <button className={styles.btnAdd} onClick={openCatCreate}>
                <FaPlus /> Добавить категорию
              </button>
            </div>
          </div>

          {catLoading ? <div className={styles.loading}><FaSync className={styles.spin} /> Загрузка...</div> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Название</th>
                    <th>Описание</th>
                    <th>Вопросов</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr><td colSpan={5} className={styles.empty}>Нет категорий. Добавьте первую!</td></tr>
                  ) : categories.map(c => (
                    <tr key={c.id}>
                      <td className={styles.idCell}>{c.id}</td>
                      <td className={styles.nameCell}><FiTag className={styles.rowIcon} />{c.name}</td>
                      <td className={styles.descCell}>{c.description || '—'}</td>
                      <td>
                        <span className={styles.badge}>{c.question_count || 0}</span>
                      </td>
                      <td className={styles.actionCell}>
                        <button className={styles.btnEdit} onClick={() => openCatEdit(c)}><FaEdit /></button>
                        <button className={styles.btnDel} onClick={() => deleteCategory(c.id)}><FaTrash /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {catShowForm && (
            <div className={styles.overlay} onClick={closeCatForm}>
              <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h3>{catEditing ? 'Редактировать категорию' : 'Новая категория'}</h3>
                  <button className={styles.modalClose} onClick={closeCatForm}><FaTimes /></button>
                </div>
                <div className={styles.formGroup}>
                  <label>Название <span className={styles.req}>*</span></label>
                  <input
                    className={styles.input}
                    value={catForm.name}
                    onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Например: История, Математика..."
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Описание</label>
                  <textarea
                    className={styles.textarea}
                    value={catForm.description}
                    onChange={e => setCatForm(p => ({ ...p, description: e.target.value }))}
                    rows={3}
                    placeholder="Краткое описание категории"
                  />
                </div>
                <div className={styles.modalFooter}>
                  <button className={styles.btnCancel} onClick={closeCatForm}><FaTimes /> Отмена</button>
                  <button className={styles.btnSave} onClick={saveCategory}><FaSave /> Сохранить</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── QUESTIONS TAB ──────────────────────────────────── */}
      {tab === 'questions' && (
        <div className={styles.panel}>
          <div className={styles.panelBar}>
            <h2 className={styles.panelTitle}>Вопросы <span className={styles.count}>({filteredQ.length}/{questions.length})</span></h2>
            <div className={styles.panelActions}>
              <button className={styles.btnRefresh} onClick={loadQuestions} title="Обновить"><FaSync /></button>
              <button className={styles.btnAdd} onClick={openQCreate}><FaPlus /> Добавить вопрос</button>
            </div>
          </div>

          {/* Filters */}
          <div className={styles.filters}>
            <div className={styles.searchWrap}>
              <FaSearch className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Поиск по тексту вопроса..."
                value={qFilter.search}
                onChange={e => setQFilter(p => ({ ...p, search: e.target.value }))}
              />
            </div>
            <select
              className={styles.select}
              value={qFilter.category}
              onChange={e => setQFilter(p => ({ ...p, category: e.target.value }))}
            >
              <option value="">Все категории</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              className={styles.select}
              value={qFilter.difficulty}
              onChange={e => setQFilter(p => ({ ...p, difficulty: e.target.value }))}
            >
              <option value="">Вся сложность</option>
              {DIFFICULTIES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
            {(qFilter.category || qFilter.difficulty || qFilter.search) && (
              <button
                className={styles.btnClear}
                onClick={() => setQFilter({ category: '', difficulty: '', search: '' })}
              >
                <FaTimes /> Сбросить
              </button>
            )}
          </div>

          {qLoading ? <div className={styles.loading}><FaSync className={styles.spin} /> Загрузка...</div> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Вопрос</th>
                    <th>Категория</th>
                    <th>Сложность</th>
                    <th>Правильный</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQ.length === 0 ? (
                    <tr><td colSpan={6} className={styles.empty}>Нет вопросов по фильтру</td></tr>
                  ) : filteredQ.map(q => {
                    const diff = DIFFICULTIES.find(d => d.id === q.difficulty) || DIFFICULTIES[1];
                    return (
                      <tr key={q.id}>
                        <td className={styles.idCell}>{q.id}</td>
                        <td className={styles.qCell}>
                          <span className={styles.qText}>{q.question}</span>
                          <div className={styles.qOptions}>
                            {['a','b','c','d'].map(o => (
                              <span key={o} className={`${styles.qOpt} ${q.correct_option === o ? styles.qOptCorrect : ''}`}>
                                {o.toUpperCase()}: {q[`option_${o}`]}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={styles.catTag}>{q.category_name || '—'}</span>
                        </td>
                        <td>
                          <span className={styles.diffTag} style={{ color: diff.color, borderColor: diff.color + '40', backgroundColor: diff.color + '15' }}>
                            {diff.label}
                          </span>
                        </td>
                        <td>
                          <span className={styles.correctTag}>{q.correct_option?.toUpperCase()}</span>
                        </td>
                        <td className={styles.actionCell}>
                          <button className={styles.btnEdit} onClick={() => openQEdit(q)}><FaEdit /></button>
                          <button className={styles.btnDel} onClick={() => deleteQuestion(q.id)}><FaTrash /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Question Form Modal */}
          {qShowForm && (
            <div className={styles.overlay} onClick={closeQForm}>
              <div className={`${styles.modal} ${styles.modalLarge}`} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h3>{qEditing ? 'Редактировать вопрос' : 'Новый вопрос'}</h3>
                  <button className={styles.modalClose} onClick={closeQForm}><FaTimes /></button>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup} style={{ flex: 2 }}>
                    <label>Категория</label>
                    <select className={styles.input} value={qForm.category_id} onChange={e => setQForm(p => ({ ...p, category_id: e.target.value }))}>
                      <option value="">— Без категории —</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label>Сложность</label>
                    <select className={styles.input} value={qForm.difficulty} onChange={e => setQForm(p => ({ ...p, difficulty: e.target.value }))}>
                      {DIFFICULTIES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Текст вопроса <span className={styles.req}>*</span></label>
                  <textarea
                    className={styles.textarea}
                    rows={3}
                    value={qForm.question}
                    onChange={e => setQForm(p => ({ ...p, question: e.target.value }))}
                    placeholder="Введите текст вопроса..."
                  />
                </div>

                <div className={styles.optionsGrid}>
                  {['a','b','c','d'].map(opt => (
                    <div key={opt} className={`${styles.optionBlock} ${qForm.correct_option === opt ? styles.optionBlockCorrect : ''}`}>
                      <div className={styles.optionHeader}>
                        <span className={`${styles.optionLetter} ${qForm.correct_option === opt ? styles.optionLetterCorrect : ''}`}>
                          {opt.toUpperCase()}
                        </span>
                        <label className={styles.radioLabel}>
                          <input
                            type="radio"
                            name="correct_option"
                            value={opt}
                            checked={qForm.correct_option === opt}
                            onChange={() => setQForm(p => ({ ...p, correct_option: opt }))}
                          />
                          <span>Правильный</span>
                        </label>
                      </div>
                      <input
                        className={styles.input}
                        value={qForm[`option_${opt}`]}
                        onChange={e => setQForm(p => ({ ...p, [`option_${opt}`]: e.target.value }))}
                        placeholder={`Вариант ${opt.toUpperCase()}...`}
                      />
                    </div>
                  ))}
                </div>

                <div className={styles.modalFooter}>
                  <button className={styles.btnCancel} onClick={closeQForm}><FaTimes /> Отмена</button>
                  <button className={styles.btnSave} onClick={saveQuestion}><FaSave /> Сохранить</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BATTLES TAB ────────────────────────────────────── */}
      {tab === 'battles' && (
        <div className={styles.panel}>
          <div className={styles.panelBar}>
            <h2 className={styles.panelTitle}>
              Матчи <span className={styles.count}>({battles.length})</span>
            </h2>
            <div className={styles.panelActions}>
              <button className={styles.btnRefresh} onClick={loadBattles}><FaSync /> Обновить</button>
            </div>
          </div>

          {bLoading ? <div className={styles.loading}><FaSync className={styles.spin} /> Загрузка...</div> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Код</th>
                    <th>Создатель</th>
                    <th>Категория</th>
                    <th>Игроков</th>
                    <th>Статус</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {battles.length === 0 ? (
                    <tr><td colSpan={7} className={styles.empty}>Нет сыгранных матчей</td></tr>
                  ) : battles.map(b => (
                    <tr key={b.id}>
                      <td className={styles.idCell}>{b.id}</td>
                      <td><code className={styles.code}>{b.room_code}</code></td>
                      <td>{b.creator_name || '—'}</td>
                      <td><span className={styles.catTag}>{b.category_name || 'Все'}</span></td>
                      <td>
                        <span className={styles.playersBadge}><FaUsers size={11} /> {b.player_count || 0}</span>
                      </td>
                      <td>
                        <span
                          className={styles.statusDot}
                          style={{ background: statusColor[b.status] || '#64748b' }}
                        />
                        <span className={styles.statusText}>{statusLabel[b.status] || b.status}</span>
                      </td>
                      <td className={styles.dateCell}>
                        {b.created_at ? new Date(b.created_at).toLocaleString('ru-RU', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
