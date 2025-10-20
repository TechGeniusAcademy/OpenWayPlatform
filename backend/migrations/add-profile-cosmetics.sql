-- Добавляем поля для косметики профиля в таблицу users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_frame VARCHAR(50) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS profile_banner VARCHAR(50) DEFAULT 'default';

COMMENT ON COLUMN users.avatar_frame IS 'Рамка для аватара (none, gold, silver, rainbow, fire, ice)';
COMMENT ON COLUMN users.profile_banner IS 'Баннер профиля (default, gradient1, gradient2, space, nature, abstract)';

-- Создаем таблицу для магазина косметических предметов
CREATE TABLE IF NOT EXISTS shop_items (
  id SERIAL PRIMARY KEY,
  item_type VARCHAR(20) NOT NULL, -- 'frame' или 'banner'
  item_key VARCHAR(50) NOT NULL UNIQUE, -- Уникальный ключ предмета
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- Цена в баллах
  preview_url VARCHAR(255), -- URL превью предмета
  created_at TIMESTAMP DEFAULT NOW()
);

-- Создаем таблицу для отслеживания купленных предметов
CREATE TABLE IF NOT EXISTS user_purchases (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_key VARCHAR(50) NOT NULL,
  purchased_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, item_key)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_user_purchases_user ON user_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_items_type ON shop_items(item_type);

-- Вставляем базовые предметы в магазин
INSERT INTO shop_items (item_type, item_key, name, description, price) VALUES
-- Рамки для аватара
('frame', 'gold', 'Золотая рамка', 'Элегантная золотая рамка для аватара', 100),
('frame', 'silver', 'Серебряная рамка', 'Стильная серебряная рамка', 75),
('frame', 'rainbow', 'Радужная рамка', 'Яркая радужная рамка с переливами', 150),
('frame', 'fire', 'Огненная рамка', 'Пылающая огненная рамка', 200),
('frame', 'ice', 'Ледяная рамка', 'Морозная ледяная рамка', 200),
('frame', 'neon', 'Неоновая рамка', 'Светящаяся неоновая рамка', 175),
('frame', 'galaxy', 'Космическая рамка', 'Рамка с космическим узором', 250),

-- Баннеры профиля
('banner', 'gradient1', 'Градиент "Закат"', 'Красивый градиент заката', 50),
('banner', 'gradient2', 'Градиент "Океан"', 'Морской градиент', 50),
('banner', 'gradient3', 'Градиент "Аврора"', 'Северное сияние', 75),
('banner', 'space', 'Космос', 'Космический фон с звездами', 100),
('banner', 'nature', 'Природа', 'Природный пейзаж', 100),
('banner', 'abstract', 'Абстракция', 'Абстрактный узор', 125),
('banner', 'cyber', 'Киберпанк', 'Неоновый киберпанк стиль', 150),
('banner', 'anime', 'Аниме', 'Аниме стиль фон', 175)
ON CONFLICT (item_key) DO NOTHING;
