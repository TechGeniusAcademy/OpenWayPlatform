import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminLayout.css';
import { AiOutlineUser, AiOutlineMessage } from "react-icons/ai";
import { HiUserGroup } from "react-icons/hi";
import { FaTrophy } from "react-icons/fa";

function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Админ-панель</h2>
          <p>{user?.full_name || user?.username}</p>
        </div>

        <nav>
          <ul className="sidebar-menu">
            <li>
              <NavLink to="/admin" end>
                <span className="menu-icon"><AiOutlineUser /></span>
                Пользователи
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/groups">
                <span className="menu-icon"><HiUserGroup /></span>
                Группы
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/leaderboard">
                <span className="menu-icon"><FaTrophy /></span>
                Топы
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/chat">
                <span className="menu-icon"><AiOutlineMessage /></span>
                Чат
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/tests">
                <span className="menu-icon">📝</span>
                Тесты
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/homeworks">
                <span className="menu-icon">📚</span>
                Домашние задания
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/typing">
                <span className="menu-icon">⌨️</span>
                Клавиатурный тренажер
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/game">
                <span className="menu-icon">  </span>
                Вопросы-Ответы
              </NavLink>
            </li>
            {/* Здесь можно добавлять новые пункты меню */}
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
