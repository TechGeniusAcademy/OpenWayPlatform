import { useState, useRef, useMemo } from 'react';
import { FaCamera, FaCopy, FaDownload, FaCheck, FaCode, FaPalette, FaExpand } from 'react-icons/fa';
import styles from './CodeScreenshotGenerator.module.css';

const THEMES = [
  { id: 'nightOwl', name: 'Night Owl', bg: '#011627', text: '#d6deeb', accent: '#7fdbca' },
  { id: 'dracula', name: 'Dracula', bg: '#282a36', text: '#f8f8f2', accent: '#bd93f9' },
  { id: 'monokai', name: 'Monokai', bg: '#272822', text: '#f8f8f2', accent: '#a6e22e' },
  { id: 'github', name: 'GitHub Dark', bg: '#0d1117', text: '#c9d1d9', accent: '#58a6ff' },
  { id: 'nord', name: 'Nord', bg: '#2e3440', text: '#eceff4', accent: '#88c0d0' },
  { id: 'synthwave', name: 'Synthwave', bg: '#262335', text: '#ffffff', accent: '#ff7edb' },
  { id: 'cobalt', name: 'Cobalt', bg: '#193549', text: '#e1efff', accent: '#ffc600' },
  { id: 'material', name: 'Material', bg: '#263238', text: '#eeffff', accent: '#89ddff' },
  { id: 'oneDark', name: 'One Dark', bg: '#282c34', text: '#abb2bf', accent: '#61afef' },
  { id: 'solarized', name: 'Solarized', bg: '#002b36', text: '#839496', accent: '#2aa198' },
  { id: 'vscode', name: 'VS Code', bg: '#1e1e1e', text: '#d4d4d4', accent: '#569cd6' },
  { id: 'ayu', name: 'Ayu Mirage', bg: '#1f2430', text: '#cbccc6', accent: '#ffcc66' },
];

const GRADIENTS = [
  { id: 'none', name: 'Без фона', colors: ['transparent', 'transparent'] },
  { id: 'purple', name: 'Purple', colors: ['#667eea', '#764ba2'] },
  { id: 'blue', name: 'Ocean', colors: ['#2193b0', '#6dd5ed'] },
  { id: 'sunset', name: 'Sunset', colors: ['#f093fb', '#f5576c'] },
  { id: 'green', name: 'Forest', colors: ['#11998e', '#38ef7d'] },
  { id: 'orange', name: 'Fire', colors: ['#f12711', '#f5af19'] },
  { id: 'pink', name: 'Pink', colors: ['#ee9ca7', '#ffdde1'] },
  { id: 'dark', name: 'Dark', colors: ['#232526', '#414345'] },
  { id: 'midnight', name: 'Midnight', colors: ['#0f0c29', '#302b63'] },
  { id: 'peach', name: 'Peach', colors: ['#ed6ea0', '#ec8c69'] },
  { id: 'aqua', name: 'Aqua', colors: ['#13547a', '#80d0c7'] },
  { id: 'rainbow', name: 'Rainbow', colors: ['#f093fb', '#f5576c', '#ffd86f', '#43e97b', '#38f9d7'] },
];

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 
  'html', 'css', 'scss', 'json', 'sql', 'bash', 'go', 'rust', 
  'php', 'ruby', 'swift', 'kotlin', 'dart', 'vue', 'jsx', 'tsx'
];

const FONTS = [
  { id: 'firacode', name: 'Fira Code', family: "'Fira Code', monospace" },
  { id: 'jetbrains', name: 'JetBrains Mono', family: "'JetBrains Mono', monospace" },
  { id: 'cascadia', name: 'Cascadia Code', family: "'Cascadia Code', monospace" },
  { id: 'consolas', name: 'Consolas', family: "'Consolas', monospace" },
  { id: 'monaco', name: 'Monaco', family: "'Monaco', monospace" },
  { id: 'source', name: 'Source Code Pro', family: "'Source Code Pro', monospace" },
];

const DEFAULT_CODE = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Пример использования
const result = fibonacci(10);
console.log(\`Fibonacci(10) = \${result}\`);`;

function CodeScreenshotGenerator() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [theme, setTheme] = useState(THEMES[0]);
  const [gradient, setGradient] = useState(GRADIENTS[1]);
  const [language, setLanguage] = useState('javascript');
  const [font, setFont] = useState(FONTS[0]);
  const [fontSize, setFontSize] = useState(14);
  const [padding, setPadding] = useState(32);
  const [borderRadius, setBorderRadius] = useState(12);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const [fileName, setFileName] = useState('code.js');
  const [shadow, setShadow] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const previewRef = useRef(null);

  // Простая подсветка синтаксиса
  const highlightCode = useMemo(() => {
    const keywords = ['function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined'];
    const lines = code.split('\n');
    
    return lines.map((line, idx) => {
      let highlighted = line
        // Строки
        .replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, `<span style="color: ${theme.accent}">$&</span>`)
        // Комментарии
        .replace(/(\/\/.*$)/gm, `<span style="color: #6a737d; font-style: italic">$1</span>`)
        // Числа
        .replace(/\b(\d+)\b/g, `<span style="color: #f78c6c">$1</span>`)
        // Функции
        .replace(/(\w+)(?=\s*\()/g, `<span style="color: #82aaff">$1</span>`);
      
      // Ключевые слова
      keywords.forEach(kw => {
        const regex = new RegExp(`\\b(${kw})\\b`, 'g');
        highlighted = highlighted.replace(regex, `<span style="color: #c792ea">$1</span>`);
      });
      
      return {
        number: idx + 1,
        content: highlighted || ' '
      };
    });
  }, [code, theme]);

  const gradientStyle = useMemo(() => {
    if (gradient.id === 'none') return { background: 'transparent' };
    if (gradient.colors.length > 2) {
      return { background: `linear-gradient(135deg, ${gradient.colors.join(', ')})` };
    }
    return { background: `linear-gradient(135deg, ${gradient.colors[0]} 0%, ${gradient.colors[1]} 100%)` };
  }, [gradient]);

  const handleDownload = async () => {
    if (!previewRef.current) return;
    
    try {
      // Используем html2canvas если доступен, иначе копируем как HTML
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      
      const link = document.createElement('a');
      link.download = `${fileName.replace(/\.[^/.]+$/, '')}-screenshot.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      // Fallback: копируем HTML
      alert('Для скачивания PNG установите html2canvas. Пока можно скопировать код и использовать встроенный скриншот браузера (Ctrl+Shift+S в Chrome)');
    }
  };

  const handleCopyImage = async () => {
    if (!previewRef.current) return;
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      });
    } catch (error) {
      alert('Не удалось скопировать изображение. Используйте кнопку скачать.');
    }
  };

  return (
    <div className={styles.generator}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <FaCamera className={styles.titleIcon} />
          <h2>Code Screenshot</h2>
        </div>
        <p className={styles.subtitle}>Создавай красивые скриншоты кода</p>
      </div>

      <div className={styles.content}>
        <div className={styles.mainArea}>
          {/* Превью */}
          <div className={styles.previewSection}>
            <div className={styles.previewLabel}>Превью</div>
            <div className={styles.previewWrapper}>
              <div 
                ref={previewRef}
                className={styles.preview}
                style={{
                  ...gradientStyle,
                  padding: `${padding}px`,
                }}
              >
                <div 
                  className={styles.codeWindow}
                  style={{
                    backgroundColor: theme.bg,
                    borderRadius: `${borderRadius}px`,
                    boxShadow: shadow ? '0 20px 68px rgba(0, 0, 0, 0.55)' : 'none',
                  }}
                >
                  {showHeader && (
                    <div className={styles.windowHeader}>
                      <div className={styles.windowButtons}>
                        <span className={styles.btnClose}></span>
                        <span className={styles.btnMinimize}></span>
                        <span className={styles.btnMaximize}></span>
                      </div>
                      <div className={styles.windowTitle}>{fileName}</div>
                      <div className={styles.windowSpacer}></div>
                    </div>
                  )}
                  <div className={styles.codeContent}>
                    <pre style={{ fontFamily: font.family, fontSize: `${fontSize}px` }}>
                      {highlightCode.map((line, idx) => (
                        <div key={idx} className={styles.codeLine}>
                          {showLineNumbers && (
                            <span className={styles.lineNumber} style={{ color: `${theme.text}40` }}>
                              {line.number}
                            </span>
                          )}
                          <code 
                            style={{ color: theme.text }}
                            dangerouslySetInnerHTML={{ __html: line.content }}
                          />
                        </div>
                      ))}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={styles.previewActions}>
              <button className={styles.actionBtn} onClick={handleCopyImage}>
                {copied ? <><FaCheck /> Скопировано!</> : <><FaCopy /> Копировать</>}
              </button>
              <button className={styles.downloadBtn} onClick={handleDownload}>
                <FaDownload /> Скачать PNG
              </button>
            </div>
          </div>

          {/* Редактор кода */}
          <div className={styles.editorSection}>
            <div className={styles.editorLabel}>Код</div>
            <textarea
              className={styles.codeEditor}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Вставьте ваш код здесь..."
              spellCheck={false}
            />
          </div>
        </div>

        {/* Настройки */}
        <div className={styles.settingsPanel}>
          <div className={styles.settingsSection}>
            <h3><FaPalette /> Тема редактора</h3>
            <div className={styles.themesGrid}>
              {THEMES.map(t => (
                <button
                  key={t.id}
                  className={`${styles.themeBtn} ${theme.id === t.id ? styles.active : ''}`}
                  onClick={() => setTheme(t)}
                  style={{ backgroundColor: t.bg, color: t.text }}
                  title={t.name}
                >
                  <span style={{ color: t.accent }}>●</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.settingsSection}>
            <h3>Фон</h3>
            <div className={styles.gradientsGrid}>
              {GRADIENTS.map(g => (
                <button
                  key={g.id}
                  className={`${styles.gradientBtn} ${gradient.id === g.id ? styles.active : ''}`}
                  onClick={() => setGradient(g)}
                  style={{
                    background: g.id === 'none' 
                      ? 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 10px 10px'
                      : g.colors.length > 2 
                        ? `linear-gradient(135deg, ${g.colors.join(', ')})`
                        : `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})`
                  }}
                  title={g.name}
                />
              ))}
            </div>
          </div>

          <div className={styles.settingsGrid}>
            <div className={styles.settingItem}>
              <label>Шрифт</label>
              <select value={font.id} onChange={(e) => setFont(FONTS.find(f => f.id === e.target.value))}>
                {FONTS.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.settingItem}>
              <label>Размер шрифта: {fontSize}px</label>
              <input
                type="range"
                min="10"
                max="24"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
            </div>

            <div className={styles.settingItem}>
              <label>Отступ: {padding}px</label>
              <input
                type="range"
                min="0"
                max="64"
                value={padding}
                onChange={(e) => setPadding(Number(e.target.value))}
              />
            </div>

            <div className={styles.settingItem}>
              <label>Скругление: {borderRadius}px</label>
              <input
                type="range"
                min="0"
                max="24"
                value={borderRadius}
                onChange={(e) => setBorderRadius(Number(e.target.value))}
              />
            </div>

            <div className={styles.settingItem}>
              <label>Имя файла</label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="code.js"
              />
            </div>
          </div>

          <div className={styles.checkboxes}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={showLineNumbers}
                onChange={(e) => setShowLineNumbers(e.target.checked)}
              />
              <span>Номера строк</span>
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={showHeader}
                onChange={(e) => setShowHeader(e.target.checked)}
              />
              <span>Заголовок окна</span>
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={shadow}
                onChange={(e) => setShadow(e.target.checked)}
              />
              <span>Тень</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CodeScreenshotGenerator;
