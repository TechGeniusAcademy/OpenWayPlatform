import { useState, useEffect, useRef } from 'react';
import styles from './LayoutGameManagement.module.css';
import { FaPlus, FaEdit, FaTrash, FaCode, FaSave, FaTimes, FaEye, FaEyeSlash, FaArrowUp, FaArrowDown, FaPlay } from 'react-icons/fa';
import api from '../utils/api';
import { toast } from 'react-toastify';

function LayoutGameManagement() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 1,
    order_index: 0,
    points_reward: 10,
    target_html: '',
    target_css: '',
    canvas_width: 800,
    canvas_height: 400
  });
  const [saving, setSaving] = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    loadLevels();
  }, []);

  const loadLevels = async () => {
    try {
      const response = await api.get('/layout-game/admin/levels');
      setLevels(response.data);
    } catch (error) {
      console.error('Ошибка загрузки уровней:', error);
      toast.error('Не удалось загрузить уровни');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (level = null) => {
    if (level) {
      setEditingLevel(level);
      setFormData({
        title: level.title,
        description: level.description || '',
        difficulty: level.difficulty,
        order_index: level.order_index,
        points_reward: level.points_reward,
        target_html: level.target_html || '',
        target_css: level.target_css || '',
        canvas_width: level.canvas_width || 800,
        canvas_height: level.canvas_height || 400
      });
    } else {
      setEditingLevel(null);
      setFormData({
        title: '',
        description: '',
        difficulty: 1,
        order_index: levels.length,
        points_reward: 10,
        target_html: `<div class="card">
  <h2>Заголовок</h2>
  <p>Текст описания</p>
  <button>Кнопка</button>
</div>`,
        target_css: `.card {
  width: 300px;
  padding: 24px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.card h2 {
  margin: 0 0 12px 0;
  color: #1a1a2e;
  font-size: 24px;
}

.card p {
  margin: 0 0 16px 0;
  color: #666;
  font-size: 14px;
}

.card button {
  padding: 10px 20px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}`,
        canvas_width: 800,
        canvas_height: 400
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingLevel(null);
    setFormData({
      title: '',
      description: '',
      difficulty: 1,
      order_index: 0,
      points_reward: 10,
      target_html: '',
      target_css: '',
      canvas_width: 800,
      canvas_height: 400
    });
  };

  const updatePreview = () => {
    if (!previewRef.current) return;
    
    const iframe = previewRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            background: #f5f5f5;
          }
          ${formData.target_css}
        </style>
      </head>
      <body>
        ${formData.target_html}
      </body>
      </html>
    `;
    
    doc.open();
    doc.write(fullHtml);
    doc.close();
  };

  useEffect(() => {
    if (showModal) {
      const timer = setTimeout(updatePreview, 300);
      return () => clearTimeout(timer);
    }
  }, [formData.target_html, formData.target_css, showModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Введите название уровня');
      return;
    }
    
    if (!formData.target_html.trim()) {
      toast.error('Введите HTML макета');
      return;
    }

    setSaving(true);

    try {
      if (editingLevel) {
        await api.put(`/layout-game/admin/levels/${editingLevel.id}`, formData);
        toast.success('Уровень обновлен');
      } else {
        await api.post('/layout-game/admin/levels', formData);
        toast.success('Уровень создан');
      }

      closeModal();
      loadLevels();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      toast.error('Ошибка при сохранении уровня');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (level) => {
    if (!confirm(`Удалить уровень "${level.title}"?`)) return;

    try {
      await api.delete(`/layout-game/admin/levels/${level.id}`);
      toast.success('Уровень удален');
      loadLevels();
    } catch (error) {
      console.error('Ошибка удаления:', error);
      toast.error('Ошибка при удалении уровня');
    }
  };

  const toggleActive = async (level) => {
    try {
      await api.put(`/layout-game/admin/levels/${level.id}`, {
        is_active: !level.is_active
      });
      toast.success(level.is_active ? 'Уровень скрыт' : 'Уровень активирован');
      loadLevels();
    } catch (error) {
      console.error('Ошибка:', error);
      toast.error('Ошибка при изменении статуса');
    }
  };

  const moveLevel = async (level, direction) => {
    const currentIndex = levels.findIndex(l => l.id === level.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= levels.length) return;

    const otherLevel = levels[newIndex];

    try {
      await api.put(`/layout-game/admin/levels/${level.id}`, {
        order_index: otherLevel.order_index
      });
      await api.put(`/layout-game/admin/levels/${otherLevel.id}`, {
        order_index: level.order_index
      });
      loadLevels();
    } catch (error) {
      console.error('Ошибка перемещения:', error);
      toast.error('Ошибка при перемещении уровня');
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1><FaCode /> Управление игрой "Верстка"</h1>
        <button onClick={() => openModal()} className={styles.addBtn}>
          <FaPlus /> Новый уровень
        </button>
      </div>

      <div className={styles.info}>
        <p>
          <strong>Как это работает:</strong> Вы создаёте макет на HTML/CSS, а ученики должны его воссоздать. 
          Ученики могут наводить на элементы макета и видеть все размеры, отступы и стили — как в Figma.
        </p>
      </div>

      {levels.length === 0 ? (
        <div className={styles.empty}>
          <FaCode className={styles.emptyIcon} />
          <p>Нет созданных уровней</p>
          <button onClick={() => openModal()} className={styles.addBtn}>
            <FaPlus /> Создать первый уровень
          </button>
        </div>
      ) : (
        <div className={styles.levelsList}>
          {levels.map((level, index) => (
            <div key={level.id} className={`${styles.levelItem} ${!level.is_active ? styles.inactive : ''}`}>
              <div className={styles.levelOrder}>
                <button 
                  onClick={() => moveLevel(level, 'up')} 
                  disabled={index === 0}
                  className={styles.moveBtn}
                >
                  <FaArrowUp />
                </button>
                <span>{index + 1}</span>
                <button 
                  onClick={() => moveLevel(level, 'down')} 
                  disabled={index === levels.length - 1}
                  className={styles.moveBtn}
                >
                  <FaArrowDown />
                </button>
              </div>

              <div className={styles.levelPreview}>
                <iframe
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                          padding: 10px;
                          background: #f5f5f5;
                          transform: scale(0.5);
                          transform-origin: top left;
                        }
                        ${level.target_css || ''}
                      </style>
                    </head>
                    <body>${level.target_html || ''}</body>
                    </html>
                  `}
                  title={level.title}
                  className={styles.previewFrame}
                />
              </div>

              <div className={styles.levelInfo}>
                <h3>{level.title}</h3>
                <p>{level.description || 'Без описания'}</p>
                <div className={styles.levelMeta}>
                  <span>{'⭐'.repeat(level.difficulty)}</span>
                  <span>+{level.points_reward} очков</span>
                  <span>{level.canvas_width}×{level.canvas_height}</span>
                </div>
              </div>

              <div className={styles.levelActions}>
                <button 
                  onClick={() => toggleActive(level)} 
                  className={`${styles.actionBtn} ${!level.is_active ? styles.inactive : ''}`}
                  title={level.is_active ? 'Скрыть' : 'Показать'}
                >
                  {level.is_active ? <FaEye /> : <FaEyeSlash />}
                </button>
                <button 
                  onClick={() => openModal(level)} 
                  className={styles.actionBtn}
                  title="Редактировать"
                >
                  <FaEdit />
                </button>
                <button 
                  onClick={() => handleDelete(level)} 
                  className={`${styles.actionBtn} ${styles.danger}`}
                  title="Удалить"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingLevel ? 'Редактировать уровень' : 'Новый уровень'}</h2>
              <button onClick={closeModal} className={styles.closeBtn}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.modalForm}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Название уровня</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Например: Кнопка с hover-эффектом"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Сложность</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({...formData, difficulty: parseInt(e.target.value)})}
                  >
                    <option value={1}>⭐ Легко</option>
                    <option value={2}>⭐⭐ Средне</option>
                    <option value={3}>⭐⭐⭐ Сложно</option>
                    <option value={4}>⭐⭐⭐⭐ Очень сложно</option>
                    <option value={5}>⭐⭐⭐⭐⭐ Эксперт</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Очки</label>
                  <input
                    type="number"
                    value={formData.points_reward}
                    onChange={(e) => setFormData({...formData, points_reward: parseInt(e.target.value) || 10})}
                    min="1"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Описание задания</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Опишите что нужно сверстать..."
                  rows={2}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Ширина холста (px)</label>
                  <input
                    type="number"
                    value={formData.canvas_width}
                    onChange={(e) => setFormData({...formData, canvas_width: parseInt(e.target.value) || 800})}
                    min="200"
                    max="1920"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Высота холста (px)</label>
                  <input
                    type="number"
                    value={formData.canvas_height}
                    onChange={(e) => setFormData({...formData, canvas_height: parseInt(e.target.value) || 400})}
                    min="200"
                    max="1080"
                  />
                </div>
              </div>

              <div className={styles.codeSection}>
                <div className={styles.codeEditors}>
                  <div className={styles.codeEditor}>
                    <label><FaCode /> HTML макета</label>
                    <textarea
                      value={formData.target_html}
                      onChange={(e) => setFormData({...formData, target_html: e.target.value})}
                      placeholder="<div class='card'>...</div>"
                      spellCheck={false}
                    />
                  </div>
                  
                  <div className={styles.codeEditor}>
                    <label><FaCode /> CSS стили</label>
                    <textarea
                      value={formData.target_css}
                      onChange={(e) => setFormData({...formData, target_css: e.target.value})}
                      placeholder=".card { ... }"
                      spellCheck={false}
                    />
                  </div>
                </div>

                <div className={styles.previewSection}>
                  <label><FaPlay /> Предпросмотр</label>
                  <div 
                    className={styles.previewContainer}
                    style={{ 
                      width: Math.min(formData.canvas_width, 400),
                      height: Math.min(formData.canvas_height, 300)
                    }}
                  >
                    <iframe
                      ref={previewRef}
                      title="Preview"
                      className={styles.previewIframe}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={closeModal} className={styles.cancelBtn}>
                  Отмена
                </button>
                <button type="submit" className={styles.saveBtn} disabled={saving}>
                  <FaSave /> {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LayoutGameManagement;
