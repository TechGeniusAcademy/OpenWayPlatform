import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminLayout.css';
import { AiOutlineUser, AiOutlineMessage, AiOutlineMenu, AiOutlineClose, AiOutlineBell } from "react-icons/ai";
import { HiUserGroup } from "react-icons/hi";
import { MdOutlineMapsHomeWork } from "react-icons/md";
import { CiShop } from "react-icons/ci";
import { FaTrophy } from "react-icons/fa";
import { BsKeyboard } from "react-icons/bs";
import { FaRegNoteSticky, FaQuestion } from "react-icons/fa6";
import { LuBookOpenText } from "react-icons/lu";
import { AiOutlineSend } from "react-icons/ai";

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

  return (
    <div className="admin-layout">
      {/* Мобильная шапка */}
      <header className="admin-mobile-header">
        <button className="menu-toggle" onClick={toggleSidebar}>
          {sidebarOpen ? <AiOutlineClose /> : <AiOutlineMenu />}
        </button>
        <h1>Админ-панель</h1>
        <div className="mobile-user-info">
          <span>{user?.username}</span>
        </div>
      </header>

      {/* Оверлей для закрытия сайдбара */}
      {sidebarOpen && <div className="admin-sidebar-overlay" onClick={closeSidebar}></div>}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="admin-sidebar-header">
          <h2>Админ-панель</h2>
          <p>{user?.full_name || user?.username}</p>
        </div>

        <nav>
          <ul className="admin-sidebar-menu">
            <li>
              <NavLink to="/admin" end onClick={closeSidebar}>
                <span className="admin-menu-icon"><AiOutlineUser /></span>
                <span className="admin-menu-text">Пользователи</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/groups" onClick={closeSidebar}>
                <span className="admin-menu-icon"><HiUserGroup /></span>
                <span className="admin-menu-text">Группы</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/leaderboard" onClick={closeSidebar}>
                <span className="admin-menu-icon"><FaTrophy /></span>
                <span className="admin-menu-text">Топы</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/chat" onClick={closeSidebar}>
                <span className="admin-menu-icon"><AiOutlineMessage /></span>
                <span className="admin-menu-text">Чат</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/tests" onClick={closeSidebar}>
                <span className="admin-menu-icon"><FaRegNoteSticky /></span>
                <span className="admin-menu-text">Тесты</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/homeworks" onClick={closeSidebar}>
                <span className="admin-menu-icon"><MdOutlineMapsHomeWork /></span>
                <span className="admin-menu-text">Домашние задания</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/typing" onClick={closeSidebar}>
                <span className="admin-menu-icon"><BsKeyboard /></span>
                <span className="admin-menu-text">Клавиатурный тренажер</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/game" onClick={closeSidebar}>
                <span className="admin-menu-icon"><FaQuestion /></span>
                <span className="admin-menu-text">Вопросы-Ответы</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/shop" onClick={closeSidebar}>
                <span className="admin-menu-icon"><CiShop /></span>
                <span className="admin-menu-text">Магазин косметики</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/knowledge" onClick={closeSidebar}>
                <span className="admin-menu-icon"><LuBookOpenText /></span>
                <span className="admin-menu-text">База знаний</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/updates" onClick={closeSidebar}>
                <span className="admin-menu-icon"><AiOutlineBell /></span>
                <span className="admin-menu-text">Обновления</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/submissions" onClick={closeSidebar}>
                <span className="admin-menu-icon"><AiOutlineSend /></span>
                <span className="admin-menu-text">Проверка проектов</span>
              </NavLink>
            </li>
          </ul>
        </nav>

        <button className="admin-logout-btn" onClick={handleLogout}>
          Выйти
        </button>
      </aside>

      <main className="admin-main-content">
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
