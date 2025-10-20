import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../utils/api';
import './StudentLayout.css';
import { AiOutlineHome, AiOutlineBook, AiOutlineUser, AiOutlineMessage, AiOutlineLogout, AiOutlineShoppingCart } from 'react-icons/ai';
import { HiUserGroup, HiMenu, HiX } from 'react-icons/hi';
import { FaTrophy } from 'react-icons/fa';
import { useState } from 'react';

function StudentLayout({ children }) {
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
    <div className="student-layout">
      {/* Мобильное меню кнопка */}
      <button className="mobile-menu-btn" onClick={toggleSidebar}>
        {sidebarOpen ? <HiX /> : <HiMenu />}
      </button>

      {/* Оверлей для мобильных */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      <aside className={`student-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="student-sidebar-header">
          <div className="sidebar-header-content">
            <div className="sidebar-logo">
              <div className="logo-circle">OW</div>
            </div>
            <div className="sidebar-title">
              <h2>OpenWay</h2>
              <p>Платформа обучения</p>
            </div>
          </div>
        </div>

        <nav>
          <ul className="student-sidebar-menu">
            {/* Основное меню */}
            <li className="menu-category-title">Основное</li>
            <li>
              <NavLink to="/student" end onClick={closeSidebar}>
                <span className="menu-icon"><AiOutlineHome /></span>
                <span className="menu-text">Главная</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/profile" onClick={closeSidebar}>
                <span className="menu-icon"><AiOutlineUser /></span>
                <span className="menu-text">Профиль</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/group" onClick={closeSidebar}>
                <span className="menu-icon"><HiUserGroup /></span>
                <span className="menu-text">Моя группа</span>
              </NavLink>
            </li>

            {/* Разделитель */}
            <li className="menu-divider"></li>

            {/* Обучение */}
            <li className="menu-category-title">Обучение</li>
            <li>
              <NavLink to="/student/courses" onClick={closeSidebar}>
                <span className="menu-icon"><AiOutlineBook /></span>
                <span className="menu-text">Курсы</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/tests" onClick={closeSidebar}>
                <span className="menu-icon">📝</span>
                <span className="menu-text">Тесты</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/homeworks" onClick={closeSidebar}>
                <span className="menu-icon">📚</span>
                <span className="menu-text">Домашние задания</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/typing" onClick={closeSidebar}>
                <span className="menu-icon">⌨️</span>
                <span className="menu-text">Клавиатурный тренажер</span>
              </NavLink>
            </li>

            {/* Разделитель */}
            <li className="menu-divider"></li>

            {/* Социальное */}
            <li className="menu-category-title">Социальное</li>
            <li>
              <NavLink to="/student/chat" onClick={closeSidebar}>
                <span className="menu-icon"><AiOutlineMessage /></span>
                <span className="menu-text">Чат</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/leaderboard" onClick={closeSidebar}>
                <span className="menu-icon"><FaTrophy /></span>
                <span className="menu-text">Топы</span>
              </NavLink>
            </li>

            {/* Разделитель */}
            <li className="menu-divider"></li>

            {/* Магазин */}
            <li className="menu-category-title">Магазин</li>
            <li>
              <NavLink to="/student/shop" onClick={closeSidebar}>
                <span className="menu-icon"><AiOutlineShoppingCart /></span>
                <span className="menu-text">Косметика</span>
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {user?.avatar_url ? (
                <img src={`${BASE_URL}${user.avatar_url}`} alt={user.username} />
              ) : (
                <span>{(user?.full_name || user?.username)?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.full_name || user?.username}</div>
              <div className="sidebar-user-role">Студент</div>
            </div>
          </div>
          <button className="sidebar-logout-btn" onClick={handleLogout} title="Выйти">
            <AiOutlineLogout />
          </button>
        </div>
      </aside>

      <main className="student-main-content">
        {children}
      </main>
    </div>
  );
}

export default StudentLayout;
