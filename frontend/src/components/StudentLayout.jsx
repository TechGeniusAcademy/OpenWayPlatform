import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { BASE_URL } from '../utils/api';
import './StudentLayout.css';
import '../styles/UsernameStyles.css';
import { AiOutlineHome, AiOutlineBook, AiOutlineUser, AiOutlineMessage, AiOutlineLogout, AiOutlineShoppingCart, AiOutlineBell, AiOutlineCode } from 'react-icons/ai';
import { LuBookCopy, LuPencilLine, LuHouse } from "react-icons/lu";
import { RxKeyboard } from "react-icons/rx";
import { HiUserGroup, HiMenu, HiX } from 'react-icons/hi';
import { FaTrophy } from 'react-icons/fa';
import { BiData } from 'react-icons/bi';
import { VscFiles } from 'react-icons/vsc';
import { FaPlug, FaPalette, FaGamepad } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import FloatingChat from './FloatingChat';

function StudentLayout({ children }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [frameImage, setFrameImage] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);

  useEffect(() => {
    // Загружаем изображения рамки и баннера
    const loadCosmetics = async () => {
      try {
        // Загружаем рамку
        if (user?.avatar_frame && user.avatar_frame !== 'none') {
          const frameResponse = await api.get('/shop/items?type=frame');
          const frame = frameResponse.data.items.find(item => item.item_key === user.avatar_frame);
          if (frame?.image_url) {
            setFrameImage(frame.image_url);
          }
        } else {
          setFrameImage(null);
        }

        // Загружаем баннер
        if (user?.profile_banner && user.profile_banner !== 'default') {
          const bannerResponse = await api.get('/shop/items?type=banner');
          const banner = bannerResponse.data.items.find(item => item.item_key === user.profile_banner);
          if (banner?.image_url) {
            setBannerImage(banner.image_url);
          }
        } else {
          setBannerImage(null);
        }
      } catch (error) {
        console.error('Ошибка загрузки косметики:', error);
      }
    };
    
    loadCosmetics();
  }, [user?.avatar_frame, user?.profile_banner]);

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
              <img src="/logo.jpg" alt="OpenWay" className="logo-image" />
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
              <NavLink to="/student/knowledge" onClick={closeSidebar}>
                <span className="menu-icon"><LuBookCopy /></span>
                <span className="menu-text">База знаний</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/tests" onClick={closeSidebar}>
                <span className="menu-icon"><LuPencilLine /></span>
                <span className="menu-text">Тесты</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/homeworks" onClick={closeSidebar}>
                <span className="menu-icon"><LuHouse /></span>
                <span className="menu-text">Домашние задания</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/typing" onClick={closeSidebar}>
                <span className="menu-icon"><RxKeyboard /></span>
                <span className="menu-text">Клавиатурный тренажер</span>
              </NavLink>
            </li>

            {/* Разделитель */}
            <li className="menu-divider"></li>

            {/* Программирование */}
            <li className="menu-category-title">Программирование</li>
            <li>
              <NavLink to="/student/projects" onClick={closeSidebar}>
                <span className="menu-icon"><VscFiles /></span>
                <span className="menu-text">Мои проекты</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/databases" onClick={closeSidebar}>
                <span className="menu-icon"><BiData /></span>
                <span className="menu-text">Базы данных</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/plugins" onClick={closeSidebar}>
                <span className="menu-icon"><FaPlug /></span>
                <span className="menu-text">Плагины</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/themes" onClick={closeSidebar}>
                <span className="menu-icon"><FaPalette /></span>
                <span className="menu-text">Темы</span>
              </NavLink>
            </li>

            {/* Разделитель */}
            <li className="menu-divider"></li>

            {/* Социальное */}
            <li className="menu-category-title">Социальное</li>
            <li>
              <NavLink to="/student/chat" onClick={closeSidebar}>
                <span className="menu-icon">
                  <AiOutlineMessage />
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </span>
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
            <li className="menu-category-title">Развлечения</li>
            <li>
              <NavLink to="/student/games" onClick={closeSidebar}>
                <span className="menu-icon"><FaGamepad /></span>
                <span className="menu-text">Игры</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/shop" onClick={closeSidebar}>
                <span className="menu-icon"><AiOutlineShoppingCart /></span>
                <span className="menu-text">Косметика</span>
              </NavLink>
            </li>

            {/* Разделитель */}
            <li className="menu-divider"></li>

            {/* Информация */}
            <li className="menu-category-title">Информация</li>
            <li>
              <NavLink to="/student/updates" onClick={closeSidebar}>
                <span className="menu-icon"><AiOutlineBell /></span>
                <span className="menu-text">Обновления</span>
              </NavLink>
            </li>
          </ul>
        </nav>

        <div 
          className="sidebar-footer"
          style={{
            backgroundImage: bannerImage 
              ? `url(${BASE_URL}${bannerImage})` 
              : user?.profile_banner === 'default' 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(0, 0, 0, 0.2)'
          }}
        >
          <div className="sidebar-footer-overlay"></div>
          
          <div className="sidebar-user">
            <div className="sidebar-user-avatar-wrapper">
              <div className="sidebar-user-avatar">
                {user?.avatar_url ? (
                  <img src={`${BASE_URL}${user.avatar_url}`} alt={user.username} />
                ) : (
                  <span>{(user?.full_name || user?.username)?.[0]?.toUpperCase()}</span>
                )}
              </div>
              {frameImage && (
                <img 
                  src={`${BASE_URL}${frameImage}`}
                  alt="Frame"
                  className="sidebar-avatar-frame"
                />
              )}
            </div>
            <div className="sidebar-user-info">
              <div className={`sidebar-user-name styled-username ${user?.username_style || 'username-none'}`}>
                {user?.full_name || user?.username}
              </div>
              <div className="sidebar-user-role">🪙 {user?.points || 0} баллов</div>
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

      <FloatingChat />
    </div>
  );
}

export default StudentLayout;
