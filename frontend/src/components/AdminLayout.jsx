import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './AdminLayout.module.css';
import { AiOutlineUser, AiOutlineMessage, AiOutlineMenu, AiOutlineClose, AiOutlineBell } from "react-icons/ai";
import { HiUserGroup } from "react-icons/hi";
import { MdOutlineMapsHomeWork } from "react-icons/md";
import { CiShop } from "react-icons/ci";
import { FaTrophy, FaGraduationCap, FaCode, FaJs, FaStar, FaMusic } from "react-icons/fa";
import { BsKeyboard } from "react-icons/bs";
import { FaRegNoteSticky, FaQuestion } from "react-icons/fa6";
import { LuBookOpenText } from "react-icons/lu";
import { AiOutlineSend } from "react-icons/ai";
import { IoGameControllerOutline } from "react-icons/io5";

function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const menuSections = [
    {
      title: 'Управление',
      items: [
        { to: '/admin', end: true, icon: <AiOutlineUser />, text: 'Пользователи' },
        { to: '/admin/groups', icon: <HiUserGroup />, text: 'Группы' },
        { to: '/admin/leaderboard', icon: <FaTrophy />, text: 'Рейтинг' },
      ]
    },
    {
      title: 'Обучение',
      items: [
        { to: '/admin/courses', icon: <FaGraduationCap />, text: 'Курсы' },
        { to: '/admin/tests', icon: <FaRegNoteSticky />, text: 'Тесты' },
        { to: '/admin/homeworks', icon: <MdOutlineMapsHomeWork />, text: 'Домашние задания' },
        { to: '/admin/submissions', icon: <AiOutlineSend />, text: 'Проверка проектов' },
        { to: '/admin/knowledge', icon: <LuBookOpenText />, text: 'База знаний' },
      ]
    },
    {
      title: 'Интерактив',
      items: [
        { to: '/admin/typing', icon: <BsKeyboard />, text: 'Клавиатура' },
        { to: '/admin/game', icon: <FaQuestion />, text: 'Викторина' },
        { to: '/admin/games', icon: <IoGameControllerOutline />, text: 'Игры' },
        { to: '/admin/flexchan', icon: <IoGameControllerOutline />, text: 'FlexChan' },
        { to: '/admin/layout-game', icon: <FaCode />, text: 'Верстка' },
        { to: '/admin/js-game', icon: <FaJs />, text: 'JavaScript' },
      ]
    },
    {
      title: 'Система',
      items: [
        { to: '/admin/user-levels', icon: <FaStar />, text: 'Уровни' },
        { to: '/admin/chat', icon: <AiOutlineMessage />, text: 'Чат' },
        { to: '/admin/shop', icon: <CiShop />, text: 'Магазин' },
        { to: '/admin/music', icon: <FaMusic />, text: 'Музыка' },
        { to: '/admin/updates', icon: <AiOutlineBell />, text: 'Обновления' },
      ]
    }
  ];

  return (
    <div className={styles['admin-layout']}>
      {/* Топ бар */}
      <header className={styles['admin-topbar']}>
        <button className={styles['menu-toggle']} onClick={toggleSidebar}>
          <AiOutlineMenu />
        </button>
        <div className={styles['topbar-brand']}>
          <span className={styles['brand-text']}>Admin Panel</span>
        </div>
        <div className={styles['topbar-user']}>
          <span className={styles['user-name']}>{user?.full_name || user?.username}</span>
          <div className={styles['user-avatar']}>
            {(user?.full_name || user?.username || 'A').charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Оверлей */}
      {sidebarOpen && <div className={styles['sidebar-overlay']} onClick={closeSidebar}></div>}

      {/* Сайдбар */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles['sidebar-open'] : ''}`}>
        <div className={styles['sidebar-content']}>
          <div className={styles['sidebar-header']}>
            <div className={styles['sidebar-logo']}>
              <div className={styles['logo-icon']}>OP</div>
              <span className={styles['logo-text']}>OpenWay Platform</span>
            </div>
          </div>

          <nav className={styles['sidebar-nav']}>
            {menuSections.map((section, idx) => (
              <div key={idx} className={styles['nav-section']}>
                <div className={styles['section-title']}>{section.title}</div>
                <ul className={styles['nav-list']}>
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx}>
                      <NavLink 
                        to={item.to} 
                        end={item.end}
                        onClick={closeSidebar}
                        className={({ isActive }) => 
                          isActive ? `${styles['nav-link']} ${styles['active']}` : styles['nav-link']
                        }
                      >
                        <span className={styles['nav-icon']}>{item.icon}</span>
                        <span className={styles['nav-text']}>{item.text}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className={styles['sidebar-footer']}>
            <button className={styles['logout-btn']} onClick={handleLogout}>
              <AiOutlineClose />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Контент */}
      <main className={styles['main-content']}>
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
