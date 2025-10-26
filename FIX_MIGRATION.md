# 🔧 Исправление ошибки "column m.reply_to_id does not exist"

## Проблема
На production сервере отсутствует колонка `reply_to_id` в таблице `messages`.

## Решение
Выполните следующие команды на сервере:

### 1. Подключитесь к серверу
```bash
ssh ubuntu@194.110.55.56
```

### 2. Выполните миграцию базы данных
```bash
# Перейдите в директорию с проектом
cd /var/www/openway/backend

# Выполните SQL миграцию
sudo -u postgres psql -d openway_platform -f migrations/add_reply_to_column.sql
```

### 3. Перезапустите backend
```bash
pm2 restart openway-backend
```

### 4. Проверьте работу
```bash
pm2 logs openway-backend --lines 20
```

---

## Альтернативный способ (если миграция не найдена на сервере)

Если файл миграции отсутствует после `git pull`, выполните SQL напрямую:

```bash
sudo -u postgres psql -d openway_platform << 'EOF'
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id);

COMMENT ON COLUMN messages.reply_to_id IS 'ID сообщения, на которое отвечает данное сообщение';
EOF
```

Затем перезапустите:
```bash
pm2 restart openway-backend
pm2 logs openway-backend --lines 20
```

---

## Проверка успешного выполнения

После миграции вы должны увидеть:
- ✅ Логи без ошибок "column m.reply_to_id does not exist"
- ✅ Чат открывается и загружает сообщения
- ✅ Можно отправлять и получать сообщения

Если проблема сохраняется, проверьте:
```bash
# Проверить структуру таблицы
sudo -u postgres psql -d openway_platform -c "\d messages"
```
