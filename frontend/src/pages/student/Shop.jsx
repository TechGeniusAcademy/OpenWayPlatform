import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api, { BASE_URL } from "../../utils/api";
import styles from "./Shop.module.css";
import {
  AiOutlineShoppingCart, AiOutlineWallet, AiOutlineSearch,
  AiOutlinePicture, AiOutlineFontSize, AiOutlineReload,
  AiOutlineDollarCircle, AiOutlineCheck, AiOutlineCloseCircle,
  AiOutlineStar, AiOutlineFilter, AiOutlineLock,
} from "react-icons/ai";
import { MdFormatColorText } from "react-icons/md";
import { IoSparkles } from "react-icons/io5";
import { HiLightningBolt } from "react-icons/hi";
import { BsBagCheckFill } from "react-icons/bs";
import "../../styles/UsernameStyles.css";
import "../../styles/MessageColors.css";

export default function Shop() {
  const { user, updateUser } = useAuth();
  const [shopItems, setShopItems]       = useState([]);
  const [purchases, setPurchases]       = useState([]);
  const [userPoints, setUserPoints]     = useState(0);
  const [userExperience, setUserXP]     = useState(0);
  const [userLevels, setUserLevels]     = useState([]);
  const [loading, setLoading]           = useState(false);

  const [selectedType, setSelectedType] = useState("all");
  const [searchQuery, setSearch]        = useState("");
  const [priceRange, setPriceRange]     = useState("all");
  const [sortBy, setSortBy]             = useState("price-asc");

  useEffect(() => {
    fetchUserPoints();
    fetchShopItems();
    fetchPurchases();
    refreshUserData();
    fetchUserLevels();
  }, []);

  const refreshUserData = async () => {
    try {
      const r = await api.get("/auth/me");
      if (r.data.user) { updateUser(r.data.user); setUserXP(r.data.user.experience || 0); }
    } catch (e) { console.error(e); }
  };
  const fetchUserPoints = async () => {
    try { const r = await api.get("/points/my"); setUserPoints(r.data.totalPoints || 0); } catch (e) { console.error(e); }
  };
  const fetchShopItems = async () => {
    try { const r = await api.get("/shop/items"); setShopItems(r.data.items); } catch (e) { console.error(e); }
  };
  const fetchPurchases = async () => {
    try { const r = await api.get("/shop/purchases"); setPurchases(r.data.purchases); } catch (e) { console.error(e); }
  };
  const fetchUserLevels = async () => {
    try { const r = await api.get("/user-levels"); setUserLevels(r.data); } catch (e) { console.error(e); }
  };

  const getRequiredLevel = (xp) => {
    if (!xp || xp <= 0) return null;
    const sorted = [...userLevels].sort((a, b) => a.experience_required - b.experience_required);
    return sorted.find(l => l.experience_required >= xp) || sorted[sorted.length - 1] || null;
  };

  const handlePurchase = async (itemKey, price, requiredXP) => {
    if (userPoints < price || (requiredXP > 0 && userExperience < requiredXP)) return;
    setLoading(true);
    try {
      const r = await api.post("/shop/purchase", { itemKey });
      setPurchases(p => [...p, itemKey]);
      setUserPoints(r.data.remainingPoints);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleApply = async (type, key) => {
    setLoading(true);
    try {
      if      (type === "frame")         { await api.post("/shop/apply-frame",          { frameKey:   key }); updateUser({ ...user, avatar_frame:    key }); }
      else if (type === "banner")        { await api.post("/shop/apply-banner",         { bannerKey:  key }); updateUser({ ...user, profile_banner:  key }); }
      else if (type === "username")      { await api.post("/shop/apply-username-style", { styleKey:   key }); updateUser({ ...user, username_style:  key }); }
      else if (type === "message_color") { await api.post("/shop/apply-message-color",  { colorKey:   key }); updateUser({ ...user, message_color:   key }); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const isActive = (item) => {
    if (item.item_type === "frame")         return user?.avatar_frame   === item.item_key;
    if (item.item_type === "banner")        return user?.profile_banner === item.item_key;
    if (item.item_type === "username")      return user?.username_style === item.item_key;
    if (item.item_type === "message_color") return user?.message_color  === item.item_key;
    return false;
  };

  const getFilteredItems = () => {
    let f = [...shopItems];
    if (selectedType !== "all") f = f.filter(i => i.item_type === selectedType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      f = f.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
    if (priceRange === "0-100")   f = f.filter(i => i.price <= 100);
    if (priceRange === "100-200") f = f.filter(i => i.price > 100 && i.price <= 200);
    if (priceRange === "200+")    f = f.filter(i => i.price > 200);
    if (sortBy === "price-asc")   f.sort((a, b) => a.price - b.price);
    if (sortBy === "price-desc")  f.sort((a, b) => b.price - a.price);
    if (sortBy === "name")        f.sort((a, b) => a.name.localeCompare(b.name));
    return f;
  };

  const filteredItems = getFilteredItems();
  const ownedCount = purchases.length;

  const categories = [
    { value: "all",           label: "Все",           icon: <AiOutlineStar />,        count: shopItems.length },
    { value: "frame",         label: "Рамки",         icon: <AiOutlinePicture />,     count: shopItems.filter(i => i.item_type === "frame").length },
    { value: "banner",        label: "Баннеры",       icon: <AiOutlinePicture />,     count: shopItems.filter(i => i.item_type === "banner").length },
    { value: "username",      label: "Никнеймы",      icon: <AiOutlineFontSize />,    count: shopItems.filter(i => i.item_type === "username").length },
    { value: "message_color", label: "Цвет текста",   icon: <MdFormatColorText />,    count: shopItems.filter(i => i.item_type === "message_color").length },
  ];

  const priceRanges = [
    { value: "all",     label: "Любая цена" },
    { value: "0-100",   label: "До 100 баллов" },
    { value: "100-200", label: "100 – 200" },
    { value: "200+",    label: "Дороже 200" },
  ];

  const freeDefaults = [
    { show: selectedType === "all" || selectedType === "frame",         type: "frame",         key: "none",    title: "Без рамки",     desc: "Базовая рамка без украшений",  activeKey: user?.avatar_frame },
    { show: selectedType === "all" || selectedType === "banner",        type: "banner",        key: "default", title: "Базовый баннер",desc: "Стандартный градиентный баннер",activeKey: user?.profile_banner },
    { show: selectedType === "all" || selectedType === "username",      type: "username",      key: "none",    title: "Без стиля",     desc: "Обычный стиль никнейма",       activeKey: user?.username_style },
    { show: selectedType === "all" || selectedType === "message_color", type: "message_color", key: "none",    title: "Без цвета",     desc: "Обычный цвет сообщений",       activeKey: user?.message_color },
  ].filter(d => d.show && !searchQuery);

  const avatarSrc = user?.avatar_url ? `${BASE_URL}${user.avatar_url}` : null;

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderIcon}><IoSparkles /></div>
        <div>
          <h1 className={styles.pageTitle}>Магазин косметики</h1>
          <p className={styles.pageSub}>Персонализируй профиль уникальными предметами</p>
        </div>
        <div className={styles.pointsPill}>
          <AiOutlineWallet className={styles.walletIco} />
          <div>
            <span className={styles.pointsVal}>{userPoints}</span>
            <span className={styles.pointsLbl}>Ваши баллы</span>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><AiOutlineStar /></div>
          <div><div className={styles.statVal}>{shopItems.length}</div><div className={styles.statLbl}>Всего предметов</div></div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#d1fae5", color: "#059669" }}><BsBagCheckFill /></div>
          <div><div className={styles.statVal}>{ownedCount}</div><div className={styles.statLbl}>Куплено</div></div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#fef3c7", color: "#d97706" }}><HiLightningBolt /></div>
          <div><div className={styles.statVal}>{userExperience}</div><div className={styles.statLbl}>Ваш опыт (XP)</div></div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#ede9fe", color: "#7c3aed" }}><AiOutlineDollarCircle /></div>
          <div><div className={styles.statVal}>{shopItems.filter(i => i.price <= userPoints).length}</div><div className={styles.statLbl}>Доступно купить</div></div>
        </div>
      </div>

      {/* ── Layout ── */}
      <div className={styles.layout}>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}><AiOutlineFilter /> Фильтры</div>

          {/* Search */}
          <div className={styles.filterBlock}>
            <div className={styles.filterLabel}><AiOutlineSearch /> Поиск</div>
            <div className={styles.searchWrap}>
              <AiOutlineSearch className={styles.searchIco} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Найти предмет…"
                value={searchQuery}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Category */}
          <div className={styles.filterBlock}>
            <div className={styles.filterLabel}><AiOutlinePicture /> Категория</div>
            {categories.map(cat => (
              <button
                key={cat.value}
                className={`${styles.catBtn} ${selectedType === cat.value ? styles.catBtnActive : ""}`}
                onClick={() => setSelectedType(cat.value)}
              >
                <span className={styles.catIco}>{cat.icon}</span>
                <span className={styles.catLbl}>{cat.label}</span>
                <span className={styles.catCount}>{cat.count}</span>
              </button>
            ))}
          </div>

          {/* Price */}
          <div className={styles.filterBlock}>
            <div className={styles.filterLabel}><AiOutlineDollarCircle /> Цена</div>
            {priceRanges.map(r => (
              <button
                key={r.value}
                className={`${styles.catBtn} ${priceRange === r.value ? styles.catBtnActive : ""}`}
                onClick={() => setPriceRange(r.value)}
              >
                <span className={styles.catLbl}>{r.label}</span>
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className={styles.filterBlock}>
            <div className={styles.filterLabel}><AiOutlineReload /> Сортировка</div>
            <select className={styles.sortSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="price-asc">Сначала дешёвые</option>
              <option value="price-desc">Сначала дорогие</option>
              <option value="name">По названию</option>
            </select>
          </div>

          <button
            className={styles.resetBtn}
            onClick={() => { setSelectedType("all"); setSearch(""); setPriceRange("all"); setSortBy("price-asc"); }}
          >
            <AiOutlineReload /> Сбросить
          </button>
        </aside>

        {/* Main grid */}
        <main className={styles.main}>
          <div className={styles.toolBar}>
            <span className={styles.resultInfo}>
              Показано: <strong>{filteredItems.length + freeDefaults.length}</strong> предметов
            </span>
          </div>

          <div className={styles.grid}>

            {/* Free defaults */}
            {freeDefaults.map(d => (
              <div key={`${d.type}-${d.key}`} className={styles.card}>
                {d.type === "frame" && (
                  <div className={styles.previewFrame}>
                    <div className={styles.previewAvatar}>
                      {avatarSrc ? <img src={avatarSrc} alt="" /> : <span>{user?.username?.[0]?.toUpperCase()}</span>}
                    </div>
                  </div>
                )}
                {d.type === "banner" && <div className={styles.previewBanner} />}
                {d.type === "username" && (
                  <div className={styles.previewUsername}>
                    <span className="styled-username username-none">{user?.username || "Никнейм"}</span>
                  </div>
                )}
                {d.type === "message_color" && (
                  <div className={styles.previewMessage}>
                    <div className={styles.msgBubble}><span>Привет! Это пример сообщения</span></div>
                  </div>
                )}
                <div className={styles.cardBody}>
                  <div className={styles.cardTop}>
                    <h3 className={styles.cardName}>{d.title}</h3>
                    {d.activeKey === d.key && <span className={styles.badgeActive}><AiOutlineCheck /> Активно</span>}
                  </div>
                  <p className={styles.cardDesc}>{d.desc}</p>
                  <div className={styles.cardFoot}>
                    <span className={styles.priceFree}>Бесплатно</span>
                    <button
                      className={`${styles.btn} ${d.activeKey === d.key ? styles.btnActive : styles.btnApply}`}
                      onClick={() => handleApply(d.type, d.key)}
                      disabled={loading || d.activeKey === d.key}
                    >
                      {d.activeKey === d.key ? <><AiOutlineCheck /> Активно</> : "Применить"}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Shop items */}
            {filteredItems.map(item => {
              const locked = item.required_experience > 0 && userExperience < item.required_experience;
              const reqLevel = locked ? getRequiredLevel(item.required_experience) : null;
              const owned  = purchases.includes(item.item_key);
              const active = isActive(item);

              return (
                <div key={item.id} className={`${styles.card} ${locked ? styles.cardLocked : ""}`}>
                  {locked && (
                    <div className={styles.lockOverlay}>
                      <div className={styles.lockContent}>
                        {reqLevel?.image_url
                          ? <img src={`${BASE_URL}${reqLevel.image_url}`} className={styles.lockLvlImg} alt="" />
                          : <AiOutlineLock className={styles.lockIco} />
                        }
                        <span className={styles.lockText}>
                          {reqLevel ? (reqLevel.rank_name || `Уровень ${reqLevel.level_number}`) : `${item.required_experience} XP`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Preview */}
                  {item.item_type === "frame" && (
                    <div className={styles.previewFrame}>
                      <div className={styles.previewAvatar}>
                        {avatarSrc ? <img src={avatarSrc} alt="" /> : <span>{user?.username?.[0]?.toUpperCase()}</span>}
                      </div>
                      {item.image_url && (
                        <img src={`${BASE_URL}${item.image_url}`} className={styles.frameImg} alt={item.name} />
                      )}
                    </div>
                  )}
                  {item.item_type === "banner" && (
                    <div className={styles.previewBanner}>
                      {item.image_url
                        ? <img src={`${BASE_URL}${item.image_url}`} className={styles.bannerImg} alt={item.name} />
                        : <span className={styles.noImg}>Нет изображения</span>
                      }
                    </div>
                  )}
                  {item.item_type === "username" && (
                    <div className={styles.previewUsername}>
                      <span className={`styled-username ${item.item_key}`}>{user?.username || "Никнейм"}</span>
                    </div>
                  )}
                  {item.item_type === "message_color" && (
                    <div className={styles.previewMessage}>
                      <div className={styles.msgBubble}><span className={item.item_key}>Привет! Это пример сообщения</span></div>
                    </div>
                  )}

                  <div className={styles.cardBody}>
                    <div className={styles.cardTop}>
                      <h3 className={styles.cardName}>{item.name}</h3>
                      <div className={styles.badges}>
                        {owned  && <span className={styles.badgeOwned}><AiOutlineCheck /> Куплено</span>}
                        {active && <span className={styles.badgeActive}><AiOutlineCheck /> Активно</span>}
                      </div>
                    </div>
                    <p className={styles.cardDesc}>{item.description}</p>
                    <div className={styles.cardFoot}>
                      <span className={styles.price}>
                        <AiOutlineDollarCircle className={styles.priceIco} /> {item.price}
                      </span>
                      {owned ? (
                        <button
                          className={`${styles.btn} ${active ? styles.btnActive : styles.btnApply}`}
                          onClick={() => handleApply(item.item_type, item.item_key)}
                          disabled={loading || active}
                        >
                          {active ? <><AiOutlineCheck /> Активно</> : "Применить"}
                        </button>
                      ) : (
                        <button
                          className={`${styles.btn} ${styles.btnBuy} ${locked || userPoints < item.price ? styles.btnDisabled : ""}`}
                          onClick={() => handlePurchase(item.item_key, item.price, item.required_experience)}
                          disabled={loading || userPoints < item.price || locked}
                        >
                          {locked ? <><AiOutlineLock /> Заблокировано</>
                            : userPoints < item.price ? <><AiOutlineCloseCircle /> Недостаточно</>
                            : <><AiOutlineShoppingCart /> Купить</>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && freeDefaults.length === 0 && (
            <div className={styles.empty}>
              <AiOutlineSearch />
              <h3>Ничего не найдено</h3>
              <p>Попробуйте изменить параметры поиска или фильтры</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
