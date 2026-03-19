import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const LINES = ["Учись.", "Создавай.", "Развивайся."];
const CHAR_MS  = 70;
const PAUSE_MS = 1200;
const DELETE_MS = 40;

function TypedH1() {
  const [lineIdx, setLineIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const cursorId = setInterval(() => setShowCursor(c => !c), 530);
    return () => clearInterval(cursorId);
  }, []);

  useEffect(() => {
    const full = LINES[lineIdx];
    if (!deleting && displayed.length < full.length) {
      const id = setTimeout(() => setDisplayed(full.slice(0, displayed.length + 1)), CHAR_MS);
      return () => clearTimeout(id);
    }
    if (!deleting && displayed.length === full.length) {
      // last line — stay forever
      if (lineIdx === LINES.length - 1) return;
      const id = setTimeout(() => setDeleting(true), PAUSE_MS);
      return () => clearTimeout(id);
    }
    if (deleting && displayed.length > 0) {
      const id = setTimeout(() => setDisplayed(displayed.slice(0, -1)), DELETE_MS);
      return () => clearTimeout(id);
    }
    if (deleting && displayed.length === 0) {
      setDeleting(false);
      setLineIdx(i => (i + 1) % LINES.length);
    }
  }, [displayed, deleting, lineIdx]);

  return (
    <h1 style={{
      fontSize: "clamp(48px, 5.5vw, 82px)",
      fontWeight: 900,
      lineHeight: 1.05,
      letterSpacing: "-2px",
      color: "#f1f5f9",
      margin: 0,
      minHeight: "1.1em",
      fontFamily: "inherit",
    }}>
      {displayed}
      <span style={{
        display: "inline-block",
        width: "3px",
        height: "0.85em",
        background: "#818cf8",
        marginLeft: "4px",
        verticalAlign: "middle",
        borderRadius: "1px",
        opacity: showCursor ? 1 : 0,
        transition: "opacity 0.1s",
      }} />
    </h1>
  );
}
import styles from "./LandingPage.module.css";
import BongoCat from "../components/BongoCat";
import SignupModal from "../components/SignupModal";
import Roadmap from "../components/Roadmap";

// Burn shapes: [cxPct, cyPct, startP, rate, polygonPoints]
// Each shape is a unique irregular polygon centered at (0,0), unit scale.
// Positions are percent of screen; js converts to px and applies scale via transform.
const BURN_SHAPES = [
  // 0 — center: 11-sided organic blob, ignites first
  [0.50, 0.50, 0.00, 1.00,
   "0.82,0.12 0.55,0.72 0.10,1.02 -0.48,0.88 -0.92,0.38 -0.98,-0.08 -0.72,-0.62 -0.35,-0.98 0.22,-1.05 0.72,-0.75 0.95,-0.28"],
  // 1 — top-left corner: stretched toward upper-left
  [0.13, 0.17, 0.10, 0.78,
   "1.08,-0.05 0.78,0.72 0.18,1.08 -0.52,0.92 -0.98,0.32 -1.02,-0.28 -0.72,-0.82 0.08,-1.08 0.72,-0.88"],
  // 2 — top-right corner: triangular leaning right
  [0.87, 0.15, 0.16, 0.74,
   "0.52,-1.08 1.12,-0.12 0.88,0.62 0.18,1.05 -0.58,0.82 -1.05,0.08 -0.85,-0.62 -0.18,-1.02 0.38,-1.05"],
  // 3 — bottom-left corner: wide squat shape
  [0.07, 0.78, 0.22, 0.67,
   "1.12,-0.08 0.82,0.62 0.18,1.12 -0.58,0.90 -1.08,0.18 -1.05,-0.48 -0.52,-1.02 0.22,-1.12 0.85,-0.72"],
  // 4 — bottom-right corner: tall narrow teardrop
  [0.93, 0.81, 0.14, 0.71,
   "0.48,-1.10 1.05,-0.22 1.12,0.52 0.58,1.02 -0.18,1.12 -0.82,0.62 -1.02,-0.12 -0.72,-0.82 -0.12,-1.15"],
  // 5 — top edge center: very wide flat oval
  [0.50, 0.03, 0.27, 0.57,
   "1.22,-0.05 0.95,0.58 0.28,0.88 -0.32,0.92 -0.95,0.55 -1.22,-0.02 -0.92,-0.58 -0.28,-0.88 0.32,-0.92 0.92,-0.60"],
  // 6 — left edge mid: tall elongated
  [0.02, 0.47, 0.32, 0.53,
   "0.58,-1.12 1.02,-0.28 0.98,0.42 0.48,1.08 -0.22,1.12 -0.78,0.52 -1.02,-0.22 -0.82,-0.88 -0.12,-1.18"],
  // 7 — right edge mid: spiky asymmetric
  [0.98, 0.44, 0.19, 0.61,
   "0.28,-1.18 1.08,-0.38 1.02,0.42 0.38,1.08 -0.38,0.95 -0.98,0.28 -1.05,-0.45 -0.38,-1.12"],
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // ── Burn-reveal refs ──
  const tunnelRef  = useRef();
  const holeRefs   = useRef([]);
  const rafPending = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (rafPending.current) return;
      rafPending.current = true;
      requestAnimationFrame(() => {
        rafPending.current = false;
        const tunnel = tunnelRef.current;
        if (!tunnel) return;
        const rect       = tunnel.getBoundingClientRect();
        const scrollDist = tunnel.offsetHeight - window.innerHeight;
        const p          = Math.max(0, Math.min(1, -rect.top / scrollDist));
        const diag       = Math.hypot(window.innerWidth, window.innerHeight);

        // Grow each shape with its own ignition delay, speed, and unique polygon form
        const W = window.innerWidth;
        const H = window.innerHeight;
        BURN_SHAPES.forEach(([cxP, cyP, startP, rate], i) => {
          const lp = Math.max(0, (p - startP) / Math.max(0.001, 1 - startP));
          const r  = lp * rate * diag * 0.58;
          const cx = (cxP * W).toFixed(1);
          const cy = (cyP * H).toFixed(1);
          if (holeRefs.current[i]) {
            holeRefs.current[i].setAttribute("transform", `translate(${cx} ${cy}) scale(${r})`);
          }
        });
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.heroBg} />

      {/* ━━━ NAVBAR ━━━ */}
      <header className={styles.navbar}>
        <a href="/" className={styles.navLogo}>
          <img src="/openway-logo.png" alt="" />
          <span>Open<em>Way</em></span>
        </a>
        <nav className={`${styles.navCenter} ${menuOpen ? styles.navCenterOpen : ""}`}>
          <a href="#about"    className={styles.navItem}>О платформе</a>
          <a href="#features" className={styles.navItem}>Возможности</a>
          <a href="#courses"  className={styles.navItem}>Курсы</a>
          <a href="#contact"  className={styles.navItem}>Контакты</a>
        </nav>
        <div className={styles.navRight}>
          <button className={styles.navLoginBtn} onClick={() => navigate("/login")}>
            Войти →
          </button>
          <button
            className={`${styles.burger} ${menuOpen ? styles.burgerOpen : ""}`}
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Меню"
          >
            <span /><span /><span />
          </button>
        </div>
      </header>

      {/* ━━━ HERO ━━━ */}
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <TypedH1 />
          <p className={styles.heroDesc}>
            Школа программирования Open way в Талдыкоргане. Приглашает вас попробовать себя в изучении программного кода.
          </p>
          <button className={styles.heroBtn} onClick={() => setShowModal(true)}>
            Записаться →
          </button>
        </div>

        <div className={styles.heroRight}>
          <BongoCat />
        </div>

        {/* Scroll nudge */}
        <div className={styles.scrollHint}>
          <span>прокрути</span>
          <svg viewBox="0 0 18 18">
            <polyline points="3,6 9,13 15,6"/>
          </svg>
        </div>
      </section>

      {/* ━━━ BURN-REVEAL SCROLL TUNNEL ━━━ */}
      

      {showModal && <SignupModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
