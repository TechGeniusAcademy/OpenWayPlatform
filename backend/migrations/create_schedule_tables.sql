-- Таблица расписания уроков
CREATE TABLE IF NOT EXISTS schedule_lessons (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    lesson_date DATE,                      -- Дата для одноразового урока
    lesson_time TIME NOT NULL,             -- Время начала урока
    duration_minutes INTEGER DEFAULT 60,   -- Длительность урока в минутах
    is_recurring BOOLEAN DEFAULT FALSE,    -- Повторяющийся урок?
    recurring_days INTEGER[] DEFAULT '{}', -- Дни недели (0=Вс, 1=Пн, ..., 6=Сб)
    recurring_start_date DATE,             -- Дата начала повторяющихся уроков
    recurring_end_date DATE,               -- Дата окончания повторяющихся уроков
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица посещаемости
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER REFERENCES schedule_lessons(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lesson_date DATE NOT NULL,             -- Конкретная дата урока
    status VARCHAR(50) NOT NULL DEFAULT 'unknown', -- present, absent, late, excused
    reason TEXT,                           -- Причина опоздания/отсутствия
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lesson_id, student_id, lesson_date)
);

-- Таблица примечаний к уроку
CREATE TABLE IF NOT EXISTS lesson_notes (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER REFERENCES schedule_lessons(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lesson_date DATE NOT NULL,             -- Конкретная дата урока
    note TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для начислений баллов/опыта на уроке
CREATE TABLE IF NOT EXISTS lesson_rewards (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER REFERENCES schedule_lessons(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lesson_date DATE NOT NULL,
    points_amount INTEGER DEFAULT 0,
    experience_amount INTEGER DEFAULT 0,
    reason TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_schedule_lessons_group ON schedule_lessons(group_id);
CREATE INDEX IF NOT EXISTS idx_schedule_lessons_date ON schedule_lessons(lesson_date);
CREATE INDEX IF NOT EXISTS idx_attendance_lesson ON attendance(lesson_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(lesson_date);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_student ON lesson_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_date ON lesson_notes(lesson_date);
