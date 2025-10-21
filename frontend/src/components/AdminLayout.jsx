import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminLayout.css';
import { AiOutlineUser, AiOutlineMessage, AiOutlineMenu, AiOutlineClose } from "react-icons/ai";
import { HiUserGroup } from "react-icons/hi";
import { FaTrophy } from "react-icons/fa";

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
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h2>Админ-панель</h2>
          <p>{user?.full_name || user?.username}</p>
        </div>

        <nav>
          <ul className="sidebar-menu">
            <li>
              <NavLink to="/admin" end onClick={closeSidebar}>
                <span className="menu-icon"><AiOutlineUser /></span>
                <span className="menu-text">Пользователи</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/groups" onClick={closeSidebar}>
                <span className="menu-icon"><HiUserGroup /></span>
                <span className="menu-text">Группы</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/leaderboard" onClick={closeSidebar}>
                <span className="menu-icon"><FaTrophy /></span>
                <span className="menu-text">Топы</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/chat" onClick={closeSidebar}>
                <span className="menu-icon"><AiOutlineMessage /></span>
                <span className="menu-text">Чат</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/tests" onClick={closeSidebar}>
                <span className="menu-icon">📝</span>
                <span className="menu-text">Тесты</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/homeworks" onClick={closeSidebar}>
                <span className="menu-icon">📚</span>
                <span className="menu-text">Домашние задания</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/typing" onClick={closeSidebar}>
                <span className="menu-icon">⌨️</span>
                <span className="menu-text">Клавиатурный тренажер</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/game" onClick={closeSidebar}>
                <span className="menu-icon">🎮</span>
                <span className="menu-text">Вопросы-Ответы</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/shop" onClick={closeSidebar}>
                <span className="menu-icon">🛒</span>
                <span className="menu-text">Магазин косметики</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/knowledge" onClick={closeSidebar}>
                <span className="menu-icon">�</span>
                <span className="menu-text">База знаний</span>
              </NavLink>
            </li>
          </ul>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          Выйти
        </button>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
