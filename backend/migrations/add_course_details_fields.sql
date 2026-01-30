-- Добавление дополнительных полей для детальной информации о курсе
ALTER TABLE courses ADD COLUMN IF NOT EXISTS requirements TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_outcomes TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_name VARCHAR(255);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS language VARCHAR(50) DEFAULT 'Русский';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS certificate_available BOOLEAN DEFAULT false;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS total_students INTEGER DEFAULT 0;
