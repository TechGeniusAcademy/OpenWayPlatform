import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaUpload, FaStar, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../utils/api';
import styles from './UserLevelsManagement.module.css';

function UserLevelsManagement() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const [form, setForm] = useState({
    level_number: 1,
    rank_name: '',
    experience_required: 0,
    image_url: ''
  });

  useEffect(() => {
    loadLevels();
  }, []);

  const loadLevels = async () => {
    try {
      const response = await api.get('/user-levels');
      setLevels(response.data);
    } catch (error) {
      console.error('Ошибка загрузки уровней:', error);
      toast.error('Не удалось загрузить уровни');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.level_number || form.level_number < 1) {
      toast.error('Номер уровня должен быть больше 0');
      return;
    }
    
    if (form.experience_required < 0) {
      toast.error('Опыт не может быть отрицательным');
      return;
    }

    try {
      if (editingLevel) {
        await api.put(`/user-levels/${editingLevel.id}`, form);
        toast.success('Уровень обновлен');
      } else {
        await api.post('/user-levels', form);
        toast.success('Уровень создан');
      }
      
      loadLevels();
      resetForm();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      toast.error(error.response?.data?.error || 'Ошибка сохранения');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить этот уровень?')) return;
    
    try {
      await api.delete(`/user-levels/${id}`);
      toast.success('Уровень удален');
      loadLevels();
    } catch (error) {
      console.error('Ошибка удаления:', error);
      toast.error('Ошибка удаления');
    }
  };

  const handleEdit = (level) => {
    setEditingLevel(level);
    setForm({
      level_number: level.level_number,
      rank_name: level.rank_name || '',
      experience_required: level.experience_required,
      image_url: level.image_url || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      level_number: levels.length > 0 ? Math.max(...levels.map(l => l.level_number)) + 1 : 1,
      rank_name: '',
      experience_required: 0,
      image_url: ''
    });
    setEditingLevel(null);
    setShowForm(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Проверка размера (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Файл слишком большой. Максимум 5MB');
      return;
    }

    // Проверка типа
    if (!file.type.startsWith('image/')) {
      toast.error('Можно загружать только изображения');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/user-levels/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setForm(prev => ({ ...prev, image_url: response.data.url }));
      toast.success('Изображение загружено');
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      toast.error('Ошибка загрузки изображения');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <FaSpinner className={styles.spinner} />
          <span>Загрузка...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1><FaStar /> Уровни пользователей</h1>
          <p className={styles.subtitle}>Настройка уровней и требуемого опыта</p>
        </div>
        <button className={styles.addBtn} onClick={() => {
          resetForm();
          setShowForm(true);
        }}>
          <FaPlus /> Добавить уровень
        </button>
      </div>

      {showForm && (
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>{editingLevel ? 'Редактирование уровня' : 'Новый уровень'}</h2>
            <button className={styles.closeBtn} onClick={resetForm}>
              <FaTimes />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <label>
                Номер уровня
                <input
                  type="number"
                  min="1"
                  value={form.level_number}
                  onChange={(e) => setForm(prev => ({ ...prev, level_number: parseInt(e.target.value) || 1 }))}
                  required
                />
              </label>
              
              <label>
                Название звания
                <input
                  type="text"
                  value={form.rank_name}
                  onChange={(e) => setForm(prev => ({ ...prev, rank_name: e.target.value }))}
                  placeholder="Например: Новичок, Мастер..."
                />
              </label>
            </div>
            
            <div className={styles.formRow}>
              <label>
                Требуемый опыт (XP)
                <input
                  type="number"
                  min="0"
                  value={form.experience_required}
                  onChange={(e) => setForm(prev => ({ ...prev, experience_required: parseInt(e.target.value) || 0 }))}
                  required
                />
              </label>
            </div>
            
            <div className={styles.imageSection}>
              <label>Изображение уровня (150x30)</label>
              <div className={styles.imageUpload}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  id="level-image"
                  className={styles.fileInput}
                />
                <label htmlFor="level-image" className={styles.uploadLabel}>
                  {uploading ? (
                    <><FaSpinner className={styles.spinner} /> Загрузка...</>
                  ) : (
                    <><FaUpload /> Выбрать изображение</>
                  )}
                </label>
                
                {form.image_url && (
                  <div className={styles.imagePreview}>
                    <img 
                      src={form.image_url.startsWith('http') ? form.image_url : `${import.meta.env.VITE_API_URL?.replace('/api', '')}${form.image_url}`} 
                      alt="Preview" 
                    />
                    <button 
                      type="button" 
                      className={styles.removeImage}
                      onClick={() => setForm(prev => ({ ...prev, image_url: '' }))}
                    >
                      <FaTimes />
                    </button>
                  </div>
                )}
              </div>
              <p className={styles.hint}>Рекомендуемый размер: 400×400 пикселей</p>
            </div>
            
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={resetForm}>
                Отмена
              </button>
              <button type="submit" className={styles.saveBtn}>
                <FaSave /> {editingLevel ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={styles.levelsGrid}>
        {levels.length === 0 ? (
          <div className={styles.empty}>
            <FaStar className={styles.emptyIcon} />
            <p>Уровни не созданы</p>
            <p className={styles.emptyHint}>Добавьте первый уровень</p>
          </div>
        ) : (
          levels.sort((a, b) => a.level_number - b.level_number).map(level => (
            <div key={level.id} className={styles.levelCard}>
              <div className={styles.levelNumber}>
                <span>Уровень</span>
                <strong>{level.level_number}</strong>
              </div>
              
              <div className={styles.levelImage}>
                {level.image_url ? (
                  <img 
                    src={level.image_url.startsWith('http') ? level.image_url : `${import.meta.env.VITE_API_URL?.replace('/api', '')}${level.image_url}`}
                    alt={`Уровень ${level.level_number}`}
                  />
                ) : (
                  <div className={styles.noImage}>
                    <FaStar />
                  </div>
                )}
              </div>
              
              <div className={styles.levelInfo}>
                {level.rank_name && (
                  <span className={styles.rankName}>{level.rank_name}</span>
                )}
                <span className={styles.xpRequired}>
                  {level.experience_required.toLocaleString()} XP
                </span>
              </div>
              
              <div className={styles.levelActions}>
                <button onClick={() => handleEdit(level)} title="Редактировать">
                  <FaEdit />
                </button>
                <button onClick={() => handleDelete(level.id)} className={styles.deleteBtn} title="Удалить">
                  <FaTrash />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default UserLevelsManagement;
