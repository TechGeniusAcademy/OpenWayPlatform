import { useState, useEffect } from 'react';
import api from '../../utils/api';
import './KnowledgeBase.css';

function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKnowledgeBase();
  }, []);

  useEffect(() => {
    if (selectedCategory !== 'all') {
      loadSubcategories(selectedCategory);
    } else {
      setSubcategories([]);
      setSelectedSubcategory('all');
    }
  }, [selectedCategory]);

  const loadKnowledgeBase = async () => {
    try {
      setLoading(true);
      const categoriesRes = await api.get('/knowledge-base/categories');
      const articlesRes = await api.get('/knowledge-base/articles/published');
      
      setCategories(categoriesRes.data);
      setArticles(articlesRes.data);
    } catch (error) {
      console.error('Ошибка загрузки базы знаний:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubcategories = async (categoryId) => {
    try {
      const response = await api.get(`/knowledge-base/categories/${categoryId}/subcategories`);
      setSubcategories(response.data);
      setSelectedSubcategory('all');
    } catch (error) {
      console.error('Ошибка загрузки подкатегорий:', error);
      setSubcategories([]);
    }
  };

  const filteredArticles = articles.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.category_id === selectedCategory;
    const matchesSubcategory = selectedSubcategory === 'all' || article.subcategory_id === selectedSubcategory;
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSubcategory && matchesSearch;
  });

  const handleArticleClick = async (article) => {
    try {
      // Загружаем полную статью с увеличением просмотров
      const response = await api.get(`/knowledge-base/articles/${article.id}`);
      setSelectedArticle(response.data);
    } catch (error) {
      console.error('Ошибка загрузки статьи:', error);
      // Если не удалось загрузить, показываем то что есть
      setSelectedArticle(article);
    }
  };

  if (loading) {
    return (
      <div className="knowledge-base-loading">
        <div className="loader"></div>
        <p>Загрузка базы знаний...</p>
      </div>
    );
  }

  return (
    <div className="knowledge-base">
      {!selectedArticle ? (
        <>
          {/* Заголовок и поиск */}
          <div className="kb-header">
            <div className="kb-header-content">
              <h1>📚 База знаний</h1>
              <p>Изучайте материалы и расширяйте свои знания</p>
            </div>
            <div className="kb-search">
              <input
                type="text"
                placeholder="🔍 Поиск по базе знаний..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="kb-search-input"
              />
            </div>
          </div>

          {/* Категории */}
          <div className="kb-categories">
            <button
              className={`kb-category ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              <span className="category-icon">📋</span>
              <span className="category-name">Все темы</span>
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                className={`kb-category ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <span className="category-icon">{category.icon}</span>
                <span className="category-name">{category.name}</span>
              </button>
            ))}
          </div>

          {/* Подкатегории */}
          {subcategories.length > 0 && (
            <div className="kb-subcategories">
              <button
                className={`kb-subcategory ${selectedSubcategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedSubcategory('all')}
              >
                📋 Все разделы
              </button>
              {subcategories.map(subcategory => (
                <button
                  key={subcategory.id}
                  className={`kb-subcategory ${selectedSubcategory === subcategory.id ? 'active' : ''}`}
                  onClick={() => setSelectedSubcategory(subcategory.id)}
                >
                  {subcategory.icon} {subcategory.name}
                </button>
              ))}
            </div>
          )}

          {/* Список статей */}
          <div className="kb-articles-grid">
            {filteredArticles.length === 0 ? (
              <div className="kb-empty">
                <div className="kb-empty-icon">🔍</div>
                <h3>Ничего не найдено</h3>
                <p>Попробуйте изменить параметры поиска</p>
              </div>
            ) : (
              filteredArticles.map(article => (
                <div
                  key={article.id}
                  className="kb-article-card"
                  onClick={() => handleArticleClick(article)}
                >
                  <div className="kb-article-header">
                    <span className="kb-article-category">{article.category}</span>
                    <span className="kb-article-views">👁️ {article.views}</span>
                  </div>
                  <h3 className="kb-article-title">{article.title}</h3>
                  <p className="kb-article-description">{article.description}</p>
                  <div className="kb-article-footer">
                    <span className="kb-article-date">
                      📅 {new Date(article.created_at).toLocaleDateString('ru-RU')}
                    </span>
                    <span className="kb-article-link">Читать →</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        /* Просмотр статьи */
        <div className="kb-article-view">
          <button
            className="kb-back-button"
            onClick={() => setSelectedArticle(null)}
          >
            ← Назад к списку
          </button>
          
          <div className="kb-article-content">
            <div className="kb-article-meta">
              <span className="kb-article-category-badge">{selectedArticle.category}</span>
              <span className="kb-article-views-badge">👁️ {selectedArticle.views} просмотров</span>
            </div>
            
            <h1 className="kb-article-main-title">{selectedArticle.title}</h1>
            
            <div className="kb-article-info">
              <span>📅 {new Date(selectedArticle.created_at).toLocaleDateString('ru-RU')}</span>
            </div>

            <div 
              className="kb-article-body"
              dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default KnowledgeBase;
