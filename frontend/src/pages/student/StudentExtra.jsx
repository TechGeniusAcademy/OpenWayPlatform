import { useState } from 'react';
import styles from './StudentExtra.module.css';
import CSSGradientGenerator from '../../components/tools/CSSGradientGenerator';
import SmoothShadowGenerator from '../../components/tools/SmoothShadowGenerator';
import NeumorphismGenerator from '../../components/tools/NeumorphismGenerator';
import ClipPathGenerator from '../../components/tools/ClipPathGenerator';
import CubicBezierGenerator from '../../components/tools/CubicBezierGenerator';
import GlassmorphismGenerator from '../../components/tools/GlassmorphismGenerator';
import KeyframesGenerator from '../../components/tools/KeyframesGenerator';
import WavesGenerator from '../../components/tools/WavesGenerator';
import CodeScreenshotGenerator from '../../components/tools/CodeScreenshotGenerator';
import ScreenSizeMap from '../../components/tools/ScreenSizeMap';
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
  FaStar, FaTools
} from 'react-icons/fa';
import { 
  SiUnity, SiGodotengine, SiCypress 
} from 'react-icons/si';
import { 
  BiCodeCurly 
} from 'react-icons/bi';
import { 
  VscJson 
} from 'react-icons/vsc';

function StudentExtra() {
  const [activeTool, setActiveTool] = useState('visual-generators');
  const [showGradientModal, setShowGradientModal] = useState(false);
  const [showShadowModal, setShowShadowModal] = useState(false);
  const [showNeumorphismModal, setShowNeumorphismModal] = useState(false);
  const [showClipPathModal, setShowClipPathModal] = useState(false);
  const [showCubicBezierModal, setShowCubicBezierModal] = useState(false);
  const [showGlassmorphismModal, setShowGlassmorphismModal] = useState(false);
  const [showKeyframesModal, setShowKeyframesModal] = useState(false);
  const [showWavesModal, setShowWavesModal] = useState(false);
  const [showCodeScreenshotModal, setShowCodeScreenshotModal] = useState(false);
  const [showScreenSizeMapModal, setShowScreenSizeMapModal] = useState(false);

  const tools = [
    { id: 'visual-generators', name: 'Визуальные генераторы', icon: <FaPalette /> },
    { id: 'utilities', name: 'Утилиты', icon: <FaWrench /> },
    { id: 'javascript-web', name: 'JavaScript / Web', icon: <FaGlobe /> },
    { id: 'responsive-ux', name: 'Responsive / UX', icon: <FaMobileAlt /> },
    { id: 'backend-api', name: 'Backend / API', icon: <FaCog /> },
    { id: 'testing', name: 'Тестирование', icon: <FaFlask /> },
    { id: 'images', name: 'Изображения', icon: <FaImage /> },
    { id: 'for-developers', name: 'Для программистов', icon: <FaCode /> },
    { id: 'gamedev', name: 'GameDev', icon: <FaGamepad /> }
  ];

  const renderContent = () => {
    switch (activeTool) {
      case 'visual-generators':
        return (
          <div className={styles.toolContent}>
            <h2><FaPalette /> Визуальные генераторы</h2>
            <p className={styles.description}>Инструменты для создания CSS-эффектов и визуальных элементов</p>
            
            <div className={styles.linksGrid}>
              {/* Встроенный CSS Gradient Generator - открывается в модальном окне */}
              <button 
                className={styles.toolCard}
                onClick={() => setShowGradientModal(true)}
              >
                <div className={styles.toolCardGradient}></div>
                <div className={styles.toolCardContent}>
                  <div className={styles.linkIcon}><FaRainbow /></div>
                  <div className={styles.linkInfo}>
                    <h3>CSS Gradient Generator</h3>
                    <p>Создавай градиенты прямо здесь!</p>
                  </div>
                  <span className={styles.toolBadge}>Встроенный</span>
                </div>
              </button>
              {/* Встроенный Smooth Shadow Generator */}
              <button 
                className={styles.toolCard}
                onClick={() => setShowShadowModal(true)}
              >
                <div className={styles.toolCardShadow}></div>
                <div className={styles.toolCardContent}>
                  <div className={styles.linkIcon}><FaMoon /></div>
                  <div className={styles.linkInfo}>
                    <h3>Smooth Shadow Generator</h3>
                    <p>Создавай плавные тени прямо здесь!</p>
                  </div>
                  <span className={styles.toolBadge}>Встроенный</span>
                </div>
              </button>
              {/* Встроенный Neumorphism Generator */}
              <button 
                className={styles.toolCard}
                onClick={() => setShowNeumorphismModal(true)}
              >
                <div className={styles.toolCardNeumorphism}></div>
                <div className={styles.toolCardContent}>
                  <div className={styles.linkIcon}><FaCircle /></div>
                  <div className={styles.linkInfo}>
                    <h3>Neumorphism Generator</h3>
                    <p>Создавай неоморфные элементы!</p>
                  </div>
                  <span className={styles.toolBadge}>Встроенный</span>
                </div>
              </button>
              {/* Встроенный Clip-Path Generator */}
              <button 
                className={styles.toolCard}
                onClick={() => setShowClipPathModal(true)}
              >
                <div className={styles.toolCardClipPath}></div>
                <div className={styles.toolCardContent}>
                  <div className={styles.linkIcon}><FaCut /></div>
                  <div className={styles.linkInfo}>
                    <h3>Clip-Path Generator</h3>
                    <p>Создавай clip-path формы!</p>
                  </div>
                  <span className={styles.toolBadge}>Встроенный</span>
                </div>
              </button>
              {/* Встроенный Cubic Bezier Generator */}
              <button 
                className={styles.toolCard}
                onClick={() => setShowCubicBezierModal(true)}
              >
                <div className={styles.toolCardBezier}></div>
                <div className={styles.toolCardContent}>
                  <div className={styles.linkIcon}><FaChartLine /></div>
                  <div className={styles.linkInfo}>
                    <h3>Cubic Bezier Generator</h3>
                    <p>Создавай кривые для анимаций!</p>
                  </div>
                  <span className={styles.toolBadge}>Встроенный</span>
                </div>
              </button>
              {/* Встроенный Glassmorphism Generator */}
              <button 
                className={styles.toolCard}
                onClick={() => setShowGlassmorphismModal(true)}
              >
                <div className={styles.toolCardGlass}></div>
                <div className={styles.toolCardContent}>
                  <div className={styles.linkIcon}><FaWindowMaximize /></div>
                  <div className={styles.linkInfo}>
                    <h3>Glassmorphism Generator</h3>
                    <p>Создавай эффект стекла!</p>
                  </div>
                  <span className={styles.toolBadge}>Встроенный</span>
                </div>
              </button>
              {/* Встроенный Keyframes Generator */}
              <button 
                className={styles.toolCard}
                onClick={() => setShowKeyframesModal(true)}
              >
                <div className={styles.toolCardKeyframes}></div>
                <div className={styles.toolCardContent}>
                  <div className={styles.linkIcon}><FaFilm /></div>
                  <div className={styles.linkInfo}>
                    <h3>Keyframes Generator</h3>
                    <p>Создавай CSS-анимации!</p>
                  </div>
                  <span className={styles.toolBadge}>Встроенный</span>
                </div>
              </button>
              {/* Встроенный Waves Generator */}
              <button 
                className={styles.toolCard}
                onClick={() => setShowWavesModal(true)}
              >
                <div className={styles.toolCardWaves}></div>
                <div className={styles.toolCardContent}>
                  <div className={styles.linkIcon}><FaWater /></div>
                  <div className={styles.linkInfo}>
                    <h3>Waves Generator</h3>
                    <p>Генератор SVG волн для дизайна</p>
                  </div>
                  <span className={styles.toolBadge}>Встроенный</span>
                </div>
              </button>
            </div>
          </div>
        );
      
      case 'utilities':
        return (
          <div className={styles.toolContent}>
            <h2><FaWrench /> Утилиты</h2>
            <p className={styles.description}>Полезные инструменты для повседневной работы</p>
            <div className={styles.linksGrid}>
              <a href="https://regex101.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaSearch /></div>
                <div className={styles.linkInfo}>
                  <h3>Regex101</h3>
                  <p>Тестирование и отладка регулярных выражений</p>
                </div>
              </a>
              <a href="https://crontab.guru" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaClock /></div>
                <div className={styles.linkInfo}>
                  <h3>Crontab Guru</h3>
                  <p>Редактор cron-выражений</p>
                </div>
              </a>
              <a href="https://jsonformatter.org" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><VscJson /></div>
                <div className={styles.linkInfo}>
                  <h3>JSON Formatter</h3>
                  <p>Форматирование и валидация JSON</p>
                </div>
              </a>
              <a href="https://transform.tools" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaSync /></div>
                <div className={styles.linkInfo}>
                  <h3>Transform</h3>
                  <p>Конвертер между форматами данных</p>
                </div>
              </a>
              <a href="https://devdocs.io" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaBook /></div>
                <div className={styles.linkInfo}>
                  <h3>DevDocs</h3>
                  <p>Документация по всем языкам в одном месте</p>
                </div>
              </a>
              {/* Встроенный Code Screenshot Generator */}
              <button 
                className={styles.toolCard}
                onClick={() => setShowCodeScreenshotModal(true)}
              >
                <div className={styles.toolCardCodeshot}></div>
                <div className={styles.toolCardContent}>
                  <div className={styles.linkIcon}><FaCamera /></div>
                  <div className={styles.linkInfo}>
                    <h3>Code Screenshot</h3>
                    <p>Красивые скриншоты кода</p>
                  </div>
                  <span className={styles.toolBadge}>Встроенный</span>
                </div>
              </button>
            </div>
          </div>
        );
      
      case 'javascript-web':
        return (
          <div className={styles.toolContent}>
            <h2><FaGlobe /> JavaScript / Web</h2>
            <p className={styles.description}>Ресурсы для веб-разработки и JavaScript</p>
            <div className={styles.linksGrid}>
              <a href="https://developer.mozilla.org" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaBookOpen /></div>
                <div className={styles.linkInfo}>
                  <h3>MDN Web Docs</h3>
                  <p>Полная документация по веб-технологиям</p>
                </div>
              </a>
              <a href="https://javascript.info" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><BiCodeCurly /></div>
                <div className={styles.linkInfo}>
                  <h3>JavaScript.info</h3>
                  <p>Современный учебник JavaScript</p>
                </div>
              </a>
              <a href="https://bundlephobia.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaCube /></div>
                <div className={styles.linkInfo}>
                  <h3>Bundlephobia</h3>
                  <p>Анализ размера npm-пакетов</p>
                </div>
              </a>
              <a href="https://caniuse.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaCheckCircle /></div>
                <div className={styles.linkInfo}>
                  <h3>Can I Use</h3>
                  <p>Поддержка функций браузерами</p>
                </div>
              </a>
              <a href="https://codepen.io" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaPen /></div>
                <div className={styles.linkInfo}>
                  <h3>CodePen</h3>
                  <p>Онлайн-редактор HTML/CSS/JS</p>
                </div>
              </a>
              <a href="https://codesandbox.io" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaCube /></div>
                <div className={styles.linkInfo}>
                  <h3>CodeSandbox</h3>
                  <p>Онлайн IDE для веб-приложений</p>
                </div>
              </a>
            </div>
          </div>
        );
      
      case 'responsive-ux':
        return (
          <div className={styles.toolContent}>
            <h2><FaMobileAlt /> Responsive / UX</h2>
            <p className={styles.description}>Инструменты для адаптивного дизайна и UX</p>
            <div className={styles.linksGrid}>
              <a href="https://responsively.app" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaDesktop /></div>
                <div className={styles.linkInfo}>
                  <h3>Responsively</h3>
                  <p>Браузер для тестирования адаптивности</p>
                </div>
              </a>
              {/* Встроенный Screen Size Map */}
              <button 
                className={styles.toolCard}
                onClick={() => setShowScreenSizeMapModal(true)}
              >
                <div className={styles.toolCardScreenSize}></div>
                <div className={styles.toolCardContent}>
                  <div className={styles.linkIcon}><FaRulerCombined /></div>
                  <div className={styles.linkInfo}>
                    <h3>Screen Size Map</h3>
                    <p>Карта размеров экранов и брейкпоинтов</p>
                  </div>
                  <span className={styles.toolBadge}>Встроенный</span>
                </div>
              </button>
              <a href="https://whatismyviewport.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaTv /></div>
                <div className={styles.linkInfo}>
                  <h3>Viewport Size</h3>
                  <p>Определение размера viewport</p>
                </div>
              </a>
              <a href="https://lawsofux.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaBalanceScale /></div>
                <div className={styles.linkInfo}>
                  <h3>Laws of UX</h3>
                  <p>Законы UX-дизайна</p>
                </div>
              </a>
              <a href="https://wave.webaim.org" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaUniversalAccess /></div>
                <div className={styles.linkInfo}>
                  <h3>WAVE</h3>
                  <p>Проверка доступности сайта</p>
                </div>
              </a>
              <a href="https://contrast-ratio.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaAdjust /></div>
                <div className={styles.linkInfo}>
                  <h3>Contrast Ratio</h3>
                  <p>Проверка контрастности цветов</p>
                </div>
              </a>
            </div>
          </div>
        );
      
      case 'backend-api':
        return (
          <div className={styles.toolContent}>
            <h2><FaCog /> Backend / API</h2>
            <p className={styles.description}>Инструменты для серверной разработки</p>
            <div className={styles.linksGrid}>
              <a href="https://www.postman.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaMailBulk /></div>
                <div className={styles.linkInfo}>
                  <h3>Postman</h3>
                  <p>Тестирование API запросов</p>
                </div>
              </a>
              <a href="https://insomnia.rest" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaCloudMoon /></div>
                <div className={styles.linkInfo}>
                  <h3>Insomnia</h3>
                  <p>Альтернативный REST-клиент</p>
                </div>
              </a>
              <a href="https://httpbin.org" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaVial /></div>
                <div className={styles.linkInfo}>
                  <h3>HTTPBin</h3>
                  <p>Тестовый HTTP-сервер для запросов</p>
                </div>
              </a>
              <a href="https://jsonplaceholder.typicode.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaFolder /></div>
                <div className={styles.linkInfo}>
                  <h3>JSONPlaceholder</h3>
                  <p>Бесплатное fake REST API</p>
                </div>
              </a>
              <a href="https://mocky.io" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaMask /></div>
                <div className={styles.linkInfo}>
                  <h3>Mocky</h3>
                  <p>Создание mock API endpoints</p>
                </div>
              </a>
              <a href="https://swagger.io" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaFileAlt /></div>
                <div className={styles.linkInfo}>
                  <h3>Swagger</h3>
                  <p>Документация и дизайн API</p>
                </div>
              </a>
            </div>
          </div>
        );
      
      case 'testing':
        return (
          <div className={styles.toolContent}>
            <h2><FaFlask /> Тестирование</h2>
            <p className={styles.description}>Инструменты для тестирования и отладки</p>
            <div className={styles.linksGrid}>
              <a href="https://jestjs.io" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaVial /></div>
                <div className={styles.linkInfo}>
                  <h3>Jest</h3>
                  <p>JavaScript тестовый фреймворк</p>
                </div>
              </a>
              <a href="https://www.cypress.io" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><SiCypress /></div>
                <div className={styles.linkInfo}>
                  <h3>Cypress</h3>
                  <p>E2E тестирование для веба</p>
                </div>
              </a>
              <a href="https://playwright.dev" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaMask /></div>
                <div className={styles.linkInfo}>
                  <h3>Playwright</h3>
                  <p>Автоматизация браузеров от Microsoft</p>
                </div>
              </a>
              <a href="https://pagespeed.web.dev" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaBolt /></div>
                <div className={styles.linkInfo}>
                  <h3>PageSpeed Insights</h3>
                  <p>Анализ производительности сайта</p>
                </div>
              </a>
              <a href="https://gtmetrix.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaChartBar /></div>
                <div className={styles.linkInfo}>
                  <h3>GTmetrix</h3>
                  <p>Детальный анализ скорости загрузки</p>
                </div>
              </a>
              <a href="https://validator.w3.org" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaCheck /></div>
                <div className={styles.linkInfo}>
                  <h3>W3C Validator</h3>
                  <p>Проверка валидности HTML</p>
                </div>
              </a>
            </div>
          </div>
        );
      
      case 'images':
        return (
          <div className={styles.toolContent}>
            <h2><FaImage /> Изображения</h2>
            <p className={styles.description}>Работа с изображениями и иконками</p>
            <div className={styles.linksGrid}>
              <a href="https://squoosh.app" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaCompress /></div>
                <div className={styles.linkInfo}>
                  <h3>Squoosh</h3>
                  <p>Сжатие изображений от Google</p>
                </div>
              </a>
              <a href="https://tinypng.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaPaw /></div>
                <div className={styles.linkInfo}>
                  <h3>TinyPNG</h3>
                  <p>Умное сжатие PNG и JPEG</p>
                </div>
              </a>
              <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaCamera /></div>
                <div className={styles.linkInfo}>
                  <h3>Unsplash</h3>
                  <p>Бесплатные высококачественные фото</p>
                </div>
              </a>
              <a href="https://undraw.co" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaPaintBrush /></div>
                <div className={styles.linkInfo}>
                  <h3>unDraw</h3>
                  <p>Бесплатные SVG-иллюстрации</p>
                </div>
              </a>
              <a href="https://heroicons.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaShieldAlt /></div>
                <div className={styles.linkInfo}>
                  <h3>Heroicons</h3>
                  <p>Красивые SVG-иконки от Tailwind</p>
                </div>
              </a>
              <a href="https://react-icons.github.io/react-icons" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaAtom /></div>
                <div className={styles.linkInfo}>
                  <h3>React Icons</h3>
                  <p>Иконки для React-приложений</p>
                </div>
              </a>
              <a href="https://svgomg.net" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaMagic /></div>
                <div className={styles.linkInfo}>
                  <h3>SVGOMG</h3>
                  <p>Оптимизация SVG-файлов</p>
                </div>
              </a>
              <a href="https://placeholder.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaImages /></div>
                <div className={styles.linkInfo}>
                  <h3>Placeholder</h3>
                  <p>Генератор placeholder изображений</p>
                </div>
              </a>
            </div>
          </div>
        );
      
      case 'for-developers':
        return (
          <div className={styles.toolContent}>
            <h2><FaCode /> Для программистов</h2>
            <p className={styles.description}>Инструменты разработчика и редакторы кода</p>
            <div className={styles.linksGrid}>
              <a href="https://code.visualstudio.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaLaptopCode /></div>
                <div className={styles.linkInfo}>
                  <h3>VS Code</h3>
                  <p>Мощный редактор кода от Microsoft</p>
                </div>
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaGithub /></div>
                <div className={styles.linkInfo}>
                  <h3>GitHub</h3>
                  <p>Хостинг кода и совместная работа</p>
                </div>
              </a>
              <a href="https://stackoverflow.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaQuestionCircle /></div>
                <div className={styles.linkInfo}>
                  <h3>Stack Overflow</h3>
                  <p>Сообщество для решения проблем</p>
                </div>
              </a>
              <a href="https://www.docker.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaDocker /></div>
                <div className={styles.linkInfo}>
                  <h3>Docker</h3>
                  <p>Контейнеризация приложений</p>
                </div>
              </a>
              <a href="https://git-scm.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaCodeBranch /></div>
                <div className={styles.linkInfo}>
                  <h3>Git</h3>
                  <p>Система контроля версий</p>
                </div>
              </a>
              <a href="https://www.freecodecamp.org" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaGraduationCap /></div>
                <div className={styles.linkInfo}>
                  <h3>freeCodeCamp</h3>
                  <p>Бесплатные курсы по программированию</p>
                </div>
              </a>
            </div>
          </div>
        );
      
      case 'gamedev':
        return (
          <div className={styles.toolContent}>
            <h2><FaGamepad /> GameDev</h2>
            <p className={styles.description}>Инструменты для разработки игр</p>
            <div className={styles.linksGrid}>
              <a href="https://unity.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><SiUnity /></div>
                <div className={styles.linkInfo}>
                  <h3>Unity</h3>
                  <p>Популярный игровой движок</p>
                </div>
              </a>
              <a href="https://godotengine.org" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><SiGodotengine /></div>
                <div className={styles.linkInfo}>
                  <h3>Godot</h3>
                  <p>Бесплатный open-source движок</p>
                </div>
              </a>
              <a href="https://phaser.io" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaGamepad /></div>
                <div className={styles.linkInfo}>
                  <h3>Phaser</h3>
                  <p>HTML5 фреймворк для игр</p>
                </div>
              </a>
              <a href="https://www.piskelapp.com" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaPalette /></div>
                <div className={styles.linkInfo}>
                  <h3>Piskel</h3>
                  <p>Редактор пиксельной графики</p>
                </div>
              </a>
              <a href="https://www.aseprite.org" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaBrush /></div>
                <div className={styles.linkInfo}>
                  <h3>Aseprite</h3>
                  <p>Профессиональный пиксель-арт редактор</p>
                </div>
              </a>
              <a href="https://itch.io" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaDice /></div>
                <div className={styles.linkInfo}>
                  <h3>itch.io</h3>
                  <p>Платформа для публикации инди-игр</p>
                </div>
              </a>
              <a href="https://www.mapeditor.org" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaMap /></div>
                <div className={styles.linkInfo}>
                  <h3>Tiled</h3>
                  <p>Редактор 2D-карт и уровней</p>
                </div>
              </a>
              <a href="https://sfxr.me" target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkIcon}><FaVolumeUp /></div>
                <div className={styles.linkInfo}>
                  <h3>SFXR</h3>
                  <p>Генератор ретро звуковых эффектов</p>
                </div>
              </a>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={styles.extraPage}>
      <div className={styles.header}>
        <h1><FaStar /> Дополнительно</h1>
        <p className={styles.subtitle}>Дополнительные материалы и ресурсы для обучения</p>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.contentArea}>
          {renderContent()}
        </div>

        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h3><FaTools /> Инструменты</h3>
          </div>
          <nav className={styles.sidebarNav}>
            {tools.map(tool => (
              <button
                key={tool.id}
                className={`${styles.sidebarItem} ${activeTool === tool.id ? styles.active : ''}`}
                onClick={() => setActiveTool(tool.id)}
              >
                <span className={styles.sidebarIcon}>{tool.icon}</span>
                <span className={styles.sidebarText}>{tool.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Модальное окно CSS Gradient Generator */}
      {showGradientModal && (
        <div className={styles.modalOverlay} onClick={() => setShowGradientModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <CSSGradientGenerator />
          </div>
        </div>
      )}

      {/* Модальное окно Smooth Shadow Generator */}
      {showShadowModal && (
        <div className={styles.modalOverlay} onClick={() => setShowShadowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <SmoothShadowGenerator />
          </div>
        </div>
      )}

      {/* Модальное окно Neumorphism Generator */}
      {showNeumorphismModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNeumorphismModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <NeumorphismGenerator />
          </div>
        </div>
      )}

      {/* Модальное окно Clip-Path Generator */}
      {showClipPathModal && (
        <div className={styles.modalOverlay} onClick={() => setShowClipPathModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <ClipPathGenerator />
          </div>
        </div>
      )}

      {/* Модальное окно Cubic Bezier Generator */}
      {showCubicBezierModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCubicBezierModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <CubicBezierGenerator />
          </div>
        </div>
      )}

      {/* Модальное окно Glassmorphism Generator */}
      {showGlassmorphismModal && (
        <div className={styles.modalOverlay} onClick={() => setShowGlassmorphismModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <GlassmorphismGenerator />
          </div>
        </div>
      )}

      {/* Модальное окно Keyframes Generator */}
      {showKeyframesModal && (
        <div className={styles.modalOverlay} onClick={() => setShowKeyframesModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <KeyframesGenerator />
          </div>
        </div>
      )}

      {/* Модальное окно Waves Generator */}
      {showWavesModal && (
        <div className={styles.modalOverlay} onClick={() => setShowWavesModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <WavesGenerator />
          </div>
        </div>
      )}

      {/* Модальное окно Code Screenshot Generator */}
      {showCodeScreenshotModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCodeScreenshotModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <CodeScreenshotGenerator />
          </div>
        </div>
      )}

      {/* Модальное окно Screen Size Map */}
      {showScreenSizeMapModal && (
        <div className={styles.modalOverlay} onClick={() => setShowScreenSizeMapModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <ScreenSizeMap />
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentExtra;
