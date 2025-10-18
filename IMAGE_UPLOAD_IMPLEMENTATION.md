# 📸 Загрузка изображений для карточек

## Изменения в системе загрузки изображений

### ❌ Было:
- Поле ввода URL: `https://example.com/image.jpg`
- Изображения хранились на внешних серверах

### ✅ Стало:
- Загрузка файла через `<input type="file">`
- Изображения загружаются на сервер в папку `backend/uploads/cards/`
- Автоматическое сохранение с уникальным именем

---

## 🎯 Реализация

### Frontend (GameCards.jsx)

**1. Добавлено состояние для файла:**
```javascript
const [selectedImage, setSelectedImage] = useState(null);
```

**2. Обработчик выбора файла:**
```javascript
const handleImageChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    setSelectedImage(file);
  }
};
```

**3. Отправка через FormData:**
```javascript
const formDataToSend = new FormData();
formDataToSend.append('name', formData.name);
formDataToSend.append('description', formData.description);
formDataToSend.append('card_type', formData.card_type);
formDataToSend.append('effect_value', formData.effect_value);
formDataToSend.append('drop_chance', formData.drop_chance);
formDataToSend.append('team', formData.team);

if (selectedImage) {
  formDataToSend.append('image', selectedImage);
}

await api.post('/game/cards', formDataToSend, {
  headers: {
    'Content-Type': 'multipart/form-data'
  }
});
```

**4. UI для загрузки:**
```jsx
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
        src={editingCard.image_url} 
        alt="Текущее изображение" 
        style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '8px' }}
      />
      <p style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
        Текущее изображение (загрузите новое, чтобы заменить)
      </p>
    </div>
  )}
</div>
```

---

### Backend (game.js)

**1. Импорт multer:**
```javascript
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
```

**2. Настройка хранилища:**
```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/cards/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'card-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB максимум
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Только изображения разрешены!'));
    }
  }
});
```

**3. Обновленные роуты:**

**Создание карточки:**
```javascript
router.post('/cards', upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const cardData = {
      ...req.body,
      created_by: req.user.id
    };

    // Если загружен файл, сохраняем путь к нему
    if (req.file) {
      cardData.image_url = `/uploads/cards/${req.file.filename}`;
    }

    const card = await GameCard.create(cardData);
    res.json({ card });
  } catch (error) {
    console.error('Ошибка создания карточки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});
```

**Обновление карточки:**
```javascript
router.put('/cards/:id', upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const cardData = { ...req.body };

    // Если загружен новый файл, обновляем путь
    if (req.file) {
      cardData.image_url = `/uploads/cards/${req.file.filename}`;
    }

    const card = await GameCard.update(req.params.id, cardData);
    res.json({ card });
  } catch (error) {
    console.error('Ошибка обновления карточки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});
```

**4. Раздача статических файлов (server.js):**
```javascript
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
```

---

## 📁 Структура папок

```
backend/
├── uploads/
│   └── cards/
│       ├── card-1697614800000-123456789.jpg
│       ├── card-1697614801000-987654321.png
│       └── ...
├── routes/
│   └── game.js
└── server.js
```

---

## 🎨 Особенности реализации

### ✅ Преимущества:

1. **Безопасность:**
   - Проверка типов файлов (только изображения)
   - Ограничение размера (5MB максимум)
   - Уникальные имена файлов (timestamp + random)

2. **Удобство:**
   - Предпросмотр выбранного файла
   - Показ текущего изображения при редактировании
   - Возможность заменить изображение

3. **Производительность:**
   - Файлы хранятся локально на сервере
   - Быстрая загрузка через статический сервер

### 📝 Формат имени файла:
```
card-{timestamp}-{random}.{ext}

Пример: card-1697614800000-123456789.jpg
```

### 🔗 URL изображения в базе:
```
/uploads/cards/card-1697614800000-123456789.jpg
```

Изображение доступно по адресу:
```
http://localhost:5000/uploads/cards/card-1697614800000-123456789.jpg
```

---

## 🚀 Использование

### Создание новой карточки:
1. Нажмите "Создать карточку"
2. Заполните форму
3. Нажмите кнопку "Выберите файл"
4. Выберите изображение (jpg, png, gif, webp)
5. Увидите: "✓ Выбран файл: image.jpg"
6. Нажмите "Создать"

### Редактирование карточки:
1. Нажмите "Редактировать" на карточке
2. Увидите текущее изображение
3. При необходимости выберите новый файл
4. Нажмите "Сохранить"

---

## ⚠️ Ограничения

- **Максимальный размер файла:** 5MB
- **Разрешенные форматы:** JPEG, JPG, PNG, GIF, WEBP
- **Доступ:** Только администраторы могут загружать изображения

---

## 🎉 Готово!

Теперь карточки можно создавать с локальными изображениями вместо внешних URL!
