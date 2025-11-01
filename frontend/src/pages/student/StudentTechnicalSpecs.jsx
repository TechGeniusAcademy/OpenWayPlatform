import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaClone, FaDownload, FaFileAlt, FaCheck, FaTimes, FaClipboardList } from 'react-icons/fa';
import { MdSettings } from 'react-icons/md';
import api from '../../utils/api';
import styles from './StudentTechnicalSpecs.module.css';

function StudentTechnicalSpecs() {
  const [specs, setSpecs] = useState([]);
  const [selectedSpec, setSelectedSpec] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Форма ТЗ
  const [formData, setFormData] = useState({
    title: '',
    project_type: 'web',
    description: '',
    goals: '',
    target_audience: '',
    functional_requirements: '',
    technical_requirements: '',
    design_requirements: '',
    deadline: '',
    budget: '',
    additional_info: ''
  });

  // Загрузка списка ТЗ
  useEffect(() => {
    loadSpecs();
  }, []);

  const loadSpecs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/technical-specs');
      setSpecs(response.data.specs || []);
    } catch (error) {
      console.error('Ошибка загрузки ТЗ:', error);
    } finally {
      setLoading(false);
    }
  };

  // Создание нового ТЗ
  const handleCreateNew = () => {
    setIsCreating(true);
    setSelectedSpec(null);
    setFormData({
      title: '',
      project_type: 'web',
      description: '',
      goals: '',
      target_audience: '',
      functional_requirements: '',
      technical_requirements: '',
      design_requirements: '',
      deadline: '',
      budget: '',
      additional_info: ''
    });
  };

  // Редактирование существующего ТЗ
  const handleEdit = (spec) => {
    setSelectedSpec(spec);
    setIsCreating(true);
    setFormData({
      title: spec.title,
      project_type: spec.project_type,
      description: spec.description || '',
      goals: spec.goals || '',
      target_audience: spec.target_audience || '',
      functional_requirements: spec.functional_requirements || '',
      technical_requirements: spec.technical_requirements || '',
      design_requirements: spec.design_requirements || '',
      deadline: spec.deadline || '',
      budget: spec.budget || '',
      additional_info: spec.additional_info || ''
    });
  };

  // Сохранение ТЗ
  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Введите название проекта');
      return;
    }

    try {
      setSaving(true);
      if (selectedSpec) {
        // Обновление существующего
        await api.put(`/technical-specs/${selectedSpec.id}`, formData);
      } else {
        // Создание нового
        await api.post('/technical-specs', formData);
      }
      
      await loadSpecs();
      setIsCreating(false);
      setSelectedSpec(null);
    } catch (error) {
      console.error('Ошибка сохранения ТЗ:', error);
      alert('Ошибка при сохранении ТЗ');
    } finally {
      setSaving(false);
    }
  };

  // Удаление ТЗ
  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить это ТЗ?')) return;

    try {
      await api.delete(`/technical-specs/${id}`);
      await loadSpecs();
      if (selectedSpec?.id === id) {
        setSelectedSpec(null);
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Ошибка удаления ТЗ:', error);
      alert('Ошибка при удалении ТЗ');
    }
  };

  // Дублирование ТЗ
  const handleDuplicate = async (spec) => {
    try {
      const duplicateData = {
        ...spec,
        title: `${spec.title} (копия)`,
        id: undefined,
        created_at: undefined,
        updated_at: undefined
      };
      await api.post('/technical-specs', duplicateData);
      await loadSpecs();
    } catch (error) {
      console.error('Ошибка дублирования ТЗ:', error);
      alert('Ошибка при дублировании ТЗ');
    }
  };

  // Экспорт ТЗ в текст
  const handleExport = (spec) => {
    const text = `
ТЕХНИЧЕСКОЕ ЗАДАНИЕ
==================

Название проекта: ${spec.title}
Тип проекта: ${getProjectTypeName(spec.project_type)}
Дата создания: ${new Date(spec.created_at).toLocaleDateString('ru-RU')}

ОПИСАНИЕ ПРОЕКТА
----------------
${spec.description || 'Не указано'}

ЦЕЛИ И ЗАДАЧИ
-------------
${spec.goals || 'Не указано'}

ЦЕЛЕВАЯ АУДИТОРИЯ
-----------------
${spec.target_audience || 'Не указано'}

ФУНКЦИОНАЛЬНЫЕ ТРЕБОВАНИЯ
-------------------------
${spec.functional_requirements || 'Не указано'}

ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ
----------------------
${spec.technical_requirements || 'Не указано'}

ТРЕБОВАНИЯ К ДИЗАЙНУ
--------------------
${spec.design_requirements || 'Не указано'}

СРОК ВЫПОЛНЕНИЯ
---------------
${spec.deadline || 'Не указано'}

БЮДЖЕТ
------
${spec.budget || 'Не указано'}

ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ
-------------------------
${spec.additional_info || 'Не указано'}
`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ТЗ_${spec.title.replace(/[^a-zа-яё0-9]/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getProjectTypeName = (type) => {
    const types = {
      'web': 'Веб-сайт',
      'mobile': 'Мобильное приложение',
      'desktop': 'Десктоп приложение',
      'game': 'Игра',
      'other': 'Другое'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className={styles['technical-specs-page']}>
        <div className={styles['loading-container']}>
          <div className={styles.spinner}></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['technical-specs-page']}>
      <div className={styles['technical-specs-header']}>
        <div className={styles['header-left']}>
          <h1><FaClipboardList /> Технические задания</h1>
          <p>Создавайте и управляйте своими ТЗ</p>
        </div>
        <button className={styles['create-spec-btn']} onClick={handleCreateNew}>
          <FaPlus /> Создать новое ТЗ
        </button>
      </div>

      <div className={styles['technical-specs-content']}>
        {/* Левая панель - Список ТЗ */}
        <div className={styles['specs-list-panel']}>
          <div className={styles['specs-list-header']}>
            <h3>Мои ТЗ ({specs.length})</h3>
          </div>
          
          {specs.length === 0 ? (
            <div className={styles['empty-state']}>
              <FaFileAlt />
              <p>У вас пока нет ТЗ</p>
              <small>Создайте первое техническое задание</small>
            </div>
          ) : (
            <div className={styles['specs-list']}>
              {specs.map((spec) => (
                <div 
                  key={spec.id} 
                  className={`spec-card ${selectedSpec?.id === spec.id && isCreating ? 'active' : ''}`}
                  onClick={() => handleEdit(spec)}
                >
                  <div className={styles['spec-card-header']}>
                    <h4>{spec.title}</h4>
                    <span className={styles['spec-type']}>{getProjectTypeName(spec.project_type)}</span>
                  </div>
                  <div className={styles['spec-card-meta']}>
                    <small>Создано: {new Date(spec.created_at).toLocaleDateString('ru-RU')}</small>
                  </div>
                  <div className={styles['spec-card-actions']}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDuplicate(spec); }}
                      title="Дублировать"
                    >
                      <FaClone />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleExport(spec); }}
                      title="Экспортировать"
                    >
                      <FaDownload />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(spec.id); }}
                      className={styles['delete-btn']}
                      title="Удалить"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Правая панель - Форма редактирования */}
        <div className={styles['spec-editor-panel']}>
          {!isCreating ? (
            <div className={styles['empty-editor']}>
              <FaFileAlt />
              <h3>Выберите ТЗ или создайте новое</h3>
              <p>Выберите техническое задание из списка слева для редактирования</p>
            </div>
          ) : (
            <div className={styles['spec-form']}>
              <div className={styles['spec-form-header']}>
                <h2>{selectedSpec ? 'Редактирование ТЗ' : 'Создание нового ТЗ'}</h2>
                <div className={styles['form-actions']}>
                  <button 
                    className={styles['save-btn']} 
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <FaCheck /> {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button 
                    className={styles['cancel-btn']} 
                    onClick={() => setIsCreating(false)}
                  >
                    <FaTimes /> Отмена
                  </button>
                </div>
              </div>

              <div className={styles['spec-form-body']}>
                <div className={styles['form-group']}>
                  <label>
                    Название проекта <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Например: Интернет-магазин одежды"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div className={styles['form-group']}>
                  <label>Тип проекта</label>
                  <select
                    value={formData.project_type}
                    onChange={(e) => setFormData({...formData, project_type: e.target.value})}
                  >
                    <option value="web">Веб-сайт</option>
                    <option value="mobile">Мобильное приложение</option>
                    <option value="desktop">Десктоп приложение</option>
                    <option value="game">Игра</option>
                    <option value="other">Другое</option>
                  </select>
                </div>

                <div className={styles['form-group']}>
                  <label>Описание проекта</label>
                  <textarea
                    rows="4"
                    placeholder="Краткое описание проекта, его назначение и основная идея"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className={styles['form-group']}>
                  <label>Цели и задачи</label>
                  <textarea
                    rows="4"
                    placeholder="Что должен решать проект? Какие проблемы он решает?"
                    value={formData.goals}
                    onChange={(e) => setFormData({...formData, goals: e.target.value})}
                  />
                </div>

                <div className={styles['form-group']}>
                  <label>Целевая аудитория</label>
                  <textarea
                    rows="3"
                    placeholder="Кто будет пользоваться проектом? Возраст, интересы, потребности"
                    value={formData.target_audience}
                    onChange={(e) => setFormData({...formData, target_audience: e.target.value})}
                  />
                </div>

                <div className={styles['form-group']}>
                  <label>Функциональные требования</label>
                  <textarea
                    rows="6"
                    placeholder="Какие функции должны быть реализованы? Например:&#10;- Регистрация и авторизация пользователей&#10;- Каталог товаров с фильтрами&#10;- Корзина и оформление заказа"
                    value={formData.functional_requirements}
                    onChange={(e) => setFormData({...formData, functional_requirements: e.target.value})}
                  />
                </div>

                <div className={styles['form-group']}>
                  <label>Технические требования</label>
                  <textarea
                    rows="5"
                    placeholder="Технологии, платформы, требования к производительности. Например:&#10;- React + Node.js&#10;- Адаптивный дизайн&#10;- Поддержка браузеров: Chrome, Firefox, Safari"
                    value={formData.technical_requirements}
                    onChange={(e) => setFormData({...formData, technical_requirements: e.target.value})}
                  />
                </div>

                <div className={styles['form-group']}>
                  <label>Требования к дизайну</label>
                  <textarea
                    rows="4"
                    placeholder="Стиль, цветовая гамма, примеры дизайна. Например:&#10;- Минималистичный стиль&#10;- Основные цвета: синий, белый&#10;- Современный и чистый UI"
                    value={formData.design_requirements}
                    onChange={(e) => setFormData({...formData, design_requirements: e.target.value})}
                  />
                </div>

                <div className={styles['form-row']}>
                  <div className={styles['form-group']}>
                    <label>Срок выполнения</label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                    />
                  </div>

                  <div className={styles['form-group']}>
                    <label>Бюджет</label>
                    <input
                      type="text"
                      placeholder="Например: 50000 тенге или По договоренности"
                      value={formData.budget}
                      onChange={(e) => setFormData({...formData, budget: e.target.value})}
                    />
                  </div>
                </div>

                <div className={styles['form-group']}>
                  <label>Дополнительная информация</label>
                  <textarea
                    rows="4"
                    placeholder="Любая дополнительная информация, пожелания, ссылки на примеры"
                    value={formData.additional_info}
                    onChange={(e) => setFormData({...formData, additional_info: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentTechnicalSpecs;
