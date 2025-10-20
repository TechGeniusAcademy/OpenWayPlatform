import { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api from '../utils/api';
import './KnowledgeBaseManagement.css';

// Wrapper для ReactQuill чтобы избежать findDOMNode warning
const QuillEditor = ({ value, onChange, modules, placeholder, style }) => {
  const quillRef = useRef(null);
  
  return (
    <ReactQuill
      ref={quillRef}
      theme="snow"
      value={value}
      onChange={onChange}
      modules={modules}
      placeholder={placeholder}
      style={style}
    />
  );
};

function KnowledgeBaseManagement() {
  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' или 'articles'
  
  // Модальные окна
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showArticleModal, setShowArticleModal] = useState(false);
  
  // Данные для форм
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingArticle, setEditingArticle] = useState(null);
  
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: '📚',
    description: ''
  });

  const [articleForm, setArticleForm] = useState({
    title: '',
    category_id: '',
    description: '',
    content: '',
    published: true
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Иконки для категорий
  const iconOptions = ['📚', '💻', '🌐', '🗄️', '🧮', '🔀', '🎨', '🔧', '📊', '🚀', '💡', '🎯', '🔐', '📱', '⚙️'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // TODO: Заменить на реальный API
      // const categoriesRes = await api.get('/knowledge-base/categories');
      // const articlesRes = await api.get('/knowledge-base/articles');
      
      // Временные данные
      setCategories([
        { id: 1, name: 'Основы программирования', icon: '💻', description: 'Базовые концепции', articles_count: 5 },
        { id: 2, name: 'Web-разработка', icon: '🌐', description: 'HTML, CSS, JavaScript', articles_count: 8 },
        { id: 3, name: 'Базы данных', icon: '🗄️', description: 'SQL и NoSQL', articles_count: 4 }
      ]);
      
      setArticles([
        { 
          id: 1, 
          title: 'Введение в JavaScript', 
          category_id: 1,
          category_name: 'Основы программирования',
          description: 'Основы языка JavaScript',
          views: 245,
          published: true,
          created_at: '2025-10-15'
        },
        { 
          id: 2, 
          title: 'HTML5 Семантика', 
          category_id: 2,
          category_name: 'Web-разработка',
          description: 'Семантические теги HTML5',
          views: 189,
          published: true,
          created_at: '2025-10-16'
        }
      ]);
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
        // await api.put(`/knowledge-base/categories/${editingCategory.id}`, categoryForm);
        setSuccess('Категория обновлена');
      } else {
        // await api.post('/knowledge-base/categories', categoryForm);
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
      // await api.delete(`/knowledge-base/categories/${categoryId}`);
      setSuccess('Категория удалена');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Ошибка при удалении');
    }
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', icon: '📚', description: '' });
  };

  // Статьи
  const handleArticleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingArticle) {
        // await api.put(`/knowledge-base/articles/${editingArticle.id}`, articleForm);
        setSuccess('Статья обновлена');
      } else {
        // await api.post('/knowledge-base/articles', articleForm);
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
      // await api.delete(`/knowledge-base/articles/${articleId}`);
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

  if (loading) {
    return (
      <div className="kb-management-loading">
        <div className="loader"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="kb-management">
      <div className="kb-management-header">
        <h1>📚 Управление Базой Знаний</h1>
        <p>Создавайте категории и статьи для учеников</p>
      </div>

      {/* Сообщения */}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Табы */}
      <div className="kb-tabs">
        <button
          className={`kb-tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          🗂️ Категории ({categories.length})
        </button>
        <button
          className={`kb-tab ${activeTab === 'articles' ? 'active' : ''}`}
          onClick={() => setActiveTab('articles')}
        >
          📄 Статьи ({articles.length})
        </button>
      </div>

      {/* Категории */}
      {activeTab === 'categories' && (
        <div className="kb-section">
          <div className="kb-section-header">
            <h2>Категории</h2>
            <button
              className="btn btn-primary"
              onClick={() => {
                resetCategoryForm();
                setShowCategoryModal(true);
              }}
            >
              + Создать категорию
            </button>
          </div>

          <div className="categories-grid">
            {categories.length === 0 ? (
              <div className="empty-state">
                <p>Нет категорий</p>
              </div>
            ) : (
              categories.map(category => (
                <div key={category.id} className="category-card">
                  <div className="category-icon">{category.icon}</div>
                  <h3>{category.name}</h3>
                  <p>{category.description}</p>
                  <div className="category-stats">
                    📄 {category.articles_count} статей
                  </div>
                  <div className="category-actions">
                    <button
                      className="btn btn-small btn-edit"
                      onClick={() => handleEditCategory(category)}
                    >
                      ✏️ Изменить
                    </button>
                    <button
                      className="btn btn-small btn-delete"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      🗑️ Удалить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Статьи */}
      {activeTab === 'articles' && (
        <div className="kb-section">
          <div className="kb-section-header">
            <h2>Статьи</h2>
            <button
              className="btn btn-primary"
              onClick={() => {
                resetArticleForm();
                setShowArticleModal(true);
              }}
            >
              + Создать статью
            </button>
          </div>

          <div className="articles-table">
            {articles.length === 0 ? (
              <div className="empty-state">
                <p>Нет статей</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Категория</th>
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
                      <td>👁️ {article.views}</td>
                      <td>
                        <span className={`status-badge ${article.published ? 'published' : 'draft'}`}>
                          {article.published ? '✅ Опубликовано' : '📝 Черновик'}
                        </span>
                      </td>
                      <td>{new Date(article.created_at).toLocaleDateString('ru-RU')}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-small btn-edit"
                            onClick={() => handleEditArticle(article)}
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-small btn-delete"
                            onClick={() => handleDeleteArticle(article.id)}
                          >
                            🗑️
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
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCategory ? 'Редактировать категорию' : 'Новая категория'}</h2>
              <button className="modal-close" onClick={() => setShowCategoryModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleCategorySubmit}>
              <div className="form-group">
                <label>Название *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  required
                  placeholder="Например: Web-разработка"
                />
              </div>

              <div className="form-group">
                <label>Иконка</label>
                <div className="icon-selector">
                  {iconOptions.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      className={`icon-option ${categoryForm.icon === icon ? 'selected' : ''}`}
                      onClick={() => setCategoryForm({ ...categoryForm, icon })}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Описание</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  rows="3"
                  placeholder="Краткое описание категории"
                />
              </div>

              <div className="modal-actions">
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

      {/* Модальное окно статьи */}
      {showArticleModal && (
        <div className="modal-overlay" onClick={() => setShowArticleModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingArticle ? 'Редактировать статью' : 'Новая статья'}</h2>
              <button className="modal-close" onClick={() => setShowArticleModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleArticleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Название статьи *</label>
                  <input
                    type="text"
                    value={articleForm.title}
                    onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                    required
                    placeholder="Введение в JavaScript"
                  />
                </div>

                <div className="form-group">
                  <label>Категория *</label>
                  <select
                    value={articleForm.category_id}
                    onChange={(e) => setArticleForm({ ...articleForm, category_id: e.target.value })}
                    required
                  >
                    <option value="">Выберите категорию</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Краткое описание</label>
                <input
                  type="text"
                  value={articleForm.description}
                  onChange={(e) => setArticleForm({ ...articleForm, description: e.target.value })}
                  placeholder="Краткое описание для превью"
                />
              </div>

              <div className="form-group">
                <label>Содержание статьи *</label>
                <QuillEditor
                  value={articleForm.content}
                  onChange={(content) => setArticleForm({ ...articleForm, content })}
                  modules={quillModules}
                  placeholder="Напишите содержание статьи..."
                  style={{ height: '400px', marginBottom: '50px' }}
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={articleForm.published}
                    onChange={(e) => setArticleForm({ ...articleForm, published: e.target.checked })}
                  />
                  Опубликовать статью
                </label>
              </div>

              <div className="modal-actions">
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
