import { useState, useEffect, useRef, useCallback } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api from '../utils/api';
import styles from './KnowledgeBaseManagement.module.css';
import './ArticleModal.css';
import { 
  FiBook, FiCode, FiGlobe, FiDatabase, FiTool,
  FiZap, FiTrendingUp, FiGrid, FiLayers, FiPackage,
  FiCpu, FiShield, FiSmartphone, FiSettings,
  FiFileText, FiEdit2, FiClipboard, FiStar, FiMapPin,
  FiType, FiMonitor, FiBox, FiClock, FiSearch,
  FiFolder, FiEye, FiCheckCircle, FiTrash2, FiPlus,
  FiRefreshCw, FiX, FiAlertCircle
} from 'react-icons/fi';

// Wrapper для ReactQuill чтобы избежать findDOMNode warning
const QuillEditor = ({ value, onChange, modules, formats, placeholder, editorRef }) => {
  return (
    <ReactQuill
      ref={editorRef}
      theme="snow"
      value={value}
      onChange={onChange}
      modules={modules}
      formats={formats}
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
  const [showTableModal, setShowTableModal] = useState(false);
  
  // Редактор
  const quillRef = useRef(null);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableData, setTableData] = useState([]);
  
  // Данные для форм
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [editingArticle, setEditingArticle] = useState(null);
  
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: 'FiBook',
    description: ''
  });

  const [subcategoryForm, setSubcategoryForm] = useState({
    name: '',
    category_id: '',
    icon: 'FiFileText',
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
    { icon: <FiBook />, name: 'FiBook' },
    { icon: <FiCode />, name: 'FiCode' },
    { icon: <FiGlobe />, name: 'FiGlobe' },
    { icon: <FiDatabase />, name: 'FiDatabase' },
    { icon: <FiTool />, name: 'FiTool' },
    { icon: <FiZap />, name: 'FiZap' },
    { icon: <FiTrendingUp />, name: 'FiTrendingUp' },
    { icon: <FiGrid />, name: 'FiGrid' },
    { icon: <FiLayers />, name: 'FiLayers' },
    { icon: <FiPackage />, name: 'FiPackage' },
    { icon: <FiCpu />, name: 'FiCpu' },
    { icon: <FiShield />, name: 'FiShield' },
    { icon: <FiSmartphone />, name: 'FiSmartphone' },
    { icon: <FiMonitor />, name: 'FiMonitor' },
    { icon: <FiSettings />, name: 'FiSettings' }
  ];
  
  // Иконки для подкатегорий
  const subIconOptions = [
    { icon: <FiFileText />, name: 'FiFileText' },
    { icon: <FiEdit2 />, name: 'FiEdit2' },
    { icon: <FiClipboard />, name: 'FiClipboard' },
    { icon: <FiStar />, name: 'FiStar' },
    { icon: <FiMapPin />, name: 'FiMapPin' },
    { icon: <FiType />, name: 'FiType' },
    { icon: <FiZap />, name: 'FiZap' },
    { icon: <FiBox />, name: 'FiBox' },
    { icon: <FiClock />, name: 'FiClock' },
    { icon: <FiGrid />, name: 'FiGrid' },
    { icon: <FiTool />, name: 'FiTool' },
    { icon: <FiSettings />, name: 'FiSettings' },
    { icon: <FiLayers />, name: 'FiLayers' },
    { icon: <FiCpu />, name: 'FiCpu' },
    { icon: <FiSearch />, name: 'FiSearch' }
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
    setCategoryForm({ name: '', icon: 'FiBook', description: '' });
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
    setSubcategoryForm({ name: '', category_id: '', icon: 'FiFileText', description: '', order_index: 0 });
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

  // Функция вставки таблицы
  const insertTable = useCallback(() => {
    // Генерируем HTML таблицы из данных
    let tableHTML = '<table class="kb-table" style="border-collapse: collapse; width: 100%; margin: 16px 0;"><tbody>';
    
    tableData.forEach((row, rowIdx) => {
      tableHTML += '<tr>';
      row.forEach((cell) => {
        if (rowIdx === 0) {
          tableHTML += `<th style="border: 1px solid #d1d5db; padding: 10px 12px; background: #f3f4f6; font-weight: 600; text-align: left;">${cell || 'Заголовок'}</th>`;
        } else {
          tableHTML += `<td style="border: 1px solid #d1d5db; padding: 10px 12px;">${cell || ''}</td>`;
        }
      });
      tableHTML += '</tr>';
    });
    tableHTML += '</tbody></table>';
    
    // Добавляем таблицу в конец контента
    // Используем специальный маркер чтобы Quill не испортил таблицу
    const tableMarker = `<!--TABLE_START-->${tableHTML}<!--TABLE_END-->`;
    
    const currentContent = articleForm.content || '';
    setArticleForm(prev => ({
      ...prev,
      content: currentContent + tableMarker
    }));
    
    setShowTableModal(false);
    resetTableEditor();
  }, [tableData, articleForm.content]);
  
  // Инициализация редактора таблицы
  const initTableEditor = useCallback(() => {
    const rows = tableRows;
    const cols = tableCols;
    const newData = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) {
        row.push(i === 0 ? `Заголовок ${j + 1}` : '');
      }
      newData.push(row);
    }
    setTableData(newData);
  }, [tableRows, tableCols]);
  
  // Сброс редактора таблицы
  const resetTableEditor = () => {
    setTableRows(3);
    setTableCols(3);
    setTableData([]);
  };
  
  // Обновление размера таблицы
  const updateTableSize = (newRows, newCols) => {
    setTableRows(newRows);
    setTableCols(newCols);
    
    const newData = [];
    for (let i = 0; i < newRows; i++) {
      const row = [];
      for (let j = 0; j < newCols; j++) {
        // Сохраняем существующие данные если есть
        row.push(tableData[i]?.[j] ?? (i === 0 ? `Заголовок ${j + 1}` : ''));
      }
      newData.push(row);
    }
    setTableData(newData);
  };
  
  // Обновление ячейки таблицы
  const updateTableCell = (rowIdx, colIdx, value) => {
    setTableData(prev => {
      const newData = [...prev];
      newData[rowIdx] = [...newData[rowIdx]];
      newData[rowIdx][colIdx] = value;
      return newData;
    });
  };
  
  // Открытие модалки таблицы
  const openTableModal = () => {
    initTableEditor();
    setShowTableModal(true);
  };

  // Конфигурация Quill
  const quillModules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        ['link', 'image', 'code-block'],
        ['clean']
      ]
    }
  };
  
  // Форматы для Quill (включая таблицы)
  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'color', 'background', 'align',
    'link', 'image', 'code-block'
  ];

  // Функция для рендеринга иконки по имени
  const renderIcon = (iconName) => {
    const iconMap = {
      FiBook: <FiBook />,
      FiCode: <FiCode />,
      FiGlobe: <FiGlobe />,
      FiDatabase: <FiDatabase />,
      FiTool: <FiTool />,
      FiZap: <FiZap />,
      FiTrendingUp: <FiTrendingUp />,
      FiGrid: <FiGrid />,
      FiLayers: <FiLayers />,
      FiPackage: <FiPackage />,
      FiCpu: <FiCpu />,
      FiShield: <FiShield />,
      FiSmartphone: <FiSmartphone />,
      FiMonitor: <FiMonitor />,
      FiSettings: <FiSettings />,
      FiFileText: <FiFileText />,
      FiEdit2: <FiEdit2 />,
      FiClipboard: <FiClipboard />,
      FiStar: <FiStar />,
      FiMapPin: <FiMapPin />,
      FiType: <FiType />,
      FiBox: <FiBox />,
      FiClock: <FiClock />,
      FiSearch: <FiSearch />
    };
    return iconMap[iconName] || <FiBook />;
  };

  if (loading) {
    return (
      <div className={styles['loading-state']}>
        <FiRefreshCw className={styles['loading-icon']} />
        <p>Загрузка базы знаний...</p>
      </div>
    );
  }

  return (
    <div className={styles['page-container']}>
      <div className={styles['page-header']}>
        <div className={styles['header-content']}>
          <div className={styles['header-left']}>
            <div className={styles['header-icon']}>
              <FiBook />
            </div>
            <div>
              <h1>Управление Базой Знаний</h1>
              <p>Создавайте категории и статьи для учеников</p>
            </div>
          </div>
        </div>
      </div>

      {/* Сообщения */}
      {error && (
        <div className={styles['alert-error']}>
          <FiAlertCircle />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className={styles['alert-success']}>
          <FiCheckCircle />
          <span>{success}</span>
        </div>
      )}

      {/* Табы */}
      <div className={styles['tabs-container']}>
        <button
          className={`${styles['tab']} ${activeTab === 'categories' ? styles['active'] : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <FiFolder />
          <span>Категории</span>
          <span className={styles['tab-badge']}>{categories.length}</span>
        </button>
        <button
          className={`${styles['tab']} ${activeTab === 'subcategories' ? styles['active'] : ''}`}
          onClick={() => setActiveTab('subcategories')}
        >
          <FiLayers />
          <span>Подкатегории</span>
          <span className={styles['tab-badge']}>{subcategories.length}</span>
        </button>
        <button
          className={`${styles['tab']} ${activeTab === 'articles' ? styles['active'] : ''}`}
          onClick={() => setActiveTab('articles')}
        >
          <FiFileText />
          <span>Статьи</span>
          <span className={styles['tab-badge']}>{articles.length}</span>
        </button>
      </div>

      {/* Категории */}
      {activeTab === 'categories' && (
        <div className={styles['content-section']}>
          <div className={styles['section-header']}>
            <h2>Категории</h2>
            <button
              className={styles['btn-primary']}
              onClick={() => {
                resetCategoryForm();
                setShowCategoryModal(true);
              }}
            >
              <FiPlus />
              <span>Создать категорию</span>
            </button>
          </div>

          {categories.length === 0 ? (
            <div className={styles['empty-state']}>
              <div className={styles['empty-state-icon']}>
                <FiFolder />
              </div>
              <h3>Нет категорий</h3>
              <p>Создайте первую категорию для базы знаний</p>
            </div>
          ) : (
            <div className={styles['categories-grid']}>
              {categories.map(category => (
                <div key={category.id} className={styles['category-card']}>
                  <div className={styles['category-icon']}>{renderIcon(category.icon)}</div>
                  <h3>{category.name}</h3>
                  <p>{category.description || 'Нет описания'}</p>
                  <div className={styles['category-stats']}>
                    <FiFileText />
                    <span>{category.articles_count} статей</span>
                  </div>
                  <div className={styles['category-actions']}>
                    <button
                      className={styles['btn-icon-edit']}
                      onClick={() => handleEditCategory(category)}
                      title="Редактировать"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      className={styles['btn-icon-delete']}
                      onClick={() => handleDeleteCategory(category.id)}
                      title="Удалить"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Подкатегории */}
      {activeTab === 'subcategories' && (
        <div className={styles['content-section']}>
          <div className={styles['section-header']}>
            <h2>Подкатегории</h2>
            <button
              className={styles['btn-primary']}
              onClick={() => {
                resetSubcategoryForm();
                setShowSubcategoryModal(true);
              }}
            >
              <FiPlus />
              <span>Создать подкатегорию</span>
            </button>
          </div>

          {subcategories.length === 0 ? (
            <div className={styles['empty-state']}>
              <div className={styles['empty-state-icon']}>
                <FiLayers />
              </div>
              <h3>Нет подкатегорий</h3>
              <p>Создайте подкатегории для организации статей</p>
            </div>
          ) : (
            <div className={styles['subcategories-list']}>
              {subcategories.map(subcategory => (
                <div key={subcategory.id} className={styles['subcategory-card']}>
                  <div className={styles['subcategory-icon']}>{renderIcon(subcategory.icon)}</div>
                  <div className={styles['subcategory-info']}>
                    <h3>{subcategory.name}</h3>
                    <div className={styles['subcategory-meta']}>
                      <span className={styles['parent-category']}>
                        <FiFolder />
                        {subcategory.category_name}
                      </span>
                    </div>
                    <p>{subcategory.description || 'Нет описания'}</p>
                    <div className={styles['subcategory-stats']}>
                      <FiFileText />
                      <span>{subcategory.articles_count} {subcategory.articles_count === 1 ? 'статья' : 'статей'}</span>
                    </div>
                  </div>
                  <div className={styles['subcategory-actions']}>
                    <button
                      className={styles['btn-icon-edit']}
                      onClick={() => handleEditSubcategory(subcategory)}
                      title="Редактировать"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      className={styles['btn-icon-delete']}
                      onClick={() => handleDeleteSubcategory(subcategory.id)}
                      title="Удалить"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Статьи */}
      {activeTab === 'articles' && (
        <div className={styles['content-section']}>
          <div className={styles['section-header']}>
            <h2>Статьи</h2>
            <button
              className={styles['btn-primary']}
              onClick={() => {
                resetArticleForm();
                setShowArticleModal(true);
              }}
            >
              <FiPlus />
              <span>Создать статью</span>
            </button>
          </div>

          {articles.length === 0 ? (
            <div className={styles['empty-state']}>
              <div className={styles['empty-state-icon']}>
                <FiFileText />
              </div>
              <h3>Нет статей</h3>
              <p>Создайте первую статью для базы знаний</p>
            </div>
          ) : (
            <div className={styles['table-container']}>
              <table className={styles['articles-table']}>
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
                        <div className={styles['article-title']}>
                          <strong>{article.title}</strong>
                          {article.description && (
                            <span className={styles['article-desc']}>{article.description}</span>
                          )}
                        </div>
                      </td>
                      <td>{article.category_name}</td>
                      <td>{article.subcategory_name || '—'}</td>
                      <td>
                        <div className={styles['views-cell']}>
                          <FiEye />
                          <span>{article.views}</span>
                        </div>
                      </td>
                      <td>
                        {article.published ? (
                          <span className={styles['badge-published']}>
                            <FiCheckCircle />
                            <span>Опубликовано</span>
                          </span>
                        ) : (
                          <span className={styles['badge-draft']}>
                            <FiEdit2 />
                            <span>Черновик</span>
                          </span>
                        )}
                      </td>
                      <td>{new Date(article.created_at).toLocaleDateString('ru-RU')}</td>
                      <td>
                        <div className={styles['table-actions']}>
                          <button
                            className={styles['btn-icon-edit']}
                            onClick={() => handleEditArticle(article)}
                            title="Редактировать"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            className={styles['btn-icon-delete']}
                            onClick={() => handleDeleteArticle(article.id)}
                            title="Удалить"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Модальное окно категории */}
      {showCategoryModal && (
        <div className={styles['modal-overlay']} onClick={() => setShowCategoryModal(false)}>
          <div className={styles['modal']} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>{editingCategory ? 'Редактировать категорию' : 'Новая категория'}</h2>
              <button className={styles['close-btn']} onClick={() => setShowCategoryModal(false)}>
                <FiX />
              </button>
            </div>
            
            <form onSubmit={handleCategorySubmit}>
              <div className={styles['modal-body']}>
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Название *</label>
                  <input
                    type="text"
                    className={styles['form-input']}
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    required
                    placeholder="Например: Web-разработка"
                  />
                </div>

                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Иконка</label>
                  <div className={styles['icon-selector']}>
                    {iconOptions.map(iconObj => (
                      <button
                        key={iconObj.name}
                        type="button"
                        className={`${styles['icon-option']} ${categoryForm.icon === iconObj.name ? styles['selected'] : ''}`}
                        onClick={() => setCategoryForm({ ...categoryForm, icon: iconObj.name })}
                      >
                        {iconObj.icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Описание</label>
                  <textarea
                    className={styles['form-input']}
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    rows="3"
                    placeholder="Краткое описание категории"
                  />
                </div>
              </div>

              <div className={styles['modal-footer']}>
                <button type="button" className={styles['btn-secondary']} onClick={() => setShowCategoryModal(false)}>
                  Отмена
                </button>
                <button type="submit" className={styles['btn-primary']}>
                  {editingCategory ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно подкатегории */}
      {showSubcategoryModal && (
        <div className={styles['modal-overlay']} onClick={() => setShowSubcategoryModal(false)}>
          <div className={styles['modal']} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>{editingSubcategory ? 'Редактировать подкатегорию' : 'Новая подкатегория'}</h2>
              <button className={styles['close-btn']} onClick={() => setShowSubcategoryModal(false)}>
                <FiX />
              </button>
            </div>
            
            <form onSubmit={handleSubcategorySubmit}>
              <div className={styles['modal-body']}>
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Название *</label>
                  <input
                    type="text"
                    className={styles['form-input']}
                    value={subcategoryForm.name}
                    onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
                    required
                    placeholder="Например: Синтаксис и основы"
                  />
                </div>

                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Категория *</label>
                  <select
                    className={styles['form-input']}
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

                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Иконка</label>
                  <div className={styles['icon-selector']}>
                    {subIconOptions.map(iconObj => (
                      <button
                        key={iconObj.name}
                        type="button"
                        className={`${styles['icon-option']} ${subcategoryForm.icon === iconObj.name ? styles['selected'] : ''}`}
                        onClick={() => setSubcategoryForm({ ...subcategoryForm, icon: iconObj.name })}
                      >
                        {iconObj.icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Описание</label>
                  <textarea
                    className={styles['form-input']}
                    value={subcategoryForm.description}
                    onChange={(e) => setSubcategoryForm({ ...subcategoryForm, description: e.target.value })}
                    rows="3"
                    placeholder="Краткое описание подкатегории"
                  />
                </div>

                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Порядок отображения</label>
                  <input
                    type="number"
                    className={styles['form-input']}
                    value={subcategoryForm.order_index}
                    onChange={(e) => setSubcategoryForm({ ...subcategoryForm, order_index: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              <div className={styles['modal-footer']}>
                <button type="button" className={styles['btn-secondary']} onClick={() => setShowSubcategoryModal(false)}>
                  Отмена
                </button>
                <button type="submit" className={styles['btn-primary']}>
                  {editingSubcategory ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно статьи */}
      {showArticleModal && (
        <div className={styles['modal-overlay']} onClick={() => setShowArticleModal(false)}>
          <div className={`${styles['modal']} ${styles['modal-xlarge']}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>{editingArticle ? 'Редактировать статью' : 'Новая статья'}</h2>
              <button className={styles['close-btn']} onClick={() => setShowArticleModal(false)}>
                <FiX />
              </button>
            </div>
            
            <form onSubmit={handleArticleSubmit}>
              <div className={styles['modal-body']}>
                <div className={styles['form-row']}>
                  <div className={styles['form-group']}>
                    <label className={styles['form-label']}>Название статьи *</label>
                    <input
                      type="text"
                      className={styles['form-input']}
                      value={articleForm.title}
                      onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                      required
                      placeholder="Введение в JavaScript"
                    />
                  </div>

                  <div className={styles['form-group']}>
                    <label className={styles['form-label']}>Категория *</label>
                    <select
                      className={styles['form-input']}
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
                </div>

                <div className={styles['form-row']}>
                  <div className={styles['form-group']}>
                    <label className={styles['form-label']}>Подкатегория</label>
                    <select
                      className={styles['form-input']}
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

                  <div className={styles['form-group']}>
                    <label className={styles['form-label']}>Краткое описание</label>
                    <input
                      type="text"
                      className={styles['form-input']}
                      value={articleForm.description}
                      onChange={(e) => setArticleForm({ ...articleForm, description: e.target.value })}
                      placeholder="Краткое описание для превью"
                    />
                  </div>
                </div>

                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Содержание статьи *</label>
                  <div className={styles['editor-toolbar-extra']}>
                    <button
                      type="button"
                      className={styles['btn-insert-table']}
                      onClick={openTableModal}
                      title="Вставить таблицу"
                    >
                      <FiGrid /> Вставить таблицу
                    </button>
                  </div>
                  <div className={styles['editor-wrapper']}>
                    <QuillEditor
                      editorRef={quillRef}
                      value={articleForm.content}
                      onChange={(content) => setArticleForm({ ...articleForm, content })}
                      modules={quillModules}
                      formats={quillFormats}
                      placeholder="Напишите содержание статьи..."
                    />
                  </div>
                </div>

                <div className={styles['form-group']}>
                  <label className={styles['checkbox-label']}>
                    <input
                      type="checkbox"
                      checked={articleForm.published}
                      onChange={(e) => setArticleForm({ ...articleForm, published: e.target.checked })}
                    />
                    Опубликовать статью
                  </label>
                </div>
              </div>

              <div className={styles['modal-footer']}>
                <button type="button" className={styles['btn-secondary']} onClick={() => setShowArticleModal(false)}>
                  Отмена
                </button>
                <button type="submit" className={styles['btn-primary']}>
                  {editingArticle ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка вставки таблицы */}
      {showTableModal && (
        <div className={styles['modal-overlay']} onClick={() => { setShowTableModal(false); resetTableEditor(); }}>
          <div className={styles['table-modal']} onClick={e => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2><FiGrid /> Создать таблицу</h2>
              <button className={styles['close-btn']} onClick={() => { setShowTableModal(false); resetTableEditor(); }}>
                <FiX />
              </button>
            </div>
            <div className={styles['table-modal-content']}>
              <div className={styles['table-size-inputs']}>
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Строки</label>
                  <input
                    type="number"
                    min="2"
                    max="15"
                    value={tableRows}
                    onChange={(e) => updateTableSize(Math.max(2, Math.min(15, parseInt(e.target.value) || 2)), tableCols)}
                    className={styles['form-input']}
                  />
                </div>
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Столбцы</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={tableCols}
                    onChange={(e) => updateTableSize(tableRows, Math.max(1, Math.min(8, parseInt(e.target.value) || 1)))}
                    className={styles['form-input']}
                  />
                </div>
              </div>
              
              <div className={styles['table-editor']}>
                <p className={styles['table-editor-hint']}>Заполните таблицу (первая строка - заголовки):</p>
                <div className={styles['table-editor-scroll']}>
                  <table className={styles['editable-table']}>
                    <tbody>
                      {tableData.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          {row.map((cell, colIdx) => (
                            <td key={colIdx} className={rowIdx === 0 ? styles['header-cell-edit'] : ''}>
                              <input
                                type="text"
                                value={cell}
                                onChange={(e) => updateTableCell(rowIdx, colIdx, e.target.value)}
                                placeholder={rowIdx === 0 ? 'Заголовок' : 'Данные'}
                                className={styles['table-cell-input']}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className={styles['modal-footer']}>
              <button className={styles['btn-secondary']} onClick={() => { setShowTableModal(false); resetTableEditor(); }}>
                Отмена
              </button>
              <button className={styles['btn-primary']} onClick={insertTable} disabled={tableData.length === 0}>
                <FiPlus /> Вставить таблицу
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KnowledgeBaseManagement;
