-- Добавляем поля required_level и price в таблицу courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS required_level INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0;

-- Комментарии
COMMENT ON COLUMN courses.required_level IS 'Минимальный уровень пользователя для доступа к курсу';
COMMENT ON COLUMN courses.price IS 'Цена курса в баллах (0 = бесплатный)';
