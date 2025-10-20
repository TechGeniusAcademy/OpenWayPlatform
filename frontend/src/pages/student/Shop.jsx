import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { BASE_URL } from '../../utils/api';
import './Shop.css';
import '../../styles/UsernameStyles.css';
import '../../styles/MessageColors.css';

function Shop() {
  const { user, updateUser } = useAuth();
  const [shopItems, setShopItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Фильтры и поиск
  const [selectedType, setSelectedType] = useState('all'); // 'all', 'frame', 'banner', 'username', 'message_color'
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState('all'); // 'all', '0-100', '100-200', '200+'
  const [sortBy, setSortBy] = useState('price-asc'); // 'price-asc', 'price-desc', 'name'

  useEffect(() => {
    fetchUserPoints();
    fetchShopItems();
    fetchPurchases();
    refreshUserData();
  }, []);

  const refreshUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.user) {
        updateUser(response.data.user);
      }
    } catch (error) {
      console.error('Ошибка обновления данных пользователя:', error);
    }
  };

  const fetchUserPoints = async () => {
    try {
      const response = await api.get('/points/my');
      setUserPoints(response.data.totalPoints || 0);
    } catch (error) {
      console.error('Ошибка получения баллов:', error);
    }
  };

  const fetchShopItems = async () => {
    try {
      const response = await api.get('/shop/items');
      setShopItems(response.data.items);
    } catch (error) {
      console.error('Ошибка загрузки магазина:', error);
    }
  };

  const fetchPurchases = async () => {
    try {
      const response = await api.get('/shop/purchases');
      setPurchases(response.data.purchases);
    } catch (error) {
      console.error('Ошибка загрузки покупок:', error);
    }
  };

  const handlePurchase = async (itemKey, price) => {
    if (userPoints < price) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/shop/purchase', { itemKey });
      setPurchases([...purchases, itemKey]);
      setUserPoints(response.data.remainingPoints);
    } catch (error) {
      console.error('Ошибка покупки:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFrame = async (frameKey) => {
    setLoading(true);
    try {
      await api.post('/shop/apply-frame', { frameKey });
      const updatedUser = { ...user, avatar_frame: frameKey };
      updateUser(updatedUser);
    } catch (error) {
      console.error('Ошибка применения рамки:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyBanner = async (bannerKey) => {
    setLoading(true);
    try {
      await api.post('/shop/apply-banner', { bannerKey });
      const updatedUser = { ...user, profile_banner: bannerKey };
      updateUser(updatedUser);
    } catch (error) {
      console.error('Ошибка применения баннера:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyUsernameStyle = async (styleKey) => {
    setLoading(true);
    try {
      await api.post('/shop/apply-username-style', { styleKey });
      const updatedUser = { ...user, username_style: styleKey };
      updateUser(updatedUser);
    } catch (error) {
      console.error('Ошибка применения стиля никнейма:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyMessageColor = async (colorKey) => {
    setLoading(true);
    try {
      await api.post('/shop/apply-message-color', { colorKey });
      const updatedUser = { ...user, message_color: colorKey };
      updateUser(updatedUser);
    } catch (error) {
      console.error('Ошибка применения цвета сообщения:', error);
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация предметов
  const getFilteredItems = () => {
    let filtered = [...shopItems];

    // Фильтр по типу
    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.item_type === selectedType);
    }

    // Поиск
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Фильтр по цене
    if (priceRange !== 'all') {
      if (priceRange === '0-100') {
        filtered = filtered.filter(item => item.price <= 100);
      } else if (priceRange === '100-200') {
        filtered = filtered.filter(item => item.price > 100 && item.price <= 200);
      } else if (priceRange === '200+') {
        filtered = filtered.filter(item => item.price > 200);
      }
    }

    // Сортировка
    if (sortBy === 'price-asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  };

  const filteredItems = getFilteredItems();

  return (
    <div className="student-page shop-page">
      <div className="shop-header">
        <div className="shop-header-left">
          <h1>🛒 Магазин косметики</h1>
          <p>Персонализируйте свой профиль</p>
        </div>
        <div className="shop-header-right">
          <div className="user-points-badge">
            <span className="points-icon">⭐</span>
            <div className="points-info">
              <span className="points-value">{userPoints}</span>
              <span className="points-label">Ваши баллы</span>
            </div>
          </div>
        </div>
      </div>

      <div className="shop-layout">
        {/* Сайдбар с фильтрами */}
        <aside className="shop-sidebar">
          <div className="filter-section">
            <h3>🔍 Поиск</h3>
            <input 
              type="text"
              className="search-input"
              placeholder="Найти предмет..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-divider"></div>

          <div className="filter-section">
            <h3>📦 Категория</h3>
            <div className="filter-options">
              <label className="filter-option">
                <input 
                  type="radio" 
                  name="type"
                  value="all"
                  checked={selectedType === 'all'}
                  onChange={(e) => setSelectedType(e.target.value)}
                />
                <span>Все предметы</span>
                <span className="filter-count">{shopItems.length}</span>
              </label>
              <label className="filter-option">
                <input 
                  type="radio" 
                  name="type"
                  value="frame"
                  checked={selectedType === 'frame'}
                  onChange={(e) => setSelectedType(e.target.value)}
                />
                <span>🖼️ Рамки</span>
                <span className="filter-count">
                  {shopItems.filter(i => i.item_type === 'frame').length}
                </span>
              </label>
              <label className="filter-option">
                <input 
                  type="radio" 
                  name="type"
                  value="banner"
                  checked={selectedType === 'banner'}
                  onChange={(e) => setSelectedType(e.target.value)}
                />
                <span>🎨 Баннеры</span>
                <span className="filter-count">
                  {shopItems.filter(i => i.item_type === 'banner').length}
                </span>
              </label>
              <label className="filter-option">
                <input 
                  type="radio" 
                  name="type"
                  value="username"
                  checked={selectedType === 'username'}
                  onChange={(e) => setSelectedType(e.target.value)}
                />
                <span>✨ Стили Никнейма</span>
                <span className="filter-count">
                  {shopItems.filter(i => i.item_type === 'username').length}
                </span>
              </label>
              <label className="filter-option">
                <input 
                  type="radio" 
                  name="type"
                  value="message_color"
                  checked={selectedType === 'message_color'}
                  onChange={(e) => setSelectedType(e.target.value)}
                />
                <span>💬 Цвета Текста</span>
                <span className="filter-count">
                  {shopItems.filter(i => i.item_type === 'message_color').length}
                </span>
              </label>
            </div>
          </div>

          <div className="filter-divider"></div>

          <div className="filter-section">
            <h3>💰 Цена</h3>
            <div className="filter-options">
              <label className="filter-option">
                <input 
                  type="radio" 
                  name="price"
                  value="all"
                  checked={priceRange === 'all'}
                  onChange={(e) => setPriceRange(e.target.value)}
                />
                <span>Любая цена</span>
              </label>
              <label className="filter-option">
                <input 
                  type="radio" 
                  name="price"
                  value="0-100"
                  checked={priceRange === '0-100'}
                  onChange={(e) => setPriceRange(e.target.value)}
                />
                <span>До 100 ⭐</span>
              </label>
              <label className="filter-option">
                <input 
                  type="radio" 
                  name="price"
                  value="100-200"
                  checked={priceRange === '100-200'}
                  onChange={(e) => setPriceRange(e.target.value)}
                />
                <span>100 - 200 ⭐</span>
              </label>
              <label className="filter-option">
                <input 
                  type="radio" 
                  name="price"
                  value="200+"
                  checked={priceRange === '200+'}
                  onChange={(e) => setPriceRange(e.target.value)}
                />
                <span>От 200 ⭐</span>
              </label>
            </div>
          </div>

          <div className="filter-divider"></div>

          <div className="filter-section">
            <h3>🔄 Сортировка</h3>
            <select 
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="price-asc">Сначала дешёвые</option>
              <option value="price-desc">Сначала дорогие</option>
              <option value="name">По названию</option>
            </select>
          </div>

          <div className="filter-divider"></div>

          <div className="filter-section">
            <button 
              className="reset-filters-btn"
              onClick={() => {
                setSelectedType('all');
                setSearchQuery('');
                setPriceRange('all');
                setSortBy('price-asc');
              }}
            >
              🔄 Сбросить фильтры
            </button>
          </div>
        </aside>

        {/* Основной контент с товарами */}
        <main className="shop-content">
          <div className="shop-toolbar">
            <div className="results-info">
              Найдено предметов: <strong>{filteredItems.length}</strong>
            </div>
          </div>

          <div className="shop-items-grid">
            {/* Базовая рамка */}
            {(selectedType === 'all' || selectedType === 'frame') && !searchQuery && (
              <div className="shop-card">
                <div className={`card-preview frame-none`}>
                  <div className="preview-avatar">
                    {user?.avatar_url ? (
                      <img src={`${BASE_URL}${user.avatar_url}`} alt="" />
                    ) : (
                      <span>{user?.username?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                </div>
                <div className="card-body">
                  <div className="shop-card-header">
                    <h3 className="card-title">Без рамки</h3>
                    {user?.avatar_frame === 'none' && (
                      <span className="badge badge-active">✓ Активна</span>
                    )}
                  </div>
                  <p className="card-description">Базовая рамка без украшений</p>
                  <div className="card-footer">
                    <span className="card-price">
                      <span className="price-free">Бесплатно</span>
                    </span>
                    <button 
                      className={`card-btn ${user?.avatar_frame === 'none' ? 'btn-active' : 'btn-apply'}`}
                      onClick={() => handleApplyFrame('none')}
                      disabled={loading || user?.avatar_frame === 'none'}
                    >
                      {user?.avatar_frame === 'none' ? '✓ Активна' : 'Применить'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Базовый баннер */}
            {(selectedType === 'all' || selectedType === 'banner') && !searchQuery && (
              <div className="shop-card">
                <div className="card-banner-preview banner-default"></div>
                <div className="card-body">
                  <div className="shop-card-header">
                    <h3 className="card-title">Базовый баннер</h3>
                    {user?.profile_banner === 'default' && (
                      <span className="badge badge-active">✓ Активен</span>
                    )}
                  </div>
                  <p className="card-description">Стандартный градиентный баннер</p>
                  <div className="card-footer">
                    <span className="card-price">
                      <span className="price-free">Бесплатно</span>
                    </span>
                    <button 
                      className={`card-btn ${user?.profile_banner === 'default' ? 'btn-active' : 'btn-apply'}`}
                      onClick={() => handleApplyBanner('default')}
                      disabled={loading || user?.profile_banner === 'default'}
                    >
                      {user?.profile_banner === 'default' ? '✓ Активен' : 'Применить'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Базовый стиль никнейма */}
            {(selectedType === 'all' || selectedType === 'username') && !searchQuery && (
              <div className="shop-card">
                <div className="card-username-preview">
                  <div className="username-preview">
                    <span className="styled-username username-none">
                      {user?.username || 'Никнейм'}
                    </span>
                  </div>
                </div>
                <div className="card-body">
                  <div className="shop-card-header">
                    <h3 className="card-title">Без стиля</h3>
                    {user?.username_style === 'none' && (
                      <span className="badge badge-active">✓ Активен</span>
                    )}
                  </div>
                  <p className="card-description">Обычный стиль без эффектов</p>
                  <div className="card-footer">
                    <span className="card-price">
                      <span className="price-free">Бесплатно</span>
                    </span>
                    <button 
                      className={`card-btn ${user?.username_style === 'none' ? 'btn-active' : 'btn-apply'}`}
                      onClick={() => handleApplyUsernameStyle('none')}
                      disabled={loading || user?.username_style === 'none'}
                    >
                      {user?.username_style === 'none' ? '✓ Активен' : 'Применить'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Базовый цвет текста */}
            {(selectedType === 'all' || selectedType === 'message_color') && !searchQuery && (
              <div className="shop-card">
                <div className="card-message-preview">
                  <div className="message-preview">
                    <span className="message-none">
                      Привет! Это пример сообщения
                    </span>
                  </div>
                </div>
                <div className="card-body">
                  <div className="shop-card-header">
                    <h3 className="card-title">Без цвета</h3>
                    {user?.message_color === 'none' && (
                      <span className="badge badge-active">✓ Активен</span>
                    )}
                  </div>
                  <p className="card-description">Обычный цвет текста</p>
                  <div className="card-footer">
                    <span className="card-price">
                      <span className="price-free">Бесплатно</span>
                    </span>
                    <button 
                      className={`card-btn ${user?.message_color === 'none' ? 'btn-active' : 'btn-apply'}`}
                      onClick={() => handleApplyMessageColor('none')}
                      disabled={loading || user?.message_color === 'none'}
                    >
                      {user?.message_color === 'none' ? '✓ Активен' : 'Применить'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Магазинные предметы */}
            {filteredItems.map(item => (
              <div key={item.id} className="shop-card">
                {item.item_type === 'frame' ? (
                  <div className="card-preview">
                    <div className="preview-avatar">
                      {user?.avatar_url ? (
                        <img src={`${BASE_URL}${user.avatar_url}`} alt="" />
                      ) : (
                        <span>{user?.username?.[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    {item.image_url && (
                      <img 
                        src={`${BASE_URL}${item.image_url}`} 
                        alt={item.name}
                        className="frame-overlay"
                      />
                    )}
                  </div>
                ) : item.item_type === 'banner' ? (
                  <div className="card-banner-preview">
                    {item.image_url ? (
                      <img 
                        src={`${BASE_URL}${item.image_url}`} 
                        alt={item.name}
                        className="banner-image"
                      />
                    ) : (
                      <div className="no-image">Нет изображения</div>
                    )}
                  </div>
                ) : item.item_type === 'username' ? (
                  <div className="card-username-preview">
                    <div className="username-preview">
                      <span className={`styled-username ${item.item_key}`}>
                        {user?.username || 'Никнейм'}
                      </span>
                    </div>
                  </div>
                ) : item.item_type === 'message_color' ? (
                  <div className="card-message-preview">
                    <div className="message-preview">
                      <span className={item.item_key}>
                        Привет! Это пример сообщения
                      </span>
                    </div>
                  </div>
                ) : null}
                
                <div className="card-body">
                  <div className="shop-card-header">
                    <h3 className="card-title">{item.name}</h3>
                    {purchases.includes(item.item_key) && (
                      <span className="badge badge-owned">✓ Куплено</span>
                    )}
                    {((item.item_type === 'frame' && user?.avatar_frame === item.item_key) ||
                      (item.item_type === 'banner' && user?.profile_banner === item.item_key) ||
                      (item.item_type === 'username' && user?.username_style === item.item_key) ||
                      (item.item_type === 'message_color' && user?.message_color === item.item_key)) && (
                      <span className="badge badge-active">✓ Активно</span>
                    )}
                  </div>
                  <p className="card-description">{item.description}</p>
                  <div className="card-footer">
                    <span className="card-price">
                      <span className="price-icon">⭐</span>
                      <span className="price-value">{item.price}</span>
                    </span>
                    {purchases.includes(item.item_key) ? (
                      <button 
                        className={`card-btn ${
                          (item.item_type === 'frame' && user?.avatar_frame === item.item_key) ||
                          (item.item_type === 'banner' && user?.profile_banner === item.item_key) ||
                          (item.item_type === 'username' && user?.username_style === item.item_key) ||
                          (item.item_type === 'message_color' && user?.message_color === item.item_key)
                            ? 'btn-active' 
                            : 'btn-apply'
                        }`}
                        onClick={() => 
                          item.item_type === 'frame' 
                            ? handleApplyFrame(item.item_key)
                            : item.item_type === 'banner'
                            ? handleApplyBanner(item.item_key)
                            : item.item_type === 'username'
                            ? handleApplyUsernameStyle(item.item_key)
                            : handleApplyMessageColor(item.item_key)
                        }
                        disabled={loading || 
                          (item.item_type === 'frame' && user?.avatar_frame === item.item_key) ||
                          (item.item_type === 'banner' && user?.profile_banner === item.item_key) ||
                          (item.item_type === 'username' && user?.username_style === item.item_key) ||
                          (item.item_type === 'message_color' && user?.message_color === item.item_key)
                        }
                      >
                        {((item.item_type === 'frame' && user?.avatar_frame === item.item_key) ||
                          (item.item_type === 'banner' && user?.profile_banner === item.item_key) ||
                          (item.item_type === 'username' && user?.username_style === item.item_key) ||
                          (item.item_type === 'message_color' && user?.message_color === item.item_key))
                          ? '✓ Активно' 
                          : 'Применить'
                        }
                      </button>
                    ) : (
                      <button 
                        className="card-btn btn-buy"
                        onClick={() => handlePurchase(item.item_key, item.price)}
                        disabled={loading || userPoints < item.price}
                      >
                        {userPoints < item.price ? '❌ Недостаточно' : '🛒 Купить'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <h3>Ничего не найдено</h3>
              <p>Попробуйте изменить параметры поиска или фильтры</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Shop;
