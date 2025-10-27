import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  BsHouseFill, 
  BsPeopleFill, 
  BsChatDots, 
  BsTrophyFill,
  BsFileEarmarkText,
  BsClipboardCheck,
  BsKeyboard,
  BsShopWindow,
  BsBook,
  BsBell,
  BsBoxArrowRight,
  BsFolderCheck
} from 'react-icons/bs';
import './TeacherLayout.css';

function TeacherLayout() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { path: '/teacher/home', icon: <BsHouseFill />, label: 'Главная' },
    { path: '/teacher/students', icon: <BsPeopleFill />, label: 'Ученики' },
    { path: '/teacher/groups', icon: <BsPeopleFill />, label: 'Группы' },
    { path: '/teacher/tests', icon: <BsClipboardCheck />, label: 'Тесты' },
    { path: '/teacher/homeworks', icon: <BsFileEarmarkText />, label: 'Домашние задания' },
    { path: '/teacher/projects', icon: <BsFolderCheck />, label: 'Проекты' },
    { path: '/teacher/typing', icon: <BsKeyboard />, label: 'Клавиатурный тренажер' },
    { path: '/teacher/leaderboard', icon: <BsTrophyFill />, label: 'Топы' },
    { path: '/teacher/knowledge-base', icon: <BsBook />, label: 'База знаний' },
    { path: '/teacher/shop', icon: <BsShopWindow />, label: 'Магазин' },
    { path: '/teacher/updates', icon: <BsBell />, label: 'Обновления' },
    { path: '/teacher/chat', icon: <BsChatDots />, label: 'Чат', badge: unreadCount }
  ];

  return (
    <div className="teacher-layout">
      <aside className="teacher-sidebar">
        <div className="sidebar-header">
          <h2>👨‍🏫 Учитель</h2>
          <div className="user-info">
            <p>{user?.full_name || user?.username}</p>
            <span className="role-badge">Преподаватель</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <BsBoxArrowRight />
          <span>Выйти</span>
        </button>
      </aside>

      <main className="teacher-content">
        <Outlet />
      </main>
    </div>
  );
}

export default TeacherLayout;
