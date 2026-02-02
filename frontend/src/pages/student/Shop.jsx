import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { BASE_URL } from '../../utils/api';
import styles from './Shop.module.css';
import { 
  AiOutlineShoppingCart, 
  AiOutlineWallet, 
  AiOutlineSearch, 
  AiOutlinePicture, 
  AiOutlineFontSize, 
  AiOutlineReload, 
  AiOutlineDollarCircle, 
  AiOutlineCheck, 
  AiOutlineCloseCircle,
  AiOutlineStar,
  AiOutlineFilter,
  AiOutlineLock
} from 'react-icons/ai';
import { MdFormatColorText } from 'react-icons/md';
import { IoSparkles } from 'react-icons/io5';
import { HiLightningBolt } from 'react-icons/hi';
import '../../styles/UsernameStyles.css';
import '../../styles/MessageColors.css';

function Shop() {
  const { user, updateUser } = useAuth();
  const [shopItems, setShopItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [userExperience, setUserExperience] = useState(0);
  const [userLevels, setUserLevels] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('price-asc');

  useEffect(() => {
    fetchUserPoints();
    fetchShopItems();
    fetchPurchases();
    refreshUserData();
    fetchUserLevels();
  }, []);

  const refreshUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.user) {
        updateUser(response.data.user);
        setUserExperience(response.data.user.experience || 0);
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

  const fetchUserLevels = async () => {
    try {
      const response = await api.get('/user-levels');
      setUserLevels(response.data);
    } catch (error) {
      console.error('Ошибка загрузки уровней:', error);
    }
  };

  // Функция для поиска уровня по требуемому опыту
  const getRequiredLevel = (requiredExperience) => {
    if (!requiredExperience || requiredExperience <= 0) return null;
    // Ищем уровень, для которого требуемый опыт >= requiredExperience
    const sortedLevels = [...userLevels].sort((a, b) => a.experience_required - b.experience_required);
    for (const level of sortedLevels) {
      if (level.experience_required >= requiredExperience) {
        return level;
      }
    }
    // Если не нашли, возвращаем последний уровень
    return sortedLevels[sortedLevels.length - 1] || null;
  };

  const handlePurchase = async (itemKey, price, requiredExperience) => {
    if (userPoints < price) return;
    if (requiredExperience > 0 && userExperience < requiredExperience) return;
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
      updateUser({ ...user, avatar_frame: frameKey });
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
      updateUser({ ...user, profile_banner: bannerKey });
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
      updateUser({ ...user, username_style: styleKey });
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
      updateUser({ ...user, message_color: colorKey });
    } catch (error) {
      console.error('Ошибка применения цвета сообщения:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredItems = () => {
    let filtered = [...shopItems];
    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.item_type === selectedType);
    }
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (priceRange !== 'all') {
      if (priceRange === '0-100') {
        filtered = filtered.filter(item => item.price <= 100);
      } else if (priceRange === '100-200') {
        filtered = filtered.filter(item => item.price > 100 && item.price <= 200);
      } else if (priceRange === '200+') {
        filtered = filtered.filter(item => item.price > 200);
      }
    }
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

  const categories = [
    { value: 'all', label: 'Все предметы', icon: <AiOutlineStar />, count: shopItems.length },
    { value: 'frame', label: 'Рамки', icon: <AiOutlinePicture />, count: shopItems.filter(i => i.item_type === 'frame').length },
    { value: 'banner', label: 'Баннеры', icon: <AiOutlinePicture />, count: shopItems.filter(i => i.item_type === 'banner').length },
    { value: 'username', label: 'Стили Никнейма', icon: <AiOutlineFontSize />, count: shopItems.filter(i => i.item_type === 'username').length },
    { value: 'message_color', label: 'Цвета Текста', icon: <MdFormatColorText />, count: shopItems.filter(i => i.item_type === 'message_color').length }
  ];

  const priceRanges = [
    { value: 'all', label: 'Любая цена' },
    { value: '0-100', label: 'До 100' },
    { value: '100-200', label: '100 - 200' },
    { value: '200+', label: 'От 200' }
  ];

  return (
    <div className={styles.shopPage}>
      <div className={styles.shopHeader}>
        <div className={styles.headerLeft}>
          <h1>
            <IoSparkles className={styles.headerIcon} /> 
            Магазин косметики
          </h1>
          <p>Персонализируйте свой профиль уникальными предметами</p>
        </div>
        <div className={styles.pointsBadge}>
          <AiOutlineWallet className={styles.walletIcon} />
          <div className={styles.pointsInfo}>
            <span className={styles.pointsValue}>{userPoints}</span>
            <span className={styles.pointsLabel}>Ваши баллы</span>
          </div>
        </div>
      </div>

      <div className={styles.shopLayout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <AiOutlineFilter className={styles.sidebarIcon} />
            <h3>Фильтры</h3>
          </div>

          <div className={styles.filterSection}>
            <label className={styles.filterLabel}>
              <AiOutlineSearch className={styles.labelIcon} />
              Поиск
            </label>
            <input 
              type="text"
              className={styles.searchInput}
              placeholder="Найти предмет..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.filterSection}>
            <label className={styles.filterLabel}>
              <AiOutlinePicture className={styles.labelIcon} />
              Категория
            </label>
            <div className={styles.filterOptions}>
              {categories.map(cat => (
                <label 
                  key={cat.value}
                  className={`${styles.filterOption} ${selectedType === cat.value ? styles.active : ''}`}
                >
                  <input 
                    type="radio" 
                    name="type"
                    value={cat.value}
                    checked={selectedType === cat.value}
                    onChange={(e) => setSelectedType(e.target.value)}
                  />
                  <span className={styles.optionText}>
                    {cat.icon}
                    {cat.label}
                  </span>
                  <span className={styles.count}>{cat.count}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.filterSection}>
            <label className={styles.filterLabel}>
              <AiOutlineDollarCircle className={styles.labelIcon} />
              Цена
            </label>
            <div className={styles.filterOptions}>
              {priceRanges.map(range => (
                <label 
                  key={range.value}
                  className={`${styles.filterOption} ${priceRange === range.value ? styles.active : ''}`}
                >
                  <input 
                    type="radio" 
                    name="price"
                    value={range.value}
                    checked={priceRange === range.value}
                    onChange={(e) => setPriceRange(e.target.value)}
                  />
                  <span className={styles.optionText}>{range.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.filterSection}>
            <label className={styles.filterLabel}>
              <AiOutlineReload className={styles.labelIcon} />
              Сортировка
            </label>
            <select 
              className={styles.sortSelect}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="price-asc">Сначала дешёвые</option>
              <option value="price-desc">Сначала дорогие</option>
              <option value="name">По названию</option>
            </select>
          </div>

          <button 
            className={styles.resetBtn}
            onClick={() => {
              setSelectedType('all');
              setSearchQuery('');
              setPriceRange('all');
              setSortBy('price-asc');
            }}
          >
            <AiOutlineReload />
            Сбросить фильтры
          </button>
        </aside>

        <main className={styles.content}>
          <div className={styles.toolbar}>
            <div className={styles.resultsInfo}>
              Найдено предметов: <strong>{filteredItems.length}</strong>
            </div>
            <HiLightningBolt className={styles.lightningIcon} />
          </div>

          <div className={styles.itemsGrid}>
            {(selectedType === 'all' || selectedType === 'frame') && !searchQuery && (
              <div className={styles.itemCard}>
                <div className={styles.cardPreview}>
                  <div className={styles.previewAvatar}>
                    {user?.avatar_url ? (
                      <img src={`${BASE_URL}${user.avatar_url}`} alt="" />
                    ) : (
                      <span>{user?.username?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>Без рамки</h3>
                    {user?.avatar_frame === 'none' && (
                      <span className={styles.badgeActive}>
                        <AiOutlineCheck /> Активна
                      </span>
                    )}
                  </div>
                  <p className={styles.cardDesc}>Базовая рамка без украшений</p>
                  <div className={styles.cardFooter}>
                    <span className={styles.priceFree}>Бесплатно</span>
                    <button 
                      className={`${styles.btn} ${user?.avatar_frame === 'none' ? styles.btnActive : styles.btnApply}`}
                      onClick={() => handleApplyFrame('none')}
                      disabled={loading || user?.avatar_frame === 'none'}
                    >
                      {user?.avatar_frame === 'none' ? <><AiOutlineCheck /> Активна</> : 'Применить'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(selectedType === 'all' || selectedType === 'banner') && !searchQuery && (
              <div className={styles.itemCard}>
                <div className={styles.bannerPreview}></div>
                <div className={styles.cardBody}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>Базовый баннер</h3>
                    {user?.profile_banner === 'default' && (
                      <span className={styles.badgeActive}>
                        <AiOutlineCheck /> Активен
                      </span>
                    )}
                  </div>
                  <p className={styles.cardDesc}>Стандартный градиентный баннер</p>
                  <div className={styles.cardFooter}>
                    <span className={styles.priceFree}>Бесплатно</span>
                    <button 
                      className={`${styles.btn} ${user?.profile_banner === 'default' ? styles.btnActive : styles.btnApply}`}
                      onClick={() => handleApplyBanner('default')}
                      disabled={loading || user?.profile_banner === 'default'}
                    >
                      {user?.profile_banner === 'default' ? <><AiOutlineCheck /> Активен</> : 'Применить'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(selectedType === 'all' || selectedType === 'username') && !searchQuery && (
              <div className={styles.itemCard}>
                <div className={styles.usernamePreview}>
                  <span className="styled-username username-none">
                    {user?.username || 'Никнейм'}
                  </span>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>Без стиля</h3>
                    {user?.username_style === 'none' && (
                      <span className={styles.badgeActive}>
                        <AiOutlineCheck /> Активен
                      </span>
                    )}
                  </div>
                  <p className={styles.cardDesc}>Обычный стиль без эффектов</p>
                  <div className={styles.cardFooter}>
                    <span className={styles.priceFree}>Бесплатно</span>
                    <button 
                      className={`${styles.btn} ${user?.username_style === 'none' ? styles.btnActive : styles.btnApply}`}
                      onClick={() => handleApplyUsernameStyle('none')}
                      disabled={loading || user?.username_style === 'none'}
                    >
                      {user?.username_style === 'none' ? <><AiOutlineCheck /> Активен</> : 'Применить'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(selectedType === 'all' || selectedType === 'message_color') && !searchQuery && (
              <div className={styles.itemCard}>
                <div className={styles.messagePreview}>
                  <div className={styles.messageBox}>
                    <span>Привет! Это пример сообщения</span>
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>Без цвета</h3>
                    {user?.message_color === 'none' && (
                      <span className={styles.badgeActive}>
                        <AiOutlineCheck /> Активен
                      </span>
                    )}
                  </div>
                  <p className={styles.cardDesc}>Обычный цвет текста</p>
                  <div className={styles.cardFooter}>
                    <span className={styles.priceFree}>Бесплатно</span>
                    <button 
                      className={`${styles.btn} ${user?.message_color === 'none' ? styles.btnActive : styles.btnApply}`}
                      onClick={() => handleApplyMessageColor('none')}
                      disabled={loading || user?.message_color === 'none'}
                    >
                      {user?.message_color === 'none' ? <><AiOutlineCheck /> Активен</> : 'Применить'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {filteredItems.map((item) => {
              const isLocked = item.required_experience > 0 && userExperience < item.required_experience;
              const requiredLevel = isLocked ? getRequiredLevel(item.required_experience) : null;
              
              return (
              <div key={item.id} className={`${styles.itemCard} ${isLocked ? styles.lockedCard : ''}`}>
                {/* Overlay для заблокированных товаров */}
                {isLocked && (
                  <div className={styles.lockedOverlay}>
                    <div className={styles.lockedContent}>
                      {requiredLevel?.image_url ? (
                        <img 
                          src={`${BASE_URL}${requiredLevel.image_url}`} 
                          alt={`Уровень ${requiredLevel.level_number}`}
                          className={styles.lockedLevelImage}
                        />
                      ) : (
                        <AiOutlineLock className={styles.lockedIcon} />
                      )}
                      <span className={styles.lockedText}>
                        {requiredLevel ? (
                          <>Требуется {requiredLevel.rank_name || `Уровень ${requiredLevel.level_number}`}</>
                        ) : (
                          <>Требуется {item.required_experience} XP</>
                        )}
                      </span>
                    </div>
                  </div>
                )}
                
                {item.item_type === 'frame' ? (
                  <div className={styles.cardPreview}>
                    <div className={styles.previewAvatar}>
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
                        className={styles.frameOverlay}
                      />
                    )}
                  </div>
                ) : item.item_type === 'banner' ? (
                  <div className={styles.bannerPreview}>
                    {item.image_url ? (
                      <img 
                        src={`${BASE_URL}${item.image_url}`} 
                        alt={item.name}
                        className={styles.bannerImage}
                      />
                    ) : (
                      <div className={styles.noImage}>Нет изображения</div>
                    )}
                  </div>
                ) : item.item_type === 'username' ? (
                  <div className={styles.usernamePreview}>
                    <span className={`styled-username ${item.item_key}`}>
                      {user?.username || 'Никнейм'}
                    </span>
                  </div>
                ) : item.item_type === 'message_color' ? (
                  <div className={styles.messagePreview}>
                    <div className={styles.messageBox}>
                      <span className={item.item_key}>
                        Привет! Это пример сообщения
                      </span>
                    </div>
                  </div>
                ) : null}
                
                <div className={styles.cardBody}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{item.name}</h3>
                    <div className={styles.badges}>
                      {purchases.includes(item.item_key) && (
                        <span className={styles.badgeOwned}>
                          <AiOutlineCheck /> Куплено
                        </span>
                      )}
                      {((item.item_type === 'frame' && user?.avatar_frame === item.item_key) ||
                        (item.item_type === 'banner' && user?.profile_banner === item.item_key) ||
                        (item.item_type === 'username' && user?.username_style === item.item_key) ||
                        (item.item_type === 'message_color' && user?.message_color === item.item_key)) && (
                        <span className={styles.badgeActive}>
                          <AiOutlineCheck /> Активно
                        </span>
                      )}
                    </div>
                  </div>
                  <p className={styles.cardDesc}>{item.description}</p>
                  <div className={styles.cardFooter}>
                    <span className={styles.price}>
                      <AiOutlineDollarCircle className={styles.priceIcon} />
                      {item.price}
                    </span>
                    {purchases.includes(item.item_key) ? (
                      <button 
                        className={`${styles.btn} ${
                          (item.item_type === 'frame' && user?.avatar_frame === item.item_key) ||
                          (item.item_type === 'banner' && user?.profile_banner === item.item_key) ||
                          (item.item_type === 'username' && user?.username_style === item.item_key) ||
                          (item.item_type === 'message_color' && user?.message_color === item.item_key)
                            ? styles.btnActive
                            : styles.btnApply
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
                          ? <><AiOutlineCheck /> Активно</>
                          : 'Применить'
                        }
                      </button>
                    ) : (
                      <button 
                        className={`${styles.btn} ${styles.btnBuy} ${isLocked ? styles.btnLocked : ''}`}
                        onClick={() => handlePurchase(item.item_key, item.price, item.required_experience)}
                        disabled={loading || userPoints < item.price || isLocked}
                      >
                        {isLocked ? (
                          <><AiOutlineLock /> Заблокировано</>
                        ) : userPoints < item.price ? (
                          <><AiOutlineCloseCircle /> Недостаточно</>
                        ) : (
                          <><AiOutlineShoppingCart /> Купить</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className={styles.noResults}>
              <AiOutlineSearch className={styles.noResultsIcon} />
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
