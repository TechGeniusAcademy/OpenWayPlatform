-- Миграция: Исправление структуры таблицы updates
-- Меняем JSONB колонку changes на TEXT колонку content

-- Добавляем новую колонку content
ALTER TABLE updates ADD COLUMN IF NOT EXISTS content TEXT;

-- Удаляем старую колонку changes (если она существует)
ALTER TABLE updates DROP COLUMN IF EXISTS changes;

-- Комментарий к таблице
COMMENT ON TABLE updates IS 'Таблица обновлений платформы (changelog)';
COMMENT ON COLUMN updates.content IS 'Подробное описание изменений в обновлении';
