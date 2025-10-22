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
    
    // Получаем историю транзакций
    const historyResult = await pool.query(
      `SELECT 
        ph.id,
        ph.points_change,
        ph.reason,
        ph.admin_id,
        ph.created_at,
        a.username as admin_username,
        a.full_name as admin_name
      FROM points_history ph
      LEFT JOIN users a ON ph.admin_id = a.id
      WHERE ph.user_id = $1
      ORDER BY ph.created_at DESC
      LIMIT 100`,
      [userId]
    );

    res.json({ 
      history: historyResult.rows 
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

export default router;
