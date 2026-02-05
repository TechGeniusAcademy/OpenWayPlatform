-- Добавляем колонку для хранения прикреплённых файлов (JSON массив)
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
