import { useState, useEffect } from "react";
import {
  FaPlus, FaEdit, FaTrash, FaClone, FaDownload, FaFileAlt,
  FaCheck, FaTimes, FaClipboardList, FaGlobe, FaMobileAlt,
  FaDesktop, FaGamepad, FaEllipsisH, FaCalendarAlt, FaCoins,
  FaBullseye, FaUsers, FaCogs, FaCode, FaPalette, FaInfoCircle,
  FaChevronRight, FaSearch,
} from "react-icons/fa";
import { MdOutlineAssignment } from "react-icons/md";
import { AiOutlineSearch } from "react-icons/ai";
import api from "../../utils/api";
import styles from "./StudentTechnicalSpecs.module.css";

const PROJECT_TYPES = {
  web:     { label: "Веб-сайт",          icon: <FaGlobe />,    color: "#3b82f6" },
  mobile:  { label: "Мобильное прил.",    icon: <FaMobileAlt />, color: "#10b981" },
  desktop: { label: "Десктоп прил.",      icon: <FaDesktop />, color: "#8b5cf6" },
  game:    { label: "Игра",               icon: <FaGamepad />, color: "#f59e0b" },
  other:   { label: "Другое",             icon: <FaEllipsisH />, color: "#6b7280" },
};

const EMPTY_FORM = {
  title: "", project_type: "web", description: "", goals: "",
  target_audience: "", functional_requirements: "", technical_requirements: "",
  design_requirements: "", deadline: "", budget: "", additional_info: "",
};

const SECTIONS = [
  { key: "description",             label: "Описание проекта",           icon: <FaInfoCircle />,  rows: 4, placeholder: "Краткое описание проекта, его назначение и основная идея" },
  { key: "goals",                   label: "Цели и задачи",               icon: <FaBullseye />,   rows: 4, placeholder: "Что должен решать проект? Какие проблемы он решает?" },
  { key: "target_audience",         label: "Целевая аудитория",           icon: <FaUsers />,      rows: 3, placeholder: "Кто будет пользоваться проектом? Возраст, интересы, потребности" },
  { key: "functional_requirements", label: "Функциональные требования",   icon: <FaCogs />,       rows: 6, placeholder: "Какие функции должны быть реализованы? Например:\n- Регистрация и авторизация\n- Каталог с фильтрами" },
  { key: "technical_requirements",  label: "Технические требования",      icon: <FaCode />,       rows: 5, placeholder: "Технологии, платформы, производительность. Например:\n- React + Node.js\n- Адаптивный дизайн" },
  { key: "design_requirements",     label: "Требования к дизайну",        icon: <FaPalette />,    rows: 4, placeholder: "Стиль, цветовая гамма, примеры. Например:\n- Минималистичный стиль\n- Цвета: синий, белый" },
  { key: "additional_info",         label: "Дополнительная информация",   icon: <FaClipboardList />, rows: 4, placeholder: "Любая дополнительная информация, пожелания, ссылки" },
];

function StudentTechnicalSpecs() {
  const [specs, setSpecs]           = useState([]);
  const [selectedSpec, setSelectedSpec] = useState(null);
  const [isEditing, setIsEditing]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState("");
  const [formData, setFormData]     = useState(EMPTY_FORM);

  useEffect(() => { loadSpecs(); }, []);

  const loadSpecs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/technical-specs");
      setSpecs(res.data.specs || []);
    } catch (err) {
      console.error("Ошибка загрузки ТЗ:", err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setSelectedSpec(null);
    setFormData(EMPTY_FORM);
    setIsEditing(true);
  };

  const openEdit = (spec) => {
    setSelectedSpec(spec);
    setFormData({
      title: spec.title,
      project_type: spec.project_type,
      description: spec.description || "",
      goals: spec.goals || "",
      target_audience: spec.target_audience || "",
      functional_requirements: spec.functional_requirements || "",
      technical_requirements: spec.technical_requirements || "",
      design_requirements: spec.design_requirements || "",
      deadline: spec.deadline ? spec.deadline.split("T")[0] : "",
      budget: spec.budget || "",
      additional_info: spec.additional_info || "",
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) { alert("Введите название проекта"); return; }
    try {
      setSaving(true);
      if (selectedSpec) {
        await api.put(`/technical-specs/${selectedSpec.id}`, formData);
      } else {
        await api.post("/technical-specs", formData);
      }
      await loadSpecs();
      setIsEditing(false);
      setSelectedSpec(null);
    } catch (err) {
      console.error("Ошибка сохранения:", err);
      alert("Ошибка при сохранении ТЗ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Вы уверены, что хотите удалить это ТЗ?")) return;
    try {
      await api.delete(`/technical-specs/${id}`);
      await loadSpecs();
      if (selectedSpec?.id === id) { setSelectedSpec(null); setIsEditing(false); }
    } catch (err) {
      alert("Ошибка при удалении ТЗ");
    }
  };

  const handleDuplicate = async (spec, e) => {
    e.stopPropagation();
    try {
      const { id, created_at, updated_at, ...rest } = spec;
      await api.post("/technical-specs", { ...rest, title: `${spec.title} (копия)` });
      await loadSpecs();
    } catch (err) {
      alert("Ошибка при дублировании ТЗ");
    }
  };

  const handleExport = (spec, e) => {
    e?.stopPropagation();
    const pt = PROJECT_TYPES[spec.project_type];
    const line = (label, val) => `\n${label}\n${"-".repeat(label.length)}\n${val || "Не указано"}\n`;
    const text = [
      "ТЕХНИЧЕСКОЕ ЗАДАНИЕ",
      "===================\n",
      `Название проекта: ${spec.title}`,
      `Тип проекта: ${pt?.label || spec.project_type}`,
      `Дата создания: ${new Date(spec.created_at).toLocaleDateString("ru-RU")}`,
      line("ОПИСАНИЕ ПРОЕКТА", spec.description),
      line("ЦЕЛИ И ЗАДАЧИ", spec.goals),
      line("ЦЕЛЕВАЯ АУДИТОРИЯ", spec.target_audience),
      line("ФУНКЦИОНАЛЬНЫЕ ТРЕБОВАНИЯ", spec.functional_requirements),
      line("ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ", spec.technical_requirements),
      line("ТРЕБОВАНИЯ К ДИЗАЙНУ", spec.design_requirements),
      line("СРОК ВЫПОЛНЕНИЯ", spec.deadline),
      line("БЮДЖЕТ", spec.budget),
      line("ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ", spec.additional_info),
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ТЗ_${spec.title.replace(/[^a-zа-яё0-9]/gi, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getProjectTypeName = (type) => PROJECT_TYPES[type]?.label || type;

  const filteredSpecs = specs.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) ||
    getProjectTypeName(s.project_type).toLowerCase().includes(search.toLowerCase())
  );

  const stats = Object.keys(PROJECT_TYPES).map(k => ({
    key: k, ...PROJECT_TYPES[k],
    count: specs.filter(s => s.project_type === k).length,
  })).filter(s => s.count > 0);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.spinnerWrap}>
          <div className={styles.spinner} />
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderIcon}><MdOutlineAssignment /></div>
        <div>
          <h1 className={styles.pageTitle}>Технические задания</h1>
          <p className={styles.pageSub}>Создавайте и управляйте своими ТЗ для проектов</p>
        </div>
        <button className={styles.createBtn} onClick={openCreate}>
          <FaPlus /> Создать ТЗ
        </button>
      </div>

      {/* Stats */}
      {specs.length > 0 && (
        <div className={styles.statsRow}>
          <div className={styles.statTile}>
            <span className={styles.statIcon}><FaFileAlt /></span>
            <span className={styles.statVal}>{specs.length}</span>
            <span className={styles.statLbl}>Всего ТЗ</span>
          </div>
          {stats.map(s => (
            <div className={styles.statTile} key={s.key} style={{ "--type-color": s.color }}>
              <span className={styles.statIcon} style={{ color: s.color }}>{s.icon}</span>
              <span className={styles.statVal}>{s.count}</span>
              <span className={styles.statLbl}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main layout */}
      <div className={styles.mainLayout}>
        {/* Left: list */}
        <div className={styles.listPanel}>
          <div className={styles.listTop}>
            <div className={styles.searchWrap}>
              <AiOutlineSearch className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Поиск..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && <button className={styles.searchClear} onClick={() => setSearch("")}><FaTimes /></button>}
            </div>
          </div>

          {filteredSpecs.length === 0 ? (
            <div className={styles.emptyList}>
              <FaFileAlt className={styles.emptyListIcon} />
              <p>{specs.length === 0 ? "Нет технических заданий" : "Нет совпадений"}</p>
              {specs.length === 0 && (
                <button className={styles.emptyCreateBtn} onClick={openCreate}>
                  <FaPlus /> Создать первое ТЗ
                </button>
              )}
            </div>
          ) : (
            <div className={styles.specsList}>
              {filteredSpecs.map(spec => {
                const pt = PROJECT_TYPES[spec.project_type] || PROJECT_TYPES.other;
                const isActive = selectedSpec?.id === spec.id && isEditing;
                return (
                  <div
                    key={spec.id}
                    className={`${styles.specCard} ${isActive ? styles.specCardActive : ""}`}
                    onClick={() => openEdit(spec)}
                  >
                    <div className={styles.specCardTop}>
                      <span className={styles.specTypeBadge} style={{ "--tc": pt.color, background: `${pt.color}18`, color: pt.color }}>
                        {pt.icon} {pt.label}
                      </span>
                      <span className={styles.specDate}>
                        {new Date(spec.created_at).toLocaleDateString("ru-RU")}
                      </span>
                    </div>
                    <h4 className={styles.specCardTitle}>{spec.title}</h4>
                    {spec.description && (
                      <p className={styles.specCardDesc}>{spec.description.slice(0, 80)}{spec.description.length > 80 ? "..." : ""}</p>
                    )}
                    <div className={styles.specCardActions}>
                      <button title="Редактировать" onClick={e => { e.stopPropagation(); openEdit(spec); }}>
                        <FaEdit />
                      </button>
                      <button title="Дублировать" onClick={e => handleDuplicate(spec, e)}>
                        <FaClone />
                      </button>
                      <button title="Экспорт" onClick={e => handleExport(spec, e)}>
                        <FaDownload />
                      </button>
                      <button title="Удалить" className={styles.deleteBtn} onClick={e => handleDelete(spec.id, e)}>
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: editor */}
        <div className={styles.editorPanel}>
          {!isEditing ? (
            <div className={styles.emptyEditor}>
              <div className={styles.emptyEditorIcon}><MdOutlineAssignment /></div>
              <h3>Выберите ТЗ или создайте новое</h3>
              <p>Нажмите на карточку слева для редактирования или создайте новое техническое задание</p>
              <button className={styles.createBtn} onClick={openCreate}><FaPlus /> Создать ТЗ</button>
            </div>
          ) : (
            <div className={styles.editorForm}>
              {/* Editor header */}
              <div className={styles.editorHeader}>
                <div>
                  <h2 className={styles.editorTitle}>
                    {selectedSpec ? "Редактирование ТЗ" : "Новое техническое задание"}
                  </h2>
                  {selectedSpec && (
                    <p className={styles.editorSub}>Изменения сохранятся после нажатия «Сохранить»</p>
                  )}
                </div>
                <div className={styles.editorHeaderActions}>
                  <button className={styles.cancelBtn} onClick={() => { setIsEditing(false); setSelectedSpec(null); }}>
                    <FaTimes /> Отмена
                  </button>
                  <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                    <FaCheck /> {saving ? "Сохранение..." : "Сохранить"}
                  </button>
                </div>
              </div>

              {/* Base fields */}
              <div className={styles.formSection}>
                <div className={styles.formSectionTitle}><FaFileAlt /> Основное</div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Название проекта <span className={styles.required}>*</span>
                  </label>
                  <input
                    className={styles.formInput}
                    type="text"
                    placeholder="Например: Интернет-магазин одежды"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Тип проекта</label>
                  <div className={styles.typeGrid}>
                    {Object.entries(PROJECT_TYPES).map(([key, pt]) => (
                      <button
                        key={key}
                        type="button"
                        className={`${styles.typeBtn} ${formData.project_type === key ? styles.typeBtnActive : ""}`}
                        style={{ "--tc": pt.color }}
                        onClick={() => setFormData({ ...formData, project_type: key })}
                      >
                        <span style={{ color: pt.color }}>{pt.icon}</span>
                        {pt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}><FaCalendarAlt /> Срок выполнения</label>
                    <input
                      className={styles.formInput}
                      type="date"
                      value={formData.deadline}
                      onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}><FaCoins /> Бюджет</label>
                    <input
                      className={styles.formInput}
                      type="text"
                      placeholder="Например: 50 000 тенге"
                      value={formData.budget}
                      onChange={e => setFormData({ ...formData, budget: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Content sections */}
              {SECTIONS.map(sec => (
                <div className={styles.formSection} key={sec.key}>
                  <div className={styles.formSectionTitle}>{sec.icon} {sec.label}</div>
                  <textarea
                    className={styles.formTextarea}
                    placeholder={sec.placeholder}
                    value={formData[sec.key]}
                    onChange={e => setFormData({ ...formData, [sec.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentTechnicalSpecs;
