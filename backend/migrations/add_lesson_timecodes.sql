-- Добавление поля для таймкодов в уроки
ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS timecodes TEXT;

-- Комментарий: timecodes будет хранить JSON строку с массивом объектов
-- Формат: [{"time": "00:05", "title": "Введение"}, {"time": "02:30", "title": "Основная часть"}]
