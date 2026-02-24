import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./AdminLayout.module.css";
import {
  AiOutlineUser, AiOutlineMessage, AiOutlineBell,
  AiOutlineLogout, AiOutlineClose,
} from "react-icons/ai";
import { HiUserGroup, HiMenuAlt3 } from "react-icons/hi";
import { MdOutlineMapsHomeWork, MdOutlineSpaceDashboard } from "react-icons/md";
import { CiShop } from "react-icons/ci";
import {
  FaTrophy, FaGraduationCap, FaCode, FaJs,
  FaStar, FaMusic, FaFilm, FaChevronLeft,
} from "react-icons/fa";
import { FaRegNoteSticky, FaQuestion } from "react-icons/fa6";
import { LuBookOpenText } from "react-icons/lu";
import { IoGameControllerOutline } from "react-icons/io5";
import { FiCalendar, FiMonitor } from "react-icons/fi";

const MENU = [
  {
    title: "Управление",
    items: [
      { to: "/admin",              end: true, icon: <AiOutlineUser />,          text: "Пользователи"     },
      { to: "/admin/groups",                  icon: <HiUserGroup />,             text: "Группы"           },
      { to: "/admin/leaderboard",             icon: <FaTrophy />,                text: "Рейтинг"          },
    ],
  },
  {
    title: "Обучение",
    items: [
      { to: "/admin/schedule",                icon: <FiCalendar />,              text: "Расписание"       },
      { to: "/admin/courses",                 icon: <FaGraduationCap />,         text: "Курсы"            },
      { to: "/admin/tests",                   icon: <FaRegNoteSticky />,         text: "Тесты"            },
      { to: "/admin/homeworks",               icon: <MdOutlineMapsHomeWork />,   text: "Домашние задания" },
      { to: "/admin/knowledge",               icon: <LuBookOpenText />,          text: "База знаний"      },
    ],
  },
  {
    title: "Интерактив",
    items: [
      { to: "/admin/quiz-battle",             icon: <FaQuestion />,              text: "Викторина"        },
      { to: "/admin/games",                   icon: <IoGameControllerOutline />, text: "Игры"             },
      { to: "/admin/flexchan",                icon: <FiMonitor />,               text: "FlexChan"         },
      { to: "/admin/layout-game",             icon: <FaCode />,                  text: "Верстка"          },
      { to: "/admin/js-game",                 icon: <FaJs />,                    text: "JavaScript"       },
    ],
  },
  {
    title: "Система",
    items: [
      { to: "/admin/user-levels",             icon: <FaStar />,                  text: "Уровни"           },
      { to: "/admin/chat",                    icon: <AiOutlineMessage />,        text: "Чат"              },
      { to: "/admin/shop",                    icon: <CiShop />,                  text: "Магазин"          },
      { to: "/admin/music",                   icon: <FaMusic />,                 text: "Музыка"           },
      { to: "/admin/movies",                  icon: <FaFilm />,                  text: "Фильмы"           },
      { to: "/admin/updates",                 icon: <AiOutlineBell />,           text: "Обновления"       },
    ],
  },
];

function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tooltip, setTooltip]       = useState(null);
  const tooltipTimer = useRef(null);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLogout = () => { logout(); navigate("/"); };

  const showTooltip = (text, e) => {
    if (!collapsed) return;
    clearTimeout(tooltipTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ text, top: rect.top + rect.height / 2 });
  };
  const hideTooltip = () => {
    tooltipTimer.current = setTimeout(() => setTooltip(null), 80);
  };

  const initials = (user?.full_name || user?.username || "A")
    .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const role = user?.role === "admin" ? "Администратор" : "Модератор";

  return (
    <div className={`${styles.layout} ${collapsed ? styles.layoutCollapsed : ""}`}>

      {/* ── TOPBAR ── */}
      <header className={styles.topbar}>
        <button className={styles.burgerBtn} onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
          {mobileOpen ? <AiOutlineClose /> : <HiMenuAlt3 />}
        </button>

        <div className={styles.topbarBrand}>
          <div className={styles.topbarLogo}>OP</div>
          <span className={styles.topbarTitle}>Admin Panel</span>
        </div>

        <div className={styles.topbarRight}>
          <button className={styles.topbarBtn} title="Уведомления">
            <AiOutlineBell />
          </button>
          <div className={styles.topbarUser}>
            <div className={styles.topbarAvatar}>{initials}</div>
            <div className={styles.topbarUserInfo}>
              <span className={styles.topbarUserName}>{user?.full_name || user?.username}</span>
              <span className={styles.topbarUserRole}>{role}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── MOBILE OVERLAY ── */}
      {mobileOpen && (
        <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarMobileOpen : ""}`}>

        {/* Logo area */}
        <div className={styles.sidebarHead}>
          <div className={styles.sidebarLogo}>
            <div className={styles.logoMark}>OP</div>
            {!collapsed && <span className={styles.logoLabel}>OpenWay</span>}
          </div>
          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? "Развернуть" : "Свернуть"}
          >
            <FaChevronLeft className={collapsed ? styles.collapseBtnFlipped : ""} />
          </button>
        </div>

        {/* User card */}
        <div className={styles.sidebarUser}>
          <div className={styles.sidebarUserAvatar}>{initials}</div>
          {!collapsed && (
            <div className={styles.sidebarUserInfo}>
              <span className={styles.sidebarUserName}>{user?.full_name || user?.username}</span>
              <span className={styles.sidebarUserRole}>{role}</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {MENU.map((section, si) => (
            <div key={si} className={styles.navSection}>
              {!collapsed && (
                <div className={styles.sectionLabel}>{section.title}</div>
              )}
              {collapsed && si > 0 && <div className={styles.sectionDivider} />}
              <ul className={styles.navList}>
                {section.items.map((item, ii) => (
                  <li key={ii}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
                      }
                      onMouseEnter={e => showTooltip(item.text, e)}
                      onMouseLeave={hideTooltip}
                    >
                      <span className={styles.navIcon}>{item.icon}</span>
                      {!collapsed && <span className={styles.navText}>{item.text}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={styles.sidebarFooter}>
          <button
            className={styles.logoutBtn}
            onClick={handleLogout}
            onMouseEnter={e => showTooltip("Выйти", e)}
            onMouseLeave={hideTooltip}
            title="Выйти"
          >
            <AiOutlineLogout />
            {!collapsed && <span>Выйти</span>}
          </button>
        </div>
      </aside>

      {/* Tooltip (collapsed mode) */}
      {tooltip && collapsed && (
        <div
          className={styles.tooltip}
          style={{ top: tooltip.top }}
          onMouseEnter={() => clearTimeout(tooltipTimer.current)}
          onMouseLeave={hideTooltip}
        >
          {tooltip.text}
        </div>
      )}

      {/* ── MAIN ── */}
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
