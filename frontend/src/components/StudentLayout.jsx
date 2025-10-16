import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './StudentLayout.css';
import { AiOutlineHome, AiOutlineBook, AiOutlineUser, AiOutlineMessage } from 'react-icons/ai';
import { HiUserGroup } from 'react-icons/hi';
import { FaTrophy } from 'react-icons/fa';

function StudentLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="student-layout">
      <aside className="student-sidebar">
        <div className="student-sidebar-header">
          <h2>Личный кабинет</h2>
          <p>{user?.full_name || user?.username}</p>
        </div>

        <nav>
          <ul className="student-sidebar-menu">
            <li>
              <NavLink to="/student" end>
                <span className="menu-icon"><AiOutlineHome /></span>
                Главная
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/profile">
                <span className="menu-icon"><AiOutlineUser /></span>
                Профиль
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/group">
                <span className="menu-icon"><HiUserGroup /></span>
                Моя группа
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/courses">
                <span className="menu-icon"><AiOutlineBook /></span>
                Курсы
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/leaderboard">
                <span className="menu-icon"><FaTrophy /></span>
                Топы
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/chat">
                <span className="menu-icon"><AiOutlineMessage /></span>
                Чат
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/tests">
                <span className="menu-icon">📝</span>
                Тесты
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/homeworks">
                <span className="menu-icon">📚</span>
                Домашние задания
              </NavLink>
            </li>
          </ul>
        </nav>

        <button className="student-logout-btn" onClick={handleLogout}>
          Выйти
        </button>
      </aside>

      <main className="student-main-content">
        {children}
      </main>
    </div>
  );
}

export default StudentLayout;
