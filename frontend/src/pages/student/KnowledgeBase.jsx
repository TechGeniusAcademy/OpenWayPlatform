import { useState, useEffect } from 'react';
import api from '../../utils/api';
import styles from './KnowledgeBase.module.css';
import { 
  AiOutlineBook,
  AiOutlineSearch,
  AiOutlineEye,
  AiOutlineCalendar,
  AiOutlineArrowRight,
  AiOutlineArrowLeft,
  AiOutlineFileText,
  AiOutlineAppstore,
  AiOutlineFire,
  AiOutlineStar
} from 'react-icons/ai';
import { FaFolderOpen } from 'react-icons/fa';

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

  // Вычисление статистики
  const getStats = () => {
    const totalArticles = articles.length;
    const totalCategories = categories.length;
    const totalViews = articles.reduce((sum, article) => sum + (article.views || 0), 0);
    const mostViewed = articles.length > 0 ? Math.max(...articles.map(a => a.views || 0)) : 0;
    
    return { totalArticles, totalCategories, totalViews, mostViewed };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className={styles['knowledge-base-loading']}>
        <div className={styles.loader}></div>
        <p>Загрузка базы знаний...</p>
      </div>
    );
  }

  return (
    <div className={styles['knowledge-base']}>
      {!selectedArticle ? (
        <>
          {/* Заголовок и поиск */}
          <div className={styles['kb-header']}>
            <div className={styles['kb-header-content']}>
              <h1>
                <AiOutlineBook /> База знаний
              </h1>
              <p>Изучайте материалы и расширяйте свои знания</p>
            </div>
            <div className={styles['kb-search']}>
              <div className={styles['kb-search-wrapper']}>
                <AiOutlineSearch className={styles['search-icon']} />
                <input
                  type="text"
                  placeholder="Поиск по базе знаний..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles['kb-search-input']}
                />
              </div>
            </div>
          </div>

          {/* Статистика */}
          <div className={styles['kb-stats']}>
            <div className={styles['stat-card']}>
              <div className={styles['stat-icon']} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <AiOutlineBook />
              </div>
              <div className={styles['stat-info']}>
                <div className={styles['stat-value']}>{stats.totalArticles}</div>
                <div className={styles['stat-label']}>Всего статей</div>
              </div>
            </div>

            <div className={styles['stat-card']}>
              <div className={styles['stat-icon']} style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                <FaFolderOpen />
              </div>
              <div className={styles['stat-info']}>
                <div className={styles['stat-value']}>{stats.totalCategories}</div>
                <div className={styles['stat-label']}>Категорий</div>
              </div>
            </div>

            <div className={styles['stat-card']}>
              <div className={styles['stat-icon']} style={{ background: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)' }}>
                <AiOutlineEye />
              </div>
              <div className={styles['stat-info']}>
                <div className={styles['stat-value']}>{stats.totalViews}</div>
                <div className={styles['stat-label']}>Просмотров</div>
              </div>
            </div>

            <div className={styles['stat-card']}>
              <div className={styles['stat-icon']} style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
                <AiOutlineFire />
              </div>
              <div className={styles['stat-info']}>
                <div className={styles['stat-value']}>{stats.mostViewed}</div>
                <div className={styles['stat-label']}>Самая популярная</div>
              </div>
            </div>
          </div>

          {/* Категории */}
          <div className={styles['kb-categories']}>
            <button
              className={`${styles['kb-category']} ${selectedCategory === 'all' ? styles['active'] : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              <span className={styles['category-icon']}>
                <AiOutlineAppstore />
              </span>
              <span className={styles['category-name']}>Все темы</span>
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                className={`${styles['kb-category']} ${selectedCategory === category.id ? styles['active'] : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <span className={styles['category-icon']}>{category.icon}</span>
                <span className={styles['category-name']}>{category.name}</span>
              </button>
            ))}
          </div>

          {/* Подкатегории */}
          {subcategories.length > 0 && (
            <div className={styles['kb-subcategories']}>
              <button
                className={`${styles['kb-subcategory']} ${selectedSubcategory === 'all' ? styles['active'] : ''}`}
                onClick={() => setSelectedSubcategory('all')}
              >
                <AiOutlineFileText /> Все разделы
              </button>
              {subcategories.map(subcategory => (
                <button
                  key={subcategory.id}
                  className={`${styles['kb-subcategory']} ${selectedSubcategory === subcategory.id ? styles['active'] : ''}`}
                  onClick={() => setSelectedSubcategory(subcategory.id)}
                >
                  {subcategory.icon} {subcategory.name}
                </button>
              ))}
            </div>
          )}

          {/* Список статей */}
          <div className={styles['kb-articles-grid']}>
            {filteredArticles.length === 0 ? (
              <div className={styles['kb-empty']}>
                <div className={styles['kb-empty-icon']}>
                  <AiOutlineSearch />
                </div>
                <h3>Ничего не найдено</h3>
                <p>Попробуйте изменить параметры поиска</p>
              </div>
            ) : (
              filteredArticles.map(article => (
                <div
                  key={article.id}
                  className={styles['kb-article-card']}
                  onClick={() => handleArticleClick(article)}
                >
                  <div className={styles['kb-article-header']}>
                    <span className={styles['kb-article-category']}>{article.category}</span>
                    <span className={styles['kb-article-views']}>
                      <AiOutlineEye /> {article.views}
                    </span>
                  </div>
                  <h3 className={styles['kb-article-title']}>{article.title}</h3>
                  <p className={styles['kb-article-description']}>{article.description}</p>
                  <div className={styles['kb-article-footer']}>
                    <span className={styles['kb-article-date']}>
                      <AiOutlineCalendar /> {new Date(article.created_at).toLocaleDateString('ru-RU')}
                    </span>
                    <span className={styles['kb-article-link']}>
                      Читать <AiOutlineArrowRight />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        /* Просмотр статьи */
        <div className={styles['kb-article-view']}>
          <button
            className={styles['kb-back-button']}
            onClick={() => setSelectedArticle(null)}
          >
            <AiOutlineArrowLeft /> Назад к списку
          </button>
          
          <div className={styles['kb-article-content']}>
            <div className={styles['kb-article-meta']}>
              <span className={styles['kb-article-category-badge']}>{selectedArticle.category}</span>
              <span className={styles['kb-article-views-badge']}>
                <AiOutlineEye /> {selectedArticle.views} просмотров
              </span>
            </div>
            
            <h1 className={styles['kb-article-main-title']}>{selectedArticle.title}</h1>
            
            <div className={styles['kb-article-info']}>
              <span>
                <AiOutlineCalendar /> {new Date(selectedArticle.created_at).toLocaleDateString('ru-RU')}
              </span>
            </div>

            <div 
              className={styles['kb-article-body']}
              dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default KnowledgeBase;
