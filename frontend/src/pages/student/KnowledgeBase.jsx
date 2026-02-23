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
  AiOutlineCode,
  AiOutlineBulb,
  AiOutlineRocket,
  AiOutlineSetting,
  AiOutlineGlobal,
  AiOutlineDesktop,
  AiOutlineMobile,
  AiOutlineDatabase,
  AiOutlineCloud,
  AiOutlineSafety,
  AiOutlineExperiment,
  AiOutlineTool,
  AiOutlineHeart,
  AiOutlineThunderbolt,
  AiOutlineClose,
} from 'react-icons/ai';
import {
  FaFolderOpen, FaReact, FaPython, FaJs, FaHtml5,
  FaCss3Alt, FaNodeJs, FaGitAlt, FaDocker, FaLinux,
} from 'react-icons/fa';
import {
  SiTypescript, SiVuedotjs, SiAngular,
  SiNextdotjs, SiMongodb, SiPostgresql,
} from 'react-icons/si';
import { BiServer, BiData } from 'react-icons/bi';
import { HiOutlineLightBulb, HiOutlineAcademicCap } from 'react-icons/hi';
import { MdOutlineSchool, MdOutlineTipsAndUpdates } from 'react-icons/md';

const getCategoryIcon = (iconName) => {
  const iconMap = {
    '📚': <AiOutlineBook />, '💻': <AiOutlineCode />, '🚀': <AiOutlineRocket />,
    '⚡': <AiOutlineThunderbolt />, '🔧': <AiOutlineTool />, '💡': <AiOutlineBulb />,
    '🌐': <AiOutlineGlobal />, '🖥️': <AiOutlineDesktop />, '📱': <AiOutlineMobile />,
    '🗄️': <AiOutlineDatabase />, '☁️': <AiOutlineCloud />, '🔒': <AiOutlineSafety />,
    '🧪': <AiOutlineExperiment />, '❤️': <AiOutlineHeart />, '🎓': <HiOutlineAcademicCap />,
    '📖': <AiOutlineBook />, '🎯': <AiOutlineFire />, '⚙️': <AiOutlineSetting />,
    'react': <FaReact />, 'python': <FaPython />, 'javascript': <FaJs />, 'js': <FaJs />,
    'html': <FaHtml5 />, 'css': <FaCss3Alt />, 'node': <FaNodeJs />, 'nodejs': <FaNodeJs />,
    'git': <FaGitAlt />, 'docker': <FaDocker />, 'linux': <FaLinux />,
    'typescript': <SiTypescript />, 'ts': <SiTypescript />, 'vue': <SiVuedotjs />,
    'angular': <SiAngular />, 'next': <SiNextdotjs />, 'nextjs': <SiNextdotjs />,
    'mongodb': <SiMongodb />, 'postgres': <SiPostgresql />, 'postgresql': <SiPostgresql />,
    'server': <BiServer />, 'data': <BiData />, 'backend': <BiServer />,
    'frontend': <AiOutlineDesktop />, 'database': <AiOutlineDatabase />, 'api': <AiOutlineCloud />,
    'security': <AiOutlineSafety />, 'tips': <MdOutlineTipsAndUpdates />,
    'tutorial': <HiOutlineLightBulb />, 'education': <MdOutlineSchool />,
  };
  if (!iconName) return <AiOutlineFileText />;
  const lower = iconName.toLowerCase().trim();
  return iconMap[lower] || iconMap[iconName] || <AiOutlineFileText />;
};

function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadKnowledgeBase(); }, []);

  useEffect(() => {
    if (selectedCategory !== 'all') loadSubcategories(selectedCategory);
    else { setSubcategories([]); setSelectedSubcategory('all'); }
  }, [selectedCategory]);

  const loadKnowledgeBase = async () => {
    try {
      setLoading(true);
      const [catRes, artRes] = await Promise.all([
        api.get('/knowledge-base/categories'),
        api.get('/knowledge-base/articles/published'),
      ]);
      setCategories(catRes.data);
      setArticles(artRes.data);
    } catch (e) {
      console.error('Ошибка загрузки базы знаний:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSubcategories = async (categoryId) => {
    try {
      const res = await api.get(`/knowledge-base/categories/${categoryId}/subcategories`);
      setSubcategories(res.data);
      setSelectedSubcategory('all');
    } catch {
      setSubcategories([]);
    }
  };

  const filteredArticles = articles.filter(article => {
    const matchCat  = selectedCategory === 'all' || article.category_id === selectedCategory;
    const matchSub  = selectedSubcategory === 'all' || article.subcategory_id === selectedSubcategory;
    const matchSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        article.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSub && matchSearch;
  });

  const handleArticleClick = async (article) => {
    try {
      const res = await api.get(`/knowledge-base/articles/${article.id}`);
      setSelectedArticle(res.data);
    } catch {
      setSelectedArticle(article);
    }
  };

  const totalViews = articles.reduce((s, a) => s + (a.views || 0), 0);
  const mostViewed = articles.length > 0 ? Math.max(...articles.map(a => a.views || 0)) : 0;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.spinnerWrap}>
          <div className={styles.spinner} />
          <p>Загрузка базы знаний...</p>
        </div>
      </div>
    );
  }

  /* ── ARTICLE VIEW ── */
  if (selectedArticle) {
    const plainText = selectedArticle.content?.replace(/<[^>]+>/g, '') || '';
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;
    const readTime = Math.max(1, Math.round(wordCount / 200));

    const relatedArticles = articles
      .filter(a => a.id !== selectedArticle.id && a.category_id === selectedArticle.category_id)
      .slice(0, 4);

    const popularArticles = [...articles]
      .filter(a => a.id !== selectedArticle.id)
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5);

    return (
      <div className={styles.page}>
        <button className={styles.backBtn} onClick={() => setSelectedArticle(null)}>
          <AiOutlineArrowLeft /> Назад к списку
        </button>

        <div className={styles.articleLayout}>
          {/* ── Main article ── */}
          <div className={styles.articleView}>
            <div className={styles.articleViewMeta}>
              <span className={styles.articleViewCat}>{selectedArticle.category}</span>
              <span className={styles.articleViewViews}><AiOutlineEye /> {selectedArticle.views} просмотров</span>
            </div>
            <h1 className={styles.articleViewTitle}>{selectedArticle.title}</h1>
            <div className={styles.articleViewInfo}>
              <span><AiOutlineCalendar /> {new Date(selectedArticle.created_at).toLocaleDateString('ru-RU')}</span>
            </div>
            <div
              className={styles.articleViewBody}
              dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
            />
          </div>

          {/* ── Right sidebar ── */}
          <aside className={styles.articleSidebar}>

            {/* Meta card */}
            <div className={styles.sideCard}>
              <div className={styles.sideCardTitle}><AiOutlineFileText /> О статье</div>
              <ul className={styles.sideMetaList}>
                <li className={styles.sideMetaRow}>
                  <span className={styles.sideMetaLabel}>Категория</span>
                  <span className={styles.sideMetaVal}>{selectedArticle.category}</span>
                </li>
                <li className={styles.sideMetaRow}>
                  <span className={styles.sideMetaLabel}>Просмотров</span>
                  <span className={styles.sideMetaVal}>{(selectedArticle.views || 0).toLocaleString()}</span>
                </li>
                <li className={styles.sideMetaRow}>
                  <span className={styles.sideMetaLabel}>Слов</span>
                  <span className={styles.sideMetaVal}>{wordCount.toLocaleString()}</span>
                </li>
                <li className={styles.sideMetaRow}>
                  <span className={styles.sideMetaLabel}>Время чтения</span>
                  <span className={styles.sideMetaVal}>{readTime} мин</span>
                </li>
                <li className={styles.sideMetaRow}>
                  <span className={styles.sideMetaLabel}>Опубликовано</span>
                  <span className={styles.sideMetaVal}>
                    {new Date(selectedArticle.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </li>
              </ul>
            </div>

            {/* Related articles */}
            {relatedArticles.length > 0 && (
              <div className={styles.sideCard}>
                <div className={styles.sideCardTitle}><AiOutlineAppstore /> Похожие статьи</div>
                <ul className={styles.sideRelatedList}>
                  {relatedArticles.map(a => (
                    <li
                      key={a.id}
                      className={styles.sideRelatedItem}
                      onClick={() => handleArticleClick(a)}
                    >
                      <span className={styles.sideRelatedTitle}>{a.title}</span>
                      <span className={styles.sideRelatedViews}><AiOutlineEye /> {a.views}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Popular articles */}
            {popularArticles.length > 0 && (
              <div className={styles.sideCard}>
                <div className={styles.sideCardTitle}><AiOutlineFire /> Популярное</div>
                <ul className={styles.sideRelatedList}>
                  {popularArticles.map((a, i) => (
                    <li
                      key={a.id}
                      className={styles.sideRelatedItem}
                      onClick={() => handleArticleClick(a)}
                    >
                      <span className={styles.sidePopRank}>{i + 1}</span>
                      <span className={styles.sideRelatedTitle}>{a.title}</span>
                      <span className={styles.sideRelatedViews}><AiOutlineEye /> {a.views}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </aside>
        </div>
      </div>
    );
  }

  /* ── LIST VIEW ── */
  return (
    <div className={styles.page}>

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderIcon}><AiOutlineBook /></div>
        <div>
          <h1 className={styles.pageTitle}>База знаний</h1>
          <p className={styles.pageSub}>Изучайте материалы и расширяйте свои знания</p>
        </div>
      </div>

      {/* Stat tiles */}
      <div className={styles.statsRow}>
        <div className={styles.statTile}>
          <span className={styles.statTileIcon}><AiOutlineBook /></span>
          <span className={styles.statTileVal}>{articles.length}</span>
          <span className={styles.statTileLabel}>Всего статей</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statTileIcon}><FaFolderOpen /></span>
          <span className={styles.statTileVal}>{categories.length}</span>
          <span className={styles.statTileLabel}>Категорий</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statTileIcon}><AiOutlineEye /></span>
          <span className={styles.statTileVal}>{totalViews.toLocaleString()}</span>
          <span className={styles.statTileLabel}>Просмотров</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statTileIcon}><AiOutlineFire /></span>
          <span className={styles.statTileVal}>{mostViewed}</span>
          <span className={styles.statTileLabel}>Топ статья</span>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}><AiOutlineSearch /></span>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Поиск по базе знаний..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className={styles.searchClear} onClick={() => setSearchQuery('')}><AiOutlineClose /></button>
        )}
      </div>

      {/* Category chips */}
      <div className={styles.catBar}>
        <button
          className={`${styles.catChip} ${selectedCategory === 'all' ? styles.catChipActive : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          <span className={styles.catChipIcon}><AiOutlineAppstore /></span>
          Все темы
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`${styles.catChip} ${selectedCategory === cat.id ? styles.catChipActive : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span className={styles.catChipIcon}>{getCategoryIcon(cat.icon)}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Subcategory chips */}
      {subcategories.length > 0 && (
        <div className={styles.subBar}>
          <button
            className={`${styles.subChip} ${selectedSubcategory === 'all' ? styles.subChipActive : ''}`}
            onClick={() => setSelectedSubcategory('all')}
          >
            <AiOutlineFileText /> Все разделы
          </button>
          {subcategories.map(sub => (
            <button
              key={sub.id}
              className={`${styles.subChip} ${selectedSubcategory === sub.id ? styles.subChipActive : ''}`}
              onClick={() => setSelectedSubcategory(sub.id)}
            >
              {getCategoryIcon(sub.icon)} {sub.name}
            </button>
          ))}
        </div>
      )}

      {/* Results count */}
      <div className={styles.resultsBar}>
        <span>{filteredArticles.length} {filteredArticles.length === 1 ? 'статья' : filteredArticles.length >= 2 && filteredArticles.length <= 4 ? 'статьи' : 'статей'}</span>
        {(searchQuery || selectedCategory !== 'all') && (
          <button className={styles.resetBtn} onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
            Сбросить фильтры
          </button>
        )}
      </div>

      {/* Articles grid */}
      {filteredArticles.length === 0 ? (
        <div className={styles.emptyState}>
          <AiOutlineSearch className={styles.emptyIcon} />
          <h3>Ничего не найдено</h3>
          <p>Попробуйте изменить параметры поиска или выбрать другую категорию</p>
        </div>
      ) : (
        <div className={styles.articlesGrid}>
          {filteredArticles.map(article => (
            <div
              key={article.id}
              className={styles.articleCard}
              onClick={() => handleArticleClick(article)}
            >
              <div className={styles.articleCardTop}>
                <span className={styles.articleCatBadge}>{article.category}</span>
                <span className={styles.articleViews}><AiOutlineEye /> {article.views}</span>
              </div>
              <h3 className={styles.articleCardTitle}>{article.title}</h3>
              <p className={styles.articleCardDesc}>
                {article.description?.length > 110
                  ? article.description.substring(0, 110) + '…'
                  : article.description}
              </p>
              <div className={styles.articleCardFooter}>
                <span className={styles.articleDate}>
                  <AiOutlineCalendar /> {new Date(article.created_at).toLocaleDateString('ru-RU')}
                </span>
                <span className={styles.articleReadLink}>
                  Читать <AiOutlineArrowRight />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default KnowledgeBase;
