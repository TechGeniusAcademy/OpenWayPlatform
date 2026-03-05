import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Статические страницы навигации
const STATIC_PAGES = [
  { title: 'Главная',          description: 'Дашборд ученика',       link: '/student',                  icon: '🏠' },
  { title: 'Курсы',            description: 'Все учебные курсы',      link: '/student/courses',           icon: '📚' },
  { title: 'Тесты',            description: 'Проверка знаний',        link: '/student/tests',             icon: '📝' },
  { title: 'Домашние задания', description: 'ДЗ и подачи',            link: '/student/homeworks',         icon: '📋' },
  { title: 'Расписание',       description: 'Расписание занятий',     link: '/student/schedule',          icon: '📅' },
  { title: 'Чат',              description: 'Общение с учителями',    link: '/student/chat',              icon: '💬' },
  { title: 'Группа',           description: 'Моя группа',             link: '/student/group',             icon: '👥' },
  { title: 'Профиль',          description: 'Мой профиль',            link: '/student/profile',           icon: '👤' },
  { title: 'Настройки',        description: 'Настройки аккаунта',     link: '/student/settings',          icon: '⚙️' },
  { title: 'База знаний',      description: 'Статьи и руководства',   link: '/student/knowledge-base',    icon: '📖' },
  { title: 'Магазин',          description: 'Покупка бонусов',        link: '/student/shop',              icon: '🛍️' },
  { title: 'Игры',             description: 'Мини-игры и активности', link: '/student/games',             icon: '🎮' },
  { title: 'Тренажёр печати',  description: 'Скорость набора',        link: '/student/typing',            icon: '⌨️' },
  { title: 'Фильмы',           description: 'Учебные видео и фильмы', link: '/student/movies',            icon: '🎬' },
  { title: 'Музыка',           description: 'Музыкальная библиотека', link: '/student/music',             icon: '🎵' },
  { title: 'Обновления',       description: 'Новости платформы',      link: '/student/updates',           icon: '🚀' },
  { title: 'Технические задания', description: 'ТЗ для проектов',     link: '/student/technical-specs',   icon: '📐' },
  { title: 'Дизайн-проекты',   description: 'Задания по дизайну',     link: '/student/design-projects',   icon: '🎨' },
  { title: 'Шахматы',          description: 'Шахматный клуб',         link: '/student/chess',             icon: '♟️' },
  { title: 'Викторина',        description: 'Битвы-викторины',        link: '/student/quiz',              icon: '❓' },
];

router.get('/', authenticate, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json({ results: {} });
    }

    const like = `%${q}%`;
    const likeStart = `${q}%`;
    const isStudent = req.user.role === 'student';

    // 1. Курсы
    const coursesQuery = await pool.query(
      `SELECT id, title, description, thumbnail_url, category
       FROM courses
       WHERE is_published = true
         AND (title ILIKE $1 OR description ILIKE $1)
       ORDER BY
         CASE WHEN title ILIKE $2 THEN 0 ELSE 1 END,
         title
       LIMIT 8`,
      [like, likeStart]
    );

    // 2. Статьи базы знаний
    const kbQuery = await pool.query(
      `SELECT a.id, a.title, LEFT(a.content, 120) AS snippet, c.name AS category_name
       FROM kb_articles a
       LEFT JOIN kb_categories c ON c.id = a.category_id
       WHERE a.published = true
         AND a.deleted_at IS NULL
         AND (a.title ILIKE $1 OR a.content ILIKE $1)
       ORDER BY
         CASE WHEN a.title ILIKE $2 THEN 0 ELSE 1 END,
         a.title
       LIMIT 6`,
      [like, likeStart]
    );

    // 3. Тесты (только назначенные ученику, или все для учителя/админа)
    let testsQuery;
    if (isStudent) {
      testsQuery = await pool.query(
        `SELECT DISTINCT t.id, t.title, t.description
         FROM tests t
         INNER JOIN test_assignments ta ON ta.test_id = t.id
         WHERE (ta.student_id = $3 OR ta.group_id IN (
           SELECT group_id FROM group_members WHERE user_id = $3
         ))
           AND (t.title ILIKE $1 OR t.description ILIKE $1)
         ORDER BY
           CASE WHEN t.title ILIKE $2 THEN 0 ELSE 1 END,
           t.title
         LIMIT 5`,
        [like, likeStart, req.user.id]
      );
    } else {
      testsQuery = await pool.query(
        `SELECT id, title, description
         FROM tests
         WHERE title ILIKE $1 OR description ILIKE $1
         ORDER BY
           CASE WHEN title ILIKE $2 THEN 0 ELSE 1 END,
           title
         LIMIT 5`,
        [like, likeStart]
      );
    }

    // 4. Домашние задания
    let hwQuery;
    if (isStudent) {
      hwQuery = await pool.query(
        `SELECT DISTINCT h.id, h.title, h.description
         FROM homeworks h
         INNER JOIN homework_assignments ha ON ha.homework_id = h.id
         WHERE (ha.student_id = $3 OR ha.group_id IN (
           SELECT group_id FROM group_members WHERE user_id = $3
         ))
           AND (h.title ILIKE $1 OR h.description ILIKE $1)
         ORDER BY
           CASE WHEN h.title ILIKE $2 THEN 0 ELSE 1 END,
           h.title
         LIMIT 5`,
        [like, likeStart, req.user.id]
      );
    } else {
      hwQuery = await pool.query(
        `SELECT id, title, description
         FROM homeworks
         WHERE title ILIKE $1 OR description ILIKE $1
         ORDER BY
           CASE WHEN title ILIKE $2 THEN 0 ELSE 1 END,
           title
         LIMIT 5`,
        [like, likeStart]
      );
    }

    // 5. Обновления/новости
    const updatesQuery = await pool.query(
      `SELECT id, title, description, version, created_at
       FROM updates
       WHERE published = true
         AND (title ILIKE $1 OR description ILIKE $1)
       ORDER BY created_at DESC
       LIMIT 4`,
      [like]
    );

    // 6. Пользователи (только для не-студентов или поиск по своей группе)
    let usersResults = [];
    if (!isStudent) {
      const usersQ = await pool.query(
        `SELECT id, full_name, username, avatar_url, role
         FROM users
         WHERE full_name ILIKE $1 OR username ILIKE $1
         ORDER BY
           CASE WHEN full_name ILIKE $2 THEN 0 ELSE 1 END,
           full_name
         LIMIT 6`,
        [like, likeStart]
      );
      usersResults = usersQ.rows;
    }

    // 7. Статические страницы (фильтрация на JS-стороне)
    const pageResults = STATIC_PAGES.filter(p =>
      p.title.toLowerCase().includes(q.toLowerCase()) ||
      p.description.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 5);

    res.json({
      results: {
        courses:  coursesQuery.rows,
        articles: kbQuery.rows,
        tests:    testsQuery.rows,
        homeworks: hwQuery.rows,
        updates:  updatesQuery.rows,
        users:    usersResults,
        pages:    pageResults,
      },
      query: q,
    });
  } catch (error) {
    console.error('Ошибка поиска:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
