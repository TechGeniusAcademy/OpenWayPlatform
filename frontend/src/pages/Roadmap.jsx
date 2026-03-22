import { useState, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, useGLTF, Environment } from "@react-three/drei";
import BG_OBJECTS from "./roadmapBackground";
import * as THREE from "three";
import styles from "./Roadmap.module.css";
import { FaHtml5, FaJs, FaReact, FaNodeJs, FaDatabase, FaLock, FaServer, FaRocket, FaCogs, FaBriefcase, FaPalette, FaSitemap, FaFlask, FaCubes, FaClock, FaMousePointer, FaArrowsAlt, FaSearchPlus } from "react-icons/fa";
import { SiTypescript, SiPrisma } from "react-icons/si";

// ════════════════════════════════════════════════════════════════════════════
//  КАК ДОБАВИТЬ ВЕТКУ / УЗЕЛ — ПОЛНЫЙ ГАЙД
// ════════════════════════════════════════════════════════════════════════════
//
//  СИСТЕМА КООРДИНАТ Three.js:
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │   Y  (вверх/вниз)           X  (влево/вправо)    Z (к нам/от нас)  │
//  │   +Y = выше на экране       +X = правее           +Z = ближе к нам │
//  │   -Y = ниже на экране       -X = левее            -Z = дальше      │
//  │                                                                     │
//  │   pos: [X, Y, Z]  — 3D-позиция узла                                │
//  │   Единица ≈ 1 игровая единица Three.js (камера на дистанции ~18)   │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ТЕКУЩАЯ СХЕМА (вид сверху — ось Z):
//
//              [0, 8, 0]  id:1  HTML/CSS  ← ROOT (верхний центр)
//                   |
//              [0, 5, 0]  id:2  JavaScript
//             /    |    \
//   [-3.5,2,0]  [0,2,0]  [3.5,2,0]    ← ветки влево / прямо / вправо
//     id:3 Git           id:4 React
//                              |
//                        [3.5,-1,0] id:5 TypeScript  ← прямо вниз
//
//  КАК ДОБАВИТЬ НОВЫЙ УЗЕЛ:
//  ─────────────────────────
//  Шаг 1. Добавь в STEPS (данные):
//    {
//      id: 12,                    ← уникальный номер
//      icon: "🎯",
//      category: "frontend",      ← одна из: basics/frontend/backend/advanced/final
//      title: "Testing",
//      duration: "2 нед.",
//      desc: "Короткое описание",
//      skills: ["Jest", "Vitest", "RTL", "E2E", "Cypress"],
//      details: "Полное описание для модалки",
//    },
//
//  Шаг 2. Добавь в TREE_NODES (позиция):
//    { id: 12, parent: 4, pos: [6, 2, 0] },
//                   ↑              ↑
//             parent id        позиция [X, Y, Z]
//
//  ПРАВИЛА ПОЗИЦИОНИРОВАНИЯ:
//  ─────────────────────────
//  • Ветка вправо от родителя:      pos родителя + [+3.5, 0, 0]
//  • Ветка влево от родителя:       pos родителя + [-3.5, 0, 0]
//  • Ветка вниз (продолжение):      pos родителя + [0, -3, 0]
//  • Ветка вперёд (3D-глубина):     pos родителя + [0, 0, +3]
//  • Ветка назад (3D-глубина):      pos родителя + [0, 0, -3]
//  • Диагональ вниз-вправо:         pos родителя + [+3, -3, 0]
//  • Диагональ вниз-влево:          pos родителя + [-3, -3, 0]
//
//  ПРИМЕРЫ НАПРАВЛЕНИЙ ВЕТОК ОТ УЗЛА [0, 0, 0]:
//  ─────────────────────────────────────────────
//  [  3.5,   0,   0] — прямо вправо
//  [ -3.5,   0,   0] — прямо влево
//  [    0,   3,   0] — вверх
//  [    0,  -3,   0] — вниз
//  [    0,   0,   3] — вперёд (3D)
//  [    0,   0,  -3] — назад (3D)
//  [  2.5,  -2.5, 2] — диагональ в 3D (x, y, z все разные)
//
//  КАТЕГОРИИ (цвет ветки определяется категорией ДОЧЕРНЕГО узла):
//  ───────────────────────────────────────────────────────────────
//  "basics"   → зелёный  #22c55e
//  "frontend" → синий    #818cf8
//  "backend"  → оранжевый #f97316
//  "advanced" → фиолетовый #a78bfa
//  "final"    → жёлтый   #f59e0b
//  Можно добавить новую: просто внеси её в объект CATEGORIES ниже
//
// ════════════════════════════════════════════════════════════════════════════

const CATEGORIES = {
  basics: { label: "Основы", color: "#22c55e" },
  frontend: { label: "Frontend", color: "#818cf8" },
  backend: { label: "Backend", color: "#f97316" },
  advanced: { label: "Продвинутый", color: "#a78bfa" },
  final: { label: "Проект", color: "#f59e0b" },
  devops: { label: "DevOps", color: "#38bdf8" },
  projects: { label: "Проекты", color: "#fbbf24" },
};

const STEPS = [
  {
    // Точка соединения
    id: 999,
    category: "basics",
    title: "",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    // Точка соединения
    id: 998,
    category: "basics",
    title: "",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    // Точка соединения
    id: 997,
    category: "basics",
    title: "",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    // Точка соединения
    id: 996,
    category: "basics",
    title: "",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    // Точка соединения
    id: 995,
    category: "basics",
    title: "",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    // Точка соединения
    id: 994,
    category: "basics",
    title: "",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    // Точка соединения
    id: 993,
    category: "basics",
    title: "",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    // Точка соединения
    id: 992,
    category: "basics",
    title: "",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    // Точка соединения
    id: 991,
    category: "basics",
    title: "",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    // Точка соединения
    id: 990,
    category: "basics",
    title: "",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    // Точка соединения
    id: 989,
    category: "basics",
    title: "",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    id: 1,
    icon: FaHtml5,
    category: "basics",
    title: "HTML5",
    duration: "3 нед.",
    desc: "Фундамент любого сайта — структура и визуальное оформление страниц.",
    skills: ["HTML5 семантика", "CSS Flexbox", "CSS Grid", "Адаптив & медиазапросы", "CSS анимации", "BEM методология"],
    details: "Начни с HTML — языка разметки, который задаёт структуру страницы. Затем CSS: оформляй элементы, работай с Flexbox и Grid-раскладкой, делай адаптивные сайты под разные устройства.",
  },
  {
    id: 2,
    category: "basics",
    title: "Базовые теги",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    id: 3,
    category: "basics",
    title: "Ссылки и навигация",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    id: 4,
    category: "basics",
    title: "Вставка медиа",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    id: 5,
    category: "basics",
    title: "Списки",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    id: 6,
    category: "basics",
    title: "Формы",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    id: 7,
    category: "basics",
    title: "Семантика",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    id: 8,
    category: "basics",
    title: "Основы SEO",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    id: 9,
    category: "basics",
    title: "Атрибуты",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    id: 10,
    category: "basics",
    title: "Валидация HTML",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  // CSS
  {
    id: 11,
    category: "basics",
    title: "Селекторы",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    id: 12,
    category: "basics",
    title: "Каскадность",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    id: 13,
    category: "basics",
    title: "Цвета и шрифты",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    id: 10,
    category: "basics",
    title: "Box Model",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    id: 14,
    category: "basics",
    title: "Flexbox",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    id: 15,
    category: "basics",
    title: "Grid Layout",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    id: 16,
    category: "basics",
    title: "Позиционирование",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    id: 17,
    category: "basics",
    title: "Адаптивная верстка",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    id: 18,
    category: "basics",
    title: "Единицы измерения",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    id: 19,
    category: "basics",
    title: "Анимации и переходы",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    id: 20,
    category: "basics",
    title: "Псевдоклассы и псевдоэлементы",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
  {
    id: 21,
    category: "basics",
    title: "BEM, модульный CSS",
    duration: "",
    desc: "",
    skills: [],
    details: "",
  },
];

// ── Tree layout: position each node in 3D space ────────────────────────────
// Root is top. Each category branches out. Layout computed manually for clarity.

// СИСТЕМА КООРДИНАТ:
//   pos: [X, Y, Z]
//   +X = правее,  -X = левее
//   +Y = выше,    -Y = ниже
//   +Z = ближе,   -Z = дальше (3D)
const TREE_NODES = [
  // HTML - Start
  { id: 1, parent: null, pos: [0, 8, 0], bg: "black", color: "white" },
  { id: 2, parent: 1, pos: [0, 7, 0], lineStyle: "dashed", color: "grey", bg: "white" },
  { id: 3, parent: 2, pos: [3, 7, 0], lineStyle: "dashed", color: "grey", bg: "white" },
  { id: 4, parent: 3, pos: [3, 6, 0], lineStyle: "dashed", color: "grey", bg: "white" },
  { id: 5, parent: 4, pos: [0, 6, 0], lineStyle: "dashed", color: "grey", bg: "white" },
  { id: 6, parent: 5, pos: [0, 5, 0], lineStyle: "dashed", color: "grey", bg: "white" },
  { id: 7, parent: 6, pos: [3, 5, 0], lineStyle: "dashed", color: "grey", bg: "white" },
  { id: 8, parent: 7, pos: [3, 4, 0], lineStyle: "dashed", color: "grey", bg: "white" },
  { id: 9, parent: 8, pos: [0, 4, 0], lineStyle: "dashed", color: "grey", bg: "white" },
  { id: 10, parent: 9, pos: [0, 3, 0], lineStyle: "dashed", color: "grey", bg: "white" },
  // CSS - Start
  { id: 11, parent: 1, pos: [8, 8, 0], lineStyle: "solid", color: "white", bg: "black" },
  { id: 12, parent: 11, pos: [12, 8, 0], lineStyle: "dashed", color: "grey", bg: "white" },
  { id: 13, parent: 12, pos: [12, 7, 0], lineStyle: "dashed", color: "grey", bg: "white" },
  { id: 14, parent: 13, pos: [8, 7, 0], lineStyle: "dashed", color: "grey", bg: "white" },
  { id: 15, parent: 14, pos: [8, 6, 0], lineStyle: "dashed", color: "grey", bg: "white" },
  { id: 16, parent: 15, pos: [12, 6, 0], lineStyle: "dashed", color: "grey", bg: "white" },
  { id: 17, parent: 16, pos: [12, 5, 0], lineStyle: "dashed", color: "grey", bg: "white" },
  { id: 18, parent: 17, pos: [8, 5, 0], lineStyle: "dashed", color: "grey", bg: "white" },
  { id: 19, parent: 18, pos: [8, 4, 0], lineStyle: "dashed", color: "grey", bg: "white" },
  { id: 20, parent: 19, pos: [12, 4, 0], lineStyle: "dashed", color: "grey", bg: "white" },
  { id: 21, parent: 20, pos: [12, 3, 0], lineStyle: "dashed", color: "grey", bg: "white" },
];

const childMap = {};
TREE_NODES.forEach((n) => {
  if (n.parent !== null) {
    if (!childMap[n.parent]) childMap[n.parent] = [];
    childMap[n.parent].push(n.id);
  }
});

// ── Edge (line between two nodes) ──────────────────────────────────────────
//
//  Доступные стили линий (передаются через TREE_NODES → lineStyle):
//  ─────────────────────────────────────────────────────────────────
//  "solid"   — прямая сплошная линия          (по умолчанию)
//  "dashed"  — прямая пунктирная линия
//  "dotted"  — прямая точечная линия (мелкий пунктир)
//  "curved"  — плавная дуга через промежуточную точку
//  "step"    — угол 90° (L-образная ломаная, как в блок-схемах)
//
//  Пример использования в TREE_NODES:
//    { id: 3, parent: 1, pos: [-3.5, 2, 0], lineStyle: "dashed" }
//
function Edge({ from, to, color, lineStyle = "solid" }) {
  const geo = useMemo(() => {
    let points;
    if (lineStyle === "curved") {
      const ctrl = new THREE.Vector3((from[0] + to[0]) / 2, Math.max(from[1], to[1]) + 1.5, (from[2] + to[2]) / 2);
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(...from), ctrl, new THREE.Vector3(...to));
      points = curve.getPoints(40);
    } else if (lineStyle === "step") {
      const midY = (from[1] + to[1]) / 2;
      points = [new THREE.Vector3(...from), new THREE.Vector3(from[0], midY, from[2]), new THREE.Vector3(to[0], midY, to[2]), new THREE.Vector3(...to)];
    } else {
      points = [new THREE.Vector3(...from), new THREE.Vector3(...to)];
    }
    const g = new THREE.BufferGeometry().setFromPoints(points);
    if (lineStyle === "dashed" || lineStyle === "dotted") {
      const dists = new Float32Array(points.length);
      dists[0] = 0;
      for (let i = 1; i < points.length; i++) {
        dists[i] = dists[i - 1] + points[i - 1].distanceTo(points[i]);
      }
      g.setAttribute("lineDistance", new THREE.BufferAttribute(dists, 1));
    }
    return g;
  }, [from, to, lineStyle]);

  if (lineStyle === "dashed") {
    return (
      <line geometry={geo}>
        <lineDashedMaterial color={color} transparent opacity={0.55} dashSize={0.4} gapSize={0.25} />
      </line>
    );
  }
  if (lineStyle === "dotted") {
    return (
      <line geometry={geo}>
        <lineDashedMaterial color={color} transparent opacity={0.55} dashSize={0.07} gapSize={0.2} />
      </line>
    );
  }
  return (
    <line geometry={geo}>
      <lineBasicMaterial color={color} transparent opacity={0.4} />
    </line>
  );
}

// ── Single node sphere + Html label ────────────────────────────────────────
//
//  Доступные свойства узла (TREE_NODES):
//  ──────────────────────────────────────────────────────────────────────────
//  lineStyle: "solid" | "dashed" | "dotted" | "curved" | "step"
//  color:  "#ffffff"   — цвет текста метки    (по умолчанию: #cbd5e1)
//  bg:     "#1e293b"   — фон метки            (по умолчанию: прозрачный)
//
//  Пример:
//    { id: 3, parent: 1, pos: [-3.5, 2, 0], lineStyle: "dashed", color: "#f97316", bg: "#1c0a00" }
//
function Node({ step, node, active, setActive }) {
  const cat = CATEGORIES[step.category];
  const isActive = active?.id === step.id;

  const labelStyle = {
    pointerEvents: "all",
    cursor: "pointer",
    ...(node.color && { color: node.color }),
    ...(node.bg && { background: node.bg, padding: "2px 8px", borderRadius: "5px" }),
  };

  return (
    <group position={node.pos}>
      {/* Html tag — скрывается когда открыто модальное окно */}
      {!active && (
        <Html center distanceFactor={14} style={{ pointerEvents: "none", userSelect: "none" }}>
          <div className={`${styles.nodeLabel} ${isActive ? styles.nodeLabelActive : ""}`} style={{ "--c": cat.color }}>
            <span
              className={styles.nodeTitle}
              style={labelStyle}
              // onClick={e => { e.stopPropagation(); setActive(isActive ? null : step); }} // TODO: вернуть модальное окно
            >
              {step.title}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Single background GLB object ──────────────────────────────────────────
function BgObject({ cfg }) {
  const { scene } = useGLTF(cfg.file);
  const ref = useRef();

  // Clone so multiple instances don't share the same scene graph
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    if (cfg.opacity !== undefined && cfg.opacity < 1) {
      c.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          obj.material = obj.material.clone();
          obj.material.transparent = true;
          obj.material.opacity = cfg.opacity;
        }
      });
    }
    return c;
  }, [scene, cfg.opacity]);

  useFrame(() => {
    if (!ref.current || !cfg.spin) return;
    if (cfg.spin.x) ref.current.rotation.x += cfg.spin.x;
    if (cfg.spin.y) ref.current.rotation.y += cfg.spin.y;
    if (cfg.spin.z) ref.current.rotation.z += cfg.spin.z;
  });

  const rot = cfg.rotation ?? [0, 0, 0];
  const scl = Array.isArray(cfg.scale) ? cfg.scale : [cfg.scale, cfg.scale, cfg.scale];

  return (
    <primitive
      ref={ref}
      object={cloned}
      position={cfg.pos}
      scale={scl}
      rotation={rot}
    />
  );
}

// ── All background GLB objects from config ─────────────────────────────────
function BackgroundObjects() {
  return (
    <>
      {BG_OBJECTS.map((cfg) => (
        <BgObject key={cfg.id} cfg={cfg} />
      ))}
    </>
  );
}

// ── Animated nebula background ────────────────────────────────────────────
function Nebula() {
  const ref = useRef();
  const COUNT = 600;
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    // palette: colored nebula particles + plenty of white stars
    const palette = [
      [0.49, 0.55, 0.97], // indigo  #818cf8
      [0.13, 0.77, 0.37], // green   #22c55e
      [0.98, 0.45, 0.09], // orange  #f97316
      [0.65, 0.54, 0.98], // purple  #a78bfa
      [0.22, 0.74, 0.97], // cyan    #38bdf8
      [1.0, 1.0, 1.0],    // white stars (×4 weight)
      [1.0, 1.0, 1.0],
      [1.0, 1.0, 1.0],
      [1.0, 1.0, 1.0],
    ];
    for (let i = 0; i < COUNT; i++) {
      const r     = 18 + Math.random() * 60;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.5;
      pos[i * 3 + 2] = r * Math.cos(phi) - 38;
      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    return { positions: pos, colors: col };
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime();
      ref.current.rotation.y = t * 0.013;
      ref.current.rotation.z = t * 0.007;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={COUNT} itemSize={3} />
        <bufferAttribute attach="attributes-color"    array={colors}    count={COUNT} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial vertexColors size={0.09} transparent opacity={0.92} sizeAttenuation />
    </points>
  );
}

// ── Full scene ──────────────────────────────────────────────────────────────
function Scene({ active, setActive }) {
  return (
    <>
      <Nebula />
      <BackgroundObjects />
      {/* Environment IBL — освещает GLB-модели без привязки к позиции */}
      <Environment preset="night" />
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 10, 0]} intensity={1.2} color="#818cf8" />
      <pointLight position={[-8, -6, 4]} intensity={0.6} color="#22c55e" />
      <pointLight position={[8, -6, -4]} intensity={0.6} color="#f97316" />
      {/* Отдельный свет для планеты */}
      <pointLight position={[22, 4, -14]} intensity={2.5} color="#ffffff" />

      {/* Edges */}
      {TREE_NODES.map((node) => {
        if (node.parent === null) return null;
        const parentNode = TREE_NODES.find((n) => n.id === node.parent);
        const step = STEPS.find((s) => s.id === node.id);
        const cat = CATEGORIES[step.category];
        return <Edge key={`e-${node.id}`} from={parentNode.pos} to={node.pos} color={cat.color} lineStyle={node.lineStyle} />;
      })}

      {/* Nodes */}
      {TREE_NODES.map((node) => {
        const step = STEPS.find((s) => s.id === node.id);
        return <Node key={node.id} step={step} node={node} active={active} setActive={setActive} />;
      })}
    </>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────
export default function Roadmap() {
  const [active, setActive] = useState(null);

  return (
    <section className={styles.roadmap}>
      {/* Header */}
      <div className={styles.header}>
        <p className={styles.eyebrow}>Программа обучения</p>
        <h2 className={styles.title}>Путь Full Stack JS разработчика</h2>
        <p className={styles.sub}>Нажми на узел чтобы узнать подробнее · Перетащи для вращения</p>
      </div>

      {/* 3D Canvas */}
      <div className={styles.canvasWrap}>
        <Canvas camera={{ position: [0, 0.5, 18], fov: 55 }} style={{ background: "transparent" }} gl={{ antialias: true, alpha: true }}>
          <Scene active={active} setActive={setActive} />
          <OrbitControls enableRotate={false} enablePan={true} enableZoom={true} mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }} minDistance={8} maxDistance={30} makeDefault />
        </Canvas>

        {/* Hint */}
        <p className={styles.canvasHint}>
          <FaMousePointer style={{ verticalAlign: "middle" }} /> Нажми на узел &nbsp;·&nbsp;
          <FaArrowsAlt style={{ verticalAlign: "middle" }} /> Зажми ЛКМ для перемещения &nbsp;·&nbsp;
          <FaSearchPlus style={{ verticalAlign: "middle" }} /> Колёсико для зума
        </p>
      </div>

      {/* Info panel */}
      {active && (
        <div className={styles.overlay} onClick={() => setActive(null)}>
          <div className={styles.modal} style={{ "--cat-color": CATEGORIES[active.category].color }} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setActive(null)}>
              ✕
            </button>
            <div className={styles.modalHead}>
              <span className={styles.modalIcon}>
                <active.icon />
              </span>
              <div>
                <span className={styles.catBadge}>{CATEGORIES[active.category].label}</span>
                <h3 className={styles.modalTitle}>{active.title}</h3>
                <p className={styles.modalDur}>
                  <FaClock style={{ marginRight: 4, verticalAlign: "middle" }} /> {active.duration}
                </p>
              </div>
            </div>
            <p className={styles.modalDetails}>{active.details}</p>
            <p className={styles.skillsLabel}>Что изучишь:</p>
            <div className={styles.modalSkills}>
              {active.skills.map((s) => (
                <span key={s} className={styles.modalSkill}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
