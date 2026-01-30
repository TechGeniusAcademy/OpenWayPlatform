import express from 'express';
import pool from '../config/database.js';
import { authenticate as auth } from '../middleware/auth.js';
import vm from 'vm';

const router = express.Router();

// ================== ПУБЛИЧНЫЕ РОУТЫ ==================

// Получить все активные уровни с прогрессом пользователя
router.get('/levels', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        l.*,
        COALESCE(p.status, 'pending') as user_status,
        COALESCE(p.attempts, 0) as user_attempts,
        COALESCE(p.tests_passed, 0) as user_tests_passed,
        p.solved_at,
        p.points_awarded
      FROM js_game_levels l
      LEFT JOIN js_game_progress p ON l.id = p.level_id AND p.user_id = $1
      WHERE l.is_active = true
      ORDER BY l.order_index ASC, l.id ASC
    `, [req.user.id]);

    // Убираем solution_code из ответа для учеников
    const levels = result.rows.map(level => {
      const { solution_code, ...rest } = level;
      return rest;
    });

    res.json(levels);
  } catch (error) {
    console.error('Ошибка получения уровней JS:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить конкретный уровень
router.get('/levels/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const levelResult = await pool.query(`
      SELECT 
        l.id, l.title, l.description, l.difficulty, l.points_reward,
        l.task_description, l.initial_code, l.hints, l.time_limit,
        jsonb_array_length(l.tests) as tests_count,
        COALESCE(p.status, 'pending') as user_status,
        COALESCE(p.attempts, 0) as user_attempts,
        COALESCE(p.tests_passed, 0) as user_tests_passed,
        p.submitted_code,
        p.solved_at
      FROM js_game_levels l
      LEFT JOIN js_game_progress p ON l.id = p.level_id AND p.user_id = $1
      WHERE l.id = $2 AND l.is_active = true
    `, [req.user.id, id]);

    if (levelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Уровень не найден' });
    }

    res.json(levelResult.rows[0]);
  } catch (error) {
    console.error('Ошибка получения уровня:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Выполнить код и проверить тесты
router.post('/levels/:id/run', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { code } = req.body;

    if (!code || code.trim() === '') {
      return res.status(400).json({ error: 'Код не может быть пустым' });
    }

    // Получаем уровень с тестами
    const levelResult = await pool.query(
      'SELECT * FROM js_game_levels WHERE id = $1 AND is_active = true',
      [id]
    );

    if (levelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Уровень не найден' });
    }

    const level = levelResult.rows[0];
    const tests = level.tests || [];
    const timeLimit = level.time_limit || 5000;

    // Выполняем тесты
    const results = [];
    let passedCount = 0;

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      const testResult = await runTest(code, test, timeLimit);
      results.push({
        testIndex: i + 1,
        input: test.input,
        expected: test.expected,
        actual: testResult.result,
        passed: testResult.passed,
        error: testResult.error,
        executionTime: testResult.executionTime
      });

      if (testResult.passed) passedCount++;
    }

    const allPassed = passedCount === tests.length;

    // Обновляем прогресс
    await pool.query(`
      INSERT INTO js_game_progress (user_id, level_id, submitted_code, status, attempts, tests_passed, tests_total, solved_at, updated_at)
      VALUES ($1, $2, $3, $4, 1, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, level_id) DO UPDATE SET
        submitted_code = $3,
        status = CASE WHEN js_game_progress.status = 'passed' THEN 'passed' ELSE $4 END,
        attempts = js_game_progress.attempts + 1,
        tests_passed = GREATEST(js_game_progress.tests_passed, $5),
        tests_total = $6,
        solved_at = CASE WHEN js_game_progress.status != 'passed' AND $4 = 'passed' THEN CURRENT_TIMESTAMP ELSE js_game_progress.solved_at END,
        updated_at = CURRENT_TIMESTAMP
    `, [
      req.user.id,
      id,
      code,
      allPassed ? 'passed' : 'failed',
      passedCount,
      tests.length,
      allPassed ? new Date() : null
    ]);

    // Начисляем очки если решено впервые
    let pointsAwarded = 0;
    if (allPassed) {
      const progressCheck = await pool.query(
        'SELECT points_awarded FROM js_game_progress WHERE user_id = $1 AND level_id = $2',
        [req.user.id, id]
      );
      
      if (progressCheck.rows[0]?.points_awarded === 0) {
        pointsAwarded = level.points_reward;
        
        await pool.query(
          'UPDATE js_game_progress SET points_awarded = $1 WHERE user_id = $2 AND level_id = $3',
          [pointsAwarded, req.user.id, id]
        );
        
        await pool.query(
          'UPDATE users SET points = points + $1 WHERE id = $2',
          [pointsAwarded, req.user.id]
        );
      }
    }

    res.json({
      success: allPassed,
      passedCount,
      totalCount: tests.length,
      results,
      pointsAwarded,
      message: allPassed 
        ? `🎉 Все тесты пройдены!${pointsAwarded > 0 ? ` +${pointsAwarded} очков` : ''}` 
        : `Пройдено ${passedCount} из ${tests.length} тестов`
    });

  } catch (error) {
    console.error('Ошибка выполнения кода:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить статистику
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(DISTINCT l.id) as total_levels,
        COUNT(DISTINCT CASE WHEN p.status = 'passed' THEN l.id END) as completed_levels,
        COALESCE(SUM(p.points_awarded), 0) as total_points,
        COALESCE(SUM(p.attempts), 0) as total_attempts
      FROM js_game_levels l
      LEFT JOIN js_game_progress p ON l.id = p.level_id AND p.user_id = $1
      WHERE l.is_active = true
    `, [req.user.id]);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ================== АДМИН РОУТЫ ==================

// Получить все уровни (для админа)
router.get('/admin/levels', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const result = await pool.query(`
      SELECT l.*,
        (SELECT COUNT(*) FROM js_game_progress WHERE level_id = l.id AND status = 'passed') as completions
      FROM js_game_levels l
      ORDER BY l.order_index ASC, l.id ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения уровней:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать уровень
router.post('/admin/levels', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const {
      title,
      description,
      difficulty,
      points_reward,
      task_description,
      initial_code,
      solution_code,
      tests,
      hints,
      time_limit,
      order_index
    } = req.body;

    if (!title || !task_description) {
      return res.status(400).json({ error: 'Название и описание задачи обязательны' });
    }

    const result = await pool.query(`
      INSERT INTO js_game_levels 
        (title, description, difficulty, points_reward, task_description, 
         initial_code, solution_code, tests, hints, time_limit, order_index)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      title,
      description || '',
      difficulty || 1,
      points_reward || 10,
      task_description,
      initial_code || '',
      solution_code || '',
      JSON.stringify(tests || []),
      JSON.stringify(hints || []),
      time_limit || 5000,
      order_index || 0
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания уровня:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить уровень
router.put('/admin/levels/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const { id } = req.params;
    const {
      title,
      description,
      difficulty,
      points_reward,
      task_description,
      initial_code,
      solution_code,
      tests,
      hints,
      time_limit,
      order_index,
      is_active
    } = req.body;

    const result = await pool.query(`
      UPDATE js_game_levels SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        difficulty = COALESCE($3, difficulty),
        points_reward = COALESCE($4, points_reward),
        task_description = COALESCE($5, task_description),
        initial_code = COALESCE($6, initial_code),
        solution_code = COALESCE($7, solution_code),
        tests = COALESCE($8, tests),
        hints = COALESCE($9, hints),
        time_limit = COALESCE($10, time_limit),
        order_index = COALESCE($11, order_index),
        is_active = COALESCE($12, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *
    `, [
      title,
      description,
      difficulty,
      points_reward,
      task_description,
      initial_code,
      solution_code,
      tests ? JSON.stringify(tests) : null,
      hints ? JSON.stringify(hints) : null,
      time_limit,
      order_index,
      is_active,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Уровень не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка обновления уровня:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить уровень
router.delete('/admin/levels/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const { id } = req.params;

    await pool.query('DELETE FROM js_game_progress WHERE level_id = $1', [id]);
    const result = await pool.query('DELETE FROM js_game_levels WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Уровень не найден' });
    }

    res.json({ message: 'Уровень удалён' });
  } catch (error) {
    console.error('Ошибка удаления уровня:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Тестировать код (для админа)
router.post('/admin/test-code', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const { code, tests, timeLimit = 5000 } = req.body;

    const results = [];
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      const testResult = await runTest(code, test, timeLimit);
      results.push({
        testIndex: i + 1,
        input: test.input,
        expected: test.expected,
        actual: testResult.result,
        passed: testResult.passed,
        error: testResult.error,
        executionTime: testResult.executionTime
      });
    }

    res.json({ results });
  } catch (error) {
    console.error('Ошибка тестирования:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==================

async function runTest(code, test, timeLimit) {
  const startTime = Date.now();
  
  try {
    // Создаём sandbox для выполнения кода
    const sandbox = {
      console: {
        log: () => {},
        error: () => {},
        warn: () => {}
      },
      result: undefined,
      __input__: test.input
    };

    // Оборачиваем код пользователя
    const wrappedCode = `
      ${code}
      
      // Вызываем функцию с тестовыми данными
      if (typeof solution === 'function') {
        result = solution(...__input__);
      } else if (typeof solve === 'function') {
        result = solve(...__input__);
      } else if (typeof main === 'function') {
        result = main(...__input__);
      } else {
        // Ищем любую объявленную функцию
        const funcMatch = \`${code.replace(/`/g, '\\`')}\`.match(/function\\s+(\\w+)/);
        if (funcMatch) {
          result = eval(funcMatch[1] + '(...__input__)');
        }
      }
    `;

    // Создаём контекст и выполняем
    const context = vm.createContext(sandbox);
    const script = new vm.Script(wrappedCode);
    
    script.runInContext(context, {
      timeout: timeLimit
    });

    const executionTime = Date.now() - startTime;
    const actual = sandbox.result;
    
    // Сравниваем результаты
    const passed = deepEqual(actual, test.expected);

    return {
      result: actual,
      passed,
      error: null,
      executionTime
    };

  } catch (error) {
    return {
      result: null,
      passed: false,
      error: error.message,
      executionTime: Date.now() - startTime
    };
  }
}

function deepEqual(a, b) {
  if (a === b) return true;
  
  if (typeof a !== typeof b) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }
  
  if (typeof a === 'object' && a !== null && b !== null) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => deepEqual(a[key], b[key]));
  }
  
  return false;
}

export default router;
