import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ReadOnlyWrapper.module.css';

/**
 * Wrapper компонент для read-only просмотра других интерфейсов
 * Перехватывает клики на NavLink и переводит абсолютные пути в относительные
 */
function ReadOnlyWrapper({ children, roleName, basePath }) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleClick = (e) => {
      // Перехватываем клики на ссылки
      const link = e.target.closest('a');
      if (link) {
        const href = link.getAttribute('href');
        
        // НЕ перехватываем клики на ссылки из CSS Editor сайдбара
        if (href && href.startsWith('/css-editor')) {
          return; // Пропускаем эти ссылки
        }
        
        // Если это внутренний NavLink (начинается с /)
        if (href && href.startsWith('/')) {
          e.preventDefault();
          e.stopPropagation();
          
          // Извлекаем путь после базового роута
          // Например: /student/profile -> profile
          const pathParts = href.split('/').filter(Boolean);
          
          // Если это основной путь роли (например /student или /teacher)
          if (pathParts.length === 1) {
            // Переходим на index текущего view
            navigate(basePath);
          } else {
            // Убираем первую часть (student/teacher/admin/tester) и берем остальное
            const relativePath = pathParts.slice(1).join('/');
            navigate(`${basePath}/${relativePath}`);
          }
          
          return;
        }
      }

      // Блокируем кнопки мутации
      const button = e.target.closest('button');
      if (button) {
        const buttonText = button.textContent?.toLowerCase() || '';
        const isMutationButton = 
          buttonText.includes('создать') ||
          buttonText.includes('добавить') ||
          buttonText.includes('удалить') ||
          buttonText.includes('сохранить') ||
          buttonText.includes('изменить') ||
          buttonText.includes('отправить') ||
          button.className?.includes('delete') ||
          button.className?.includes('create') ||
          button.className?.includes('edit') ||
          button.className?.includes('save') ||
          button.type === 'submit';

        if (isMutationButton) {
          e.preventDefault();
          e.stopPropagation();
          showNotification(`🔒 ${roleName} View - Read Only Mode`);
        }
      }
    };

    const handleSubmit = (e) => {
      const form = e.target;
      if (form.tagName === 'FORM') {
        const isSearchForm = form.className?.includes('search') || 
                            form.querySelector('input[type="search"]');
        if (!isSearchForm) {
          e.preventDefault();
          e.stopPropagation();
          showNotification('🔒 Read-Only Mode - Cannot submit forms');
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('submit', handleSubmit, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('submit', handleSubmit, true);
    };
  }, [navigate, roleName, basePath]);

  const showNotification = (message) => {
    const notification = document.createElement('div');
    notification.className = 'readonly-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  };

  return (
    <div className={styles['readonly-wrapper']}>
      <div className={styles['readonly-overlay-notice']}>
        <span className={styles['readonly-badge']}>🔒 Read-Only</span>
      </div>
      {children}
    </div>
  );
}

export default ReadOnlyWrapper;
