import { useState } from 'react';
import { BsEyeglasses, BsPalette, BsCodeSlash } from 'react-icons/bs';
import styles from './CSSEditorHome.module.css';

function CSSEditorHome() {
  const [exampleHovered, setExampleHovered] = useState(false);

  return (
    <div className={styles['css-editor-home']}>
      <div className={styles['editor-header']}>
        <h1>🎨 CSS Editor Dashboard</h1>
        <p>Просмотр и инспекция стилей всех страниц платформы</p>
      </div>

      <div className={styles['features-grid']}>
        <div className={styles['feature-card']}>
          <div className={styles['feature-icon']}>
            <BsEyeglasses />
          </div>
          <h3>CSS Inspector</h3>
          <p>Наведите на любой элемент и увидьте все его CSS свойства в реальном времени</p>
          <div className={styles['feature-badge']}>Ctrl+Shift+I</div>
        </div>

        <div className={styles['feature-card']}>
          <div className={styles['feature-icon']}>
            <BsPalette />
          </div>
          <h3>Live Styles</h3>
          <p>Просмотр цветов, flex, grid, padding, margin и всех CSS свойств прямо над элементами</p>
          <div className={styles['feature-badge']}>Real-time</div>
        </div>

        <div className={styles['feature-card']}>
          <div className={styles['feature-icon']}>
            <BsCodeSlash />
          </div>
          <h3>All Views Access</h3>
          <p>Доступ ко всем интерфейсам: Student, Teacher, Admin, Tester (read-only)</p>
          <div className={styles['feature-badge']}>Full Access</div>
        </div>
      </div>

      <div className={styles['demo-section']}>
        <h2>🎯 Попробуйте прямо сейчас!</h2>
        <p>Нажмите <kbd>Ctrl+Shift+I</kbd> и наведите на элементы ниже</p>

        <div className={styles['demo-grid']}>
          <div 
            className={`demo-box flexbox ${exampleHovered ? 'hovered' : ''}`}
            onMouseEnter={() => setExampleHovered(true)}
            onMouseLeave={() => setExampleHovered(false)}
          >
            <div className={styles['demo-item']}>Flex Item 1</div>
            <div className={styles['demo-item']}>Flex Item 2</div>
            <div className={styles['demo-item']}>Flex Item 3</div>
          </div>

          <div className="demo-box gridbox">
            <div className={styles['grid-item']}>Grid 1</div>
            <div className={styles['grid-item']}>Grid 2</div>
            <div className={styles['grid-item']}>Grid 3</div>
            <div className={styles['grid-item']}>Grid 4</div>
          </div>
        </div>
      </div>

      <div className={styles.instructions}>
        <h3>📖 Инструкция</h3>
        <ol>
          <li>Нажмите кнопку <BsEyeglasses /> в шапке или <kbd>Ctrl+Shift+I</kbd></li>
          <li>Наведите курсор на любой элемент страницы</li>
          <li>Увидите подсветку и панель с CSS свойствами</li>
          <li>Все данные берутся из реального computed styles</li>
          <li>Переключайтесь между разными view для инспекции</li>
        </ol>
      </div>

      <div className={styles['role-views']}>
        <h3>🔍 Доступные интерфейсы</h3>
        <div className={styles['views-grid']}>
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
