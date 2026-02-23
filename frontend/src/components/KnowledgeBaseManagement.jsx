import { useState, useEffect, useMemo, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { TextAlign } from "@tiptap/extension-text-align";
import { Underline } from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import {
  FiBook, FiCode, FiGlobe, FiDatabase, FiTool,
  FiZap, FiTrendingUp, FiGrid, FiLayers, FiPackage,
  FiCpu, FiShield, FiSmartphone, FiSettings,
  FiFileText, FiEdit2, FiClipboard, FiStar, FiMapPin,
  FiType, FiMonitor, FiBox, FiClock, FiSearch,
  FiFolder, FiEye, FiCheckCircle, FiTrash2, FiPlus,
  FiX, FiAlertCircle, FiCheck,
} from "react-icons/fi";
import {
  FaBold, FaItalic, FaUnderline, FaStrikethrough,
  FaListUl, FaListOl, FaQuoteRight, FaCode,
  FaAlignLeft, FaAlignCenter, FaAlignRight,
  FaLink, FaImage, FaTable, FaUndo, FaRedo,
  FaPlusCircle, FaMinusCircle,
} from "react-icons/fa";
import { LuBookOpenText } from "react-icons/lu";
import api from "../utils/api";
import styles from "./KnowledgeBaseManagement.module.css";
import "./ArticleModal.css";

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

/* ─── TipTap Toolbar ─── */
const EditorToolbar = ({ editor }) => {
  if (!editor) return null;
  const addImage = () => { const u = window.prompt("URL изображения:"); if (u) editor.chain().focus().setImage({ src: u }).run(); };
  const setLink  = () => { const u = window.prompt("URL ссылки:");       if (u) editor.chain().focus().setLink({ href: u }).run(); else editor.chain().focus().unsetLink().run(); };
  return (
    <div className={styles["tiptap-toolbar"]}>
      <div className={styles["toolbar-group"]}>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive("bold") ? styles.active : ""} title="Жирный"><FaBold /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive("italic") ? styles.active : ""} title="Курсив"><FaItalic /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive("underline") ? styles.active : ""} title="Подчёркнутый"><FaUnderline /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive("strike") ? styles.active : ""} title="Зачёркнутый"><FaStrikethrough /></button>
      </div>
      <div className={styles["toolbar-group"]}>
        <select onChange={e => { const l=parseInt(e.target.value); l===0?editor.chain().focus().setParagraph().run():editor.chain().focus().toggleHeading({level:l}).run(); }}
          value={editor.isActive("heading",{level:1})?1:editor.isActive("heading",{level:2})?2:editor.isActive("heading",{level:3})?3:0}
          className={styles["toolbar-select"]}>
          <option value={0}>Обычный</option>
          <option value={1}>Заголовок 1</option>
          <option value={2}>Заголовок 2</option>
          <option value={3}>Заголовок 3</option>
        </select>
      </div>
      <div className={styles["toolbar-group"]}>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive("bulletList") ? styles.active : ""} title="Список"><FaListUl /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive("orderedList") ? styles.active : ""} title="Нумер. список"><FaListOl /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive("blockquote") ? styles.active : ""} title="Цитата"><FaQuoteRight /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={editor.isActive("codeBlock") ? styles.active : ""} title="Код"><FaCode /></button>
      </div>
      <div className={styles["toolbar-group"]}>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()} className={editor.isActive({textAlign:"left"}) ? styles.active : ""} title="Влево"><FaAlignLeft /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()} className={editor.isActive({textAlign:"center"}) ? styles.active : ""} title="По центру"><FaAlignCenter /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()} className={editor.isActive({textAlign:"right"}) ? styles.active : ""} title="Вправо"><FaAlignRight /></button>
      </div>
      <div className={styles["toolbar-group"]}>
        <button type="button" onClick={setLink} title="Ссылка"><FaLink /></button>
        <button type="button" onClick={addImage} title="Изображение"><FaImage /></button>
      </div>
      <div className={styles["toolbar-group"]}>
        <button type="button" onClick={() => editor.chain().focus().insertTable({rows:3,cols:3,withHeaderRow:true}).run()} title="Таблица"><FaTable /></button>
        {editor.isActive("table") && (
          <>
            <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} title="+ столбец"><FaPlusCircle style={{color:"#3b82f6"}}/></button>
            <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} title="- столбец"><FaMinusCircle style={{color:"#ef4444"}}/></button>
            <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className={styles["btn-add-row"]}>+ Строка</button>
            <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} className={styles["btn-del-row"]}>− Строка</button>
            <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} className={styles["btn-del-table"]}><FiTrash2 /> Таблица</button>
          </>
        )}
      </div>
      <div className={styles["toolbar-group"]}>
        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Отменить"><FaUndo /></button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Повторить"><FaRedo /></button>
      </div>
    </div>
  );
};

/* ─── TipTap Editor ─── */
const TipTapEditor = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit, Underline, TextStyle, Color, Highlight,
      Link.configure({ openOnClick: false }),
      Image,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
    ],
    content: content || "",
    onUpdate: ({ editor }) => { onChange(editor.getHTML()); },
  });
  useEffect(() => {
    if (editor && content !== editor.getHTML()) editor.commands.setContent(content || "");
  }, [content, editor]);
  return (
    <div className={styles["tiptap-editor"]}>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} className={styles["tiptap-content"]} />
    </div>
  );
};

/* ─── icons ─── */
const ICON_MAP = {
  FiBook:<FiBook/>, FiCode:<FiCode/>, FiGlobe:<FiGlobe/>, FiDatabase:<FiDatabase/>, FiTool:<FiTool/>,
  FiZap:<FiZap/>, FiTrendingUp:<FiTrendingUp/>, FiGrid:<FiGrid/>, FiLayers:<FiLayers/>, FiPackage:<FiPackage/>,
  FiCpu:<FiCpu/>, FiShield:<FiShield/>, FiSmartphone:<FiSmartphone/>, FiMonitor:<FiMonitor/>, FiSettings:<FiSettings/>,
  FiFileText:<FiFileText/>, FiEdit2:<FiEdit2/>, FiClipboard:<FiClipboard/>, FiStar:<FiStar/>, FiMapPin:<FiMapPin/>,
  FiType:<FiType/>, FiBox:<FiBox/>, FiClock:<FiClock/>, FiSearch:<FiSearch/>,
};
const renderIcon = n => ICON_MAP[n] || <FiBook />;

const CAT_ICONS  = ["FiBook","FiCode","FiGlobe","FiDatabase","FiTool","FiZap","FiTrendingUp","FiGrid","FiLayers","FiPackage","FiCpu","FiShield","FiSmartphone","FiMonitor","FiSettings"];
const SUB_ICONS  = ["FiFileText","FiEdit2","FiClipboard","FiStar","FiMapPin","FiType","FiZap","FiBox","FiClock","FiGrid","FiTool","FiSettings","FiLayers","FiCpu","FiSearch"];

const emptyCat  = () => ({ name:"", icon:"FiBook",     description:"" });
const emptySub  = () => ({ name:"", category_id:"", icon:"FiFileText", description:"", order_index:0 });
const emptyArt  = () => ({ title:"", category_id:"", subcategory_id:"", description:"", content:"", published:true });

/* ════════════════ MAIN ════════════════ */
export default function KnowledgeBaseManagement() {
  const [categories,    setCategories]    = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [articles,      setArticles]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState("categories");
  const [search,        setSearch]        = useState("");
  const [toast,         setToast]         = useState(null);
  const [confirm,       setConfirm]       = useState(null);

  /* category modal */
  const [catModal, setCatModal] = useState(false);
  const [editCat,  setEditCat]  = useState(null);
  const [catForm,  setCatForm]  = useState(emptyCat());
  const [catErr,   setCatErr]   = useState("");
  const [catSav,   setCatSav]   = useState(false);

  /* subcategory modal */
  const [subModal, setSubModal] = useState(false);
  const [editSub,  setEditSub]  = useState(null);
  const [subForm,  setSubForm]  = useState(emptySub());
  const [subErr,   setSubErr]   = useState("");
  const [subSav,   setSubSav]   = useState(false);

  /* article modal */
  const [artModal, setArtModal] = useState(false);
  const [editArt,  setEditArt]  = useState(null);
  const [artForm,  setArtForm]  = useState(emptyArt());
  const [artErr,   setArtErr]   = useState("");
  const [artSav,   setArtSav]   = useState(false);

  const notify = (type, msg) => setToast({ type, msg });

  /* ── load ── */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [catRes, subRes, artRes] = await Promise.all([
        api.get("/knowledge-base/categories"),
        api.get("/knowledge-base/subcategories"),
        api.get("/knowledge-base/articles"),
      ]);
      setCategories(catRes.data || []);
      setSubcategories(subRes.data || []);
      setArticles(artRes.data || []);
    } catch { notify("error", "Ошибка загрузки данных"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  /* ── stats ── */
  const stats = useMemo(() => ({
    cats:       categories.length,
    subs:       subcategories.length,
    arts:       articles.length,
    published:  articles.filter(a => a.published).length,
  }), [categories, subcategories, articles]);

  /* ── filtered ── */
  const filteredCats = useMemo(() => { const q = search.toLowerCase(); return categories.filter(c => !q || c.name.toLowerCase().includes(q)); }, [categories, search]);
  const filteredSubs = useMemo(() => { const q = search.toLowerCase(); return subcategories.filter(s => !q || s.name.toLowerCase().includes(q) || (s.category_name||"").toLowerCase().includes(q)); }, [subcategories, search]);
  const filteredArts = useMemo(() => { const q = search.toLowerCase(); return articles.filter(a => !q || a.title.toLowerCase().includes(q) || (a.category_name||"").toLowerCase().includes(q)); }, [articles, search]);

  /* ── deleteHelper ── */
  const askDelete = (msg, fn) => setConfirm({ msg, onConfirm: async () => { setConfirm(null); try { await fn(); load(); } catch { notify("error","Ошибка удаления"); } } });

  /* ── CATEGORY handlers ── */
  const openCatCreate = () => { setEditCat(null); setCatForm(emptyCat()); setCatErr(""); setCatModal(true); };
  const openCatEdit   = c => { setEditCat(c); setCatForm({ name:c.name, icon:c.icon, description:c.description||"" }); setCatErr(""); setCatModal(true); };
  const handleCatSave = async e => {
    e.preventDefault(); setCatErr("");
    if (!catForm.name.trim()) { setCatErr("Введите название"); return; }
    setCatSav(true);
    try {
      if (editCat) { await api.put(`/knowledge-base/categories/${editCat.id}`, catForm); notify("success","Категория обновлена"); }
      else         { await api.post("/knowledge-base/categories", catForm);             notify("success","Категория создана");  }
      setCatModal(false); load();
    } catch (err) { setCatErr(err.response?.data?.error || "Ошибка сохранения"); }
    finally { setCatSav(false); }
  };

  /* ── SUBCATEGORY handlers ── */
  const openSubCreate = () => { setEditSub(null); setSubForm(emptySub()); setSubErr(""); setSubModal(true); };
  const openSubEdit   = s => { setEditSub(s); setSubForm({ name:s.name, category_id:s.category_id, icon:s.icon, description:s.description||"", order_index:s.order_index||0 }); setSubErr(""); setSubModal(true); };
  const handleSubSave = async e => {
    e.preventDefault(); setSubErr("");
    if (!subForm.name.trim()) { setSubErr("Введите название"); return; }
    if (!subForm.category_id) { setSubErr("Выберите категорию"); return; }
    setSubSav(true);
    try {
      if (editSub) { await api.put(`/knowledge-base/subcategories/${editSub.id}`, subForm); notify("success","Подкатегория обновлена"); }
      else         { await api.post("/knowledge-base/subcategories", subForm);               notify("success","Подкатегория создана");  }
      setSubModal(false); load();
    } catch (err) { setSubErr(err.response?.data?.error || "Ошибка сохранения"); }
    finally { setSubSav(false); }
  };

  /* ── ARTICLE handlers ── */
  const openArtCreate = () => { setEditArt(null); setArtForm(emptyArt()); setArtErr(""); setArtModal(true); };
  const openArtEdit   = a => { setEditArt(a); setArtForm({ title:a.title, category_id:a.category_id, subcategory_id:a.subcategory_id||"", description:a.description, content:a.content||"", published:a.published }); setArtErr(""); setArtModal(true); };
  const handleArtSave = async e => {
    e.preventDefault(); setArtErr("");
    if (!artForm.title.trim())    { setArtErr("Введите название"); return; }
    if (!artForm.category_id)     { setArtErr("Выберите категорию"); return; }
    setArtSav(true);
    try {
      if (editArt) { await api.put(`/knowledge-base/articles/${editArt.id}`, artForm); notify("success","Статья обновлена"); }
      else         { await api.post("/knowledge-base/articles", artForm);              notify("success","Статья создана");  }
      setArtModal(false); load();
    } catch (err) { setArtErr(err.response?.data?.error || "Ошибка сохранения"); }
    finally { setArtSav(false); }
  };

  /* ─── SKELETON ─── */
  if (loading) return (
    <div className={styles.page}>
      <div className={styles.stats}>{[1,2,3,4].map(i=><div key={i} className={styles.skStat}/>)}</div>
      <div className={styles.grid}>{[1,2,3,4,5,6].map(i=><div key={i} className={styles.skCard}><div className={styles.skHead}/><div className={styles.skBody}><div className={styles.skLine}/><div className={styles.skLine} style={{width:"60%"}}/></div></div>)}</div>
    </div>
  );

  const tabCount = { categories: filteredCats.length, subcategories: filteredSubs.length, articles: filteredArts.length };

  return (
    <div className={styles.page}>
      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><LuBookOpenText /></div>
          <div>
            <h1 className={styles.headerTitle}>База знаний</h1>
            <p className={styles.headerSub}>Управление категориями, подкатегориями и статьями</p>
          </div>
        </div>
        <button className={styles.btnPrimary} onClick={activeTab==="categories"?openCatCreate:activeTab==="subcategories"?openSubCreate:openArtCreate}>
          <FiPlus /><span>{activeTab==="categories"?"Создать категорию":activeTab==="subcategories"?"Создать подкатегорию":"Создать статью"}</span>
        </button>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}><div className={`${styles.statIcon} ${styles.statIconCat}`}><FiFolder /></div><div><div className={styles.statVal}>{stats.cats}</div><div className={styles.statLabel}>Категорий</div></div></div>
        <div className={styles.stat}><div className={`${styles.statIcon} ${styles.statIconSub}`}><FiLayers /></div><div><div className={styles.statVal}>{stats.subs}</div><div className={styles.statLabel}>Подкатегорий</div></div></div>
        <div className={styles.stat}><div className={`${styles.statIcon} ${styles.statIconArt}`}><FiFileText /></div><div><div className={styles.statVal}>{stats.arts}</div><div className={styles.statLabel}>Статей</div></div></div>
        <div className={styles.stat}><div className={`${styles.statIcon} ${styles.statIconPub}`}><FiCheckCircle /></div><div><div className={styles.statVal}>{stats.published}</div><div className={styles.statLabel}>Опубликовано</div></div></div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.tabsWrap}>
          {[["categories","Категории",<FiFolder/>],["subcategories","Подкатегории",<FiLayers/>],["articles","Статьи",<FiFileText/>]].map(([key,label,icon])=>(
            <button key={key} className={`${styles.tab} ${activeTab===key?styles.tabActive:""}`} onClick={()=>setActiveTab(key)}>
              {icon}<span>{label}</span><span className={styles.tabBadge}>{key==="categories"?stats.cats:key==="subcategories"?stats.subs:stats.arts}</span>
            </button>
          ))}
        </div>
        <div className={styles.searchWrap}>
          <FiSearch className={styles.searchIcon} />
          <input className={styles.searchInput} placeholder="Поиск..." value={search} onChange={e=>setSearch(e.target.value)} />
          {search && <button className={styles.searchClear} onClick={()=>setSearch("")}><FiX /></button>}
        </div>
      </div>

      {/* ── CATEGORIES TAB ── */}
      {activeTab === "categories" && (
        filteredCats.length === 0 ? (
          <div className={styles.empty}><div className={styles.emptyIcon}><FiFolder /></div><h3>{categories.length===0?"Нет категорий":"Ничего не найдено"}</h3><p>{categories.length===0?"Создайте первую категорию":"Попробуйте изменить поиск"}</p></div>
        ) : (
          <div className={styles.grid}>
            {filteredCats.map(c => (
              <div key={c.id} className={styles.catCard}>
                <div className={styles.catCardIcon}>{renderIcon(c.icon)}</div>
                <div className={styles.catCardBody}>
                  <h3 className={styles.catCardTitle}>{c.name}</h3>
                  <p className={styles.catCardDesc}>{c.description || "Нет описания"}</p>
                  <div className={styles.catCardMeta}><FiFileText /><span>{c.articles_count} статей</span></div>
                </div>
                <div className={styles.cardActions}>
                  <button className={`${styles.iconBtn} ${styles.iconBtnEdit}`} onClick={()=>openCatEdit(c)} title="Редактировать"><FiEdit2 /></button>
                  <button className={`${styles.iconBtn} ${styles.iconBtnDel}`} onClick={()=>askDelete(`Удалить категорию «${c.name}»? Все статьи в ней тоже будут удалены.`, ()=>api.delete(`/knowledge-base/categories/${c.id}`))} title="Удалить"><FiTrash2 /></button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── SUBCATEGORIES TAB ── */}
      {activeTab === "subcategories" && (
        filteredSubs.length === 0 ? (
          <div className={styles.empty}><div className={styles.emptyIcon}><FiLayers /></div><h3>{subcategories.length===0?"Нет подкатегорий":"Ничего не найдено"}</h3><p>{subcategories.length===0?"Создайте подкатегории для организации статей":"Попробуйте изменить поиск"}</p></div>
        ) : (
          <div className={styles.subList}>
            {filteredSubs.map(s => (
              <div key={s.id} className={styles.subRow}>
                <div className={styles.subRowIcon}>{renderIcon(s.icon)}</div>
                <div className={styles.subRowBody}>
                  <div className={styles.subRowTitle}>{s.name}</div>
                  <div className={styles.subRowMeta}>
                    <span className={styles.parentBadge}><FiFolder />{s.category_name}</span>
                    {s.description && <span className={styles.subRowDesc}>{s.description}</span>}
                  </div>
                </div>
                <div className={styles.subRowRight}>
                  <span className={styles.artCount}><FiFileText />{s.articles_count} ст.</span>
                  <button className={`${styles.iconBtn} ${styles.iconBtnEdit}`} onClick={()=>openSubEdit(s)} title="Редактировать"><FiEdit2 /></button>
                  <button className={`${styles.iconBtn} ${styles.iconBtnDel}`} onClick={()=>askDelete(`Удалить подкатегорию «${s.name}»?`, ()=>api.delete(`/knowledge-base/subcategories/${s.id}`))} title="Удалить"><FiTrash2 /></button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── ARTICLES TAB ── */}
      {activeTab === "articles" && (
        filteredArts.length === 0 ? (
          <div className={styles.empty}><div className={styles.emptyIcon}><FiFileText /></div><h3>{articles.length===0?"Нет статей":"Ничего не найдено"}</h3><p>{articles.length===0?"Создайте первую статью":"Попробуйте изменить поиск"}</p></div>
        ) : (
          <div className={styles.artList}>
            {filteredArts.map(a => (
              <div key={a.id} className={styles.artRow}>
                <div className={styles.artRowMain}>
                  <div className={styles.artRowTitle}>{a.title}</div>
                  {a.description && <div className={styles.artRowDesc}>{a.description}</div>}
                  <div className={styles.artRowMeta}>
                    <span className={styles.parentBadge}><FiFolder />{a.category_name}</span>
                    {a.subcategory_name && <span className={styles.subBadge}><FiLayers />{a.subcategory_name}</span>}
                    <span><FiEye />{a.views}</span>
                    <span><FiClock />{new Date(a.created_at).toLocaleDateString("ru-RU")}</span>
                  </div>
                </div>
                <div className={styles.artRowRight}>
                  <span className={a.published ? styles.badgePub : styles.badgeDraft}>
                    {a.published ? <><FiCheckCircle /><span>Опубликовано</span></> : <><FiEdit2 /><span>Черновик</span></>}
                  </span>
                  <button className={`${styles.iconBtn} ${styles.iconBtnEdit}`} onClick={()=>openArtEdit(a)} title="Редактировать"><FiEdit2 /></button>
                  <button className={`${styles.iconBtn} ${styles.iconBtnDel}`} onClick={()=>askDelete(`Удалить статью «${a.title}»?`, ()=>api.delete(`/knowledge-base/articles/${a.id}`))} title="Удалить"><FiTrash2 /></button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ════ CATEGORY MODAL ════ */}
      {catModal && (
        <div className={styles.overlay} onClick={()=>setCatModal(false)}>
          <div className={`${styles.modal} ${styles.modalSm}`} onClick={e=>e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}><FiFolder className={styles.modalIcon}/><h2>{editCat?"Редактировать категорию":"Новая категория"}</h2></div>
              <button className={styles.closeBtn} onClick={()=>setCatModal(false)}><FiX /></button>
            </div>
            <form className={styles.modalForm} onSubmit={handleCatSave}>
              {catErr && <div className={styles.inlineErr}><FiAlertCircle /><span>{catErr}</span></div>}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Название *</label>
                <input className={styles.formInput} value={catForm.name} onChange={e=>setCatForm(f=>({...f,name:e.target.value}))} placeholder="Например: Web-разработка" required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Иконка</label>
                <div className={styles.iconGrid}>
                  {CAT_ICONS.map(n=>(
                    <button key={n} type="button" className={`${styles.iconOpt} ${catForm.icon===n?styles.iconOptSel:""}`} onClick={()=>setCatForm(f=>({...f,icon:n}))}>{renderIcon(n)}</button>
                  ))}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Описание</label>
                <textarea className={styles.formInput} value={catForm.description} onChange={e=>setCatForm(f=>({...f,description:e.target.value}))} rows="3" placeholder="Краткое описание категории" />
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.btnSec} onClick={()=>setCatModal(false)}>Отмена</button>
                <button type="submit" className={styles.btnPrimary} disabled={catSav}><FiCheck /><span>{catSav?"Сохранение...":editCat?"Сохранить":"Создать"}</span></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════ SUBCATEGORY MODAL ════ */}
      {subModal && (
        <div className={styles.overlay} onClick={()=>setSubModal(false)}>
          <div className={`${styles.modal} ${styles.modalSm}`} onClick={e=>e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}><FiLayers className={styles.modalIcon}/><h2>{editSub?"Редактировать подкатегорию":"Новая подкатегория"}</h2></div>
              <button className={styles.closeBtn} onClick={()=>setSubModal(false)}><FiX /></button>
            </div>
            <form className={styles.modalForm} onSubmit={handleSubSave}>
              {subErr && <div className={styles.inlineErr}><FiAlertCircle /><span>{subErr}</span></div>}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Название *</label>
                <input className={styles.formInput} value={subForm.name} onChange={e=>setSubForm(f=>({...f,name:e.target.value}))} placeholder="Например: Синтаксис и основы" required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Категория *</label>
                <select className={styles.formInput} value={subForm.category_id} onChange={e=>setSubForm(f=>({...f,category_id:e.target.value}))} required>
                  <option value="">Выберите категорию</option>
                  {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Иконка</label>
                <div className={styles.iconGrid}>
                  {SUB_ICONS.map(n=>(
                    <button key={n} type="button" className={`${styles.iconOpt} ${subForm.icon===n?styles.iconOptSel:""}`} onClick={()=>setSubForm(f=>({...f,icon:n}))}>{renderIcon(n)}</button>
                  ))}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Описание</label>
                <textarea className={styles.formInput} value={subForm.description} onChange={e=>setSubForm(f=>({...f,description:e.target.value}))} rows="3" placeholder="Краткое описание подкатегории" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Порядок</label>
                <input type="number" className={styles.formInput} value={subForm.order_index} onChange={e=>setSubForm(f=>({...f,order_index:parseInt(e.target.value)||0}))} min="0" />
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.btnSec} onClick={()=>setSubModal(false)}>Отмена</button>
                <button type="submit" className={styles.btnPrimary} disabled={subSav}><FiCheck /><span>{subSav?"Сохранение...":editSub?"Сохранить":"Создать"}</span></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════ ARTICLE MODAL ════ */}
      {artModal && (
        <div className={styles.overlay} onClick={()=>setArtModal(false)}>
          <div className={`${styles.modal} ${styles.modalXl}`} onClick={e=>e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}><FiFileText className={styles.modalIcon}/><h2>{editArt?"Редактировать статью":"Новая статья"}</h2></div>
              <button className={styles.closeBtn} onClick={()=>setArtModal(false)}><FiX /></button>
            </div>
            <form className={styles.modalForm} onSubmit={handleArtSave}>
              {artErr && <div className={styles.inlineErr}><FiAlertCircle /><span>{artErr}</span></div>}
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Название статьи *</label>
                  <input className={styles.formInput} value={artForm.title} onChange={e=>setArtForm(f=>({...f,title:e.target.value}))} placeholder="Введение в JavaScript" required />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Категория *</label>
                  <select className={styles.formInput} value={artForm.category_id} onChange={e=>setArtForm(f=>({...f,category_id:e.target.value,subcategory_id:""}))} required>
                    <option value="">Выберите категорию</option>
                    {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Подкатегория</label>
                  <select className={styles.formInput} value={artForm.subcategory_id} onChange={e=>setArtForm(f=>({...f,subcategory_id:e.target.value}))} disabled={!artForm.category_id}>
                    <option value="">Без подкатегории</option>
                    {subcategories.filter(s=>String(s.category_id)===String(artForm.category_id)).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Краткое описание</label>
                  <input className={styles.formInput} value={artForm.description} onChange={e=>setArtForm(f=>({...f,description:e.target.value}))} placeholder="Краткое описание для превью" />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Содержание статьи</label>
                <TipTapEditor content={artForm.content} onChange={v=>setArtForm(f=>({...f,content:v}))} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={artForm.published} onChange={e=>setArtForm(f=>({...f,published:e.target.checked}))} />
                  <span>Опубликовать статью</span>
                </label>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.btnSec} onClick={()=>setArtModal(false)}>Отмена</button>
                <button type="submit" className={styles.btnPrimary} disabled={artSav}><FiCheck /><span>{artSav?"Сохранение...":editArt?"Сохранить":"Создать"}</span></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirm && <ConfirmModal msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)} />}
    </div>
  );
}
