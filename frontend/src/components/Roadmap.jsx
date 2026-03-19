import { useEffect, useRef, useState } from "react";
import styles from "./Roadmap.module.css";

const VB_W = 1100;
const VB_H = 860;

// Path travels: top-center → right → down-right → sweep left-down
//               → left-up → far-left → up-left → sweep right-up
//               → back down through middle → bottom-center
const PATH_D =
  "M 550 62 " +
  "C 700 62 880 100 880 148 " +
  "C 960 192 1050 278 1012 368 " +
  "C 974 458 850 490 782 540 " +
  "C 714 590 572 630 492 648 " +
  "C 412 666 252 620 212 538 " +
  "C 172 456 72 388 90 308 " +
  "C 108 228 228 168 360 188 " +
  "C 492 208 600 308 640 388 " +
  "C 680 468 578 678 540 758";

const STEPS = [
  {
    num:"01", x:550,  y:62,  dir:"below",
    title:"Основы веба",       icon:"🌐", dur:"2 нед.",
    desc:"Фундамент любого разработчика — HTML-структура и CSS-стили страниц.",
    skills:["HTML5 & CSS3","Семантическая вёрстка","Flexbox & Grid","Адаптивный дизайн"],
  },
  {
    num:"02", x:880,  y:148, dir:"below",
    title:"JavaScript",        icon:"⚡",  dur:"4 нед.",
    desc:"Основной язык веба — делает страницы живыми и интерактивными.",
    skills:["Типы, функции, циклы","DOM & события","Fetch & Promises","ES6+ синтаксис"],
  },
  {
    num:"03", x:1012, y:368, dir:"left",
    title:"React",             icon:"⚛️", dur:"4 нед.",
    desc:"Самая популярная библиотека для создания пользовательских интерфейсов.",
    skills:["Компоненты & JSX","useState / useEffect","React Router","Context API"],
  },
  {
    num:"04", x:782,  y:540, dir:"left",
    title:"TypeScript",        icon:"🔷", dur:"2 нед.",
    desc:"Строгая типизация делает код надёжным, понятным и безопасным.",
    skills:["Типы & интерфейсы","Дженерики","Utility types","TS + React"],
  },
  {
    num:"05", x:492,  y:648, dir:"above",
    title:"Node.js & Express", icon:"🟢", dur:"3 нед.",
    desc:"JavaScript на сервере — создаём backend API для приложений.",
    skills:["HTTP & REST API","Express роутинг","Middleware","Работа с файлами"],
  },
  {
    num:"06", x:212,  y:538, dir:"right",
    title:"Базы данных",       icon:"🗄️", dur:"3 нед.",
    desc:"Хранение и управление данными — основа любого серьёзного приложения.",
    skills:["PostgreSQL & SQL","MongoDB","Prisma / Sequelize","Redis (кэш)"],
  },
  {
    num:"07", x:90,   y:308, dir:"right",
    title:"Аутентификация",    icon:"🔐", dur:"1 нед.",
    desc:"Безопасный вход и защита данных пользователей приложения.",
    skills:["JWT токены","bcrypt & пароли","OAuth 2.0","Куки & сессии"],
  },
  {
    num:"08", x:360,  y:188, dir:"below",
    title:"DevOps",            icon:"🐳", dur:"2 нед.",
    desc:"Инструменты для командной работы и автоматизации процессов.",
    skills:["Git & GitHub","Docker","CI/CD (GitHub Actions)","Linux CLI"],
  },
  {
    num:"09", x:640,  y:388, dir:"above",
    title:"Деплой",            icon:"☁️", dur:"1 нед.",
    desc:"Публикуем проект в интернет — теперь его видит весь мир.",
    skills:["VPS & Nginx","HTTPS & SSL","Vercel / Railway","Мониторинг"],
  },
  {
    num:"10", x:540,  y:758, dir:"above",
    title:"Full Stack проекты",icon:"🚀", dur:"8 нед.",
    desc:"Закрепляем знания на реальных проектах и готовим портфолио.",
    skills:["Портфолио проекты","Code review","Командная разработка","Карьерный старт"],
  },
];

const STARS = [
  [118,98],[292,58],[764,50],[1068,78],
  [1082,480],[1076,680],[888,762],
  [700,820],[330,800],[170,730],[480,820],
  [932,248],[730,248],[440,350],[200,252],
];

const MOUNTAINS = [
  {x:680,y:74}, {x:920,y:236}, {x:440,y:298},
  {x:152,y:436},{x:960,y:620},{x:354,y:818},
];

const TREES = [
  {x:720,y:620},{x:760,y:600},{x:740,y:580},
  {x:148,y:188},{x:180,y:172},{x:165,y:155},
];

function StarMark({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`} opacity="0.22">
      <line x1="0" y1="-6"  x2="0" y2="6"  stroke="#c9a84c" strokeWidth="1"/>
      <line x1="-6" y1="0"  x2="6" y2="0"  stroke="#c9a84c" strokeWidth="1"/>
      <line x1="-4" y1="-4" x2="4" y2="4"  stroke="#c9a84c" strokeWidth="0.6"/>
      <line x1="4"  y1="-4" x2="-4" y2="4" stroke="#c9a84c" strokeWidth="0.6"/>
    </g>
  );
}

function MountainMark({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`} opacity="0.2">
      <polygon points="0,-24 22,0 -22,0"  fill="none" stroke="#c9a84c" strokeWidth="1.4"/>
      <polygon points="14,-11 28,0 0,0"   fill="none" stroke="#c9a84c" strokeWidth="1.4"/>
    </g>
  );
}

function TreeMark({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`} opacity="0.15">
      <polygon points="0,-18 10,0 -10,0"  fill="none" stroke="#7db87d" strokeWidth="1.2"/>
      <polygon points="0,-10 7,4 -7,4"    fill="none" stroke="#7db87d" strokeWidth="1"/>
      <line x1="0" y1="4" x2="0" y2="10" stroke="#7db87d" strokeWidth="1.5"/>
    </g>
  );
}

// Region labels (parchment style)
const LABELS = [
  { x:940,  y:82,  text:"The Eastern Reaches" },
  { x:140,  y:128, text:"The Wilds" },
  { x:594,  y:720, text:"Journey's End" },
  { x:900,  y:700, text:"The Deep Forest" },
];

export default function Roadmap() {
  const sectionRef = useRef();
  const pathRef    = useRef();
  const [visible,  setVisible]  = useState(false);
  const [active,   setActive]   = useState(null);
  const [pathLen,  setPathLen]  = useState(9999);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.03 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (pathRef.current) setPathLen(pathRef.current.getTotalLength());
  }, []);

  return (
    <section id="roadmap" className={styles.section} ref={sectionRef}>
      <div className={styles.inner}>
        <p className={styles.tag}>Программа обучения</p>
        <h2 className={styles.heading}>Путь JS Full Stack разработчика</h2>
        <p className={styles.sub}>10 этапов — от нуля до готового портфолио</p>

        <div className={styles.mapWrap}>
          {/* ── SVG map canvas ─────────────────────────── */}
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className={styles.svg}
            preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id="rmBg" cx="38%" cy="35%" r="70%">
                <stop offset="0%"   stopColor="#16202e"/>
                <stop offset="100%" stopColor="#090d18"/>
              </radialGradient>
              <filter id="rmGlow">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              {/* Dot-grid as a pattern — 1 DOM node instead of 414 */}
              <pattern id="dotGrid" x="0" y="0"
                width={VB_W/23} height={VB_H/18}
                patternUnits="userSpaceOnUse">
                <circle cx={(VB_W/23)*0.5} cy={(VB_H/18)*0.5} r="0.8"
                  fill="rgba(200,180,100,0.055)"/>
              </pattern>
            </defs>

            {/* Background */}
            <rect width={VB_W} height={VB_H} fill="url(#rmBg)"/>

            {/* Dot grid — single pattern rect, replaces 414 circle nodes */}
            <rect width={VB_W} height={VB_H} fill="url(#dotGrid)"/>

            {/* Outer double border */}
            <rect x={12} y={12} width={VB_W-24} height={VB_H-24}
              fill="none" stroke="rgba(200,160,60,0.2)" strokeWidth="1.5"
              strokeDasharray="14 8" rx="8"/>
            <rect x={21} y={21} width={VB_W-42} height={VB_H-42}
              fill="none" stroke="rgba(200,160,60,0.07)" strokeWidth="1" rx="5"/>

            {/* Corner ornaments */}
            {[[56,52],[VB_W-56,52],[56,VB_H-52],[VB_W-56,VB_H-52]].map(([cx,cy],i)=>(
              <g key={i} opacity="0.52">
                <line x1={cx-20} y1={cy} x2={cx+20} y2={cy} stroke="#c9a84c" strokeWidth="1.5"/>
                <line x1={cx} y1={cy-20} x2={cx} y2={cy+20} stroke="#c9a84c" strokeWidth="1.5"/>
                <circle cx={cx} cy={cy} r="9" fill="none" stroke="#c9a84c" strokeWidth="1"/>
                <circle cx={cx} cy={cy} r="3.5" fill="#c9a84c"/>
              </g>
            ))}

            {/* Region labels (no blur filter) */}
            {LABELS.map((l,i)=>(
              <text key={i} x={l.x} y={l.y} textAnchor="middle"
                fill="rgba(200,165,70,0.16)" fontSize="10"
                fontFamily="serif" fontStyle="italic" letterSpacing="1">
                {l.text}
              </text>
            ))}

            {/* Stars, mountains, trees */}
            {STARS.map(([sx,sy],i) => <StarMark key={i} x={sx} y={sy}/>)}
            {MOUNTAINS.map(({x,y},i) => <MountainMark key={i} x={x} y={y}/>)}
            {TREES.map(({x,y},i) => <TreeMark key={i} x={x} y={y}/>)}

            {/* Compass rose — top-left open area */}
            <g transform="translate(108,668)" opacity="0.55">
              <polygon points="0,-26 5.5,-12 -5.5,-12" fill="#c9a84c"/>
              <polygon points="0,26 5.5,12 -5.5,12"    fill="rgba(200,160,60,0.38)"/>
              <polygon points="26,0 12,5.5 12,-5.5"    fill="rgba(200,160,60,0.38)"/>
              <polygon points="-26,0 -12,5.5 -12,-5.5" fill="rgba(200,160,60,0.38)"/>
              <circle r="7" fill="#090d18" stroke="#c9a84c" strokeWidth="1.5"/>
              <circle r="2.8" fill="#c9a84c"/>
              <text y={-33} textAnchor="middle" fill="#c9a84c" fontSize="10" fontFamily="serif">N</text>
              <text y={40} textAnchor="middle" fill="rgba(200,160,60,0.5)" fontSize="8" fontFamily="serif">S</text>
              <text x={34} y={4} textAnchor="middle" fill="rgba(200,160,60,0.5)" fontSize="8" fontFamily="serif">E</text>
              <text x={-34} y={4} textAnchor="middle" fill="rgba(200,160,60,0.5)" fontSize="8" fontFamily="serif">W</text>
            </g>

            {/* Scale ruler */}
            <g transform="translate(900,808)" opacity="0.35">
              <line x1="-70" y1="0" x2="70" y2="0" stroke="#c9a84c" strokeWidth="1"/>
              <line x1="-70" y1="-5" x2="-70" y2="5" stroke="#c9a84c" strokeWidth="1"/>
              <line x1="0"   y1="-3" x2="0"   y2="3" stroke="#c9a84c" strokeWidth="1"/>
              <line x1="70"  y1="-5" x2="70"  y2="5" stroke="#c9a84c" strokeWidth="1"/>
              <text textAnchor="middle" y={-9} fill="#c9a84c" fontSize="7.5" fontFamily="serif" letterSpacing="1">SCALE</text>
            </g>

            {/* Map credit */}
            <text x={VB_W/2} y={VB_H-14} textAnchor="middle"
              fill="rgba(200,160,60,0.13)" fontSize="10"
              fontFamily="serif" letterSpacing="8" fontStyle="italic">
              OPENWAY · SCHOOL OF CODE
            </text>

            {/* ── Road layers ── */}
            {/* 1. Worn base */}
            <path d={PATH_D} fill="none"
              stroke="rgba(135,95,28,0.42)" strokeWidth="12"
              strokeLinecap="round"/>
            {/* 2. Gravel texture */}
            <path d={PATH_D} fill="none"
              stroke="rgba(180,140,55,0.22)" strokeWidth="8"
              strokeLinecap="round" strokeDasharray="4 6"/>
            {/* 3. Edge highlight */}
            <path d={PATH_D} fill="none"
              stroke="rgba(240,210,100,0.1)" strokeWidth="4"
              strokeLinecap="round"/>
            {/* 5. Animated gold draw-on */}
            <path
              ref={pathRef}
              d={PATH_D}
              fill="none"
              stroke="#d4a843"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={pathLen}
              strokeDashoffset={visible ? 0 : pathLen}
              filter="url(#rmGlow)"
              style={{
                transition: visible
                  ? "stroke-dashoffset 4.5s cubic-bezier(0.22,1,0.36,1) 0.4s"
                  : "none",
              }}
            />
            {/* 6. Single marching-ant flow layer */}
            <path d={PATH_D} fill="none"
              stroke="rgba(240,210,80,0.22)" strokeWidth="3"
              strokeLinecap="round" strokeDasharray="7 20">
              <animate attributeName="stroke-dashoffset"
                from="0" to="-27"
                dur="1.1s" repeatCount="indefinite" calcMode="linear"/>
            </path>

            {/* 7. Particles — 3 sparks, no halo circles */}
            {[0, 1, 2].map(i => (
              <circle key={i} r={i === 1 ? 3.2 : 2.2}
                fill={i % 2 === 0 ? "#ffe566" : "#ffca28"}
                opacity={i === 1 ? 0.95 : 0.75}>
                <animateMotion dur="9s" begin={`${-(i * 3).toFixed(1)}s`}
                  repeatCount="indefinite"
                  keyPoints="0;1" keyTimes="0;1" calcMode="linear">
                  <mpath href="#rmRoadPath"/>
                </animateMotion>
              </circle>
            ))}

            {/* Hidden path reference for animateMotion */}
            <path id="rmRoadPath" d={PATH_D} fill="none" stroke="none"/>

            {/* ── Node markers ── */}
            {STEPS.map((step, i) => {
              const isLast = step.num === "10";
              const isAct  = active === i;
              const r      = isLast ? 31 : 23;
              const ri     = isLast ? 21 : 15;
              return (
                <g key={step.num} transform={`translate(${step.x},${step.y})`}>
                  {/* Active glow — plain circle, no SVG filter */}
                  {isAct && (
                    <circle r={r + 18} fill="rgba(212,168,67,0.15)"/>
                  )}   
                  {/* Outer ring */}
                  <circle r={r + 4}
                    fill="none"
                    stroke={isAct ? "rgba(240,210,80,0.3)" : "rgba(200,160,60,0.1)"}
                    strokeWidth="1.5"
                    strokeDasharray="5 4"
                    style={{transition:"stroke 0.3s"}}/>
                  {/* Main circle */}
                  <circle r={r}
                    fill={isAct ? "#0e1828" : "#0c1020"}
                    stroke={isAct ? "#e8c46a" : "rgba(200,160,60,0.5)"}
                    strokeWidth={isAct ? 2.5 : 1.5}
                    style={{transition:"stroke 0.25s, fill 0.25s"}}/>
                  {/* Inner ring */}
                  <circle r={ri}
                    fill={isAct ? "rgba(200,160,60,0.2)" : "rgba(200,160,60,0.06)"}
                    stroke="rgba(200,160,60,0.25)" strokeWidth="1"
                    style={{transition:"fill 0.25s"}}/>
                  {/* Number */}
                  <text textAnchor="middle" dominantBaseline="middle"
                    fill={isAct ? "#f0d060" : "#c9a84c"}
                    fontSize={isLast ? 13 : 11} fontWeight="700"
                    fontFamily="monospace" y="1" letterSpacing="0.5"
                    style={{transition:"fill 0.25s"}}>
                    {step.num}
                  </text>
                  {/* Title below node */}
                  <text textAnchor="middle"
                    fill={isAct ? "rgba(240,210,100,0.85)" : "rgba(220,195,130,0.55)"}
                    fontSize={isLast ? 11 : 9.5} fontFamily="serif" fontStyle="italic"
                    y={r + 16} style={{transition:"fill 0.25s"}}>
                    {step.title}
                  </text>
                  {/* Center dot */}
                  <circle r={2.8}
                    fill={isAct ? "#f0d060" : "#c9a84c"}
                    style={{transition:"fill 0.25s, r 0.25s"}}/>
                </g>
              );
            })}
          </svg>

          {/* ── HTML hit areas + tooltips ── */}
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className={styles.hitArea}
              style={{
                left: `${(step.x / VB_W * 100).toFixed(3)}%`,
                top:  `${(step.y / VB_H * 100).toFixed(3)}%`,
              }}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(active === i ? null : i)}
            >
              <div className={[
                styles.tooltip,
                active === i ? styles.tooltipOn : "",
                step.dir === "right" ? styles.ttRight :
                step.dir === "left"  ? styles.ttLeft  :
                step.dir === "above" ? styles.ttAbove : styles.ttBelow,
              ].filter(Boolean).join(" ")}>
                <div className={styles.ttHeader}>
                  <span className={styles.ttIcon}>{step.icon}</span>
                  <div className={styles.ttMeta}>
                    <span className={styles.ttNum}>{step.num}</span>
                    <span className={styles.ttTitle}>{step.title}</span>
                  </div>
                  <span className={styles.ttDur}>{step.dur}</span>
                </div>
                <p className={styles.ttDesc}>{step.desc}</p>
                <ul className={styles.ttSkills}>
                  {step.skills.map(s => <li key={s}>{s}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
