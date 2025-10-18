import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../utils/api';
import './GameManagement.css';

function GameCards() {
  const [cards, setCards] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null); // Для загрузки файла
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    card_type: 'skip_turn',
    effect_value: 0,
    drop_chance: 10.0,
    team: 'neutral'
  });

  const cardTypes = [
    { value: 'skip_turn', label: '⏭️ Пропуск хода (-5 баллов)', effect: -5 },
    { value: 'transfer_question', label: '🔄 Передача вопроса', effect: 0 },
    { value: 'extra_questions', label: '➕ Доп. вопросы (+3)', effect: 3 },
    { value: 'double_points', label: '2️⃣ Удвоение баллов (x2)', effect: 2 },
    { value: 'steal_points', label: '💰 Кража баллов (+10)', effect: 10 },
    { value: 'time_bonus', label: '⏰ Бонус времени (+30сек)', effect: 30 },
    { value: 'minus_time', label: '⏱️ Минус времени (-15сек)', effect: -15 },
    { value: 'random_event', label: '🎲 Случайное событие', effect: 0 }
  ];

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await api.get('/game/cards');
      setCards(response.data.cards);
    } catch (error) {
      console.error('Ошибка загрузки карточек:', error);
    }
  };

  const openForm = (card = null) => {
    if (card) {
      setEditingCard(card);
      setFormData(card);
    } else {
      setEditingCard(null);
      setFormData({
        name: '',
        description: '',
        image_url: '',
        card_type: 'skip_turn',
        effect_value: 0,
        drop_chance: 10.0,
        team: 'neutral'
      });
    }
    setSelectedImage(null); // Очищаем выбранное изображение
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCard(null);
    setSelectedImage(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('card_type', formData.card_type);
      formDataToSend.append('effect_value', formData.effect_value);
      formDataToSend.append('drop_chance', formData.drop_chance);
      formDataToSend.append('team', formData.team);
      
      // Добавляем файл изображения если выбран
      if (selectedImage) {
        formDataToSend.append('image', selectedImage);
      }
      
      if (editingCard) {
        await api.put(`/game/cards/${editingCard.id}`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await api.post('/game/cards', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      fetchCards();
      closeForm();
    } catch (error) {
      console.error('Ошибка сохранения карточки:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить эту карточку?')) return;
    
    try {
      await api.delete(`/game/cards/${id}`);
      fetchCards();
    } catch (error) {
      console.error('Ошибка удаления карточки:', error);
    }
  };

  const getCardTypeLabel = (type) => {
    const cardType = cardTypes.find(ct => ct.value === type);
    return cardType ? cardType.label : type;
  };

  return (
    <div className="game-cards-management">
      <div className="header">
        <h2> Карточки для игры</h2>
        <button className="btn-primary" onClick={() => openForm()}>
          + Создать карточку
        </button>
      </div>

      <div className="cards-grid">
        {cards.map(card => (
          <div key={card.id} className={`card-item ${card.team}`}>
            <div className="card-image">
              {card.image_url ? (
                <img src={`${BASE_URL}${card.image_url}`} alt={card.name} />
              ) : (
                <div className="placeholder-image">🎴</div>
              )}
            </div>
            
            <div className="card-content">
              <h3>{card.name}</h3>
              <p className="card-description">{card.description}</p>
              
              <div className="card-stats">
                <div className="stat">
                  <span className="label">Тип:</span>
                  <span className="value">{getCardTypeLabel(card.card_type)}</span>
                </div>
                <div className="stat">
                  <span className="label">Эффект:</span>
                  <span className="value">{card.effect_value}</span>
                </div>
                <div className="stat">
                  <span className="label">Шанс:</span>
                  <span className="value">{card.drop_chance}%</span>
                </div>
                <div className="stat">
                  <span className="label">Команда:</span>
                  <span className={`team-badge ${card.team}`}>
                    {card.team === 'team_a' ? 'Команда' : card.team === 'team_b' ? 'Команда' : 'Нейтральная'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="card-actions">
              <button onClick={() => openForm(card)} className="btn-edit">✏️</button>
              <button onClick={() => handleDelete(card.id)} className="btn-delete">🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {cards.length === 0 && (
        <div className="empty-state">
          <p>📭 Пока нет карточек. Создайте первую!</p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingCard ? 'Редактировать карточку' : 'Создать карточку'}</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Название карточки</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Изображение карточки</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {selectedImage && (
                  <p style={{ marginTop: '10px', color: 'black', fontSize: '14px' }}>
                    ✓ Выбран файл: {selectedImage.name}
                  </p>
                )}
                {editingCard?.image_url && !selectedImage && (
                  <div style={{ marginTop: '10px' }}>
                    <img 
                      src={`${BASE_URL}${editingCard.image_url}`} 
                      alt="Текущее изображение" 
                      style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '8px' }}
                    />
                    <p style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                      Текущее изображение (загрузите новое, чтобы заменить)
                    </p>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Тип карточки</label>
                  <select
                    value={formData.card_type}
                    onChange={(e) => {
                      const selectedType = cardTypes.find(ct => ct.value === e.target.value);
                      setFormData({
                        ...formData, 
                        card_type: e.target.value,
                        effect_value: selectedType?.effect || 0
                      });
                    }}
                  >
                    {cardTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Значение эффекта (автоматически)</label>
                  <input
                    type="number"
                    value={formData.effect_value}
                    onChange={(e) => setFormData({...formData, effect_value: parseInt(e.target.value)})}
                    readOnly
                    disabled
                    style={{ backgroundColor: '#2d2d2d', color: '#888', cursor: 'not-allowed' }}
                    title="Это значение устанавливается автоматически в зависимости от типа карточки"
                  />
                  <p style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                    ℹ️ Это поле заполняется автоматически на основе выбранного типа карточки
                  </p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Шанс выпадения (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.drop_chance}
                    onChange={(e) => setFormData({...formData, drop_chance: parseFloat(e.target.value)})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Принадлежность</label>
                  <select
                    value={formData.team}
                    onChange={(e) => setFormData({...formData, team: e.target.value})}
                  >
                    <option value="neutral">Нейтральная</option>
                    <option value="team_a">Команда</option>
                    <option value="team_b">Команда</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={closeForm}>Отмена</button>
                <button type="submit" className="btn-primary">
                  {editingCard ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameCards;
