import { useState } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CSSInspector from './CSSInspector';
import { FaPalette } from 'react-icons/fa';
import { 
  BsSpeedometer2, 
  BsPerson,
  BsBook,
  BsShield,
  BsBug,
  BsEyeglasses,
  BsBoxArrowRight,
  BsLightning
} from 'react-icons/bs';
import './CSSEditorLayout.css';

function CSSEditorLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [inspectorActive, setInspectorActive] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const toggleInspector = () => {
    setInspectorActive(!inspectorActive);
  };

  return (
    <div className="css-editor-layout">
      <aside className="css-editor-sidebar">
        <div className="sidebar-header">
          <h2><FaPalette /> CSS Editor</h2>
          <button 
            className={`inspector-toggle ${inspectorActive ? 'active' : ''}`}
            onClick={toggleInspector}
            title="Toggle Inspector (Ctrl+Shift+I)"
          >
            <BsEyeglasses />
          </button>
        </div>

        <nav className="sidebar-nav">
          <Link 
            to="/css-editor" 
            className={`nav-item ${isActive('/css-editor') && location.pathname === '/css-editor' ? 'active' : ''}`}
          >
            <BsSpeedometer2 />
            <span>Dashboard</span>
          </Link>

          <Link 
            to="/css-editor/student-view" 
            className={`nav-item ${isActive('/css-editor/student-view') ? 'active' : ''}`}
          >
            <BsPerson />
            <span>Student View</span>
          </Link>

          <Link 
            to="/css-editor/teacher-view" 
            className={`nav-item ${isActive('/css-editor/teacher-view') ? 'active' : ''}`}
          >
            <BsBook />
            <span>Teacher View</span>
          </Link>

          <Link 
            to="/css-editor/admin-view" 
            className={`nav-item ${isActive('/css-editor/admin-view') ? 'active' : ''}`}
          >
            <BsShield />
            <span>Admin View</span>
          </Link>

          <Link 
            to="/css-editor/tester-view" 
            className={`nav-item ${isActive('/css-editor/tester-view') ? 'active' : ''}`}
          >
            <BsBug />
            <span>Tester View</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="inspector-hint">
            <BsLightning className="hint-icon" />
            <span>Ctrl+Shift+I</span>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <BsBoxArrowRight />
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      <main className="css-editor-content">
        <Outlet />
      </main>

      <CSSInspector isActive={inspectorActive} onToggle={toggleInspector} />
    </div>
  );
}

export default CSSEditorLayout;
