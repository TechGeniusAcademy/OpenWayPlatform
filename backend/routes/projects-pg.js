import express from 'express';
import { authenticate } from '../middleware/auth.js';
import pool from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Директория для хранения файлов проектов
const PROJECTS_DIR = path.join(__dirname, '../projects');

// Создаем директорию если её нет
fs.mkdir(PROJECTS_DIR, { recursive: true }).catch(console.error);

// Получить все проекты пользователя
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, name, description, language, files_count, created_at, updated_at 
       FROM projects 
       WHERE user_id = $1 
       ORDER BY updated_at DESC`,
      [req.user.id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Ошибка при загрузке проектов' });
  }
});

// Получить один проект со всеми файлами
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Проект не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Ошибка при загрузке проекта' });
  }
});

// Создать новый проект
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, language } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Название проекта обязательно' });
    }

    // Создаем дефолтную файловую систему
    const defaultFileSystem = [
      {
        type: 'folder',
        name: name,
        path: `/${name}`,
        children: [
          {
            type: 'file',
            name: 'index.html',
            path: `/${name}/index.html`,
            content: `<!DOCTYPE html>\n<html>\n<head>\n  <title>${name}</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Привет, мир!</h1>\n  <script src="script.js"></script>\n</body>\n</html>`
          },
          {
            type: 'file',
            name: 'script.js',
            path: `/${name}/script.js`,
            content: `// ${name}\nconsole.log("Hello, World!");`
          },
          {
            type: 'file',
            name: 'style.css',
            path: `/${name}/style.css`,
            content: `/* Стили для ${name} */\nbody {\n  margin: 0;\n  padding: 20px;\n  font-family: Arial, sans-serif;\n}`
          }
        ]
      }
    ];

    const result = await pool.query(
      `INSERT INTO projects (user_id, name, description, language, file_system, files_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, name, description || '', language || 'html', JSON.stringify(defaultFileSystem), 3]
    );

    const project = result.rows[0];

    // Создаем директорию проекта на диске
    const projectDir = path.join(PROJECTS_DIR, req.user.id.toString(), project.id.toString());
    await fs.mkdir(projectDir, { recursive: true });

    // Сохраняем файлы на диск
    await saveFilesToDisk(projectDir, defaultFileSystem);

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Ошибка при создании проекта' });
  }
});

// Обновить проект (сохранить изменения в файлах)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { fileSystem, name, description } = req.body;

    // Проверяем существование проекта
    const checkResult = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Проект не найден' });
    }

    // Обновляем данные
    const filesCount = fileSystem ? countFiles(fileSystem) : checkResult.rows[0].files_count;
    
    const result = await pool.query(
      `UPDATE projects 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           file_system = COALESCE($3, file_system),
           files_count = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [name, description, fileSystem ? JSON.stringify(fileSystem) : null, filesCount, req.params.id, req.user.id]
    );

    // Обновляем файлы на диске
    if (fileSystem) {
      const projectDir = path.join(PROJECTS_DIR, req.user.id.toString(), req.params.id);
      await fs.rm(projectDir, { recursive: true, force: true });
      await fs.mkdir(projectDir, { recursive: true });
      await saveFilesToDisk(projectDir, fileSystem);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Ошибка при обновлении проекта' });
  }
});

// Удалить проект
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Проверяем что ID передан
    if (!projectId || projectId === 'undefined') {
      return res.status(400).json({ message: 'ID проекта не указан' });
    }

    const checkResult = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Проект не найден' });
    }

    // Удаляем файлы с диска
    const projectDir = path.join(PROJECTS_DIR, req.user.id.toString(), req.params.id);
    await fs.rm(projectDir, { recursive: true, force: true });

    // Удаляем из базы данных
    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);

    res.json({ message: 'Проект успешно удален' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Ошибка при удалении проекта' });
  }
});

// Вспомогательная функция для сохранения файлов на диск
async function saveFilesToDisk(baseDir, fileSystem) {
  for (const item of fileSystem) {
    if (item.type === 'folder') {
      const folderPath = path.join(baseDir, item.name);
      await fs.mkdir(folderPath, { recursive: true });
      if (item.children && item.children.length > 0) {
        await saveFilesToDisk(folderPath, item.children);
      }
    } else if (item.type === 'file') {
      const filePath = path.join(baseDir, item.name);
      await fs.writeFile(filePath, item.content || '', 'utf8');
    }
  }
}

// Вспомогательная функция для подсчета файлов
function countFiles(fileSystem) {
  let count = 0;
  for (const item of fileSystem) {
    if (item.type === 'file') {
      count++;
    } else if (item.type === 'folder' && item.children) {
      count += countFiles(item.children);
    }
  }
  return count;
}

export default router;
