import { useState } from "react";
import styles from "./StudentExtra.module.css";
import CSSGradientGenerator from "../../components/tools/CSSGradientGenerator";
import SmoothShadowGenerator from "../../components/tools/SmoothShadowGenerator";
import NeumorphismGenerator from "../../components/tools/NeumorphismGenerator";
import ClipPathGenerator from "../../components/tools/ClipPathGenerator";
import CubicBezierGenerator from "../../components/tools/CubicBezierGenerator";
import GlassmorphismGenerator from "../../components/tools/GlassmorphismGenerator";
import KeyframesGenerator from "../../components/tools/KeyframesGenerator";
import WavesGenerator from "../../components/tools/WavesGenerator";
import CodeScreenshotGenerator from "../../components/tools/CodeScreenshotGenerator";
import ScreenSizeMap from "../../components/tools/ScreenSizeMap";
import {
  FaPalette, FaWrench, FaGlobe, FaMobileAlt, FaCog, FaFlask,
  FaImage, FaCode, FaGamepad, FaGraduationCap, FaRainbow, FaMoon,
  FaCircle, FaCut, FaChartLine, FaWindowMaximize, FaFilm, FaWater,
  FaSearch, FaClock, FaSync, FaBook, FaCamera,
  FaBookOpen, FaCube, FaCheckCircle, FaPen, FaDesktop, FaRulerCombined,
  FaTv, FaBalanceScale, FaUniversalAccess, FaAdjust, FaMailBulk,
  FaCloudMoon, FaVial, FaFolder, FaMask, FaFileAlt,
  FaBolt, FaChartBar, FaCheck, FaCompress,
  FaPaw, FaPaintBrush, FaShieldAlt, FaAtom, FaMagic, FaImages,
  FaLaptopCode, FaGithub, FaQuestionCircle, FaDocker, FaCodeBranch,
  FaBrush, FaDice, FaMap, FaVolumeUp,
  FaTools, FaTimes
} from "react-icons/fa";
import { SiUnity, SiGodotengine, SiCypress } from "react-icons/si";
import { BiCodeCurly } from "react-icons/bi";
import { VscJson } from "react-icons/vsc";
import { IoAppsOutline } from "react-icons/io5";

const TOOLS = [
  { id: "visual-generators", name: "Визуальные генераторы", icon: <FaPalette /> },
  { id: "utilities",         name: "Утилиты",               icon: <FaWrench /> },
  { id: "javascript-web",    name: "JavaScript / Web",      icon: <FaGlobe /> },
  { id: "responsive-ux",     name: "Responsive / UX",       icon: <FaMobileAlt /> },
  { id: "backend-api",       name: "Backend / API",         icon: <FaCog /> },
  { id: "testing",           name: "Тестирование",          icon: <FaFlask /> },
  { id: "images",            name: "Изображения",           icon: <FaImage /> },
  { id: "for-developers",    name: "Для разработчиков",     icon: <FaCode /> },
  { id: "gamedev",           name: "GameDev",               icon: <FaGamepad /> },
];

function Modal({ onClose, children }) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose}><FaTimes /></button>
        {children}
      </div>
    </div>
  );
}

function StudentExtra() {
  const [active, setActive] = useState("visual-generators");
  const [modal, setModal] = useState(null);

  const open  = (id) => setModal(id);
  const close = () => setModal(null);

  const currentTool = TOOLS.find((t) => t.id === active);

  const content = {
    "visual-generators": (
      <>
        <div className={styles.linksGrid}>
          <button className={styles.toolCard} onClick={() => open("gradient")}>
            <div className={styles.toolCardGradient} />
            <div className={styles.toolCardBody}>
              <span className={styles.toolCardIco}><FaRainbow /></span>
              <div className={styles.toolCardInfo}>
                <strong>CSS Gradient Generator</strong>
                <span>Создавай градиенты прямо здесь!</span>
              </div>
              <span className={styles.builtinBadge}>Встроенный</span>
            </div>
          </button>
          <button className={styles.toolCard} onClick={() => open("shadow")}>
            <div className={styles.toolCardShadow} />
            <div className={styles.toolCardBody}>
              <span className={styles.toolCardIco}><FaMoon /></span>
              <div className={styles.toolCardInfo}>
                <strong>Smooth Shadow Generator</strong>
                <span>Создавай плавные тени прямо здесь!</span>
              </div>
              <span className={styles.builtinBadge}>Встроенный</span>
            </div>
          </button>
          <button className={styles.toolCard} onClick={() => open("neumorphism")}>
            <div className={styles.toolCardNeumorphism} />
            <div className={styles.toolCardBody}>
              <span className={styles.toolCardIco}><FaCircle /></span>
              <div className={styles.toolCardInfo}>
                <strong>Neumorphism Generator</strong>
                <span>Создавай неоморфные элементы!</span>
              </div>
              <span className={styles.builtinBadge}>Встроенный</span>
            </div>
          </button>
          <button className={styles.toolCard} onClick={() => open("clippath")}>
            <div className={styles.toolCardClipPath} />
            <div className={styles.toolCardBody}>
              <span className={styles.toolCardIco}><FaCut /></span>
              <div className={styles.toolCardInfo}>
                <strong>Clip-Path Generator</strong>
                <span>Создавай clip-path формы!</span>
              </div>
              <span className={styles.builtinBadge}>Встроенный</span>
            </div>
          </button>
          <button className={styles.toolCard} onClick={() => open("bezier")}>
            <div className={styles.toolCardBezier} />
            <div className={styles.toolCardBody}>
              <span className={styles.toolCardIco}><FaChartLine /></span>
              <div className={styles.toolCardInfo}>
                <strong>Cubic Bezier Generator</strong>
                <span>Создавай кривые для анимаций!</span>
              </div>
              <span className={styles.builtinBadge}>Встроенный</span>
            </div>
          </button>
          <button className={styles.toolCard} onClick={() => open("glassmorphism")}>
            <div className={styles.toolCardGlass} />
            <div className={styles.toolCardBody}>
              <span className={styles.toolCardIco}><FaWindowMaximize /></span>
              <div className={styles.toolCardInfo}>
                <strong>Glassmorphism Generator</strong>
                <span>Создавай эффект стекла!</span>
              </div>
              <span className={styles.builtinBadge}>Встроенный</span>
            </div>
          </button>
          <button className={styles.toolCard} onClick={() => open("keyframes")}>
            <div className={styles.toolCardKeyframes} />
            <div className={styles.toolCardBody}>
              <span className={styles.toolCardIco}><FaFilm /></span>
              <div className={styles.toolCardInfo}>
                <strong>Keyframes Generator</strong>
                <span>Создавай CSS-анимации!</span>
              </div>
              <span className={styles.builtinBadge}>Встроенный</span>
            </div>
          </button>
          <button className={styles.toolCard} onClick={() => open("waves")}>
            <div className={styles.toolCardWaves} />
            <div className={styles.toolCardBody}>
              <span className={styles.toolCardIco}><FaWater /></span>
              <div className={styles.toolCardInfo}>
                <strong>Waves Generator</strong>
                <span>Генератор SVG волн для дизайна</span>
              </div>
              <span className={styles.builtinBadge}>Встроенный</span>
            </div>
          </button>
        </div>
      </>
    ),

    "utilities": (
      <div className={styles.linksGrid}>
        <a href="https://regex101.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaSearch /></span>
          <div className={styles.linkInfo}><strong>Regex101</strong><span>Тестирование регулярных выражений</span></div>
        </a>
        <a href="https://crontab.guru" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaClock /></span>
          <div className={styles.linkInfo}><strong>Crontab Guru</strong><span>Редактор cron-выражений</span></div>
        </a>
        <a href="https://jsonformatter.org" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><VscJson /></span>
          <div className={styles.linkInfo}><strong>JSON Formatter</strong><span>Форматирование и валидация JSON</span></div>
        </a>
        <a href="https://transform.tools" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaSync /></span>
          <div className={styles.linkInfo}><strong>Transform</strong><span>Конвертер между форматами данных</span></div>
        </a>
        <a href="https://devdocs.io" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaBook /></span>
          <div className={styles.linkInfo}><strong>DevDocs</strong><span>Документация по всем языкам в одном месте</span></div>
        </a>
        <button className={styles.toolCard} onClick={() => open("codeshot")}>
          <div className={styles.toolCardCodeshot} />
          <div className={styles.toolCardBody}>
            <span className={styles.toolCardIco}><FaCamera /></span>
            <div className={styles.toolCardInfo}><strong>Code Screenshot</strong><span>Красивые скриншоты кода</span></div>
            <span className={styles.builtinBadge}>Встроенный</span>
          </div>
        </button>
      </div>
    ),

    "javascript-web": (
      <div className={styles.linksGrid}>
        <a href="https://developer.mozilla.org" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaBookOpen /></span>
          <div className={styles.linkInfo}><strong>MDN Web Docs</strong><span>Полная документация по веб-технологиям</span></div>
        </a>
        <a href="https://javascript.info" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><BiCodeCurly /></span>
          <div className={styles.linkInfo}><strong>JavaScript.info</strong><span>Современный учебник JavaScript</span></div>
        </a>
        <a href="https://bundlephobia.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaCube /></span>
          <div className={styles.linkInfo}><strong>Bundlephobia</strong><span>Анализ размера npm-пакетов</span></div>
        </a>
        <a href="https://caniuse.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaCheckCircle /></span>
          <div className={styles.linkInfo}><strong>Can I Use</strong><span>Поддержка функций браузерами</span></div>
        </a>
        <a href="https://codepen.io" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaPen /></span>
          <div className={styles.linkInfo}><strong>CodePen</strong><span>Онлайн-редактор HTML/CSS/JS</span></div>
        </a>
        <a href="https://codesandbox.io" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaCube /></span>
          <div className={styles.linkInfo}><strong>CodeSandbox</strong><span>Онлайн IDE для веб-приложений</span></div>
        </a>
      </div>
    ),

    "responsive-ux": (
      <div className={styles.linksGrid}>
        <a href="https://responsively.app" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaDesktop /></span>
          <div className={styles.linkInfo}><strong>Responsively</strong><span>Браузер для тестирования адаптивности</span></div>
        </a>
        <button className={styles.toolCard} onClick={() => open("screensize")}>
          <div className={styles.toolCardScreenSize} />
          <div className={styles.toolCardBody}>
            <span className={styles.toolCardIco}><FaRulerCombined /></span>
            <div className={styles.toolCardInfo}><strong>Screen Size Map</strong><span>Карта размеров экранов и брейкпоинтов</span></div>
            <span className={styles.builtinBadge}>Встроенный</span>
          </div>
        </button>
        <a href="https://whatismyviewport.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaTv /></span>
          <div className={styles.linkInfo}><strong>Viewport Size</strong><span>Определение размера viewport</span></div>
        </a>
        <a href="https://lawsofux.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaBalanceScale /></span>
          <div className={styles.linkInfo}><strong>Laws of UX</strong><span>Законы UX-дизайна</span></div>
        </a>
        <a href="https://wave.webaim.org" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaUniversalAccess /></span>
          <div className={styles.linkInfo}><strong>WAVE</strong><span>Проверка доступности сайта</span></div>
        </a>
        <a href="https://contrast-ratio.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaAdjust /></span>
          <div className={styles.linkInfo}><strong>Contrast Ratio</strong><span>Проверка контрастности цветов</span></div>
        </a>
      </div>
    ),

    "backend-api": (
      <div className={styles.linksGrid}>
        <a href="https://www.postman.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaMailBulk /></span>
          <div className={styles.linkInfo}><strong>Postman</strong><span>Тестирование API запросов</span></div>
        </a>
        <a href="https://insomnia.rest" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaCloudMoon /></span>
          <div className={styles.linkInfo}><strong>Insomnia</strong><span>Альтернативный REST-клиент</span></div>
        </a>
        <a href="https://httpbin.org" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaVial /></span>
          <div className={styles.linkInfo}><strong>HTTPBin</strong><span>Тестовый HTTP-сервер для запросов</span></div>
        </a>
        <a href="https://jsonplaceholder.typicode.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaFolder /></span>
          <div className={styles.linkInfo}><strong>JSONPlaceholder</strong><span>Бесплатное fake REST API</span></div>
        </a>
        <a href="https://mocky.io" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaMask /></span>
          <div className={styles.linkInfo}><strong>Mocky</strong><span>Создание mock API endpoints</span></div>
        </a>
        <a href="https://swagger.io" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaFileAlt /></span>
          <div className={styles.linkInfo}><strong>Swagger</strong><span>Документация и дизайн API</span></div>
        </a>
      </div>
    ),

    "testing": (
      <div className={styles.linksGrid}>
        <a href="https://jestjs.io" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaVial /></span>
          <div className={styles.linkInfo}><strong>Jest</strong><span>JavaScript тестовый фреймворк</span></div>
        </a>
        <a href="https://www.cypress.io" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><SiCypress /></span>
          <div className={styles.linkInfo}><strong>Cypress</strong><span>E2E тестирование для веба</span></div>
        </a>
        <a href="https://playwright.dev" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaMask /></span>
          <div className={styles.linkInfo}><strong>Playwright</strong><span>Автоматизация браузеров от Microsoft</span></div>
        </a>
        <a href="https://pagespeed.web.dev" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaBolt /></span>
          <div className={styles.linkInfo}><strong>PageSpeed Insights</strong><span>Анализ производительности сайта</span></div>
        </a>
        <a href="https://gtmetrix.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaChartBar /></span>
          <div className={styles.linkInfo}><strong>GTmetrix</strong><span>Детальный анализ скорости загрузки</span></div>
        </a>
        <a href="https://validator.w3.org" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaCheck /></span>
          <div className={styles.linkInfo}><strong>W3C Validator</strong><span>Проверка валидности HTML</span></div>
        </a>
      </div>
    ),

    "images": (
      <div className={styles.linksGrid}>
        <a href="https://squoosh.app" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaCompress /></span>
          <div className={styles.linkInfo}><strong>Squoosh</strong><span>Сжатие изображений от Google</span></div>
        </a>
        <a href="https://tinypng.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaPaw /></span>
          <div className={styles.linkInfo}><strong>TinyPNG</strong><span>Умное сжатие PNG и JPEG</span></div>
        </a>
        <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaCamera /></span>
          <div className={styles.linkInfo}><strong>Unsplash</strong><span>Бесплатные высококачественные фото</span></div>
        </a>
        <a href="https://undraw.co" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaPaintBrush /></span>
          <div className={styles.linkInfo}><strong>unDraw</strong><span>Бесплатные SVG-иллюстрации</span></div>
        </a>
        <a href="https://heroicons.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaShieldAlt /></span>
          <div className={styles.linkInfo}><strong>Heroicons</strong><span>Красивые SVG-иконки от Tailwind</span></div>
        </a>
        <a href="https://react-icons.github.io/react-icons" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaAtom /></span>
          <div className={styles.linkInfo}><strong>React Icons</strong><span>Иконки для React-приложений</span></div>
        </a>
        <a href="https://svgomg.net" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaMagic /></span>
          <div className={styles.linkInfo}><strong>SVGOMG</strong><span>Оптимизация SVG-файлов</span></div>
        </a>
        <a href="https://placeholder.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaImages /></span>
          <div className={styles.linkInfo}><strong>Placeholder</strong><span>Генератор placeholder изображений</span></div>
        </a>
      </div>
    ),

    "for-developers": (
      <div className={styles.linksGrid}>
        <a href="https://code.visualstudio.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaLaptopCode /></span>
          <div className={styles.linkInfo}><strong>VS Code</strong><span>Мощный редактор кода от Microsoft</span></div>
        </a>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaGithub /></span>
          <div className={styles.linkInfo}><strong>GitHub</strong><span>Хостинг кода и совместная работа</span></div>
        </a>
        <a href="https://stackoverflow.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaQuestionCircle /></span>
          <div className={styles.linkInfo}><strong>Stack Overflow</strong><span>Сообщество для решения проблем</span></div>
        </a>
        <a href="https://www.docker.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaDocker /></span>
          <div className={styles.linkInfo}><strong>Docker</strong><span>Контейнеризация приложений</span></div>
        </a>
        <a href="https://git-scm.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaCodeBranch /></span>
          <div className={styles.linkInfo}><strong>Git</strong><span>Система контроля версий</span></div>
        </a>
        <a href="https://www.freecodecamp.org" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaGraduationCap /></span>
          <div className={styles.linkInfo}><strong>freeCodeCamp</strong><span>Бесплатные курсы по программированию</span></div>
        </a>
      </div>
    ),

    "gamedev": (
      <div className={styles.linksGrid}>
        <a href="https://unity.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><SiUnity /></span>
          <div className={styles.linkInfo}><strong>Unity</strong><span>Популярный игровой движок</span></div>
        </a>
        <a href="https://godotengine.org" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><SiGodotengine /></span>
          <div className={styles.linkInfo}><strong>Godot</strong><span>Бесплатный open-source движок</span></div>
        </a>
        <a href="https://phaser.io" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaGamepad /></span>
          <div className={styles.linkInfo}><strong>Phaser</strong><span>HTML5 фреймворк для игр</span></div>
        </a>
        <a href="https://www.piskelapp.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaPalette /></span>
          <div className={styles.linkInfo}><strong>Piskel</strong><span>Редактор пиксельной графики</span></div>
        </a>
        <a href="https://www.aseprite.org" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaBrush /></span>
          <div className={styles.linkInfo}><strong>Aseprite</strong><span>Профессиональный пиксель-арт редактор</span></div>
        </a>
        <a href="https://itch.io" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaDice /></span>
          <div className={styles.linkInfo}><strong>itch.io</strong><span>Платформа для публикации инди-игр</span></div>
        </a>
        <a href="https://www.mapeditor.org" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaMap /></span>
          <div className={styles.linkInfo}><strong>Tiled</strong><span>Редактор 2D-карт и уровней</span></div>
        </a>
        <a href="https://sfxr.me" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
          <span className={styles.linkIco}><FaVolumeUp /></span>
          <div className={styles.linkInfo}><strong>SFXR</strong><span>Генератор ретро звуковых эффектов</span></div>
        </a>
      </div>
    ),
  };

  const MODALS = {
    gradient:      <CSSGradientGenerator />,
    shadow:        <SmoothShadowGenerator />,
    neumorphism:   <NeumorphismGenerator />,
    clippath:      <ClipPathGenerator />,
    bezier:        <CubicBezierGenerator />,
    glassmorphism: <GlassmorphismGenerator />,
    keyframes:     <KeyframesGenerator />,
    waves:         <WavesGenerator />,
    codeshot:      <CodeScreenshotGenerator />,
    screensize:    <ScreenSizeMap />,
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.iconTile}><IoAppsOutline /></div>
          <div>
            <h1 className={styles.pageTitle}>Дополнительно</h1>
            <p className={styles.pageSub}>Инструменты и ресурсы для разработки</p>
          </div>
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.metaPill}>
            <FaTools />
            {TOOLS.length} категорий
          </span>
        </div>
      </div>

      {/* Body */}
      <div className={styles.layout}>
        {/* Left nav */}
        <aside className={styles.nav}>
          {TOOLS.map((t) => (
            <button
              key={t.id}
              className={`${styles.navItem} ${active === t.id ? styles.navItemActive : ""}`}
              onClick={() => setActive(t.id)}
            >
              <span className={styles.navIco}>{t.icon}</span>
              <span className={styles.navLabel}>{t.name}</span>
            </button>
          ))}
        </aside>

        {/* Right content */}
        <main className={styles.main}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionIco}>{currentTool?.icon}</div>
            <div>
              <h2 className={styles.sectionTitle}>{currentTool?.name}</h2>
            </div>
          </div>
          <div className={styles.contentBody} key={active}>
            {content[active]}
          </div>
        </main>
      </div>

      {/* Modals */}
      {modal && MODALS[modal] && (
        <Modal onClose={close}>{MODALS[modal]}</Modal>
      )}
    </div>
  );
}

export default StudentExtra;
