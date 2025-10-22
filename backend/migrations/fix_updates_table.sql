-- Миграция: Исправление структуры таблицы updates
-- Меняем JSONB колонку changes на TEXT колонку content

DO $$ 
BEGIN
    -- Добавляем новую колонку content если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'updates' AND column_name = 'content'
    ) THEN
        ALTER TABLE updates ADD COLUMN content TEXT;
    END IF;

    -- Удаляем старую колонку changes если она существует
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'updates' AND column_name = 'changes'
    ) THEN
        ALTER TABLE updates DROP COLUMN changes;
    END IF;
END $$;
