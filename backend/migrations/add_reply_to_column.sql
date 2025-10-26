-- Добавление колонки reply_to_id для функции ответа на сообщения
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL;

-- Создание индекса для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id);
