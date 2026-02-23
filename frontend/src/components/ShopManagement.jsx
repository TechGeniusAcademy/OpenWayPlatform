import { useState, useEffect, useRef } from 'react';
import api, { BASE_URL } from '../utils/api';
import styles from './ShopManagement.module.css';
import FramePositionEditor from './FramePositionEditor';
import {
  AiOutlineShoppingCart, AiOutlinePlus, AiOutlineEdit, AiOutlineDelete,
  AiOutlineClose, AiOutlineKey, AiOutlineDollar, AiOutlineSearch,
  AiOutlinePicture, AiOutlineStar, AiOutlineTag, AiOutlineCheck,
  AiOutlineExclamationCircle,
} from 'react-icons/ai';
import { BsImage } from 'react-icons/bs';

/* ── Toast ── */
function Toast({ toasts, remove }) {
  return (
    <div className={styles.toastWrap}>
      {toasts.map(t => (
        <div key={t.id} className={`${styles.toast} ${styles[`toast--${t.type}`]}`}>
          {t.type === 'success' ? <AiOutlineCheck /> : <AiOutlineExclamationCircle />}
          <span>{t.msg}</span>
          <button className={styles.toastClose} onClick={() => remove(t.id)}><AiOutlineClose /></button>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };
  const remove = id => setToasts(p => p.filter(t => t.id !== id));
  return { toasts, add, remove };
}

/* ── ConfirmModal ── */
function ConfirmModal({ open, title, text, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={`${styles.modal} ${styles.modalSm}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <div className={styles.modalTitle}>
            <AiOutlineExclamationCircle className={styles.modalIconDanger} />
            <h2>{title}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onCancel}><AiOutlineClose /></button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.confirmText}>{text}</p>
        </div>
        <div className={styles.modalFoot}>
          <button className={styles.btnSec} onClick={onCancel}>Отмена</button>
          <button className={styles.btnDanger} onClick={onConfirm}>Удалить</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════ */
function ShopManagement() {
  const { toasts, add: toast, remove: removeToast } = useToast();

  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [tab, setTab]             = useState('all');
  const [search, setSearch]       = useState('');

  const [showForm, setShowForm]   = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData]   = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [positionConfigs, setPositionConfigs] = useState(null);
  const [saving, setSaving]       = useState(false);
  const fileRef                   = useRef(null);

  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/shop/items');
      setItems(r.data.items);
    } catch {
      toast('Ошибка загрузки предметов', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = items.filter(it => {
    const matchTab = tab === 'all' || it.item_type === tab;
    const q = search.toLowerCase();
    const matchSearch = !q || it.name.toLowerCase().includes(q) || it.item_key.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const frames  = items.filter(i => i.item_type === 'frame');
  const banners = items.filter(i => i.item_type === 'banner');

  const handleInput = e => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
  };

  const handleImageChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const openNew = () => {
    setEditingItem(null);
    setFormData(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
    setPositionConfigs(null);
    setShowForm(true);
  };

  const openEdit = item => {
    setEditingItem(item);
    setFormData({
      item_type: item.item_type,
      item_key:  item.item_key,
      name:      item.name,
      description: item.description || '',
      price:     item.price,
      required_experience: item.required_experience || 0,
    });
    setImagePreview(item.image_url ? `${BASE_URL}${item.image_url}` : null);
    setPositionConfigs(item.position_configs || null);
    setImageFile(null);
    setShowForm(true);
  };

  const closeForm = () => { if (!saving) setShowForm(false); };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('item_type', formData.item_type);
      fd.append('item_key',  formData.item_key);
      fd.append('name',      formData.name);
      fd.append('description', formData.description);
      fd.append('price',     formData.price);
      fd.append('required_experience', formData.required_experience);
      if (imageFile) fd.append('image', imageFile);
      if (positionConfigs && formData.item_type === 'frame')
        fd.append('position_configs', JSON.stringify(positionConfigs));

      if (editingItem) {
        await api.put(`/admin/shop/items/${editingItem.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast('Предмет обновлён');
      } else {
        await api.post('/admin/shop/items', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast('Предмет создан');
      }
      setShowForm(false);
      fetchItems();
    } catch (err) {
      toast(err.response?.data?.error || 'Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = id => setConfirmId(id);
  const doDelete = async () => {
    const id = confirmId;
    setConfirmId(null);
    try {
      await api.delete(`/admin/shop/items/${id}`);
      toast('Предмет удалён');
      fetchItems();
    } catch {
      toast('Ошибка удаления', 'error');
    }
  };

  const avgPrice = items.length
    ? Math.round(items.reduce((s, i) => s + i.price, 0) / items.length)
    : 0;

  const stats = [
    { label: 'Всего предметов', value: items.length,   color: 'accent',  icon: <AiOutlineShoppingCart /> },
    { label: 'Рамки',           value: frames.length,  color: 'purple',  icon: <AiOutlinePicture /> },
    { label: 'Баннеры',         value: banners.length, color: 'teal',    icon: <BsImage /> },
    { label: 'Средняя цена',    value: avgPrice,       color: 'gold',    icon: <AiOutlineDollar /> },
  ];

  const TABS = [
    { key: 'all',    label: 'Все',     count: items.length },
    { key: 'frame',  label: 'Рамки',   count: frames.length },
    { key: 'banner', label: 'Баннеры', count: banners.length },
  ];

  return (
    <div className={styles.page}>
      <Toast toasts={toasts} remove={removeToast} />

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><AiOutlineShoppingCart /></div>
          <div>
            <h1 className={styles.headerTitle}>Магазин</h1>
            <p className={styles.headerSub}>Управление рамками и баннерами профиля</p>
          </div>
        </div>
        <button className={styles.btnPrimary} onClick={openNew}>
          <AiOutlinePlus /> Добавить предмет
        </button>
      </div>

      {/* ── Stats ── */}
      <div className={styles.stats}>
        {stats.map(s => (
          <div key={s.label} className={styles.stat}>
            <div className={`${styles.statIcon} ${styles[`statIcon--${s.color}`]}`}>{s.icon}</div>
            <div>
              <div className={styles.statVal}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`${styles.tabBtn} ${tab === t.key ? styles.tabActive : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className={styles.tabCount}>{t.count}</span>
            </button>
          ))}
        </div>
        <div className={styles.searchWrap}>
          <AiOutlineSearch className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Поиск по названию или ключу…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.searchClear} onClick={() => setSearch('')}>
              <AiOutlineClose />
            </button>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className={styles.emptyState}><div className={styles.spinner} /></div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <AiOutlineShoppingCart className={styles.emptyIcon} />
          <p>Предметы не найдены</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(item => (
            <ItemCard key={item.id} item={item} onEdit={openEdit} onDelete={confirmDelete} />
          ))}
        </div>
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <div className={styles.overlay} onClick={closeForm}>
          <div className={`${styles.modal} ${styles.modalLg}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}>
                <AiOutlineShoppingCart className={styles.modalIcon} />
                <h2>{editingItem ? 'Редактировать предмет' : 'Добавить предмет'}</h2>
              </div>
              <button className={styles.closeBtn} onClick={closeForm} disabled={saving}><AiOutlineClose /></button>
            </div>

            <form onSubmit={handleSubmit} className={styles.modalScroll}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>

                  {/* Тип */}
                  <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                    <label className={styles.formLabel}>Тип предмета *</label>
                    <div className={styles.typeSelector}>
                      {[
                        { val: 'frame',  icon: <AiOutlinePicture />, label: 'Рамка аватара',  hint: '200×200 px · PNG с прозрачным центром' },
                        { val: 'banner', icon: <BsImage />,           label: 'Баннер профиля', hint: '800×200 px · PNG / JPG / WebP' },
                      ].map(t => (
                        <label key={t.val} className={`${styles.typeCard} ${formData.item_type === t.val ? styles.typeCardActive : ''}`}>
                          <input type="radio" name="item_type" value={t.val}
                            checked={formData.item_type === t.val}
                            onChange={handleInput}
                            className={styles.typeRadio}
                          />
                          <span className={`${styles.typeIcon} ${formData.item_type === t.val ? styles.typeIconActive : ''}`}>{t.icon}</span>
                          <div>
                            <div className={styles.typeLabel}>{t.label}</div>
                            <div className={styles.typeHint}>{t.hint}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Ключ */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Уникальный ключ *</label>
                    <div className={styles.inputWrap}>
                      <AiOutlineKey className={styles.inputIcon} />
                      <input className={styles.input} name="item_key" value={formData.item_key}
                        onChange={handleInput} placeholder="golden_frame" required />
                    </div>
                    <span className={styles.hint}>Только a–z, 0–9 и подчёркивания</span>
                  </div>

                  {/* Название */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Название *</label>
                    <div className={styles.inputWrap}>
                      <AiOutlineTag className={styles.inputIcon} />
                      <input className={styles.input} name="name" value={formData.name}
                        onChange={handleInput} placeholder="Золотая рамка" required />
                    </div>
                  </div>

                  {/* Цена */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Цена (баллы) *</label>
                    <div className={styles.inputWrap}>
                      <AiOutlineDollar className={styles.inputIcon} />
                      <input className={styles.input} type="number" min="0" name="price"
                        value={formData.price} onChange={handleInput} required />
                    </div>
                  </div>

                  {/* XP */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Требуемый опыт (XP)</label>
                    <div className={styles.inputWrap}>
                      <AiOutlineStar className={styles.inputIcon} />
                      <input className={styles.input} type="number" min="0" name="required_experience"
                        value={formData.required_experience} onChange={handleInput} />
                    </div>
                    <span className={styles.hint}>0 — без ограничений</span>
                  </div>

                  {/* Описание */}
                  <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                    <label className={styles.formLabel}>Описание</label>
                    <textarea className={styles.textarea} name="description" value={formData.description}
                      onChange={handleInput} placeholder="Краткое описание предмета…" rows={3} />
                  </div>

                  {/* Изображение */}
                  <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                    <label className={styles.formLabel}>Изображение {!editingItem && '*'}</label>
                    <div
                      className={`${styles.dropzone} ${imagePreview ? styles.dropzoneHasImg : ''}`}
                      onClick={() => fileRef.current?.click()}
                    >
                      {imagePreview ? (
                        <img src={imagePreview} alt="preview" className={styles.dropzoneImg} />
                      ) : (
                        <div className={styles.dropzoneHint}>
                          <BsImage className={styles.dropzoneIcon} />
                          <span>Нажмите для выбора файла</span>
                          <span className={styles.dropzoneSmall}>PNG, JPG, WebP · до 5 МБ</span>
                        </div>
                      )}
                      <input
                        ref={fileRef} type="file" accept="image/*"
                        onChange={handleImageChange}
                        required={!editingItem && !imagePreview}
                        style={{ display: 'none' }}
                      />
                    </div>
                    {imagePreview && (
                      <button type="button" className={styles.imgClearBtn}
                        onClick={() => { setImagePreview(null); setImageFile(null); if (fileRef.current) fileRef.current.value = ''; }}>
                        <AiOutlineClose /> Убрать изображение
                      </button>
                    )}
                  </div>

                  {/* FramePositionEditor */}
                  {formData.item_type === 'frame' && (
                    <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                      <FramePositionEditor
                        imagePreview={imagePreview}
                        configs={positionConfigs}
                        onChange={setPositionConfigs}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.modalFoot}>
                <button type="button" className={styles.btnSec} onClick={closeForm} disabled={saving}>Отмена</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? 'Сохранение…' : editingItem ? 'Сохранить изменения' : 'Создать предмет'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm delete ── */}
      <ConfirmModal
        open={!!confirmId}
        title="Удалить предмет?"
        text="Предмет будет навсегда удалён из магазина. Это действие нельзя отменить."
        onConfirm={doDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

/* ── Item Card ── */
function ItemCard({ item, onEdit, onDelete }) {
  const isFrame = item.item_type === 'frame';
  const imgUrl  = item.image_url ? `${BASE_URL}${item.image_url}` : null;

  return (
    <div className={styles.card}>
      <div className={`${styles.cardPreview} ${isFrame ? styles.cardPreviewFrame : styles.cardPreviewBanner}`}>
        {imgUrl ? (
          <img src={imgUrl} alt={item.name} className={isFrame ? styles.frameImg : styles.bannerImg} />
        ) : (
          <div className={styles.noImg}><BsImage /></div>
        )}
        <span className={`${styles.typeBadge} ${isFrame ? styles.typeBadgeFrame : styles.typeBadgeBanner}`}>
          {isFrame ? 'Рамка' : 'Баннер'}
        </span>
      </div>
      <div className={styles.cardBody}>
        <h3 className={styles.cardName}>{item.name}</h3>
        {item.description && <p className={styles.cardDesc}>{item.description}</p>}
        <div className={styles.cardMeta}>
          <span className={styles.metaKey}><AiOutlineKey />{item.item_key}</span>
          <span className={styles.metaPrice}><AiOutlineDollar />{item.price}</span>
          {item.required_experience > 0 && (
            <span className={styles.metaXP}><AiOutlineStar />{item.required_experience} XP</span>
          )}
        </div>
      </div>
      <div className={styles.cardFoot}>
        <button className={styles.btnEdit} onClick={() => onEdit(item)}>
          <AiOutlineEdit /> Изменить
        </button>
        <button className={styles.btnDelCard} onClick={() => onDelete(item.id)}>
          <AiOutlineDelete />
        </button>
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  item_type: 'frame',
  item_key: '',
  name: '',
  description: '',
  price: 0,
  required_experience: 0,
};

export default ShopManagement;

