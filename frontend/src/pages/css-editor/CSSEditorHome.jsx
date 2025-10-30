import { useState } from 'react';
import { BsEyeglasses, BsPalette, BsCodeSlash } from 'react-icons/bs';
import './CSSEditorHome.css';

function CSSEditorHome() {
  const [exampleHovered, setExampleHovered] = useState(false);

  return (
    <div className="css-editor-home">
      <div className="editor-header">
        <h1>🎨 CSS Editor Dashboard</h1>
        <p>Просмотр и инспекция стилей всех страниц платформы</p>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">
            <BsEyeglasses />
          </div>
          <h3>CSS Inspector</h3>
          <p>Наведите на любой элемент и увидьте все его CSS свойства в реальном времени</p>
          <div className="feature-badge">Ctrl+Shift+I</div>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <BsPalette />
          </div>
          <h3>Live Styles</h3>
          <p>Просмотр цветов, flex, grid, padding, margin и всех CSS свойств прямо над элементами</p>
          <div className="feature-badge">Real-time</div>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <BsCodeSlash />
          </div>
          <h3>All Views Access</h3>
          <p>Доступ ко всем интерфейсам: Student, Teacher, Admin, Tester (read-only)</p>
          <div className="feature-badge">Full Access</div>
        </div>
      </div>

      <div className="demo-section">
        <h2>🎯 Попробуйте прямо сейчас!</h2>
        <p>Нажмите <kbd>Ctrl+Shift+I</kbd> и наведите на элементы ниже</p>

        <div className="demo-grid">
          <div 
            className={`demo-box flexbox ${exampleHovered ? 'hovered' : ''}`}
            onMouseEnter={() => setExampleHovered(true)}
            onMouseLeave={() => setExampleHovered(false)}
          >
            <div className="demo-item">Flex Item 1</div>
            <div className="demo-item">Flex Item 2</div>
            <div className="demo-item">Flex Item 3</div>
          </div>

          <div className="demo-box gridbox">
            <div className="grid-item">Grid 1</div>
            <div className="grid-item">Grid 2</div>
            <div className="grid-item">Grid 3</div>
            <div className="grid-item">Grid 4</div>
          </div>
        </div>
      </div>

      <div className="instructions">
        <h3>📖 Инструкция</h3>
        <ol>
          <li>Нажмите кнопку <BsEyeglasses /> в шапке или <kbd>Ctrl+Shift+I</kbd></li>
          <li>Наведите курсор на любой элемент страницы</li>
          <li>Увидите подсветку и панель с CSS свойствами</li>
          <li>Все данные берутся из реального computed styles</li>
          <li>Переключайтесь между разными view для инспекции</li>
        </ol>
      </div>

      <div className="role-views">
        <h3>🔍 Доступные интерфейсы</h3>
        <div className="views-grid">
          <div className="view-card student">
            <h4>Student View</h4>
            <p>Интерфейс студента с тестами, чатом, играми</p>
          </div>
          <div className="view-card teacher">
            <h4>Teacher View</h4>
            <p>Панель учителя с управлением группами и заданиями</p>
          </div>
          <div className="view-card admin">
            <h4>Admin View</h4>
            <p>Административная панель с полным контролем</p>
          </div>
          <div className="view-card tester">
            <h4>Tester View</h4>
            <p>Инструменты тестирования и мониторинга</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CSSEditorHome;
