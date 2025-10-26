# 🔧 Исправление ошибок базы данных на production

## Проблемы
1. `column m.reply_to_id does not exist` - отсутствует колонка для ответов на сообщения
2. `relation "message_reactions" does not exist` - отсутствует таблица реакций

## Решение

### Способ 1: Автоматический (рекомендуется)

```bash
# 1. Подключитесь к серверу
ssh ubuntu@194.110.55.56

# 2. Перейдите в директорию проекта и обновите код
cd /var/www/openway
git pull origin main

# 3. Остановите backend
pm2 stop openway-backend

# 4. Выполните автоматическую инициализацию базы данных
# (database.js теперь содержит все необходимые таблицы и колонки)
cd backend
node -e "import('./config/database.js').then(m => m.initDatabase().then(() => process.exit(0)))"

# 5. Перезапустите backend
pm2 restart openway-backend

# 6. Проверьте логи
pm2 logs openway-backend --lines 30
```

### Способ 2: Ручной (если автоматический не сработал)

```bash
# 1. Подключитесь к серверу
ssh ubuntu@194.110.55.56

# 2. Выполните SQL миграции напрямую
sudo -u postgres psql -d openway_platform << 'EOF'
-- Добавление колонки reply_to_id
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id);

-- Добавление колонки is_edited
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

-- Создание таблицы реакций
CREATE TABLE IF NOT EXISTS message_reactions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, user_id, emoji)
);

-- Создание индексов для реакций
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);

-- Вывод результата
\d messages
\d message_reactions
EOF

# 3. Перезапустите backend
pm2 restart openway-backend

# 4. Проверьте логи
pm2 logs openway-backend --lines 30
```

---

## Проверка успешного выполнения

После миграции вы должны увидеть:
- ✅ Логи без ошибок "column m.reply_to_id does not exist"
- ✅ Логи без ошибок "relation message_reactions does not exist"
- ✅ Чат открывается и загружает сообщения
- ✅ Можно отправлять и получать сообщения
- ✅ Работают реакции на сообщения

## Если проблема сохраняется

```bash
# Проверить структуру таблицы messages
sudo -u postgres psql -d openway_platform -c "\d messages"

# Проверить существование таблицы message_reactions
sudo -u postgres psql -d openway_platform -c "\d message_reactions"

# Проверить все таблицы в базе
sudo -u postgres psql -d openway_platform -c "\dt"

# Полный перезапуск
pm2 restart openway-backend
pm2 logs openway-backend --lines 50
```
