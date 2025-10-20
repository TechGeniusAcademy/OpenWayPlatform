import { useState, useEffect } from 'react';
import api from '../../utils/api';
import './KnowledgeBase.css';

function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKnowledgeBase();
  }, []);

  const loadKnowledgeBase = async () => {
    try {
      setLoading(true);
      // TODO: Заменить на реальный API когда будет готов
      // const response = await api.get('/knowledge-base');
      
      // Временные данные для демонстрации
      const mockCategories = [
        { id: 1, name: 'Основы программирования', icon: '💻' },
        { id: 2, name: 'Web-разработка', icon: '🌐' },
        { id: 3, name: 'Базы данных', icon: '🗄️' },
        { id: 4, name: 'Алгоритмы', icon: '🧮' },
        { id: 5, name: 'Git и GitHub', icon: '🔀' }
      ];

      const mockArticles = [
        {
          id: 1,
          title: 'Введение в JavaScript',
          category_id: 1,
          category: 'Основы программирования',
          description: 'Основы языка JavaScript для начинающих',
          content: `# Введение в JavaScript

JavaScript — это мощный язык программирования, который используется для создания интерактивных веб-страниц.

## Основные концепции

### Переменные
\`\`\`javascript
let name = "Иван";
const age = 25;
var city = "Алматы";
\`\`\`

### Функции
\`\`\`javascript
function greet(name) {
  return "Привет, " + name + "!";
}

console.log(greet("Мир"));
\`\`\`

### Массивы
\`\`\`javascript
const fruits = ["яблоко", "банан", "апельсин"];
console.log(fruits[0]); // яблоко
\`\`\``,
          views: 245,
          created_at: '2025-10-15'
        },
        {
          id: 2,
          title: 'HTML5 и семантическая верстка',
          category_id: 2,
          category: 'Web-разработка',
          description: 'Современные стандарты HTML5',
          content: `# HTML5 и семантическая верстка

HTML5 предоставляет новые семантические элементы для структурирования контента.

## Основные теги

- \`<header>\` - Заголовок страницы
- \`<nav>\` - Навигация
- \`<main>\` - Основной контент
- \`<article>\` - Статья
- \`<section>\` - Секция
- \`<footer>\` - Подвал`,
          views: 189,
          created_at: '2025-10-16'
        },
        {
          id: 3,
          title: 'Основы SQL',
          category_id: 3,
          category: 'Базы данных',
          description: 'Язык структурированных запросов',
          content: `# Основы SQL

SQL (Structured Query Language) — язык для управления реляционными базами данных.

## Основные команды

### SELECT
\`\`\`sql
SELECT * FROM users;
SELECT name, email FROM users WHERE age > 18;
\`\`\`

### INSERT
\`\`\`sql
INSERT INTO users (name, email, age) 
VALUES ('Иван', 'ivan@example.com', 25);
\`\`\``,
          views: 312,
          created_at: '2025-10-17'
        }
      ];

      setCategories(mockCategories);
      setArticles(mockArticles);
    } catch (error) {
      console.error('Ошибка загрузки базы знаний:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.category_id === selectedCategory;
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleArticleClick = (article) => {
    setSelectedArticle(article);
    // TODO: Отправить запрос на увеличение просмотров
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

            <div className="kb-article-body">
              {/* Простой рендеринг markdown-подобного контента */}
              {selectedArticle.content.split('\n').map((line, index) => {
                if (line.startsWith('# ')) {
                  return <h1 key={index}>{line.substring(2)}</h1>;
                } else if (line.startsWith('## ')) {
                  return <h2 key={index}>{line.substring(3)}</h2>;
                } else if (line.startsWith('### ')) {
                  return <h3 key={index}>{line.substring(4)}</h3>;
                } else if (line.startsWith('```')) {
                  return <pre key={index}><code>{line}</code></pre>;
                } else if (line.trim() === '') {
                  return <br key={index} />;
                } else {
                  return <p key={index}>{line}</p>;
                }
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KnowledgeBase;
