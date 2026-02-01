import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../utils/api';
import styles from './ShopManagement.module.css';
import { AiOutlineShoppingCart, AiOutlinePlus, AiOutlinePicture, AiOutlineEdit, AiOutlineDelete, AiOutlineCheck, AiOutlineClose, AiOutlineKey, AiOutlineDollar } from 'react-icons/ai';

function ShopManagement() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    item_type: 'frame',
    item_key: '',
    name: '',
    description: '',
    price: 0
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await api.get('/admin/shop/items');
      setItems(response.data.items);
    } catch (error) {
      console.error('Ошибка загрузки предметов:', error);
      alert('Ошибка загрузки предметов');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('item_type', formData.item_type);
      formDataToSend.append('item_key', formData.item_key);
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price);
      
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      }

      if (editingItem) {
        await api.put(`/admin/shop/items/${editingItem.id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Предмет успешно обновлен!');
      } else {
        await api.post('/admin/shop/items', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Предмет успешно создан!');
      }

      resetForm();
      fetchItems();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert(error.response?.data?.error || 'Ошибка сохранения предмета');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      item_type: item.item_type,
      item_key: item.item_key,
      name: item.name,
      description: item.description,
      price: item.price
    });
    setImagePreview(item.image_url ? `${BASE_URL}${item.image_url}` : null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот предмет?')) {
      return;
    }

    try {
      await api.delete(`/admin/shop/items/${id}`);
      alert('Предмет успешно удален!');
      fetchItems();
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка удаления предмета');
    }
  };

  const resetForm = () => {
    setFormData({
      item_type: 'frame',
      item_key: '',
      name: '',
      description: '',
      price: 0
    });
    setImageFile(null);
    setImagePreview(null);
    setEditingItem(null);
    setShowForm(false);
  };

  const frames = items.filter(item => item.item_type === 'frame');
  const banners = items.filter(item => item.item_type === 'banner');

  return (
    <div className={styles['shop-management']}>
      <div className={styles['page-header']}>
        <h1><AiOutlineShoppingCart className={styles['header-icon']} /> Управление магазином</h1>
        <button className={styles['btn-primary']} onClick={() => setShowForm(true)}>
          <AiOutlinePlus className={styles['btn-icon']} /> Добавить предмет
        </button>
      </div>

      {/* Информация о рекомендуемых размерах */}
      <div className={styles['image-guidelines']}>
  <h3><AiOutlinePicture className={styles['guide-icon']} /> Рекомендуемые размеры изображений:</h3>
        <div className={styles['guidelines-grid']}>
          <div className={styles['guideline-card']}>
            <div className={styles['guideline-icon']}><AiOutlinePicture /></div>
            <h4>Рамки для аватара</h4>
            <p className={styles['size-info']}>200×200 пикселей</p>
            <p className={styles['format-info']}>Формат: PNG с прозрачностью</p>
            <p className={styles.note}>Рамка должна быть квадратной с прозрачным центром</p>
          </div>
          <div className={styles['guideline-card']}>
            <div className={styles['guideline-icon']}><AiOutlinePicture /></div>
            <h4>Баннеры профиля</h4>
            <p className={styles['size-info']}>800×200 пикселей</p>
            <p className={styles['format-info']}>Формат: PNG, JPG, WebP</p>
            <p className={styles.note}>Баннер отображается в верхней части профиля</p>
          </div>
        </div>
      </div>

      {/* Форма добавления/редактирования */}
      {showForm && (
        <div className={styles['modal-overlay']} onClick={() => !loading && resetForm()}>
          <div className={styles['modal-content']} onClick={(e) => e.stopPropagation()}>
              <div className={styles['modal-header']}>
              <h2>{editingItem ? 'Редактировать предмет' : 'Добавить предмет'}</h2>
              <button className={styles['close-btn']} onClick={resetForm}><AiOutlineClose /></button>
            </div>
            <form onSubmit={handleSubmit} className={styles['shop-form']}>
              <div className={styles['form-group']}>
                <label>Тип предмета *</label>
                <select
                  name="item_type"
                  value={formData.item_type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="frame"><AiOutlinePicture /> Рамка для аватара</option>
                  <option value="banner"><AiOutlinePicture /> Баннер профиля</option>
                </select>
              </div>

              <div className={styles['form-group']}>
                <label>Уникальный ключ *</label>
                <input
                  type="text"
                  name="item_key"
                  value={formData.item_key}
                  onChange={handleInputChange}
                  placeholder="Например: golden_frame"
                  required
                />
                <small>Только латинские буквы, цифры и подчеркивания</small>
              </div>

              <div className={styles['form-group']}>
                <label>Название *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Например: Золотая рамка"
                  required
                />
              </div>

              <div className={styles['form-group']}>
                <label>Описание</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Краткое описание предмета..."
                  rows="3"
                />
              </div>

              <div className={styles['form-group']}>
                <label>Цена (в баллах) *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  min="0"
                  required
                />
              </div>

              <div className={styles['form-group']}>
                <label>Изображение {!editingItem && '*'}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  required={!editingItem}
                />
                {imagePreview && (
                  <div className={styles['image-preview']}>
                    <img src={imagePreview} alt="Preview" />
                  </div>
                )}
              </div>

              <div className={styles['form-actions']}>
                <button type="button" className={styles['btn-secondary']} onClick={resetForm} disabled={loading}>
                  Отмена
                </button>
                <button type="submit" className={styles['btn-primary']} disabled={loading}>
                  {loading ? 'Сохранение...' : editingItem ? 'Обновить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Список рамок */}
      <div className={styles['items-section']}>
        <h2>🖼️ Рамки для аватара ({frames.length})</h2>
        <div className={styles['items-grid']}>
          {frames.map(item => (
            <div key={item.id} className={styles['shop-item-card']}>
              <div className={styles['item-image']}>
                {item.image_url ? (
                  <img src={`${BASE_URL}${item.image_url}`} alt={item.name} />
                ) : (
                  <div className={styles['no-image']}>Нет изображения</div>
                )}
              </div>
              <div className={styles['item-info']}>
                <h3>{item.name}</h3>
                <p className={styles['item-description']}>{item.description}</p>
                <div className={styles['item-meta']}>
                  <span className={styles['item-key']}><AiOutlineKey /> {item.item_key}</span>
                  <span className={styles['item-price']}><AiOutlineDollar /> {item.price}</span>
                </div>
              </div>
              <div className={styles['item-actions']}>
                <button className={styles['btn-edit']} onClick={() => handleEdit(item)}>
                  <AiOutlineEdit className={styles['btn-icon']} /> Изменить
                </button>
                <button className={styles['btn-delete']} onClick={() => handleDelete(item.id)}>
                  <AiOutlineDelete className={styles['btn-icon']} /> Удалить
                </button>
              </div>
            </div>
          ))}
          {frames.length === 0 && (
            <div className={styles['no-items']}>
              <p>Рамки еще не добавлены</p>
            </div>
          )}
        </div>
      </div>

      {/* Список баннеров */}
      <div className={styles['items-section']}>
        <h2>🎨 Баннеры профиля ({banners.length})</h2>
        <div className={`${styles['items-grid']} ${styles['banners-grid']}`}>
          {banners.map(item => (
            <div key={item.id} className={`${styles['shop-item-card']} ${styles['banner-card']}`}>
              <div className={`${styles['item-image']} ${styles['banner-preview']}`}>
                {item.image_url ? (
                  <img src={`${BASE_URL}${item.image_url}`} alt={item.name} />
                ) : (
                  <div className={styles['no-image']}>Нет изображения</div>
                )}
              </div>
              <div className={styles['item-info']}>
                <h3>{item.name}</h3>
                <p className={styles['item-description']}>{item.description}</p>
                <div className={styles['item-meta']}>
                  <span className={styles['item-key']}><AiOutlineKey /> {item.item_key}</span>
                  <span className={styles['item-price']}><AiOutlineDollar /> {item.price}</span>
                </div>
              </div>
              <div className={styles['item-actions']}>
                <button className={styles['btn-edit']} onClick={() => handleEdit(item)}>
                  <AiOutlineEdit className={styles['btn-icon']} /> Изменить
                </button>
                <button className={styles['btn-delete']} onClick={() => handleDelete(item.id)}>
                  <AiOutlineDelete className={styles['btn-icon']} /> Удалить
                </button>
              </div>
            </div>
          ))}
          {banners.length === 0 && (
            <div className={styles['no-items']}>
              <p>Баннеры еще не добавлены</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShopManagement;
