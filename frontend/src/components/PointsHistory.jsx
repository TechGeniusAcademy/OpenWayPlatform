import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import {
  AiOutlineHistory, AiOutlineClose, AiOutlineSearch,
  AiOutlineArrowUp, AiOutlineArrowDown, AiOutlineShopping,
  AiOutlineDollar, AiOutlineReload, AiOutlineThunderbolt,
  AiOutlineTrophy, AiOutlineSwap,
  AiOutlineLeft, AiOutlineRight, AiOutlineFilter,
} from 'react-icons/ai';
import { FaCoins, FaCrown } from 'react-icons/fa';
import { MdOutlineAdminPanelSettings } from 'react-icons/md';
import { BsLightningChargeFill } from 'react-icons/bs';
import { GiTwoCoins } from 'react-icons/gi';
import styles from './PointsHistory.module.css';

// ─── helpers ────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'all',      label: 'Все' },
  { key: 'positive', label: '+ Получено' },
  { key: 'negative', label: '− Потрачено' },
  { key: 'admin',    label: 'Администратор' },
  { key: 'transfer', label: 'Переводы' },
  { key: 'shop',     label: 'Магазин' },
  { key: 'boost',    label: 'Бусты' },
];

function detectCategory(reason = '', adminId = null) {
  const r = reason.toLowerCase();
  if (r.includes('буст')) return 'boost';
  if (r.includes('покупка') || r.includes('магазин')) return 'shop';
  if (r.includes('передача баллов') || r.includes('получение баллов')) return 'transfer';
  if (adminId) return 'admin';
  if (r.includes('тест') || r.includes('quiz') || r.includes('викторин')) return 'quiz';
  if (r.includes('задан') || r.includes('homework')) return 'homework';
  if (r.includes('flex')) return 'flex';
  if (r.includes('javascript') || r.includes('js')) return 'jsgame';
  if (r.includes('шахм') || r.includes('chess')) return 'chess';
  if (r.includes('покер') || r.includes('poker') || r.includes('карт')) return 'poker';
  if (r.includes('курс') || r.includes('урок')) return 'course';
  return 'other';
}

const CATEGORY_META = {
  boost:    { label: 'Буст',          color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  icon: <BsLightningChargeFill /> },
  shop:     { label: 'Магазин',       color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', icon: <AiOutlineShopping /> },
  transfer: { label: 'Перевод',       color: '#38bdf8', bg: 'rgba(56,189,248,0.15)',  icon: <AiOutlineSwap /> },
  admin:    { label: 'Адм. начисление', color: '#f87171', bg: 'rgba(248,113,113,0.15)', icon: <MdOutlineAdminPanelSettings /> },
  quiz:     { label: 'Викторина',     color: '#fb923c', bg: 'rgba(251,146,60,0.15)',  icon: <AiOutlineTrophy /> },
  homework: { label: 'Домашка',       color: '#34d399', bg: 'rgba(52,211,153,0.15)',  icon: <AiOutlineDollar /> },
  flex:     { label: 'FlexChan',      color: '#c084fc', bg: 'rgba(192,132,252,0.15)', icon: <AiOutlineFilter /> },
  jsgame:   { label: 'JS Игра',       color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  icon: <AiOutlineThunderbolt /> },
  chess:    { label: 'Шахматы',       color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', icon: <FaCrown /> },
  poker:    { label: 'Покер',         color: '#f43f5e', bg: 'rgba(244,63,94,0.15)',   icon: <GiTwoCoins /> },
  course:   { label: 'Курс',          color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  icon: <AiOutlineHistory /> },
  other:    { label: 'Прочее',        color: '#9ca3af', bg: 'rgba(156,163,175,0.15)', icon: <FaCoins /> },
};

function formatRelDate(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  const now  = new Date();
  const diff = now - date;
  const m    = Math.floor(diff / 60000);
  const h    = Math.floor(diff / 3600000);
  const d    = Math.floor(diff / 86400000);
  if (m < 1)  return 'Только что';
  if (m < 60) return `${m} мин. назад`;
  if (h < 24) return `${h} ч. назад`;
  if (d < 7)  return `${d} дн. назад`;
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit', month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function formatAbsDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtNum(n) {
  return Number(n || 0).toLocaleString('ru-RU');
}

// ─── Component ───────────────────────────────────────────────────────────────

const LIMIT = 15;

function PointsHistory({ isOpen, onClose, userId = null }) {
  const [history, setHistory]         = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('all');
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage]               = useState(1);
  const [pagination, setPagination]   = useState({ total: 0, totalPages: 1 });
  const debounceRef = useRef(null);

  const fetchHistory = useCallback(async (p, f, s) => {
    try {
      setLoading(true);
      const base   = userId ? `/points/history/${userId}` : '/points/history';
      const params = new URLSearchParams({ page: p, limit: LIMIT, filter: f });
      if (s) params.set('search', s);
      const res = await api.get(`${base}?${params}`);
      setHistory(res.data.history     || []);
      setStats(res.data.stats         || null);
      setPagination(res.data.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Ошибка загрузки истории:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) fetchHistory(page, filter, search);
  }, [isOpen, page, filter, search, fetchHistory]);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  const handleFilterChange = (f) => { setFilter(f); setPage(1); };
  const resetFilters = () => { setFilter('all'); setSearchInput(''); setPage(1); };

  if (!isOpen) return null;

  // Pagination pills helper
  const buildPages = () => {
    const total = pagination.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (page <= 4)  return [1, 2, 3, 4, 5, '…', total];
    if (page >= total - 3) return [1, '…', total-4, total-3, total-2, total-1, total];
    return [1, '…', page - 1, page, page + 1, '…', total];
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIconWrap}><AiOutlineHistory /></div>
            <div>
              <h2 className={styles.headerTitle}>История баллов</h2>
              <p className={styles.headerSub}>Все транзакции и изменения баланса</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
            <AiOutlineClose />
          </button>
        </div>

        {/* ── Stats banner ── */}
        {stats && (
          <div className={styles.statsBar}>
            <div className={`${styles.statCard} ${styles.statEarned}`}>
              <AiOutlineArrowUp className={styles.statIcon} />
              <div>
                <span className={styles.statValue}>+{fmtNum(stats.total_earned)}</span>
                <span className={styles.statLabel}>Получено</span>
              </div>
            </div>
            <div className={`${styles.statCard} ${styles.statSpent}`}>
              <AiOutlineArrowDown className={styles.statIcon} />
              <div>
                <span className={styles.statValue}>−{fmtNum(stats.total_spent)}</span>
                <span className={styles.statLabel}>Потрачено</span>
              </div>
            </div>
            <div className={`${styles.statCard} ${styles.statNet}`}>
              <GiTwoCoins className={styles.statIcon} />
              <div>
                <span className={styles.statValue} style={{ color: stats.net_change >= 0 ? '#10b981' : '#ef4444' }}>
                  {stats.net_change >= 0 ? '+' : ''}{fmtNum(stats.net_change)}
                </span>
                <span className={styles.statLabel}>Итого</span>
              </div>
            </div>
            <div className={`${styles.statCard} ${styles.statCount}`}>
              <FaCoins className={styles.statIcon} />
              <div>
                <span className={styles.statValue}>{fmtNum(stats.total_transactions)}</span>
                <span className={styles.statLabel}>Операций</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Controls ── */}
        <div className={styles.controls}>
          <div className={styles.filterRow}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`${styles.filterTab} ${filter === f.key ? styles.filterTabActive : ''}`}
                onClick={() => handleFilterChange(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className={styles.searchWrap}>
            <AiOutlineSearch className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Поиск по описанию…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button className={styles.searchClear} onClick={() => setSearchInput('')}>
                <AiOutlineClose />
              </button>
            )}
          </div>
        </div>

        {/* ── List ── */}
        <div className={styles.content}>
          {loading ? (
            <div className={styles.center}>
              <div className={styles.spinner} />
              <p>Загрузка…</p>
            </div>
          ) : history.length === 0 ? (
            <div className={styles.center}>
              <AiOutlineHistory className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>Транзакций не найдено</p>
              {(search || filter !== 'all') && (
                <button className={styles.resetBtn} onClick={resetFilters}>
                  <AiOutlineReload /> Сбросить фильтры
                </button>
              )}
            </div>
          ) : (
            <div className={styles.list}>
              {history.map((item) => {
                const cat  = detectCategory(item.reason, item.admin_id);
                const meta = CATEGORY_META[cat] || CATEGORY_META.other;
                const isPos = item.points_change > 0;
                return (
                  <div
                    key={item.id}
                    className={`${styles.item} ${isPos ? styles.itemPos : styles.itemNeg}`}
                    title={formatAbsDate(item.created_at)}
                  >
                    <div
                      className={styles.itemIconBox}
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.icon}
                    </div>
                    <div className={styles.itemDetails}>
                      <div className={styles.itemReason}>{item.reason || 'Без описания'}</div>
                      <div className={styles.itemMeta}>
                        <span
                          className={styles.catTag}
                          style={{ color: meta.color, background: meta.bg, borderColor: meta.color + '55' }}
                        >
                          {meta.label}
                        </span>
                        {item.admin_id && (
                          <span className={styles.adminBadge}>
                            <MdOutlineAdminPanelSettings />
                            {item.admin_name || item.admin_username || 'Admin'}
                          </span>
                        )}
                        <span className={styles.itemDate}>{formatRelDate(item.created_at)}</span>
                      </div>
                    </div>
                    <div className={`${styles.itemAmount} ${isPos ? styles.amountPos : styles.amountNeg}`}>
                      <span>{isPos ? '+' : ''}{fmtNum(item.points_change)}</span>
                      <span className={styles.amountUnit}>баллов</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {!loading && pagination.totalPages > 1 && (
          <div className={styles.paginationBar}>
            <button className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <AiOutlineLeft /> Назад
            </button>
            <div className={styles.pagePills}>
              {buildPages().map((pg, i) =>
                pg === '…'
                  ? <span key={`d${i}`} className={styles.pageDots}>…</span>
                  : <button
                      key={pg}
                      className={`${styles.pagePill} ${pg === page ? styles.pagePillActive : ''}`}
                      onClick={() => setPage(pg)}
                    >{pg}</button>
              )}
            </div>
            <button className={styles.pageBtn} disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
              Вперёд <AiOutlineRight />
            </button>
          </div>
        )}
        {!loading && pagination.total > 0 && (
          <div className={styles.totalCount}>
            Показано {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, pagination.total)} из {fmtNum(pagination.total)} транзакций
          </div>
        )}

      </div>
    </div>
  );
}

export default PointsHistory;
