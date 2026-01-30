-- Создание таблицы категорий уроков
CREATE TABLE IF NOT EXISTS course_lesson_categories (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_number INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Добавление category_id в таблицу уроков
ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES course_lesson_categories(id) ON DELETE SET NULL;

-- Индекс для оптимизации
CREATE INDEX IF NOT EXISTS idx_lesson_categories_course ON course_lesson_categories(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_category ON course_lessons(category_id);
