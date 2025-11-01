import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  BsSpeedometer2, 
  BsPeople, 
  BsCollection,
  BsFileText,
  BsChatDots,
  BsJournalCode,
  BsBug,
  BsActivity,
  BsBoxArrowRight
} from 'react-icons/bs';
import styles from './TesterLayout.module.css';

function TesterLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className={styles['tester-layout']}>
      <aside className={styles['tester-sidebar']}>
        <div className={styles['sidebar-header']}>
          <h2>🧪 Tester Panel</h2>
        </div>

        <nav className={styles['sidebar-nav']}>
          <Link 
            to="/tester" 
            className={`nav-item ${isActive('/tester') && location.pathname === '/tester' ? 'active' : ''}`}
          >
            <BsSpeedometer2 />
            <span>Dashboard</span>
          </Link>

          <Link 
            to="/tester/users" 
            className={`nav-item ${isActive('/tester/users') ? 'active' : ''}`}
          >
            <BsPeople />
            <span>Users Testing</span>
          </Link>

          <Link 
            to="/tester/groups" 
            className={`nav-item ${isActive('/tester/groups') ? 'active' : ''}`}
          >
            <BsCollection />
            <span>Groups Testing</span>
          </Link>

          <Link 
            to="/tester/tests" 
            className={`nav-item ${isActive('/tester/tests') ? 'active' : ''}`}
          >
            <BsFileText />
            <span>Tests Testing</span>
          </Link>

          <Link 
            to="/tester/chat" 
            className={`nav-item ${isActive('/tester/chat') ? 'active' : ''}`}
          >
            <BsChatDots />
            <span>Chat Testing</span>
          </Link>

          <Link 
            to="/tester/logs" 
            className={`nav-item ${isActive('/tester/logs') ? 'active' : ''}`}
          >
            <BsJournalCode />
            <span>System Logs</span>
          </Link>

          <Link 
            to="/tester/bugs" 
            className={`nav-item ${isActive('/tester/bugs') ? 'active' : ''}`}
          >
            <BsBug />
            <span>Bug Reports</span>
          </Link>

          <Link 
            to="/tester/performance" 
            className={`nav-item ${isActive('/tester/performance') ? 'active' : ''}`}
          >
            <BsActivity />
            <span>Performance</span>
          </Link>
        </nav>

        <div className={styles['sidebar-footer']}>
          <button onClick={handleLogout} className={styles['logout-btn']}>
            <BsBoxArrowRight />
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      <main className={styles['tester-content']}>
        <Outlet />
      </main>
    </div>
  );
}

export default TesterLayout;
