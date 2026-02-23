import { useState } from "react";
import {
  FiX, FiUpload, FiCheck, FiArrowLeft, FiFileText,
  FiCheckCircle, FiAlertCircle, FiInfo, FiClock, FiAward,
} from "react-icons/fi";
import styles from "./BulkTestEditor.module.css";

const EXAMPLE = `1. Что такое переменная в JavaScript?
   a) Контейнер для данных [✓]
   b) Функция
   c) Объект
   d) Метод

2. Как объявить переменную в JavaScript?
   a) var name; [✓]
   b) variable name;
   c) new name;
   d) create name;

3. Какие типы данных существуют в JavaScript?
   a) string, number [✓]
   b) boolean, object [✓]
   c) undefined, null [✓]
   d) все вышеперечисленные

4. Что выведет console.log(typeof "hello")?
   a) string [✓]
   b) text
   c) object
   d) undefined`;

function parseBulkText(text) {
  const questions = [];
  const blocks = text.split(/\n(?=\d+\.)/);
  blocks.forEach(block => {
    if (!block.trim()) return;
    const lines = block.trim().split("\n");
    const qMatch = lines[0].match(/^\d+\.\s*(.+)/);
    if (!qMatch) return;
    const opts = [];
    lines.slice(1).forEach(line => {
      const m = line.trim().match(/^[a-z]\)\s*(.+?)(\s*\[✓\])?$/i);
      if (m) opts.push({ option_text: m[1].trim(), is_correct: !!m[2] });
    });
    if (opts.length > 0) questions.push({ question_text: qMatch[1], question_type: "choice", options: opts, code_template: "", code_solution: "", code_language: "javascript" });
  });
  return questions;
}

export default function BulkTestEditor({ onImport, onClose }) {
  const [bulkText, setBulkText] = useState("");
  const [settings, setSettings] = useState({ title: "", description: "", type: "choice", timeLimit: 0, pointsCorrect: 1, pointsWrong: 0, canRetry: false });
  const [preview,  setPreview]  = useState([]);
  const [step,     setStep]     = useState("edit"); // "edit" | "preview"
  const [err,      setErr]      = useState("");

  const upd = (field, val) => setSettings(s => ({ ...s, [field]: val }));

  const handlePreview = () => {
    setErr("");
    if (!bulkText.trim()) { setErr("Введите текст с вопросами"); return; }
    const q = parseBulkText(bulkText);
    if (q.length === 0) { setErr("Не удалось распознать вопросы. Проверьте формат."); return; }
    setPreview(q); setStep("preview");
  };

  const handleImport = () => {
    setErr("");
    if (!settings.title.trim()) { setErr("Введите название теста"); return; }
    if (preview.length === 0)   { setErr("Нет вопросов для импорта"); return; }
    onImport({ ...settings, questions: preview });
  };

  const loadExample = () => {
    setBulkText(EXAMPLE);
    setSettings(s => ({ ...s, title: "Основы JavaScript", description: "Тест на знание основ JavaScript" }));
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.modalXl}`} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.modalHead}>
          <div className={styles.modalTitle}>
            {step === "preview" && (
              <button className={styles.backBtn} onClick={() => setStep("edit")}><FiArrowLeft /></button>
            )}
            <div className={styles.modalIcon}><FiUpload /></div>
            <div>
              <h2 className={styles.titleText}>
                {step === "edit" ? "Массовое создание теста" : "Предварительный просмотр"}
              </h2>
              {step === "preview" && <p className={styles.titleSub}>{preview.length} вопросов распознано</p>}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><FiX /></button>
        </div>

        {/* Error banner */}
        {err && (
          <div className={styles.errBanner}>
            <FiAlertCircle /><span>{err}</span>
            <button onClick={() => setErr("")}><FiX /></button>
          </div>
        )}

        <div className={styles.modalBody}>
          {step === "edit" ? (
            <div className={styles.twoCol}>
              {/* Left — settings + input */}
              <div className={styles.leftCol}>
                {/* Settings */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Настройки теста</h3>
                  <div className={styles.formGrid}>
                    <div className={`${styles.formGroup} ${styles.spanFull}`}>
                      <label className={styles.formLabel}>Название *</label>
                      <input className={styles.formInput} value={settings.title} onChange={e => upd("title", e.target.value)} placeholder="Например: Основы JavaScript" />
                    </div>
                    <div className={`${styles.formGroup} ${styles.spanFull}`}>
                      <label className={styles.formLabel}>Описание</label>
                      <textarea className={styles.formInput} rows={2} value={settings.description} onChange={e => upd("description", e.target.value)} placeholder="Краткое описание" />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}><FiClock /> Лимит (мин)</label>
                      <input type="number" className={styles.formInput} value={settings.timeLimit} onChange={e => upd("timeLimit", +e.target.value)} min="0" />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}><FiAward /> Правильный</label>
                      <input type="number" className={styles.formInput} value={settings.pointsCorrect} onChange={e => upd("pointsCorrect", +e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}><FiAward /> Неправильный</label>
                      <input type="number" className={styles.formInput} value={settings.pointsWrong} onChange={e => upd("pointsWrong", +e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Повтор</label>
                      <div className={styles.toggleRow}>
                        <div className={`${styles.toggle} ${settings.canRetry ? styles.toggleOn : ""}`} onClick={() => upd("canRetry", !settings.canRetry)}>
                          <div className={styles.toggleKnob} />
                        </div>
                        <span className={styles.toggleLabel}>{settings.canRetry ? "Разрешён" : "Запрещён"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Textarea */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Вопросы</h3>
                  <textarea
                    className={styles.bulkTextarea}
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    placeholder={"1. Текст вопроса?\n   a) Вариант 1\n   b) Правильный ответ [✓]\n   c) Вариант 3\n\n2. Следующий вопрос?..."}
                    rows={14}
                  />
                </div>
              </div>

              {/* Right — instructions */}
              <div className={styles.rightCol}>
                <div className={`${styles.section} ${styles.sectionInfo}`}>
                  <h3 className={styles.sectionTitle}><FiInfo /> Формат</h3>
                  <pre className={styles.codeBlock}>{`1. Текст вопроса?
   a) Вариант 1
   b) Правильный [✓]
   c) Вариант 3
   d) Вариант 4

2. Второй вопрос?
   a) Вариант 1
   b) Правильный [✓]`}</pre>
                  <ul className={styles.rulesList}>
                    <li>Нумеруйте вопросы: 1., 2., 3.</li>
                    <li>Варианты: a), b), c), d)</li>
                    <li>Правильный ответ: <code>[✓]</code></li>
                    <li>Можно отмечать несколько правильных</li>
                    <li>Пустая строка между вопросами</li>
                  </ul>
                  <button className={styles.btnExample} onClick={loadExample}>
                    <FiFileText /><span>Загрузить пример</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Preview */
            <div className={styles.previewWrap}>
              {preview.map((q, qi) => (
                <div key={qi} className={styles.previewQ}>
                  <div className={styles.previewQHead}>
                    <span className={styles.previewQNum}>Вопрос {qi + 1}</span>
                    <span className={styles.previewQCorrect}>
                      {q.options.filter(o => o.is_correct).length} правильных
                    </span>
                  </div>
                  <p className={styles.previewQText}>{q.question_text}</p>
                  <div className={styles.previewOpts}>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className={`${styles.previewOpt} ${opt.is_correct ? styles.previewOptCorrect : ""}`}>
                        <span className={styles.previewOptLetter}>{String.fromCharCode(97 + oi)})</span>
                        <span className={styles.previewOptText}>{opt.option_text}</span>
                        {opt.is_correct && <FiCheckCircle className={styles.previewOptIcon} />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFoot}>
          {step === "edit" ? (
            <>
              <button className={styles.btnSec} onClick={onClose}><FiX /><span>Отмена</span></button>
              <button className={styles.btnPrimary} onClick={handlePreview}><FiFileText /><span>Предпросмотр</span></button>
            </>
          ) : (
            <>
              <button className={styles.btnSec} onClick={() => setStep("edit")}><FiArrowLeft /><span>Назад</span></button>
              <button className={styles.btnSuccess} onClick={handleImport}><FiCheck /><span>Создать тест ({preview.length} вопросов)</span></button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
