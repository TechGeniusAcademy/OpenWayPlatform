import express from 'express';
import Points from '../models/Points.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Все маршруты требуют аутентификации
router.use(authenticate);

// Получить мои баллы
router.get('/my', async (req, res) => {
  try {
    const pool = (await import('../config/database.js')).default;
    
    // Получаем баллы напрямую из таблицы users
    const result = await pool.query(
      'SELECT id, username, full_name, email, points FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const user = result.rows[0];
    
    res.json({ 
      totalPoints: user.points || 0,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Ошибка получения своих баллов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Потратить баллы (для игровых улучшений)
router.post('/spend', async (req, res) => {
  try {
    const { amount, reason } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Необходимо указать корректное количество баллов' });
    }
    const pool = (await import('../config/database.js')).default;
    // Проверяем текущий баланс
    const check = await pool.query('SELECT points FROM users WHERE id = $1', [req.user.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
    const current = check.rows[0].points || 0;
    if (current < amount) {
      return res.status(400).json({ error: 'Недостаточно баллов', current, required: amount });
    }
    const result = await pool.query(
      'UPDATE users SET points = points - $1 WHERE id = $2 RETURNING points',
      [amount, req.user.id]
    );
    res.json({ success: true, newBalance: result.rows[0].points, spent: amount });
  } catch (error) {
    console.error('Ошибка списания баллов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Добавить баллы студенту (только админы)
router.post('/add', requireAdmin, async (req, res) => {
  try {
    const { userId, points, reason } = req.body;

    if (!userId || points === undefined) {
      return res.status(400).json({ 
        error: 'Необходимо указать userId и points' 
      });
    }

    if (typeof points !== 'number' || points === 0) {
      return res.status(400).json({ 
        error: 'Количество баллов должно быть числом и не равно 0' 
      });
    }

    const updatedUser = await Points.addPoints(userId, points, reason);

    if (!updatedUser) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      message: `Баллы ${points > 0 ? 'добавлены' : 'списаны'} успешно`,
      user: updatedUser
    });
  } catch (error) {
    console.error('Ошибка добавления баллов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Установить баллы студенту (только админы)
router.put('/set', requireAdmin, async (req, res) => {
  try {
    const { userId, points } = req.body;

    if (!userId || points === undefined) {
      return res.status(400).json({ 
        error: 'Необходимо указать userId и points' 
      });
    }

    if (typeof points !== 'number' || points < 0) {
      return res.status(400).json({ 
        error: 'Количество баллов должно быть неотрицательным числом' 
      });
    }

    const updatedUser = await Points.setPoints(userId, points);

    if (!updatedUser) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      message: 'Баллы установлены успешно',
      user: updatedUser
    });
  } catch (error) {
    console.error('Ошибка установки баллов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить топ студентов по баллам (доступно всем авторизованным)
router.get('/top-students', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const topStudents = await Points.getTopStudents(limit);
    
    res.json({ students: topStudents });
  } catch (error) {
    console.error('Ошибка получения топа студентов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Передать баллы другому студенту
router.post('/transfer', async (req, res) => {
  console.log('🔔 Запрос на передачу баллов получен!');
  console.log('Body:', req.body);
  console.log('User:', req.user);
  
  try {
    const { recipient_id, amount, message } = req.body;
    const senderId = req.user.id;

    console.log('📤 Передача баллов:', { senderId, recipient_id, amount, message });

    // Валидация
    if (!recipient_id || !amount) {
      return res.status(400).json({ 
        error: 'Необходимо указать получателя и количество баллов' 
      });
    }

    if (senderId === recipient_id) {
      return res.status(400).json({ 
        error: 'Нельзя передать баллы самому себе' 
      });
    }

    const transferAmount = parseInt(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ 
        error: 'Количество баллов должно быть положительным числом' 
      });
    }

    const pool = (await import('../config/database.js')).default;

    // Проверяем баланс отправителя
    const senderResult = await pool.query(
      'SELECT id, username, full_name, points FROM users WHERE id = $1',
      [senderId]
    );

    if (senderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const sender = senderResult.rows[0];
    console.log('👤 Отправитель:', sender);

    if (sender.points < transferAmount) {
      return res.status(400).json({ 
        error: `Недостаточно баллов. У вас ${sender.points} баллов` 
      });
    }

    // Проверяем существование получателя
    const recipientResult = await pool.query(
      'SELECT id, username, full_name, points FROM users WHERE id = $1',
      [recipient_id]
    );

    if (recipientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Получатель не найден' });
    }

    const recipient = recipientResult.rows[0];
    console.log('👤 Получатель:', recipient);

    // Обновляем баллы напрямую без транзакции
    try {
      // Списываем баллы у отправителя
      const updateSenderResult = await pool.query(
        'UPDATE users SET points = points - $1 WHERE id = $2 RETURNING points',
        [transferAmount, senderId]
      );
      console.log('✅ Списано у отправителя. Новый баланс:', updateSenderResult.rows[0]?.points);

      // Добавляем баллы получателю
      const updateRecipientResult = await pool.query(
        'UPDATE users SET points = points + $1 WHERE id = $2 RETURNING points',
        [transferAmount, recipient_id]
      );
      console.log('✅ Добавлено получателю. Новый баланс:', updateRecipientResult.rows[0]?.points);

      // Проверяем, что обновления прошли успешно
      if (!updateSenderResult.rows[0] || !updateRecipientResult.rows[0]) {
        throw new Error('Ошибка обновления баланса');
      }

      const newSenderBalance = updateSenderResult.rows[0].points;
      const newRecipientBalance = updateRecipientResult.rows[0].points;

      // Записываем историю транзакции (если таблица существует)
      try {
        // Для отправителя
        await pool.query(
          `INSERT INTO points_history (user_id, points_change, reason, admin_id, created_at) 
           VALUES ($1, $2, $3, NULL, NOW())`,
          [
            senderId, 
            -transferAmount, 
            `Передача баллов пользователю ${recipient.full_name || recipient.username}${message ? ': ' + message : ''}`
          ]
        );

        // Для получателя
        await pool.query(
          `INSERT INTO points_history (user_id, points_change, reason, admin_id, created_at) 
           VALUES ($1, $2, $3, NULL, NOW())`,
          [
            recipient_id, 
            transferAmount, 
            `Получение баллов от ${sender.full_name || sender.username}${message ? ': ' + message : ''}`
          ]
        );
      } catch (historyError) {
        // Игнорируем ошибку истории, если таблица не существует
        console.log('История не записана (таблица может не существовать):', historyError.message);
      }
      
      console.log('✅ Передача успешно выполнена!');

      res.json({
        message: 'Баллы успешно переданы',
        transfer: {
          from: {
            id: sender.id,
            username: sender.username,
            full_name: sender.full_name,
            new_balance: newSenderBalance
          },
          to: {
            id: recipient.id,
            username: recipient.username,
            full_name: recipient.full_name,
            new_balance: newRecipientBalance
          },
          amount: transferAmount,
          message: message || null
        }
      });
    } catch (updateError) {
      console.error('❌ Ошибка обновления баллов:', updateError);
      throw updateError;
    }
  } catch (error) {
    console.error('Ошибка передачи баллов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить историю транзакций пользователя
router.get('/history/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId ? parseInt(req.params.userId) : req.user.id;
    
    // Студенты могут видеть только свою историю, админы - любую
    if (req.user.role === 'student' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const pool = (await import('../config/database.js')).default;

    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const filter = req.query.filter || 'all';  // all | positive | negative | admin | transfer | shop | boost
    const search = (req.query.search || '').trim();

    // Build dynamic WHERE conditions
    const conditions = ['ph.user_id = $1'];
    const params     = [userId];

    if (filter === 'positive')  conditions.push('ph.points_change > 0');
    if (filter === 'negative')  conditions.push('ph.points_change < 0');
    if (filter === 'admin')     conditions.push('ph.admin_id IS NOT NULL');
    if (filter === 'transfer')  conditions.push("ph.reason ILIKE '%передача%' OR ph.reason ILIKE '%получение баллов%'");
    if (filter === 'shop')      conditions.push("ph.reason ILIKE '%покупка%'");
    if (filter === 'boost')     conditions.push("ph.reason ILIKE '%буст%'");

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`ph.reason ILIKE $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    // Stats query (always over full user history, ignoring filter/search)
    const statsResult = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN points_change > 0 THEN points_change ELSE 0 END), 0)::int  AS total_earned,
        COALESCE(SUM(CASE WHEN points_change < 0 THEN ABS(points_change) ELSE 0 END), 0)::int AS total_spent,
        COUNT(*)::int AS total_transactions,
        COALESCE(SUM(points_change), 0)::int AS net_change
       FROM points_history WHERE user_id = $1`,
      [userId]
    );

    // Total count for pagination (respects filter)
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM points_history ph WHERE ${whereClause}`,
      params
    );

    // Paginated history
    const historyResult = await pool.query(
      `SELECT 
        ph.id,
        ph.points_change,
        ph.reason,
        ph.admin_id,
        ph.created_at,
        a.username AS admin_username,
        a.full_name AS admin_name
      FROM points_history ph
      LEFT JOIN users a ON ph.admin_id = a.id
      WHERE ${whereClause}
      ORDER BY ph.created_at DESC
      LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    const total      = countResult.rows[0]?.cnt || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    res.json({ 
      history:     historyResult.rows,
      stats:       statsResult.rows[0],
      pagination:  { page, limit, total, totalPages }
    });
  } catch (error) {
    console.error('Ошибка получения истории транзакций:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить топ групп по баллам (доступно всем авторизованным)
router.get('/top-groups', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const topGroups = await Points.getTopGroups(limit);
    
    res.json({ groups: topGroups });
  } catch (error) {
    console.error('Ошибка получения топа групп:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить баллы студента
router.get('/student/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Студенты могут видеть только свои баллы, админы - любые
    if (req.user.role === 'student' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const student = await Points.getStudentPoints(userId);
    
    if (!student) {
      return res.status(404).json({ error: 'Студент не найден' });
    }

    res.json({ student });
  } catch (error) {
    console.error('Ошибка получения баллов студента:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить активность пользователя
router.get('/activity', async (req, res) => {
  try {
    const pool = (await import('../config/database.js')).default;
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const all = req.query.all === 'true';

    // Собираем все типы активности из разных таблиц
    const activities = [];

    // 1. Прохождение тестов (test_attempts)
    const testsQuery = await pool.query(`
      SELECT 
        ta.id,
        'test' as type,
        t.title as test_name,
        ta.score as points,
        ta.points_earned as experience,
        ta.completed_at as created_at
      FROM test_attempts ta
      JOIN tests t ON ta.test_id = t.id
      WHERE ta.user_id = $1 AND ta.completed_at IS NOT NULL
      ORDER BY ta.completed_at DESC
    `, [userId]);
    
    testsQuery.rows.forEach(row => {
      activities.push({
        type: 'test',
        message: `Прошел тест "${row.test_name}" и получил ${row.points || 0} баллов, ${row.experience || 0} опыта!`,
        points: row.points || 0,
        experience: row.experience || 0,
        created_at: row.created_at
      });
    });

    // 2. Домашние задания (homework_submissions)
    const homeworkQuery = await pool.query(`
      SELECT 
        hs.id,
        hs.status,
        hs.submitted_at as created_at,
        h.title as homework_title
      FROM homework_submissions hs
      LEFT JOIN homeworks h ON hs.homework_id = h.id
      WHERE hs.user_id = $1
      ORDER BY hs.submitted_at DESC
    `, [userId]);
    
    homeworkQuery.rows.forEach(row => {
      if (row.status === 'submitted' || row.status === 'graded') {
        activities.push({
          type: 'homework_done',
          message: `Выполнил домашнее задание!`,
          points: 0,
          experience: 0,
          created_at: row.created_at
        });
      } else if (row.status === 'late') {
        activities.push({
          type: 'homework_late',
          message: `Просрочил домашнее задание`,
          points: 0,
          experience: 0,
          created_at: row.created_at
        });
      }
    });

    // 3. FlexChan прогресс
    const flexchanQuery = await pool.query(`
      SELECT 
        fp.id,
        fp.completed,
        fp.completed_at as created_at,
        fl.level_order,
        fl.points,
        fl.experience_reward
      FROM flexchan_progress fp
      JOIN flexchan_levels fl ON fp.level_id = fl.id
      WHERE fp.user_id = $1 AND fp.completed = true
      ORDER BY fp.completed_at DESC
    `, [userId]);
    
    flexchanQuery.rows.forEach(row => {
      activities.push({
        type: 'flexchan',
        message: `Прошел уровень Flex Chan номер ${row.level_order} и получил ${row.points || 0} баллов, ${row.experience_reward || 0} опыта!`,
        points: row.points || 0,
        experience: row.experience_reward || 0,
        created_at: row.created_at
      });
    });

    // 4. JS Game прогресс
    const jsGameQuery = await pool.query(`
      SELECT 
        jp.id,
        jp.solved_at as created_at,
        jl.title,
        jl.points_reward,
        jl.experience_reward
      FROM js_game_progress jp
      JOIN js_game_levels jl ON jp.level_id = jl.id
      WHERE jp.user_id = $1 AND jp.status = 'passed'
      ORDER BY jp.solved_at DESC
    `, [userId]);
    
    jsGameQuery.rows.forEach(row => {
      activities.push({
        type: 'jsgame',
        message: `Прошел уровень JavaScript "${row.title}" и получил ${row.points_reward || 0} баллов, ${row.experience_reward || 0} опыта!`,
        points: row.points_reward || 0,
        experience: row.experience_reward || 0,
        created_at: row.created_at
      });
    });

    // 5. Изменения в топе (из points_history с определёнными reason)
    const rankQuery = await pool.query(`
      SELECT 
        ph.id,
        ph.points_change,
        ph.reason,
        ph.created_at
      FROM points_history ph
      WHERE ph.user_id = $1 
        AND (ph.reason LIKE '%место в топе%' OR ph.reason LIKE '%топ%место%')
      ORDER BY ph.created_at DESC
    `, [userId]);
    
    rankQuery.rows.forEach(row => {
      const rankMatch = row.reason.match(/(\d+)\s*место/);
      if (rankMatch) {
        const rank = rankMatch[1];
        if (row.reason.toLowerCase().includes('занял') || row.points_change > 0) {
          activities.push({
            type: 'rank_up',
            message: `Занял ${rank} место в топе!`,
            points: row.points_change || 0,
            experience: 0,
            created_at: row.created_at
          });
        } else {
          activities.push({
            type: 'rank_down',
            message: `Опустился до ${rank} места в топе`,
            points: row.points_change || 0,
            experience: 0,
            created_at: row.created_at
          });
        }
      }
    });

    // Сортируем по дате (сначала новые)
    activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Общее количество
    const total = activities.length;

    // Применяем пагинацию если не запрошена вся история
    const paginatedActivities = all ? activities : activities.slice(offset, offset + limit);

    res.json({
      activities: paginatedActivities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Ошибка получения активности:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
