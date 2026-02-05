import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Вспомогательные функции для работы с датами без проблем с часовыми поясами
const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Инициализация таблиц
const initScheduleTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schedule_lessons (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        lesson_date DATE,
        lesson_time TIME NOT NULL,
        duration_minutes INTEGER DEFAULT 60,
        is_recurring BOOLEAN DEFAULT FALSE,
        recurring_days INTEGER[] DEFAULT '{}',
        recurring_start_date DATE,
        recurring_end_date DATE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        lesson_id INTEGER REFERENCES schedule_lessons(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        lesson_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'unknown',
        reason TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(lesson_id, student_id, lesson_date)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS lesson_notes (
        id SERIAL PRIMARY KEY,
        lesson_id INTEGER REFERENCES schedule_lessons(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        lesson_date DATE NOT NULL,
        note TEXT NOT NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
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
      )
    `);

    console.log('Schedule tables initialized');
  } catch (error) {
    console.error('Error initializing schedule tables:', error);
  }
};

initScheduleTables();

// ===== УРОКИ =====

// Получить все уроки (с фильтрацией по группе и дате)
router.get('/lessons', authenticate, async (req, res) => {
  try {
    const { group_id, start_date, end_date } = req.query;
    
    let query = `
      SELECT sl.*, g.name as group_name
      FROM schedule_lessons sl
      LEFT JOIN groups g ON sl.group_id = g.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (group_id) {
      query += ` AND sl.group_id = $${paramCount}`;
      params.push(group_id);
      paramCount++;
    }

    if (start_date && end_date) {
      query += ` AND (
        (sl.is_recurring = false AND sl.lesson_date BETWEEN $${paramCount} AND $${paramCount + 1})
        OR (sl.is_recurring = true AND sl.recurring_start_date <= $${paramCount + 1} AND (sl.recurring_end_date IS NULL OR sl.recurring_end_date >= $${paramCount}))
      )`;
      params.push(start_date, end_date);
      paramCount += 2;
    }

    query += ' ORDER BY sl.lesson_date, sl.lesson_time';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить уроки для календаря (развёрнутые с повторяющимися)
router.get('/lessons/calendar', authenticate, async (req, res) => {
  try {
    const { group_id, start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Укажите start_date и end_date' });
    }

    // Получаем все уроки
    let query = `
      SELECT sl.*, g.name as group_name
      FROM schedule_lessons sl
      LEFT JOIN groups g ON sl.group_id = g.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (group_id) {
      query += ` AND sl.group_id = $${paramCount}`;
      params.push(group_id);
      paramCount++;
    }

    const result = await pool.query(query, params);
    const lessons = result.rows;

    // Разворачиваем уроки для календаря
    const calendarEvents = [];
    const startDateObj = parseLocalDate(start_date);
    const endDateObj = parseLocalDate(end_date);

    for (const lesson of lessons) {
      if (lesson.is_recurring) {
        // Повторяющийся урок
        const recurringStartStr = lesson.recurring_start_date instanceof Date 
          ? formatLocalDate(lesson.recurring_start_date) 
          : lesson.recurring_start_date?.split('T')[0];
        const recurringEndStr = lesson.recurring_end_date instanceof Date 
          ? formatLocalDate(lesson.recurring_end_date) 
          : lesson.recurring_end_date?.split('T')[0];
        
        const recurringStart = parseLocalDate(recurringStartStr);
        const recurringEnd = recurringEndStr ? parseLocalDate(recurringEndStr) : endDateObj;
        
        let currentDate = new Date(Math.max(startDateObj.getTime(), recurringStart.getTime()));
        const loopEnd = new Date(Math.min(endDateObj.getTime(), recurringEnd.getTime()));
        
        while (currentDate <= loopEnd) {
          const dayOfWeek = currentDate.getDay();
          
          if (lesson.recurring_days.includes(dayOfWeek)) {
            calendarEvents.push({
              ...lesson,
              event_date: formatLocalDate(currentDate),
              is_instance: true
            });
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        // Одноразовый урок
        const lessonDateStr = lesson.lesson_date instanceof Date 
          ? formatLocalDate(lesson.lesson_date) 
          : lesson.lesson_date?.split('T')[0];
        const lessonDate = parseLocalDate(lessonDateStr);
        if (lessonDate >= startDateObj && lessonDate <= endDateObj) {
          calendarEvents.push({
            ...lesson,
            event_date: lessonDateStr,
            is_instance: false
          });
        }
      }
    }

    // Сортируем по дате и времени
    calendarEvents.sort((a, b) => {
      if (a.event_date !== b.event_date) {
        return parseLocalDate(a.event_date) - parseLocalDate(b.event_date);
      }
      return a.lesson_time.localeCompare(b.lesson_time);
    });

    res.json(calendarEvents);
  } catch (error) {
    console.error('Error fetching calendar lessons:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать урок
router.post('/lessons', authenticate, requireAdmin, async (req, res) => {
  try {
    const { 
      group_id, title, description, lesson_date, lesson_time, 
      duration_minutes, is_recurring, recurring_days, 
      recurring_start_date, recurring_end_date 
    } = req.body;

    if (!group_id || !title || !lesson_time) {
      return res.status(400).json({ error: 'Укажите group_id, title и lesson_time' });
    }

    if (!is_recurring && !lesson_date) {
      return res.status(400).json({ error: 'Для одноразового урока укажите lesson_date' });
    }

    if (is_recurring && (!recurring_days || recurring_days.length === 0)) {
      return res.status(400).json({ error: 'Для повторяющегося урока укажите recurring_days' });
    }

    const result = await pool.query(`
      INSERT INTO schedule_lessons 
      (group_id, title, description, lesson_date, lesson_time, duration_minutes, 
       is_recurring, recurring_days, recurring_start_date, recurring_end_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      group_id, title, description, 
      is_recurring ? null : lesson_date, 
      lesson_time, 
      duration_minutes || 60,
      is_recurring || false,
      recurring_days || [],
      is_recurring ? recurring_start_date : null,
      is_recurring ? recurring_end_date : null,
      req.user.id
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating lesson:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить урок
router.put('/lessons/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      group_id, title, description, lesson_date, lesson_time, 
      duration_minutes, is_recurring, recurring_days, 
      recurring_start_date, recurring_end_date 
    } = req.body;

    const result = await pool.query(`
      UPDATE schedule_lessons 
      SET group_id = $1, title = $2, description = $3, lesson_date = $4, 
          lesson_time = $5, duration_minutes = $6, is_recurring = $7,
          recurring_days = $8, recurring_start_date = $9, recurring_end_date = $10,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [
      group_id, title, description, 
      is_recurring ? null : lesson_date, 
      lesson_time, 
      duration_minutes || 60,
      is_recurring || false,
      recurring_days || [],
      is_recurring ? recurring_start_date : null,
      is_recurring ? recurring_end_date : null,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Урок не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating lesson:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить урок
router.delete('/lessons/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM schedule_lessons WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Урок не найден' });
    }

    res.json({ message: 'Урок удалён' });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ===== ПОСЕЩАЕМОСТЬ =====

// Получить посещаемость для урока на конкретную дату
router.get('/attendance/:lessonId/:date', authenticate, async (req, res) => {
  try {
    const { lessonId, date } = req.params;

    // Получаем урок
    const lessonResult = await pool.query(
      'SELECT * FROM schedule_lessons WHERE id = $1',
      [lessonId]
    );

    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Урок не найден' });
    }

    const lesson = lessonResult.rows[0];

    // Получаем студентов группы
    const studentsResult = await pool.query(`
      SELECT u.id, u.username, u.full_name, u.avatar_url
      FROM users u
      WHERE u.group_id = $1 AND u.role = 'student'
      ORDER BY u.full_name, u.username
    `, [lesson.group_id]);

    // Получаем записи посещаемости
    const attendanceResult = await pool.query(`
      SELECT * FROM attendance 
      WHERE lesson_id = $1 AND lesson_date = $2
    `, [lessonId, date]);

    const attendanceMap = {};
    attendanceResult.rows.forEach(a => {
      attendanceMap[a.student_id] = a;
    });

    // Объединяем данные
    const students = studentsResult.rows.map(student => ({
      ...student,
      attendance: attendanceMap[student.id] || { status: 'unknown', reason: null }
    }));

    res.json({ lesson, students, date });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Установить/обновить посещаемость
router.post('/attendance', authenticate, requireAdmin, async (req, res) => {
  try {
    const { lesson_id, student_id, lesson_date, status, reason } = req.body;

    if (!lesson_id || !student_id || !lesson_date || !status) {
      return res.status(400).json({ error: 'Укажите все обязательные поля' });
    }

    const result = await pool.query(`
      INSERT INTO attendance (lesson_id, student_id, lesson_date, status, reason, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (lesson_id, student_id, lesson_date) 
      DO UPDATE SET status = $4, reason = $5, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [lesson_id, student_id, lesson_date, status, reason, req.user.id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving attendance:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ===== ПРИМЕЧАНИЯ =====

// Получить примечания для урока/студента
router.get('/notes/:lessonId/:date', authenticate, async (req, res) => {
  try {
    const { lessonId, date } = req.params;
    const { student_id } = req.query;

    let query = `
      SELECT ln.*, u.username, u.full_name
      FROM lesson_notes ln
      LEFT JOIN users u ON ln.student_id = u.id
      WHERE ln.lesson_id = $1 AND ln.lesson_date = $2
    `;
    const params = [lessonId, date];

    if (student_id) {
      query += ' AND ln.student_id = $3';
      params.push(student_id);
    }

    query += ' ORDER BY ln.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Добавить примечание
router.post('/notes', authenticate, requireAdmin, async (req, res) => {
  try {
    const { lesson_id, student_id, lesson_date, note } = req.body;

    if (!lesson_id || !student_id || !lesson_date || !note) {
      return res.status(400).json({ error: 'Укажите все обязательные поля' });
    }

    const result = await pool.query(`
      INSERT INTO lesson_notes (lesson_id, student_id, lesson_date, note, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [lesson_id, student_id, lesson_date, note, req.user.id]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить примечание
router.delete('/notes/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM lesson_notes WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Примечание не найдено' });
    }

    res.json({ message: 'Примечание удалено' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ===== НАГРАДЫ =====

// Получить награды для урока
router.get('/rewards/:lessonId/:date', authenticate, async (req, res) => {
  try {
    const { lessonId, date } = req.params;
    const { student_id } = req.query;

    let query = `
      SELECT lr.*, u.username, u.full_name
      FROM lesson_rewards lr
      LEFT JOIN users u ON lr.student_id = u.id
      WHERE lr.lesson_id = $1 AND lr.lesson_date = $2
    `;
    const params = [lessonId, date];

    if (student_id) {
      query += ' AND lr.student_id = $3';
      params.push(student_id);
    }

    query += ' ORDER BY lr.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Выдать награду (баллы/опыт)
router.post('/rewards', authenticate, requireAdmin, async (req, res) => {
  try {
    const { lesson_id, student_id, lesson_date, points_amount, experience_amount, reason } = req.body;

    if (!lesson_id || !student_id || !lesson_date) {
      return res.status(400).json({ error: 'Укажите все обязательные поля' });
    }

    if (!points_amount && !experience_amount) {
      return res.status(400).json({ error: 'Укажите баллы или опыт для выдачи' });
    }

    // Добавляем запись о награде
    const rewardResult = await pool.query(`
      INSERT INTO lesson_rewards (lesson_id, student_id, lesson_date, points_amount, experience_amount, reason, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [lesson_id, student_id, lesson_date, points_amount || 0, experience_amount || 0, reason, req.user.id]);

    // Обновляем баллы и опыт пользователя
    if (points_amount) {
      await pool.query(
        'UPDATE users SET points = COALESCE(points, 0) + $1 WHERE id = $2',
        [points_amount, student_id]
      );
    }

    if (experience_amount) {
      await pool.query(
        'UPDATE users SET experience = COALESCE(experience, 0) + $1 WHERE id = $2',
        [experience_amount, student_id]
      );
    }

    res.status(201).json(rewardResult.rows[0]);
  } catch (error) {
    console.error('Error adding reward:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ===== ДЛЯ УЧЕНИКА =====

// Получить расписание своей группы
router.get('/my-schedule', authenticate, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // Получаем группу пользователя
    const userResult = await pool.query(
      'SELECT group_id FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!userResult.rows[0]?.group_id) {
      return res.json([]);
    }

    const groupId = userResult.rows[0].group_id;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Укажите start_date и end_date' });
    }

    // Получаем уроки группы
    const result = await pool.query(`
      SELECT sl.*, g.name as group_name
      FROM schedule_lessons sl
      LEFT JOIN groups g ON sl.group_id = g.id
      WHERE sl.group_id = $1
    `, [groupId]);

    const lessons = result.rows;
    const calendarEvents = [];
    const startDateObj = parseLocalDate(start_date);
    const endDateObj = parseLocalDate(end_date);

    for (const lesson of lessons) {
      if (lesson.is_recurring) {
        const recurringStartStr = lesson.recurring_start_date instanceof Date 
          ? formatLocalDate(lesson.recurring_start_date) 
          : lesson.recurring_start_date?.split('T')[0];
        const recurringEndStr = lesson.recurring_end_date instanceof Date 
          ? formatLocalDate(lesson.recurring_end_date) 
          : lesson.recurring_end_date?.split('T')[0];
        
        const recurringStart = parseLocalDate(recurringStartStr);
        const recurringEnd = recurringEndStr ? parseLocalDate(recurringEndStr) : endDateObj;
        
        let currentDate = new Date(Math.max(startDateObj.getTime(), recurringStart.getTime()));
        const loopEnd = new Date(Math.min(endDateObj.getTime(), recurringEnd.getTime()));
        
        while (currentDate <= loopEnd) {
          const dayOfWeek = currentDate.getDay();
          
          if (lesson.recurring_days.includes(dayOfWeek)) {
            calendarEvents.push({
              ...lesson,
              event_date: formatLocalDate(currentDate),
              is_instance: true
            });
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        const lessonDateStr = lesson.lesson_date instanceof Date 
          ? formatLocalDate(lesson.lesson_date) 
          : lesson.lesson_date?.split('T')[0];
        const lessonDate = parseLocalDate(lessonDateStr);
        if (lessonDate >= startDateObj && lessonDate <= endDateObj) {
          calendarEvents.push({
            ...lesson,
            event_date: lessonDateStr,
            is_instance: false
          });
        }
      }
    }

    calendarEvents.sort((a, b) => {
      if (a.event_date !== b.event_date) {
        return parseLocalDate(a.event_date) - parseLocalDate(b.event_date);
      }
      return a.lesson_time.localeCompare(b.lesson_time);
    });

    res.json(calendarEvents);
  } catch (error) {
    console.error('Error fetching my schedule:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить детали урока для ученика (список одногруппников и примечания)
router.get('/lesson-details/:lessonId/:date', authenticate, async (req, res) => {
  try {
    const { lessonId, date } = req.params;
    const userId = req.user.id;

    // Получаем урок
    const lessonResult = await pool.query(
      'SELECT * FROM schedule_lessons WHERE id = $1',
      [lessonId]
    );

    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Урок не найден' });
    }

    const lesson = lessonResult.rows[0];

    // Получаем одногруппников
    const studentsResult = await pool.query(`
      SELECT id, username, full_name, avatar_url 
      FROM users 
      WHERE group_id = $1 AND role = 'student'
      ORDER BY full_name, username
    `, [lesson.group_id]);

    // Получаем примечания к этому уроку для текущего ученика
    const notesResult = await pool.query(`
      SELECT * FROM lesson_notes 
      WHERE lesson_id = $1 AND lesson_date = $2 AND student_id = $3
      ORDER BY created_at DESC
    `, [lessonId, date, userId]);

    res.json({
      lesson,
      students: studentsResult.rows,
      notes: notesResult.rows
    });
  } catch (error) {
    console.error('Error fetching lesson details:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить примечания ученика
router.get('/my-notes', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ln.*, sl.title as lesson_title, sl.lesson_time,
             a.status as attendance_status, a.reason as attendance_reason
      FROM lesson_notes ln
      JOIN schedule_lessons sl ON ln.lesson_id = sl.id
      LEFT JOIN attendance a ON a.lesson_id = ln.lesson_id 
        AND a.student_id = ln.student_id 
        AND a.lesson_date = ln.lesson_date
      WHERE ln.student_id = $1
      ORDER BY ln.lesson_date DESC, ln.created_at DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching my notes:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить посещаемость ученика
router.get('/my-attendance', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, sl.title as lesson_title, sl.lesson_time
      FROM attendance a
      JOIN schedule_lessons sl ON a.lesson_id = sl.id
      WHERE a.student_id = $1
      ORDER BY a.lesson_date DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching my attendance:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
