import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { BASE_URL } from '../utils/api';
import styles from './StudentLayout.module.css';
import '../styles/UsernameStyles.css';
import { AiOutlineHome, AiOutlineBook, AiOutlineUser, AiOutlineMessage, AiOutlineLogout, AiOutlineShoppingCart, AiOutlineBell, AiOutlineCode } from 'react-icons/ai';
import { LuBookCopy, LuPencilLine, LuHouse } from "react-icons/lu";
import { RxKeyboard } from "react-icons/rx";
import { HiUserGroup, HiMenu, HiX } from 'react-icons/hi';
import { FaTrophy, FaPlug, FaPalette, FaGamepad, FaPen, FaFileAlt, FaBriefcase, FaStar, FaMusic } from 'react-icons/fa';
import { BiData } from 'react-icons/bi';
import { VscFiles } from 'react-icons/vsc';
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
    <div className={styles['student-layout']}>
      {/* Мобильное меню кнопка */}
      <button className={styles['mobile-menu-btn']} onClick={toggleSidebar}>
        {sidebarOpen ? <HiX /> : <HiMenu />}
      </button>

      {/* Оверлей для мобильных */}
      {sidebarOpen && <div className={styles['sidebar-overlay']} onClick={closeSidebar}></div>}

      <aside className={`${styles['student-sidebar']} ${sidebarOpen ? styles.open : ''}`}>
        <div className={styles['student-sidebar-header']}>
          <div className={styles['sidebar-header-content']}>
            <div className={styles['sidebar-logo']}>
              <img src="/logo.jpg" alt="OpenWay" className={styles['logo-image']} />
            </div>
            <div className={styles['sidebar-title']}>
              <h2>OpenWay</h2>
              <p>Платформа обучения</p>
            </div>
          </div>
        </div>

        <nav>
          <ul className={styles['student-sidebar-menu']}>
            {/* Основное меню */}
            <li className={styles['menu-category-title']}>Основное</li>
            <li>
              <NavLink to="/student" end onClick={closeSidebar}>
                <span className={styles['menu-icon']}><AiOutlineHome /></span>
                <span className={styles['menu-text']}>Главная</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/profile" onClick={closeSidebar}>
                <span className={styles['menu-icon']}><AiOutlineUser /></span>
                <span className={styles['menu-text']}>Профиль</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/group" onClick={closeSidebar}>
                <span className={styles['menu-icon']}><HiUserGroup /></span>
                <span className={styles['menu-text']}>Моя группа</span>
              </NavLink>
            </li>

            {/* Разделитель */}
            <li className={styles['menu-divider']}></li>

            {/* Обучение */}
            <li className={styles['menu-category-title']}>Обучение</li>
            <li>
              <NavLink to="/student/courses" onClick={closeSidebar}>
                <span className={styles['menu-icon']}><AiOutlineBook /></span>
                <span className={styles['menu-text']}>Курсы</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/knowledge" onClick={closeSidebar}>
                <span className={styles['menu-icon']}><LuBookCopy /></span>
                <span className={styles['menu-text']}>База знаний</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/tests" onClick={closeSidebar}>
                <span className={styles['menu-icon']}><LuPencilLine /></span>
                <span className={styles['menu-text']}>Тесты</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/homeworks" onClick={closeSidebar}>
                <span className={styles['menu-icon']}><LuHouse /></span>
                <span className={styles['menu-text']}>Домашние задания</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/typing" onClick={closeSidebar}>
                <span className={styles['menu-icon']}><RxKeyboard /></span>
                <span className={styles['menu-text']}>Клавиатурный тренажер</span>
              </NavLink>
            </li>

            {/* Разделитель */}
            <li className={styles['menu-divider']}></li>

            {/* Программирование */}
            <li className={styles['menu-category-title']}>Программирование</li>
            <li>
              <NavLink to="/student/design" onClick={closeSidebar}>
                <span className={styles['menu-icon']}><FaPen /></span>
                <span className={styles['menu-text']}>Дизайн</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/technical-specs" onClick={closeSidebar}>
                <span className={styles['menu-icon']}><FaFileAlt /></span>
                <span className={styles['menu-text']}>Технические задания</span>
              </NavLink>
            </li>

            {/* Разделитель */}
            <li className={styles['menu-divider']}></li>

            {/* Социальное */}
            <li className={styles['menu-category-title']}>Социальное</li>
            <li>
              <NavLink to="/student/chat" onClick={closeSidebar}>
                <span className={styles['menu-icon']}>
                  <AiOutlineMessage />
                  {unreadCount > 0 && (
                    <span className={styles['notification-badge']}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </span>
                <span className={styles['menu-text']}>Чат</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/leaderboard" onClick={closeSidebar}>
                <span className={styles['menu-icon']}><FaTrophy /></span>
                <span className={styles['menu-text']}>Топы</span>
              </NavLink>
            </li>

            {/* Разделитель */}
            <li className={styles['menu-divider']}></li>

            {/* Магазин */}
            <li className={styles['menu-category-title']}>Развлечения</li>
            <li>
              <NavLink to="/student/games" onClick={closeSidebar}>
                <span className={styles['menu-icon']}><FaGamepad /></span>
                <span className={styles['menu-text']}>Игры</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/music" onClick={closeSidebar}>
                <span className={styles['menu-icon']}><FaMusic /></span>
                <span className={styles['menu-text']}>Музыка</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/shop" onClick={closeSidebar}>
                <span className={styles['menu-icon']}><AiOutlineShoppingCart /></span>
                <span className={styles['menu-text']}>Косметика</span>
              </NavLink>
            </li>

            {/* Разделитель */}
            <li className={styles['menu-divider']}></li>

            {/* Информация */}
            <li className={styles['menu-category-title']}>Информация</li>
            <li>
              <NavLink to="/student/updates" onClick={closeSidebar}>
                <span className={styles['menu-icon']}><AiOutlineBell /></span>
                <span className={styles['menu-text']}>Обновления</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/student/extra" onClick={closeSidebar}>
                <span className={styles['menu-icon']}><FaStar /></span>
                <span className={styles['menu-text']}>Дополнительно</span>
              </NavLink>
            </li>
          </ul>
        </nav>

        <div 
          className={styles['sidebar-footer']}
          style={{
            backgroundImage: bannerImage 
              ? `url(${BASE_URL}${bannerImage})` 
              : user?.profile_banner === 'default' 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(0, 0, 0, 0.2)'
          }}
        >
          <div className={styles['sidebar-footer-overlay']}></div>
          
          <div className={styles['sidebar-user']}>
            <div className={styles['sidebar-user-avatar-wrapper']}>
              <div className={styles['sidebar-user-avatar']}>
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
                  className={styles['sidebar-avatar-frame']}
                />
              )}
            </div>
            <div className={styles['sidebar-user-info']}>
              <div className={`${styles['sidebar-user-name']} styled-username ${user?.username_style || 'username-none'}`}>
                {user?.full_name || user?.username}
              </div>
              <div className={styles['sidebar-user-role']}>🪙 {user?.points || 0} баллов</div>
            </div>
          </div>
          <button className={styles['sidebar-logout-btn']} onClick={handleLogout} title="Выйти">
            <AiOutlineLogout />
          </button>
        </div>
      </aside>

      <main className={styles['student-main-content']}>
        {children}
      </main>

      <FloatingChat />
    </div>
  );
}

export default StudentLayout;
