import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Настройка multer для загрузки изображений курсов
const storageImage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/courses');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'course-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadImage = multer({
    storage: storageImage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Разрешены только изображения (JPEG, PNG, GIF, WebP)'));
        }
    }
});

// Настройка multer для загрузки видео уроков
const storageVideo = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/videos');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'video-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadVideo = multer({
    storage: storageVideo,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /mp4|mov|avi|wmv|flv|mkv|webm/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype || extname) {
            return cb(null, true);
        } else {
            cb(new Error('Разрешены только видео файлы (MP4, MOV, AVI, WMV, FLV, MKV, WebM)'));
        }
    }
});

router.get('/', authenticate, async (req, res) => {
    try {
        const { published } = req.query;
        let query = `
            SELECT c.*, 
                   COUNT(DISTINCT cl.id) as lesson_count,
                   COUNT(DISTINCT ce.id) as enrolled_count,
                   u.username as created_by_name
            FROM courses c
            LEFT JOIN course_lessons cl ON c.id = cl.course_id
            LEFT JOIN course_enrollments ce ON c.id = ce.course_id
            LEFT JOIN users u ON c.created_by = u.id
        `;
        
        if (req.user.role === 'student' || published === 'true') {
            query += ' WHERE c.is_published = true';
        }
        
        query += ' GROUP BY c.id, u.username ORDER BY c.created_at DESC';
        
        const result = await pool.query(query);
        res.json({ courses: result.rows });
    } catch (error) {
        console.error('Ошибка получения курсов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        
        const courseQuery = `
            SELECT c.*, 
                   u.username as created_by_name,
                   COUNT(DISTINCT cl.id) as lesson_count
            FROM courses c
            LEFT JOIN users u ON c.created_by = u.id
            LEFT JOIN course_lessons cl ON c.id = cl.course_id
            WHERE c.id = $1
            GROUP BY c.id, u.username
        `;
        
        const courseResult = await pool.query(courseQuery, [id]);
        
        if (courseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Курс не найден' });
        }
        
        const course = courseResult.rows[0];
        
        if (!course.is_published && req.user.role === 'student') {
            return res.status(403).json({ error: 'Курс недоступен' });
        }
        
        const lessonsQuery = `
            SELECT * FROM course_lessons 
            WHERE course_id = $1 
            ORDER BY category_id NULLS FIRST, order_number ASC
        `;
        const lessonsResult = await pool.query(lessonsQuery, [id]);
        
        const categoriesQuery = `
            SELECT * FROM course_lesson_categories 
            WHERE course_id = $1 
            ORDER BY order_number ASC
        `;
        const categoriesResult = await pool.query(categoriesQuery, [id]);
        
        const enrollmentQuery = `
            SELECT * FROM course_enrollments 
            WHERE user_id = $1 AND course_id = $2
        `;
        const enrollmentResult = await pool.query(enrollmentQuery, [req.user.id, id]);
        
        const progressQuery = `
            SELECT lesson_id, completed, completed_at 
            FROM course_progress 
            WHERE user_id = $1 AND course_id = $2
        `;
        const progressResult = await pool.query(progressQuery, [req.user.id, id]);
        
        res.json({
            course,
            lessons: lessonsResult.rows,
            categories: categoriesResult.rows,
            enrolled: enrollmentResult.rows.length > 0,
            progress: progressResult.rows
        });
    } catch (error) {
        console.error('Ошибка получения курса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Загрузка изображения для курса
router.post('/upload-thumbnail', authenticate, requireAdmin, uploadImage.single('thumbnail'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }
        
        const thumbnailUrl = `/uploads/courses/${req.file.filename}`;
        res.json({ thumbnail_url: thumbnailUrl });
    } catch (error) {
        console.error('Ошибка загрузки изображения:', error);
        res.status(500).json({ error: 'Ошибка загрузки изображения' });
    }
});

// Загрузка видео для урока
router.post('/upload-video', authenticate, requireAdmin, uploadVideo.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }
        
        const videoUrl = `/uploads/videos/${req.file.filename}`;
        res.json({ video_url: videoUrl });
    } catch (error) {
        console.error('Ошибка загрузки видео:', error);
        res.status(500).json({ error: 'Ошибка загрузки видео' });
    }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const { 
            title, 
            description, 
            detailed_description, 
            thumbnail_url, 
            duration_hours, 
            difficulty_level,
            is_published,
            requirements,
            learning_outcomes,
            target_audience,
            instructor_name,
            category,
            language,
            certificate_available
        } = req.body;
        
        if (!title || !description) {
            return res.status(400).json({ error: 'Заголовок и описание обязательны' });
        }
        
        const query = `
            INSERT INTO courses (
                title, description, detailed_description, 
                thumbnail_url, duration_hours, difficulty_level, 
                is_published, created_by, requirements, learning_outcomes,
                target_audience, instructor_name, category, language, certificate_available
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `;
        
        const values = [
            title, 
            description, 
            detailed_description || '', 
            thumbnail_url || null, 
            duration_hours || 0, 
            difficulty_level || 'beginner',
            is_published || false,
            req.user.id,
            requirements || '',
            learning_outcomes || '',
            target_audience || '',
            instructor_name || '',
            category || '',
            language || 'Русский',
            certificate_available || false
        ];
        
        const result = await pool.query(query, values);
        res.status(201).json({ course: result.rows[0] });
    } catch (error) {
        console.error('Ошибка создания курса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            title, 
            description, 
            detailed_description, 
            thumbnail_url, 
            duration_hours, 
            difficulty_level,
            is_published,
            requirements,
            learning_outcomes,
            target_audience,
            instructor_name,
            category,
            language,
            certificate_available
        } = req.body;
        
        const query = `
            UPDATE courses 
            SET title = $1, 
                description = $2, 
                detailed_description = $3,
                thumbnail_url = $4,
                duration_hours = $5,
                difficulty_level = $6,
                is_published = $7,
                requirements = $8,
                learning_outcomes = $9,
                target_audience = $10,
                instructor_name = $11,
                category = $12,
                language = $13,
                certificate_available = $14,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $15
            RETURNING *
        `;
        
        const values = [
            title, 
            description, 
            detailed_description, 
            thumbnail_url, 
            duration_hours, 
            difficulty_level,
            is_published,
            requirements,
            learning_outcomes,
            target_audience,
            instructor_name,
            category,
            language,
            certificate_available,
            id
        ];
        
        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Курс не найден' });
        }
        
        res.json({ course: result.rows[0] });
    } catch (error) {
        console.error('Ошибка обновления курса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Получаем информацию о курсе и его уроках
        const courseResult = await pool.query('SELECT thumbnail_url FROM courses WHERE id = $1', [id]);
        if (courseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Курс не найден' });
        }
        
        const course = courseResult.rows[0];
        
        // Получаем все уроки курса с видео
        const lessonsResult = await pool.query('SELECT video_url FROM course_lessons WHERE course_id = $1', [id]);
        
        // Удаляем курс из базы данных
        await pool.query('DELETE FROM courses WHERE id = $1', [id]);
        
        // Удаляем файл изображения курса
        if (course.thumbnail_url && course.thumbnail_url.startsWith('/uploads/')) {
            const thumbnailPath = path.join(__dirname, '..', course.thumbnail_url);
            fs.unlink(thumbnailPath, (err) => {
                if (err) console.error('Ошибка удаления изображения курса:', err);
            });
        }
        
        // Удаляем видео файлы всех уроков
        lessonsResult.rows.forEach(lesson => {
            if (lesson.video_url && lesson.video_url.startsWith('/uploads/')) {
                const videoPath = path.join(__dirname, '..', lesson.video_url);
                fs.unlink(videoPath, (err) => {
                    if (err) console.error('Ошибка удаления видео урока:', err);
                });
            }
        });
        
        res.json({ message: 'Курс и связанные файлы удалены' });
    } catch (error) {
        console.error('Ошибка удаления курса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/:id/lessons', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, video_url, order_number, duration_minutes, category_id, timecodes } = req.body;
        
        if (!title) {
            return res.status(400).json({ error: 'Название урока обязательно' });
        }
        
        const query = `
            INSERT INTO course_lessons (
                course_id, title, content, video_url, 
                order_number, duration_minutes, category_id, timecodes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        
        const values = [
            id, 
            title, 
            content || '', 
            video_url || null, 
            order_number || 1,
            duration_minutes || 0,
            category_id || null,
            timecodes || null
        ];
        
        const result = await pool.query(query, values);
        res.status(201).json({ lesson: result.rows[0] });
    } catch (error) {
        console.error('Ошибка создания урока:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.put('/:courseId/lessons/:lessonId', authenticate, requireAdmin, async (req, res) => {
    try {
        const { lessonId } = req.params;
        const { title, content, video_url, order_number, duration_minutes, category_id, timecodes } = req.body;
        
        const query = `
            UPDATE course_lessons 
            SET title = $1, 
                content = $2, 
                video_url = $3,
                order_number = $4,
                duration_minutes = $5,
                category_id = $6,
                timecodes = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `;
        
        const values = [title, content, video_url, order_number, duration_minutes, category_id || null, timecodes || null, lessonId];
        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Урок не найден' });
        }
        
        res.json({ lesson: result.rows[0] });
    } catch (error) {
        console.error('Ошибка обновления урока:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.delete('/:courseId/lessons/:lessonId', authenticate, requireAdmin, async (req, res) => {
    try {
        const { lessonId } = req.params;
        
        // Получаем информацию об уроке
        const lessonResult = await pool.query(
            'SELECT video_url FROM course_lessons WHERE id = $1',
            [lessonId]
        );
        
        if (lessonResult.rows.length === 0) {
            return res.status(404).json({ error: 'Урок не найден' });
        }
        
        const lesson = lessonResult.rows[0];
        
        // Удаляем урок из базы данных
        await pool.query('DELETE FROM course_lessons WHERE id = $1', [lessonId]);
        
        // Удаляем видео файл урока, если он локальный
        if (lesson.video_url && lesson.video_url.startsWith('/uploads/')) {
            const videoPath = path.join(__dirname, '..', lesson.video_url);
            fs.unlink(videoPath, (err) => {
                if (err) console.error('Ошибка удаления видео урока:', err);
            });
        }
        
        res.json({ message: 'Урок и связанные файлы удалены' });
    } catch (error) {
        console.error('Ошибка удаления урока:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Управление категориями уроков
router.post('/:courseId/categories', authenticate, requireAdmin, async (req, res) => {
    try {
        const { courseId } = req.params;
        const { title, description, order_number } = req.body;
        
        const query = `
            INSERT INTO course_lesson_categories (course_id, title, description, order_number)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        
        const values = [courseId, title, description || '', order_number || 0];
        const result = await pool.query(query, values);
        
        res.status(201).json({ category: result.rows[0] });
    } catch (error) {
        console.error('Ошибка создания категории:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.put('/:courseId/categories/:categoryId', authenticate, requireAdmin, async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { title, description, order_number } = req.body;
        
        const query = `
            UPDATE course_lesson_categories 
            SET title = $1, 
                description = $2, 
                order_number = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `;
        
        const values = [title, description, order_number, categoryId];
        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Категория не найдена' });
        }
        
        res.json({ category: result.rows[0] });
    } catch (error) {
        console.error('Ошибка обновления категории:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.delete('/:courseId/categories/:categoryId', authenticate, requireAdmin, async (req, res) => {
    try {
        const { categoryId } = req.params;
        
        // Обнуляем category_id у всех уроков этой категории
        await pool.query(
            'UPDATE course_lessons SET category_id = NULL WHERE category_id = $1',
            [categoryId]
        );
        
        await pool.query('DELETE FROM course_lesson_categories WHERE id = $1', [categoryId]);
        res.json({ message: 'Категория удалена' });
    } catch (error) {
        console.error('Ошибка удаления категории:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/:id/enroll', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        
        const courseCheck = await pool.query(
            'SELECT * FROM courses WHERE id = $1 AND is_published = true',
            [id]
        );
        
        if (courseCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Курс не найден или недоступен' });
        }
        
        const query = `
            INSERT INTO course_enrollments (user_id, course_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, course_id) DO NOTHING
            RETURNING *
        `;
        
        await pool.query(query, [req.user.id, id]);
        res.json({ message: 'Вы записались на курс' });
    } catch (error) {
        console.error('Ошибка записи на курс:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/:courseId/lessons/:lessonId/complete', authenticate, async (req, res) => {
    try {
        const { courseId, lessonId } = req.params;
        
        const query = `
            INSERT INTO course_progress (user_id, course_id, lesson_id, completed, completed_at)
            VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, lesson_id) 
            DO UPDATE SET completed = true, completed_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        
        const result = await pool.query(query, [req.user.id, courseId, lessonId]);
        res.json({ progress: result.rows[0] });
    } catch (error) {
        console.error('Ошибка отметки прогресса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

export default router;
