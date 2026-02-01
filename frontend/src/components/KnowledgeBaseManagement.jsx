import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
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
import { 
  FaBold, FaItalic, FaUnderline, FaStrikethrough, 
  FaListUl, FaListOl, FaQuoteRight, FaCode,
  FaAlignLeft, FaAlignCenter, FaAlignRight,
  FaLink, FaImage, FaTable, FaUndo, FaRedo,
  FaPlusCircle, FaMinusCircle
} from 'react-icons/fa';

// TipTap Editor Toolbar
const EditorToolbar = ({ editor }) => {
  if (!editor) return null;
  
  const addImage = () => {
    const url = window.prompt('URL изображения:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };
  
  const setLink = () => {
    const url = window.prompt('URL ссылки:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
  };
  
  return (
    <div className={styles['tiptap-toolbar']}>
      <div className={styles['toolbar-group']}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? styles.active : ''}
          title="Жирный"
        >
          <FaBold />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? styles.active : ''}
          title="Курсив"
        >
          <FaItalic />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? styles.active : ''}
          title="Подчёркнутый"
        >
          <FaUnderline />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? styles.active : ''}
          title="Зачёркнутый"
        >
          <FaStrikethrough />
        </button>
      </div>
      
      <div className={styles['toolbar-group']}>
        <select
          onChange={(e) => {
            const level = parseInt(e.target.value);
            if (level === 0) {
              editor.chain().focus().setParagraph().run();
            } else {
              editor.chain().focus().toggleHeading({ level }).run();
            }
          }}
          value={
            editor.isActive('heading', { level: 1 }) ? 1 :
            editor.isActive('heading', { level: 2 }) ? 2 :
            editor.isActive('heading', { level: 3 }) ? 3 : 0
          }
          className={styles['toolbar-select']}
        >
          <option value={0}>Обычный</option>
          <option value={1}>Заголовок 1</option>
          <option value={2}>Заголовок 2</option>
          <option value={3}>Заголовок 3</option>
        </select>
      </div>
      
      <div className={styles['toolbar-group']}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? styles.active : ''}
          title="Маркированный список"
        >
          <FaListUl />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? styles.active : ''}
          title="Нумерованный список"
        >
          <FaListOl />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? styles.active : ''}
          title="Цитата"
        >
          <FaQuoteRight />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive('codeBlock') ? styles.active : ''}
          title="Блок кода"
        >
          <FaCode />
        </button>
      </div>
      
      <div className={styles['toolbar-group']}>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={editor.isActive({ textAlign: 'left' }) ? styles.active : ''}
          title="По левому краю"
        >
          <FaAlignLeft />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={editor.isActive({ textAlign: 'center' }) ? styles.active : ''}
          title="По центру"
        >
          <FaAlignCenter />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={editor.isActive({ textAlign: 'right' }) ? styles.active : ''}
          title="По правому краю"
        >
          <FaAlignRight />
        </button>
      </div>
      
      <div className={styles['toolbar-group']}>
        <button type="button" onClick={setLink} title="Вставить ссылку">
          <FaLink />
        </button>
        <button type="button" onClick={addImage} title="Вставить изображение">
          <FaImage />
        </button>
      </div>
      
      <div className={styles['toolbar-group']}>
        <button
          type="button"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Вставить таблицу"
        >
          <FaTable />
        </button>
        {editor.isActive('table') && (
          <>
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              title="Добавить столбец"
            >
              <FaPlusCircle style={{ color: '#3b82f6' }} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              title="Удалить столбец"
            >
              <FaMinusCircle style={{ color: '#ef4444' }} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              title="Добавить строку"
              className={styles['btn-add-row']}
            >
              + Строка
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteRow().run()}
              title="Удалить строку"
              className={styles['btn-del-row']}
            >
              − Строка
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteTable().run()}
              title="Удалить таблицу"
              className={styles['btn-del-table']}
            >
              <FiTrash2 /> Таблица
            </button>
          </>
        )}
      </div>
      
      <div className={styles['toolbar-group']}>
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Отменить"
        >
          <FaUndo />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Повторить"
        >
          <FaRedo />
        </button>
      </div>
    </div>
  );
};

// TipTap Editor Component
const TipTapEditor = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });
  
  // Обновляем контент при изменении извне
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);
  
  return (
    <div className={styles['tiptap-editor']}>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} className={styles['tiptap-content']} />
    </div>
  );
};

function KnowledgeBaseManagement() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('categories');
  
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
                  <TipTapEditor
                    content={articleForm.content}
                    onChange={(content) => setArticleForm({ ...articleForm, content })}
                  />
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
    </div>
  );
}

export default KnowledgeBaseManagement;
