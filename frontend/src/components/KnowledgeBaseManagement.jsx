import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api from '../utils/api';
import styles from './KnowledgeBaseManagement.module.css';
import './ArticleModal.css';
import { 
  FaBook, FaLaptopCode, FaGlobe, FaDatabase, FaCalculator, 
  FaRandom, FaPalette, FaTools, FaChartBar, FaRocket,
  FaLightbulb, FaBullseye, FaLock, FaMobileAlt, FaCog,
  FaFileAlt, FaEdit, FaClipboard, FaThumbtack, FaMapMarkerAlt,
  FaFont, FaBolt, FaBox, FaClock, FaWrench, FaSearch,
  FaFolder, FaEye, FaCheckCircle, FaPencilAlt, FaTrash, FaPlus
} from 'react-icons/fa';

// Wrapper для ReactQuill чтобы избежать findDOMNode warning
const QuillEditor = ({ value, onChange, modules, placeholder }) => {
  return (
    <ReactQuill
      theme="snow"
      value={value}
      onChange={onChange}
      modules={modules}
      placeholder={placeholder}
    />
  );
};

function KnowledgeBaseManagement() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('categories'); // 'categories', 'subcategories' или 'articles'
  
  // Модальные окна
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [showArticleModal, setShowArticleModal] = useState(false);
  
  // Данные для форм
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [editingArticle, setEditingArticle] = useState(null);
  
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: 'FaBook',
    description: ''
  });

  const [subcategoryForm, setSubcategoryForm] = useState({
    name: '',
    category_id: '',
    icon: 'FaFileAlt',
    description: '',
    order_index: 0
  });

  const [articleForm, setArticleForm] = useState({
    title: '',
    category_id: '',
    subcategory_id: '',
    description: '',
    content: '',
    published: true
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Иконки для категорий
  const iconOptions = [
    { icon: <FaBook />, name: 'FaBook' },
    { icon: <FaLaptopCode />, name: 'FaLaptopCode' },
    { icon: <FaGlobe />, name: 'FaGlobe' },
    { icon: <FaDatabase />, name: 'FaDatabase' },
    { icon: <FaCalculator />, name: 'FaCalculator' },
    { icon: <FaRandom />, name: 'FaRandom' },
    { icon: <FaPalette />, name: 'FaPalette' },
    { icon: <FaTools />, name: 'FaTools' },
    { icon: <FaChartBar />, name: 'FaChartBar' },
    { icon: <FaRocket />, name: 'FaRocket' },
    { icon: <FaLightbulb />, name: 'FaLightbulb' },
    { icon: <FaBullseye />, name: 'FaBullseye' },
    { icon: <FaLock />, name: 'FaLock' },
    { icon: <FaMobileAlt />, name: 'FaMobileAlt' },
    { icon: <FaCog />, name: 'FaCog' }
  ];
  
  // Иконки для подкатегорий
  const subIconOptions = [
    { icon: <FaFileAlt />, name: 'FaFileAlt' },
    { icon: <FaEdit />, name: 'FaEdit' },
    { icon: <FaClipboard />, name: 'FaClipboard' },
    { icon: <FaThumbtack />, name: 'FaThumbtack' },
    { icon: <FaMapMarkerAlt />, name: 'FaMapMarkerAlt' },
    { icon: <FaFont />, name: 'FaFont' },
    { icon: <FaBolt />, name: 'FaBolt' },
    { icon: <FaBox />, name: 'FaBox' },
    { icon: <FaClock />, name: 'FaClock' },
    { icon: <FaBullseye />, name: 'FaBullseye' },
    { icon: <FaWrench />, name: 'FaWrench' },
    { icon: <FaCog />, name: 'FaCog' },
    { icon: <FaTools />, name: 'FaTools' },
    { icon: <FaLightbulb />, name: 'FaLightbulb' },
    { icon: <FaSearch />, name: 'FaSearch' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const categoriesRes = await api.get('/knowledge-base/categories');
      const subcategoriesRes = await api.get('/knowledge-base/subcategories');
      const articlesRes = await api.get('/knowledge-base/articles');
      
      setCategories(categoriesRes.data);
      setSubcategories(subcategoriesRes.data);
      setArticles(articlesRes.data);
    } catch (error) {
      setError('Ошибка загрузки данных');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Категории
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingCategory) {
        await api.put(`/knowledge-base/categories/${editingCategory.id}`, categoryForm);
        setSuccess('Категория обновлена');
      } else {
        await api.post('/knowledge-base/categories', categoryForm);
        setSuccess('Категория создана');
      }
      
      setShowCategoryModal(false);
      resetCategoryForm();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Ошибка при сохранении');
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      icon: category.icon,
      description: category.description || ''
    });
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Удалить категорию? Все статьи в ней также будут удалены.')) {
      return;
    }

    try {
      await api.delete(`/knowledge-base/categories/${categoryId}`);
      setSuccess('Категория удалена');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Ошибка при удалении');
    }
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', icon: 'FaBook', description: '' });
  };

  // Подкатегории
  const handleSubcategorySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingSubcategory) {
        await api.put(`/knowledge-base/subcategories/${editingSubcategory.id}`, subcategoryForm);
        setSuccess('Подкатегория обновлена');
      } else {
        await api.post('/knowledge-base/subcategories', subcategoryForm);
        setSuccess('Подкатегория создана');
      }
      
      setShowSubcategoryModal(false);
      resetSubcategoryForm();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Ошибка при сохранении');
    }
  };

  const handleEditSubcategory = (subcategory) => {
    setEditingSubcategory(subcategory);
    setSubcategoryForm({
      name: subcategory.name,
      category_id: subcategory.category_id,
      icon: subcategory.icon,
      description: subcategory.description || '',
      order_index: subcategory.order_index || 0
    });
    setShowSubcategoryModal(true);
  };

  const handleDeleteSubcategory = async (subcategoryId) => {
    if (!window.confirm('Удалить подкатегорию? Все статьи в ней также будут удалены.')) {
      return;
    }

    try {
      await api.delete(`/knowledge-base/subcategories/${subcategoryId}`);
      setSuccess('Подкатегория удалена');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Ошибка при удалении');
    }
  };

  const resetSubcategoryForm = () => {
    setEditingSubcategory(null);
    setSubcategoryForm({ name: '', category_id: '', icon: 'FaFileAlt', description: '', order_index: 0 });
  };

  // Статьи
  const handleArticleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingArticle) {
        await api.put(`/knowledge-base/articles/${editingArticle.id}`, articleForm);
        setSuccess('Статья обновлена');
      } else {
        await api.post('/knowledge-base/articles', articleForm);
        setSuccess('Статья создана');
      }
      
      setShowArticleModal(false);
      resetArticleForm();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Ошибка при сохранении');
    }
  };

  const handleEditArticle = (article) => {
    setEditingArticle(article);
    setArticleForm({
      title: article.title,
      category_id: article.category_id,
      subcategory_id: article.subcategory_id || '',
      description: article.description,
      content: article.content || '',
      published: article.published
    });
    setShowArticleModal(true);
  };

  const handleDeleteArticle = async (articleId) => {
    if (!window.confirm('Удалить эту статью?')) {
      return;
    }

    try {
      await api.delete(`/knowledge-base/articles/${articleId}`);
      setSuccess('Статья удалена');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Ошибка при удалении');
    }
  };

  const resetArticleForm = () => {
    setEditingArticle(null);
    setArticleForm({
      title: '',
      category_id: '',
      subcategory_id: '',
      description: '',
      content: '',
      published: true
    });
  };

  // Конфигурация Quill
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link', 'image', 'code-block'],
      ['clean']
    ]
  };

  // Функция для рендеринга иконки по имени
  const renderIcon = (iconName) => {
    const iconMap = {
      FaBook: <FaBook />,
      FaLaptopCode: <FaLaptopCode />,
      FaGlobe: <FaGlobe />,
      FaDatabase: <FaDatabase />,
      FaCalculator: <FaCalculator />,
      FaRandom: <FaRandom />,
      FaPalette: <FaPalette />,
      FaTools: <FaTools />,
      FaChartBar: <FaChartBar />,
      FaRocket: <FaRocket />,
      FaLightbulb: <FaLightbulb />,
      FaBullseye: <FaBullseye />,
      FaLock: <FaLock />,
      FaMobileAlt: <FaMobileAlt />,
      FaCog: <FaCog />,
      FaFileAlt: <FaFileAlt />,
      FaEdit: <FaEdit />,
      FaClipboard: <FaClipboard />,
      FaThumbtack: <FaThumbtack />,
      FaMapMarkerAlt: <FaMapMarkerAlt />,
      FaFont: <FaFont />,
      FaBolt: <FaBolt />,
      FaBox: <FaBox />,
      FaClock: <FaClock />,
      FaWrench: <FaWrench />,
      FaSearch: <FaSearch />
    };
    return iconMap[iconName] || <FaBook />;
  };

  if (loading) {
    return (
      <div className={styles.kb-management-loading}>
        <div className={styles.loader}></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={styles.kb-management}>
      <div className={styles.kb-management-header}>
        <h1><FaBook /> Управление Базой Знаний</h1>
        <p>Создавайте категории и статьи для учеников</p>
      </div>

      {/* Сообщения */}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Табы */}
      <div className={styles.kb-tabs}>
        <button
          className={`kb-tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <FaFolder /> Категории ({categories.length})
        </button>
        <button
          className={`kb-tab ${activeTab === 'subcategories' ? 'active' : ''}`}
          onClick={() => setActiveTab('subcategories')}
        >
          <FaClipboard /> Подкатегории ({subcategories.length})
        </button>
        <button
          className={`kb-tab ${activeTab === 'articles' ? 'active' : ''}`}
          onClick={() => setActiveTab('articles')}
        >
          <FaFileAlt /> Статьи ({articles.length})
        </button>
      </div>

      {/* Категории */}
      {activeTab === 'categories' && (
        <div className={styles.kb-section}>
          <div className={styles.kb-section-header}>
            <h2>Категории</h2>
            <button
              className="btn btn-primary"
              onClick={() => {
                resetCategoryForm();
                setShowCategoryModal(true);
              }}
            >
              <FaPlus /> Создать категорию
            </button>
          </div>

          <div className={styles.categories-grid}>
            {categories.length === 0 ? (
              <div className={styles.empty-state}>
                <p>Нет категорий</p>
              </div>
            ) : (
              categories.map(category => (
                <div key={category.id} className={styles.category-card}>
                  <div className={styles.category-icon}>{renderIcon(category.icon)}</div>
                  <h3>{category.name}</h3>
                  <p>{category.description}</p>
                  <div className={styles.category-stats}>
                    <FaFileAlt /> {category.articles_count} статей
                  </div>
                  <div className={styles.category-actions}>
                    <button
                      className="btn btn-small btn-edit"
                      onClick={() => handleEditCategory(category)}
                    >
                      <FaPencilAlt /> Изменить
                    </button>
                    <button
                      className="btn btn-small btn-delete"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <FaTrash /> Удалить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Подкатегории */}
      {activeTab === 'subcategories' && (
        <div className={styles.kb-section}>
          <div className={styles.kb-section-header}>
            <h2>Подкатегории</h2>
            <button
              className="btn btn-primary"
              onClick={() => {
                resetSubcategoryForm();
                setShowSubcategoryModal(true);
              }}
            >
              <FaPlus /> Создать подкатегорию
            </button>
          </div>

          <div className={styles.kb-categories-grid}>
            {subcategories.map(subcategory => (
              <div key={subcategory.id} className={styles.kb-category-card}>
                <div className={styles.kb-category-icon}>{renderIcon(subcategory.icon)}</div>
                <div className={styles.kb-category-info}>
                  <h3>{subcategory.name}</h3>
                  <p className={styles.category-name}><FaFolder /> {subcategory.category_name}</p>
                  <p>{subcategory.description || 'Нет описания'}</p>
                  <span className={styles.kb-category-count}>
                    {subcategory.articles_count} {subcategory.articles_count === 1 ? 'статья' : 'статей'}
                  </span>
                </div>
                <div className={styles.kb-category-actions}>
                  <button
                    className="btn btn-small btn-edit"
                    onClick={() => handleEditSubcategory(subcategory)}
                  >
                    <FaPencilAlt /> Редактировать
                  </button>
                  <button
                    className="btn btn-small btn-delete"
                    onClick={() => handleDeleteSubcategory(subcategory.id)}
                  >
                    <FaTrash /> Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Статьи */}
      {activeTab === 'articles' && (
        <div className={styles.kb-section}>
          <div className={styles.kb-section-header}>
            <h2>Статьи</h2>
            <button
              className="btn btn-primary"
              onClick={() => {
                resetArticleForm();
                setShowArticleModal(true);
              }}
            >
              <FaPlus /> Создать статью
            </button>
          </div>

          <div className={styles.articles-table}>
            {articles.length === 0 ? (
              <div className={styles.empty-state}>
                <p>Нет статей</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Категория</th>
                    <th>Подкатегория</th>
                    <th>Просмотры</th>
                    <th>Статус</th>
                    <th>Дата</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map(article => (
                    <tr key={article.id}>
                      <td>
                        <strong>{article.title}</strong>
                        <br />
                        <small>{article.description}</small>
                      </td>
                      <td>{article.category_name}</td>
                      <td>{article.subcategory_name || '—'}</td>
                      <td><FaEye /> {article.views}</td>
                      <td>
                        <span className={`status-badge ${article.published ? 'published' : 'draft'}`}>
                          {article.published ? <><FaCheckCircle /> Опубликовано</> : <><FaPencilAlt /> Черновик</>}
                        </span>
                      </td>
                      <td>{new Date(article.created_at).toLocaleDateString('ru-RU')}</td>
                      <td>
                        <div className={styles.action-buttons}>
                          <button
                            className="btn btn-small btn-edit"
                            onClick={() => handleEditArticle(article)}
                          >
                            <FaPencilAlt />
                          </button>
                          <button
                            className="btn btn-small btn-delete"
                            onClick={() => handleDeleteArticle(article.id)}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно категории */}
      {showCategoryModal && (
        <div className={styles.modal-overlay} onClick={() => setShowCategoryModal(false)}>
          <div className={styles.modal-content} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modal-header}>
              <h2>{editingCategory ? 'Редактировать категорию' : 'Новая категория'}</h2>
              <button className={styles.modal-close} onClick={() => setShowCategoryModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleCategorySubmit}>
              <div className={styles.form-group}>
                <label>Название *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  required
                  placeholder="Например: Web-разработка"
                />
              </div>

              <div className={styles.form-group}>
                <label>Иконка</label>
                <div className={styles.icon-selector}>
                  {iconOptions.map(iconObj => (
                    <button
                      key={iconObj.name}
                      type="button"
                      className={`icon-option ${categoryForm.icon === iconObj.name ? 'selected' : ''}`}
                      onClick={() => setCategoryForm({ ...categoryForm, icon: iconObj.name })}
                    >
                      {iconObj.icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.form-group}>
                <label>Описание</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  rows="3"
                  placeholder="Краткое описание категории"
                />
              </div>

              <div className={styles.modal-actions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно подкатегории */}
      {showSubcategoryModal && (
        <div className={styles.modal-overlay} onClick={() => setShowSubcategoryModal(false)}>
          <div className={styles.modal-content} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modal-header}>
              <h2>{editingSubcategory ? 'Редактировать подкатегорию' : 'Новая подкатегория'}</h2>
              <button className={styles.modal-close} onClick={() => setShowSubcategoryModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubcategorySubmit}>
              <div className={styles.form-group}>
                <label>Название *</label>
                <input
                  type="text"
                  value={subcategoryForm.name}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
                  required
                  placeholder="Например: Синтаксис и основы"
                />
              </div>

              <div className={styles.form-group}>
                <label>Категория *</label>
                <select
                  value={subcategoryForm.category_id}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, category_id: e.target.value })}
                  required
                >
                  <option value="">Выберите категорию</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.form-group}>
                <label>Иконка</label>
                <div className={styles.icon-selector}>
                  {subIconOptions.map(iconObj => (
                    <button
                      key={iconObj.name}
                      type="button"
                      className={`icon-option ${subcategoryForm.icon === iconObj.name ? 'selected' : ''}`}
                      onClick={() => setSubcategoryForm({ ...subcategoryForm, icon: iconObj.name })}
                    >
                      {iconObj.icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.form-group}>
                <label>Описание</label>
                <textarea
                  value={subcategoryForm.description}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, description: e.target.value })}
                  rows="3"
                  placeholder="Краткое описание подкатегории"
                />
              </div>

              <div className={styles.form-group}>
                <label>Порядок отображения</label>
                <input
                  type="number"
                  value={subcategoryForm.order_index}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, order_index: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className={styles.modal-actions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSubcategoryModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSubcategory ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно статьи */}
      {showArticleModal && (
        <div className={styles.article-modal-overlay} onClick={() => setShowArticleModal(false)}>
          <div className={styles.article-modal-content} onClick={(e) => e.stopPropagation()}>
            <div className={styles.article-modal-header}>
              <h2>{editingArticle ? 'Редактировать статью' : 'Новая статья'}</h2>
              <button className={styles.article-modal-close} onClick={() => setShowArticleModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleArticleSubmit}>
              <div className={styles.article-form-fields-wrapper}>
                <div className={styles.article-form-row}>
                  <div className={styles.article-form-group}>
                    <label>Название статьи *</label>
                    <input
                      type="text"
                      value={articleForm.title}
                      onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                      required
                      placeholder="Введение в JavaScript"
                    />
                  </div>

                  <div className={styles.article-form-group}>
                    <label>Категория *</label>
                    <select
                      value={articleForm.category_id}
                      onChange={(e) => setArticleForm({ ...articleForm, category_id: e.target.value, subcategory_id: '' })}
                      required
                    >
                      <option value="">Выберите категорию</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.article-form-group}>
                    <label>Подкатегория</label>
                    <select
                      value={articleForm.subcategory_id}
                      onChange={(e) => setArticleForm({ ...articleForm, subcategory_id: e.target.value })}
                      disabled={!articleForm.category_id}
                    >
                      <option value="">Без подкатегории</option>
                      {subcategories
                        .filter(sub => sub.category_id === parseInt(articleForm.category_id))
                        .map(sub => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className={styles.article-form-group}>
                  <label>Краткое описание</label>
                  <input
                    type="text"
                    value={articleForm.description}
                    onChange={(e) => setArticleForm({ ...articleForm, description: e.target.value })}
                    placeholder="Краткое описание для превью"
                  />
                </div>

                <div className="article-form-group article-quill-editor-group">
                  <label>Содержание статьи *</label>
                  <div className={styles.article-quill-editor-wrapper}>
                    <QuillEditor
                      value={articleForm.content}
                      onChange={(content) => setArticleForm({ ...articleForm, content })}
                      modules={quillModules}
                      placeholder="Напишите содержание статьи..."
                    />
                  </div>
                </div>

                <div className={styles.article-form-group}>
                  <label className={styles.article-checkbox-label}>
                    <input
                      type="checkbox"
                      checked={articleForm.published}
                      onChange={(e) => setArticleForm({ ...articleForm, published: e.target.checked })}
                    />
                    Опубликовать статью
                  </label>
                </div>
              </div>

              <div className={styles.article-modal-actions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowArticleModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingArticle ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default KnowledgeBaseManagement;
