import express from 'express';
import QuizBattle from '../models/QuizBattle.js';
import { authenticate } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

// Хранилище таймеров битв
const battleTimers = new Map();

// Генерация кода комнаты
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Создать новую битву
router.post('/create', authenticate, async (req, res) => {
  try {
    const { categoryId } = req.body;
    
    // Проверить, играл ли пользователь сегодня
    const userCheck = await pool.query(
      `SELECT last_quiz_battle_date 
       FROM users 
       WHERE id = $1`,
      [req.user.id]
    );
    
    if (userCheck.rows.length > 0 && userCheck.rows[0].last_quiz_battle_date) {
      const lastBattleDate = new Date(userCheck.rows[0].last_quiz_battle_date);
      const now = new Date();
      const hoursSinceLastBattle = (now - lastBattleDate) / (1000 * 60 * 60);
      
      if (hoursSinceLastBattle < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceLastBattle);
        return res.status(429).json({ 
          error: 'Daily limit reached',
          message: `Вы уже играли сегодня. Следующая игра доступна через ${hoursRemaining} часов.`,
          hoursRemaining 
        });
      }
    }
    
    const roomCode = generateRoomCode();
    
    const battle = await QuizBattle.create({
      creatorId: req.user.id,
      categoryId: categoryId || null,
      roomCode
    });

    // Добавить создателя как игрока
    await QuizBattle.addPlayer(battle.id, req.user.id, req.user.username);

    const fullBattle = await QuizBattle.getById(battle.id);

    // Отправить событие через Socket.IO
    const io = req.app.get('io');
    io.emit('quiz:battle-created', fullBattle);

    res.json(fullBattle);
  } catch (error) {
    console.error('Error creating quiz battle:', error);
    res.status(500).json({ error: 'Failed to create battle' });
  }
});

// Присоединиться к битве по коду
router.post('/join', authenticate, async (req, res) => {
  try {
    const { roomCode } = req.body;
    
    const battle = await QuizBattle.getByRoomCode(roomCode);
    
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }

    if (battle.status !== 'waiting') {
      return res.status(400).json({ error: 'Battle already started' });
    }

    // Проверка на максимум игроков (8)
    const players = battle.players || [];
    
    if (players.length >= 8) {
      return res.status(400).json({ error: 'Battle is full' });
    }

    await QuizBattle.addPlayer(battle.id, req.user.id, req.user.username);
    const fullBattle = await QuizBattle.getById(battle.id);

    // Отправить событие через Socket.IO всем в комнате
    const io = req.app.get('io');
    if (io) {
      io.to(`quiz-${battle.id}`).emit('quiz:player-joined', {
        battleId: battle.id,
        player: {
          user_id: req.user.id,
          username: req.user.username,
          score: 0
        },
        players: fullBattle.players
      });
      
      // Также отправляем событие напрямую всем подключенным сокетам
      io.emit('quiz:player-joined-global', {
        battleId: battle.id,
        players: fullBattle.players
      });
    }

    res.json(fullBattle);
  } catch (error) {
    console.error('Error joining battle:', error);
    res.status(500).json({ error: 'Failed to join battle', details: error.message });
  }
});

// Получить активные битвы
router.get('/active', authenticate, async (req, res) => {
  try {
    const battles = await QuizBattle.getActive();
    res.json(battles);
  } catch (error) {
    console.error('Error getting battles:', error);
    res.status(500).json({ error: 'Failed to get battles' });
  }
});

// Проверить доступность игры (дневной лимит)
router.get('/can-play', authenticate, async (req, res) => {
  try {
    const userCheck = await pool.query(
      `SELECT last_quiz_battle_date 
       FROM users 
       WHERE id = $1`,
      [req.user.id]
    );
    
    if (userCheck.rows.length > 0 && userCheck.rows[0].last_quiz_battle_date) {
      const lastBattleDate = new Date(userCheck.rows[0].last_quiz_battle_date);
      const now = new Date();
      const hoursSinceLastBattle = (now - lastBattleDate) / (1000 * 60 * 60);
      
      if (hoursSinceLastBattle < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceLastBattle);
        return res.json({ 
          canPlay: false,
          hoursRemaining,
          nextAvailableTime: new Date(lastBattleDate.getTime() + 24 * 60 * 60 * 1000)
        });
      }
    }
    
    res.json({ canPlay: true });
  } catch (error) {
    console.error('Error checking play availability:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

// ============ ADMIN ROUTES (должны быть ВЫШЕ /:id) ============

// Получить все битвы (для админа)
router.get('/all-battles', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        qb.*,
        u.username as creator_name,
        COUNT(DISTINCT qbp.user_id) as player_count
      FROM quiz_battles qb
      LEFT JOIN users u ON qb.creator_id = u.id
      LEFT JOIN quiz_battle_players qbp ON qb.id = qbp.battle_id
      GROUP BY qb.id, u.username
      ORDER BY qb.created_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting all battles:', error);
    res.status(500).json({ error: 'Failed to get battles' });
  }
});

// Получить все категории
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        COUNT(q.id) as question_count
      FROM game_categories c
      LEFT JOIN game_questions q ON c.id = q.category_id
      GROUP BY c.id
      ORDER BY c.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Создать категорию
router.post('/categories', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const result = await pool.query(
      'INSERT INTO game_categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || null]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Обновить категорию
router.put('/categories/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const result = await pool.query(
      'UPDATE game_categories SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description || null, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Удалить категорию
router.delete('/categories/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM game_categories WHERE id = $1', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Получить все вопросы
router.get('/questions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        q.*,
        c.name as category_name
      FROM game_questions q
      LEFT JOIN game_categories c ON q.category_id = c.id
      ORDER BY q.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting questions:', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

// Создать вопрос
router.post('/questions', authenticate, async (req, res) => {
  try {
    const { category_id, question, option_a, option_b, option_c, option_d, correct_option, difficulty } = req.body;
    
    const result = await pool.query(
      `INSERT INTO game_questions 
       (category_id, question, option_a, option_b, option_c, option_d, correct_option, difficulty) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [category_id || null, question, option_a, option_b, option_c, option_d, correct_option, difficulty || 'medium']
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// Обновить вопрос
router.put('/questions/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, question, option_a, option_b, option_c, option_d, correct_option, difficulty } = req.body;
    
    const result = await pool.query(
      `UPDATE game_questions 
       SET category_id = $1, question = $2, option_a = $3, option_b = $4, 
           option_c = $5, option_d = $6, correct_option = $7, difficulty = $8
       WHERE id = $9 
       RETURNING *`,
      [category_id || null, question, option_a, option_b, option_c, option_d, correct_option, difficulty || 'medium', id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// Удалить вопрос
router.delete('/questions/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM game_questions WHERE id = $1', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// ============ SPECIFIC BATTLE ROUTES (должны быть ПОСЛЕ админских) ============

// Получить битву по ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const battle = await QuizBattle.getById(req.params.id);
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }
    res.json(battle);
  } catch (error) {
    console.error('Error getting battle:', error);
    res.status(500).json({ error: 'Failed to get battle' });
  }
});

// Начать битву
router.post('/:id/start', authenticate, async (req, res) => {
  try {
    const battle = await QuizBattle.getById(req.params.id);
    
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }

    if (battle.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Only creator can start the battle' });
    }

    const players = battle.players || [];
    
    if (!Array.isArray(players) || players.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 players', playerCount: players.length });
    }

    await QuizBattle.updateStatus(battle.id, 'in_progress');
    
    // Обновить дату последней игры для всех игроков
    const playerIds = players.map(p => p.user_id);
    await pool.query(
      `UPDATE users 
       SET last_quiz_battle_date = NOW() 
       WHERE id = ANY($1::int[])`,
      [playerIds]
    );

    // Получить ВСЕ вопросы из выбранной категории (или все вопросы, если категория не указана)
    let questionsResult;
    if (battle.category_id) {
      questionsResult = await pool.query(
        `SELECT id, question, option_a, option_b, option_c, option_d, correct_option
         FROM game_questions
         WHERE category_id = $1
         ORDER BY RANDOM()`,
        [battle.category_id]
      );
    } else {
      questionsResult = await pool.query(
        `SELECT id, question, option_a, option_b, option_c, option_d, correct_option
         FROM game_questions
         ORDER BY RANDOM()`
      );
    }

    if (questionsResult.rows.length === 0) {
      return res.status(400).json({ error: 'No questions available for this category' });
    }

    // Сохранить общее количество вопросов в битве
    await pool.query(
      'UPDATE quiz_battles SET total_questions = $1 WHERE id = $2',
      [questionsResult.rows.length, battle.id]
    );
    
    console.log(`[DEBUG] Battle ${battle.id} started with ${questionsResult.rows.length} questions`);

    // Запустить таймер на 10 минут (600 секунд)
    const battleTimer = setTimeout(async () => {
      try {
        const currentBattle = await QuizBattle.getById(battle.id);
        
        // Завершить битву только если она еще в процессе
        if (currentBattle && currentBattle.status === 'in_progress') {
          await QuizBattle.finishBattle(battle.id);
          const finalBattle = await QuizBattle.getById(battle.id);
          
          const io = req.app.get('io');
          if (io) {
            io.to(`quiz-${battle.id}`).emit('quiz:battle-finished', {
              battleId: battle.id,
              players: finalBattle.players,
              reason: 'timeout'
            });
          }
        }
        
        // Удалить таймер из хранилища
        battleTimers.delete(battle.id);
      } catch (error) {
        console.error('Error in battle timeout:', error);
      }
    }, 600000); // 10 минут = 600000 миллисекунд

    // Сохранить таймер
    battleTimers.set(battle.id, battleTimer);

    const io = req.app.get('io');
    if (io) {
      const roomName = `quiz-${battle.id}`;
      
      // Отправляем событие всем подключенным сокетам (broadcast)
      io.emit('quiz:battle-started', {
        battleId: battle.id,
        questions: questionsResult.rows,
        timeLimit: 600 // 10 минут в секундах
      });
    } else {
      console.warn('Socket.IO not available');
    }

    res.json({ success: true, questions: questionsResult.rows, timeLimit: 600 });
  } catch (error) {
    console.error('Error starting battle:', error);
    res.status(500).json({ error: 'Failed to start battle', details: error.message });
  }
});

// Отправить ответ
router.post('/:id/answer', authenticate, async (req, res) => {
  try {
    const { questionId, answer, timeSpent } = req.body;
    let battle = await QuizBattle.getById(req.params.id);

    if (!battle || battle.status !== 'in_progress') {
      return res.status(400).json({ error: 'Battle not active' });
    }

    // Получить правильный ответ
    const questionResult = await pool.query(
      'SELECT correct_option FROM game_questions WHERE id = $1',
      [questionId]
    );

    if (questionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const isCorrect = answer === questionResult.rows[0].correct_option;
    
    // Сохранить ответ
    await QuizBattle.saveAnswer(
      battle.id,
      req.user.id,
      questionId,
      answer,
      isCorrect,
      timeSpent
    );

    // Начислить очки если правильно
    // Распределяем 100 баллов на все вопросы в битве
    let pointsEarned = 0;
    if (isCorrect) {
      const totalQuestions = battle.total_questions || 1;
      const basePointsPerQuestion = 100 / totalQuestions; // Базовые баллы за вопрос
      const timeBonus = Math.max(0, (30 - timeSpent) / 30); // Бонус за скорость (0-1)
      pointsEarned = Math.round(basePointsPerQuestion * (0.7 + 0.3 * timeBonus)); // 70% базовых + 30% бонус за скорость
      await QuizBattle.updatePlayerScore(battle.id, req.user.id, pointsEarned);
    }

    // Получить обновленную битву ПОСЛЕ сохранения ответа
    const updatedBattle = await QuizBattle.getById(battle.id);
    
    // Перезагрузим объект battle чтобы получить актуальное значение total_questions
    battle = updatedBattle;

    // Отправить обновление всем
    const io = req.app.get('io');
    io.to(`quiz-${battle.id}`).emit('quiz:answer-submitted', {
      battleId: battle.id,
      userId: req.user.id,
      username: req.user.username,
      isCorrect,
      pointsEarned,
      players: updatedBattle.players
    });

    // Проверить, все ли игроки ответили на все вопросы
    // Используем сохраненное количество вопросов из таблицы quiz_battles
    const totalQuestions = battle.total_questions || 0;
    
    console.log(`[DEBUG] Battle ${battle.id}: totalQuestions=${totalQuestions}, players count=${updatedBattle.players?.length || 0}`);

    if (totalQuestions > 0) {
      const players = updatedBattle.players || [];
      let allPlayersFinished = true;

      for (const player of players) {
        const playerAnswersResult = await pool.query(
          'SELECT COUNT(*) as count FROM quiz_battle_answers WHERE battle_id = $1 AND user_id = $2',
          [battle.id, player.user_id]
        );
        const playerAnswersCount = parseInt(playerAnswersResult.rows[0].count);
        
        console.log(`[DEBUG] Player ${player.username} (${player.user_id}): answered ${playerAnswersCount}/${totalQuestions} questions`);
        
        if (playerAnswersCount < totalQuestions) {
          allPlayersFinished = false;
          break;
        }
      }
      
      console.log(`[DEBUG] Battle ${battle.id}: allPlayersFinished=${allPlayersFinished}`);

      // Если все игроки ответили на все вопросы - автоматически завершить битву
      if (allPlayersFinished) {
        console.log(`[DEBUG] Battle ${battle.id}: Завершаем битву - все игроки ответили на все вопросы`);
        
        // Очистить таймер если он существует
        if (battleTimers.has(battle.id)) {
          clearTimeout(battleTimers.get(battle.id));
          battleTimers.delete(battle.id);
        }
        
        await QuizBattle.finishBattle(battle.id);
        const finalBattle = await QuizBattle.getById(battle.id);
        
        io.to(`quiz-${battle.id}`).emit('quiz:battle-finished', {
          battleId: battle.id,
          players: finalBattle.players,
          reason: 'completed'
        });
      }
    }

    res.json({ isCorrect, pointsEarned, players: updatedBattle.players });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// Завершить битву
router.post('/:id/finish', authenticate, async (req, res) => {
  try {
    const battle = await QuizBattle.getById(req.params.id);
    
    if (!battle) {
      return res.status(404).json({ error: 'Battle not found' });
    }

    if (battle.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Only creator can finish the battle' });
    }

    const players = await QuizBattle.finishBattle(battle.id);

    const io = req.app.get('io');
    io.to(`quiz-${battle.id}`).emit('quiz:battle-finished', {
      battleId: battle.id,
      players
    });

    res.json({ success: true, players });
  } catch (error) {
    console.error('Error finishing battle:', error);
    res.status(500).json({ error: 'Failed to finish battle' });
  }
});

export default router;
