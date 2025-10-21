import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../utils/api';
import './ShopManagement.css';
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
    <div className="shop-management">
      <div className="page-header">
        <h1><AiOutlineShoppingCart className="header-icon" /> Управление магазином</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <AiOutlinePlus className="btn-icon" /> Добавить предмет
        </button>
      </div>

      {/* Информация о рекомендуемых размерах */}
      <div className="image-guidelines">
  <h3><AiOutlinePicture className="guide-icon" /> Рекомендуемые размеры изображений:</h3>
        <div className="guidelines-grid">
          <div className="guideline-card">
            <div className="guideline-icon"><AiOutlinePicture /></div>
            <h4>Рамки для аватара</h4>
            <p className="size-info">200×200 пикселей</p>
            <p className="format-info">Формат: PNG с прозрачностью</p>
            <p className="note">Рамка должна быть квадратной с прозрачным центром</p>
          </div>
          <div className="guideline-card">
            <div className="guideline-icon"><AiOutlinePicture /></div>
            <h4>Баннеры профиля</h4>
            <p className="size-info">800×200 пикселей</p>
            <p className="format-info">Формат: PNG, JPG, WebP</p>
            <p className="note">Баннер отображается в верхней части профиля</p>
          </div>
        </div>
      </div>

      {/* Форма добавления/редактирования */}
      {showForm && (
        <div className="modal-overlay" onClick={() => !loading && resetForm()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
              <h2>{editingItem ? 'Редактировать предмет' : 'Добавить предмет'}</h2>
              <button className="close-btn" onClick={resetForm}><AiOutlineClose /></button>
            </div>
            <form onSubmit={handleSubmit} className="shop-form">
              <div className="form-group">
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

              <div className="form-group">
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

              <div className="form-group">
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

              <div className="form-group">
                <label>Описание</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Краткое описание предмета..."
                  rows="3"
                />
              </div>

              <div className="form-group">
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

              <div className="form-group">
                <label>Изображение {!editingItem && '*'}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  required={!editingItem}
                />
                {imagePreview && (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Preview" />
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={resetForm} disabled={loading}>
                  Отмена
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Сохранение...' : editingItem ? 'Обновить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Список рамок */}
      <div className="items-section">
        <h2>🖼️ Рамки для аватара ({frames.length})</h2>
        <div className="items-grid">
          {frames.map(item => (
            <div key={item.id} className="shop-item-card">
              <div className="item-image">
                {item.image_url ? (
                  <img src={`${BASE_URL}${item.image_url}`} alt={item.name} />
                ) : (
                  <div className="no-image">Нет изображения</div>
                )}
              </div>
              <div className="item-info">
                <h3>{item.name}</h3>
                <p className="item-description">{item.description}</p>
                <div className="item-meta">
                  <span className="item-key"><AiOutlineKey /> {item.item_key}</span>
                  <span className="item-price"><AiOutlineDollar /> {item.price}</span>
                </div>
              </div>
              <div className="item-actions">
                <button className="btn-edit" onClick={() => handleEdit(item)}>
                  <AiOutlineEdit className="btn-icon" /> Изменить
                </button>
                <button className="btn-delete" onClick={() => handleDelete(item.id)}>
                  <AiOutlineDelete className="btn-icon" /> Удалить
                </button>
              </div>
            </div>
          ))}
          {frames.length === 0 && (
            <div className="no-items">
              <p>Рамки еще не добавлены</p>
            </div>
          )}
        </div>
      </div>

      {/* Список баннеров */}
      <div className="items-section">
        <h2>🎨 Баннеры профиля ({banners.length})</h2>
        <div className="items-grid banners-grid">
          {banners.map(item => (
            <div key={item.id} className="shop-item-card banner-card">
              <div className="item-image banner-preview">
                {item.image_url ? (
                  <img src={`${BASE_URL}${item.image_url}`} alt={item.name} />
                ) : (
                  <div className="no-image">Нет изображения</div>
                )}
              </div>
              <div className="item-info">
                <h3>{item.name}</h3>
                <p className="item-description">{item.description}</p>
                <div className="item-meta">
                  <span className="item-key"><AiOutlineKey /> {item.item_key}</span>
                  <span className="item-price"><AiOutlineDollar /> {item.price}</span>
                </div>
              </div>
              <div className="item-actions">
                <button className="btn-edit" onClick={() => handleEdit(item)}>
                  <AiOutlineEdit className="btn-icon" /> Изменить
                </button>
                <button className="btn-delete" onClick={() => handleDelete(item.id)}>
                  <AiOutlineDelete className="btn-icon" /> Удалить
                </button>
              </div>
            </div>
          ))}
          {banners.length === 0 && (
            <div className="no-items">
              <p>Баннеры еще не добавлены</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShopManagement;
