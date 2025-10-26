import express from 'express';
import { authenticate } from '../middleware/auth.js';
import pool from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';

const execPromise = promisify(exec);

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

    const project = result.rows[0];
    
    // Синхронизируем с диском при каждой загрузке проекта
    // Это обновит file_system если на диске появились новые файлы (например, .db от PHP)
    try {
      const projectDir = path.join(PROJECTS_DIR, req.user.id.toString(), req.params.id);
      const projectFolder = project.file_system[0];
      
      if (projectFolder && projectFolder.name) {
        const workingDir = path.join(projectDir, projectFolder.name);
        
        // Проверяем существует ли директория
        try {
          await fs.access(workingDir);
          // Директория существует, синхронизируем
          await updateFileSystemFromDisk(req.params.id, req.user.id, workingDir, projectFolder.name);
          
          // Получаем обновленные данные
          const updatedResult = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
          );
          
          if (updatedResult.rows.length > 0) {
            return res.json(updatedResult.rows[0]);
          }
        } catch (err) {
          // Директория не существует, возвращаем как есть
          console.log(`⚠️ Директория проекта не найдена: ${workingDir}`);
        }
      }
    } catch (syncError) {
      console.error('Ошибка синхронизации:', syncError);
      // Продолжаем работу даже если синхронизация не удалась
    }

    res.json(project);
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
      
      // Не удаляем всю директорию, чтобы не потерять .db файлы созданные PHP
      // Вместо этого обновляем только файлы из fileSystem
      await fs.mkdir(projectDir, { recursive: true });
      await saveFilesToDisk(projectDir, fileSystem);
      
      // После сохранения синхронизируем обратно с диска
      // Это подхватит файлы созданные PHP (например .db)
      const projectFolder = fileSystem[0];
      if (projectFolder && projectFolder.name) {
        const workingDir = path.join(projectDir, projectFolder.name);
        await updateFileSystemFromDisk(req.params.id, req.user.id, workingDir, projectFolder.name);
        
        // Получаем обновленные данные
        const updatedResult = await pool.query(
          'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
          [req.params.id, req.user.id]
        );
        
        if (updatedResult.rows.length > 0) {
          return res.json(updatedResult.rows[0]);
        }
      }
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

// Выполнить PHP код
router.post('/:id/execute-php', authenticate, async (req, res) => {
  try {
    const { code, fileName } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Код не предоставлен' });
    }

    // Проверяем существование проекта
    const checkResult = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Проект не найден' });
    }

    const project = checkResult.rows[0];

    // Сохраняем весь проект на диск
    const projectDir = path.join(PROJECTS_DIR, req.user.id.toString(), req.params.id);
    
    // Проверяем существует ли директория проекта
    let projectDirExists = false;
    try {
      await fs.access(projectDir);
      projectDirExists = true;
    } catch {
      projectDirExists = false;
    }
    
    // Если директории нет, создаем и сохраняем все файлы
    if (!projectDirExists) {
      await fs.mkdir(projectDir, { recursive: true });
      if (project.file_system) {
        await saveFilesToDisk(projectDir, project.file_system);
      }
    }

    // Определяем путь к файлу для выполнения
    // fileName приходит как /asmir/register.php, нужно найти реальный путь
    const fileToExecute = fileName || 'index.php';
    
    // Функция для поиска файла в структуре
    const findFileInStructure = (fs, targetPath) => {
      for (const item of fs) {
        if (item.path === targetPath) {
          return item;
        }
        if (item.type === 'folder' && item.children) {
          const found = findFileInStructure(item.children, targetPath);
          if (found) return found;
        }
      }
      return null;
    };

    const fileInfo = findFileInStructure(project.file_system, fileToExecute);
    
    if (!fileInfo) {
      return res.status(404).json({ 
        success: false,
        message: 'Файл не найден в структуре проекта' 
      });
    }

    // Находим папку проекта (первый уровень в file_system)
    const projectFolder = project.file_system[0];
    const workingDir = path.join(projectDir, projectFolder.name);
    
    // Получаем относительный путь файла внутри папки проекта
    const relativePath = fileToExecute.replace(`/${projectFolder.name}/`, '');

    try {
      // Выполняем PHP из рабочей директории (папка проекта)
      // Подавляем Notice и Warning для CLI режима, показываем только серьезные ошибки
      const { stdout, stderr } = await execPromise(`php -d display_errors=0 -d error_reporting=E_ERROR "${relativePath}"`, {
        cwd: workingDir, // Выполняем из папки проекта (например asmir/)
        timeout: 5000,
        maxBuffer: 1024 * 1024, // 1MB
        shell: true
      });

      // После выполнения PHP сканируем папку и обновляем file_system
      await updateFileSystemFromDisk(req.params.id, req.user.id, workingDir, projectFolder.name);

      res.json({
        success: true,
        output: stdout,
        error: stderr || null
      });
    } catch (execError) {
      if (execError.killed) {
        return res.json({
          success: false,
          output: '',
          error: '⏱️ Превышено время выполнения (5 секунд)'
        });
      }

      // PHP может вывести HTML в stdout даже при ошибке
      // Проверяем есть ли вывод
      const hasOutput = execError.stdout && execError.stdout.trim().length > 0;
      
      // Если есть вывод (HTML), считаем успешным выполнением
      if (hasOutput) {
        // Обновляем file_system после выполнения
        await updateFileSystemFromDisk(req.params.id, req.user.id, workingDir, projectFolder.name);
        
        return res.json({
          success: true,
          output: execError.stdout,
          error: execError.stderr || null
        });
      }

      // Формируем полное сообщение об ошибке
      let errorMessage = '';
      if (execError.stderr) {
        errorMessage = execError.stderr;
      } else if (execError.stdout) {
        errorMessage = execError.stdout;
      } else {
        errorMessage = execError.message;
      }

      res.json({
        success: false,
        output: execError.stdout || '',
        error: errorMessage
      });
    }
  } catch (error) {
    console.error('Error executing PHP:', error);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при выполнении PHP кода',
      error: error.message 
    });
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

// Обновить file_system из файлов на диске
async function updateFileSystemFromDisk(projectId, userId, workingDir, folderName) {
  try {
    // Список бинарных расширений которые не нужно читать
    const binaryExtensions = ['.db', '.sqlite', '.sqlite3', '.jpg', '.jpeg', '.png', '.gif', '.ico', '.pdf', '.zip', '.rar'];
    
    // Сканируем папку проекта
    const scanDirectory = async (dirPath, basePath = '') => {
      const items = [];
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
        
        if (entry.isDirectory()) {
          const children = await scanDirectory(fullPath, relativePath);
          items.push({
            type: 'folder',
            name: entry.name,
            path: `/${folderName}/${relativePath}`,
            children
          });
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          const isBinary = binaryExtensions.includes(ext);
          
          // Для бинарных файлов не читаем content
          const fileItem = {
            type: 'file',
            name: entry.name,
            path: `/${folderName}/${relativePath}`
          };
          
          // Только для текстовых файлов читаем содержимое
          if (!isBinary) {
            try {
              fileItem.content = await fs.readFile(fullPath, 'utf8');
            } catch (err) {
              // Если не удалось прочитать как текст, пропускаем content
              console.log(`⚠️ Не удалось прочитать ${entry.name} как текст`);
            }
          }
          
          items.push(fileItem);
        }
      }
      
      return items;
    };
    
    const children = await scanDirectory(workingDir);
    const newFileSystem = [{
      type: 'folder',
      name: folderName,
      path: `/${folderName}`,
      children
    }];
    
    // Обновляем в базе данных
    const filesCount = countFiles(newFileSystem);
    await pool.query(
      `UPDATE projects 
       SET file_system = $1, files_count = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4`,
      [JSON.stringify(newFileSystem), filesCount, projectId, userId]
    );
    
    console.log(`✅ File system обновлен для проекта ${projectId}, файлов: ${filesCount}`);
  } catch (error) {
    console.error('Ошибка обновления file_system:', error);
  }
}

// Отдать HTML результат PHP для открытия в новом окне (GET и POST)
router.all('/:id/php-preview/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    // Для локальной разработки упрощаем - берем user_id из query или используем дефолтный
    // В продакшене это должно быть защищено
    const userId = req.query.userId || 2; // Дефолтный user для теста
    
    // Проверяем существование проекта  
    const checkResult = await pool.query(
      'SELECT * FROM projects WHERE id = $1',
      [req.params.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).send('Проект не найден');
    }

    const project = checkResult.rows[0];
    const projectDir = path.join(PROJECTS_DIR, project.user_id.toString(), req.params.id);
    const projectFolder = project.file_system[0];
    const workingDir = path.join(projectDir, projectFolder.name);
    
    // Определяем расширение файла
    const ext = path.extname(fileName).toLowerCase();
    
    // Если это статический файл (CSS, JS, изображения), отдаем его напрямую
    if (['.css', '.js', '.jpg', '.jpeg', '.png', '.gif', '.ico'].includes(ext)) {
      try {
        const filePath = path.join(workingDir, fileName);
        const fileContent = await fs.readFile(filePath);
        
        // Определяем Content-Type
        const contentTypes = {
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.ico': 'image/x-icon'
        };
        
        res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
        res.send(fileContent);
        return;
      } catch (err) {
        return res.status(404).send('Файл не найден');
      }
    }
    
    // Для PHP файлов выполняем их
    try {
      // Устанавливаем переменные окружения для PHP чтобы симулировать веб-сервер
      const phpEnv = {
        ...process.env,
        REQUEST_METHOD: req.method,
        QUERY_STRING: Object.keys(req.query).map(k => `${k}=${req.query[k]}`).join('&'),
        SERVER_NAME: 'localhost',
        SERVER_PORT: '5000',
        SCRIPT_NAME: `/${fileName}`,
        SCRIPT_FILENAME: path.join(workingDir, fileName),
        CONTENT_TYPE: req.headers['content-type'] || '',
        CONTENT_LENGTH: req.headers['content-length'] || '0',
        REDIRECT_STATUS: '200'  // Требуется для php-cgi
      };
      
      // Для POST запросов передаем данные через stdin
      // Используем php-cgi режим для получения HTTP заголовков
      let phpCommand = `php-cgi -d display_errors=0 -d error_reporting=E_ERROR "${fileName}"`;
      let execOptions = {
        cwd: workingDir,
        timeout: 5000,
        maxBuffer: 1024 * 1024,
        shell: true,
        env: phpEnv
      };
      
      // Для POST запросов передаем данные через stdin
      if (req.method === 'POST' && req.body) {
        // Конвертируем body в formdata формат для PHP
        const postData = Object.keys(req.body).map(k => `${k}=${encodeURIComponent(req.body[k])}`).join('&');
        phpCommand = `echo ${postData} | php-cgi -d display_errors=0 -d error_reporting=E_ERROR "${fileName}"`;
        phpEnv.CONTENT_LENGTH = Buffer.byteLength(postData).toString();
      }
      
      // Выполняем PHP файл
      const { stdout, stderr } = await execPromise(phpCommand, execOptions);

      console.log('🐘 PHP stdout:', stdout.substring(0, 300));
      console.log('🐘 PHP stderr:', stderr.substring(0, 200));

      // php-cgi всегда выводит заголовки в формате CGI
      // Ищем двойной перенос строки, который разделяет заголовки и тело
      const headerEndIndex = stdout.indexOf('\r\n\r\n') !== -1 
        ? stdout.indexOf('\r\n\r\n') 
        : stdout.indexOf('\n\n');
      
      let headers = '';
      let body = stdout;
      
      if (headerEndIndex > 0) {
        headers = stdout.substring(0, headerEndIndex);
        body = stdout.substring(headerEndIndex + (stdout[headerEndIndex] === '\r' ? 4 : 2));
      }
      
      console.log('📋 Headers:', headers.substring(0, 200));
      console.log('📄 Body length:', body.length);
      
      // Ищем Location заголовок
      const locationMatch = headers.match(/^Location:\s*(.+)$/im);
      
      if (locationMatch) {
        // PHP сделал редирект
        let redirectTo = locationMatch[1].trim().replace(/\r/g, '');
        
        console.log('📍 Редирект на:', redirectTo);
        
        // Если это относительный путь, добавляем правильный базовый URL
        if (!redirectTo.startsWith('http')) {
          redirectTo = `/api/projects/${req.params.id}/php-preview/${redirectTo}`;
        }
        
        return res.redirect(redirectTo);
      }

      // Добавляем base tag для правильных путей
      let html = body;
      
      // Если вывод пустой - показываем сообщение
      if (!html || html.trim().length === 0) {
        html = '<!DOCTYPE html><html><body><h2>✓ Операция выполнена успешно</h2><p><a href="javascript:history.back()">← Назад</a></p></body></html>';
      }
      
      const baseUrl = `/api/projects/${req.params.id}/php-preview/`;
      const baseTag = `<base href="${baseUrl}">`;
      
      // Вставляем перед </head> или в начало
      if (html.includes('</head>')) {
        html = html.replace('</head>', baseTag + '</head>');
      } else if (html.includes('<head>')) {
        html = html.replace('<head>', '<head>' + baseTag);
      } else {
        html = baseTag + html;
      }

      // Возвращаем HTML
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (execError) {
      const output = execError.stdout || '';
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(output || `<html><body><h1>Ошибка выполнения PHP</h1><pre>${execError.message}</pre></body></html>`);
    }
  } catch (error) {
    console.error('Error serving PHP:', error);
    res.status(500).send('Ошибка сервера');
  }
});

export default router;
