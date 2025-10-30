import express from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Получить активные игры пользователя
router.get('/my-games', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        cg.*,
        u1.username as white_username,
        u1.full_name as white_full_name,
        u1.avatar_url as white_avatar,
        u1.avatar_frame as white_player_frame,
        u1.profile_banner as white_player_banner,
        u1.username_style as white_username_style,
        u2.username as black_username,
        u2.full_name as black_full_name,
        u2.avatar_url as black_avatar,
        u2.avatar_frame as black_player_frame,
        u2.profile_banner as black_player_banner,
        u2.username_style as black_username_style
      FROM chess_games cg
      LEFT JOIN users u1 ON cg.white_player_id = u1.id
      LEFT JOIN users u2 ON cg.black_player_id = u2.id
      WHERE (cg.white_player_id = $1 OR cg.black_player_id = $1)
        AND cg.status IN ('pending', 'active')
      ORDER BY cg.created_at DESC`,
      [req.user.id]
    );

    res.json({ games: result.rows });
  } catch (error) {
    console.error('Ошибка получения игр:', error);
    res.status(500).json({ error: 'Ошибка получения игр' });
  }
});

// Получить список игроков из группы для вызова
router.get('/available-players', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        u.id,
        u.username,
        u.full_name,
        u.avatar_url,
        u.avatar_frame,
        u.profile_banner,
        u.username_style,
        u.is_online,
        u.last_seen
      FROM users u
      WHERE u.group_id = (SELECT group_id FROM users WHERE id = $1)
        AND u.id != $1
        AND u.role = 'student'
      ORDER BY u.is_online DESC, u.full_name ASC`,
      [req.user.id]
    );

    res.json({ players: result.rows });
  } catch (error) {
    console.error('Ошибка получения игроков:', error);
    res.status(500).json({ error: 'Ошибка получения игроков' });
  }
});

// Отправить вызов на игру
router.post('/challenge', authenticate, async (req, res) => {
  const { opponentId, playerColor, betAmount } = req.body;

  console.log('♟️ Создание вызова:');
  console.log('  - req.user:', req.user);
  console.log('  - Челленджер ID:', req.user.id);
  console.log('  - Противник:', opponentId);
  console.log('  - Цвет челленджера:', playerColor);
  console.log('  - Ставка:', betAmount);

  if (!opponentId) {
    return res.status(400).json({ error: 'Не указан противник' });
  }

  if (opponentId === req.user.id) {
    return res.status(400).json({ error: 'Нельзя вызвать самого себя' });
  }

  if (!betAmount || betAmount < 0) {
    return res.status(400).json({ error: 'Некорректная ставка' });
  }

  try {
    // Проверяем баланс челленджера
    const challengerBalance = await pool.query(
      'SELECT points FROM users WHERE id = $1',
      [req.user.id]
    );

    if (challengerBalance.rows[0].points < betAmount) {
      return res.status(400).json({ error: 'Недостаточно баллов для ставки' });
    }

    // Проверяем, что оба игрока из одной группы
    const groupCheck = await pool.query(
      `SELECT u1.group_id as g1, u2.group_id as g2
       FROM users u1, users u2
       WHERE u1.id = $1 AND u2.id = $2`,
      [req.user.id, opponentId]
    );

    if (!groupCheck.rows.length || groupCheck.rows[0].g1 !== groupCheck.rows[0].g2) {
      return res.status(400).json({ error: 'Игроки должны быть из одной группы' });
    }

    // Проверяем, нет ли активного вызова между этими игроками
    const existingGame = await pool.query(
      `SELECT id FROM chess_games
       WHERE ((white_player_id = $1 AND black_player_id = $2) 
           OR (white_player_id = $2 AND black_player_id = $1))
         AND status IN ('pending', 'active')`,
      [req.user.id, opponentId]
    );

    if (existingGame.rows.length > 0) {
      return res.status(400).json({ error: 'У вас уже есть активная игра с этим игроком' });
    }

    // Создаём новую игру
    const whitePlayerId = playerColor === 'white' ? req.user.id : opponentId;
    const blackPlayerId = playerColor === 'white' ? opponentId : req.user.id;

    console.log('♟️ Распределение цветов:');
    console.log('  - Белые (white_player_id):', whitePlayerId);
    console.log('  - Чёрные (black_player_id):', blackPlayerId);
    console.log('  - Челленджер (challenger_id):', req.user.id);

    const result = await pool.query(
      `INSERT INTO chess_games 
        (white_player_id, black_player_id, challenger_id, status, position, move_history, bet_amount)
       VALUES ($1, $2, $3, 'pending', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', '[]', $4)
       RETURNING *`,
      [whitePlayerId, blackPlayerId, req.user.id, betAmount]
    );

    const game = result.rows[0];
    console.log('♟️ Игра создана:', game.id, '- white:', game.white_player_id, 'black:', game.black_player_id, 'bet:', game.bet_amount);

    // Блокируем баллы челленджера
    await pool.query(
      'UPDATE users SET points = points - $1 WHERE id = $2',
      [betAmount, req.user.id]
    );

    // Записываем в историю баллов
    await pool.query(
      `INSERT INTO points_history (user_id, points_change, reason)
       VALUES ($1, $2, $3)`,
      [req.user.id, -betAmount, `Ставка на шахматную игру #${game.id}`]
    );

    // Получаем информацию о челленджере для уведомления
    const challengerInfo = await pool.query(
      'SELECT username, full_name FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json({ 
      game,
      challengerName: challengerInfo.rows[0].full_name || challengerInfo.rows[0].username
    });
  } catch (error) {
    console.error('Ошибка создания вызова:', error);
    res.status(500).json({ error: 'Ошибка создания вызова' });
  }
});

// Принять вызов
router.post('/accept/:gameId', authenticate, async (req, res) => {
  const { gameId } = req.params;

  console.log('♟️ Принятие вызова:');
  console.log('  - req.user:', req.user);
  console.log('  - Принимающий ID:', req.user.id);
  console.log('  - Game ID:', gameId);

  try {
    const game = await pool.query(
      'SELECT * FROM chess_games WHERE id = $1 AND status = $2',
      [gameId, 'pending']
    );

    if (!game.rows.length) {
      return res.status(404).json({ error: 'Игра не найдена' });
    }

    const gameData = game.rows[0];
    
    console.log('  - Игра найдена:', {
      white: gameData.white_player_id,
      black: gameData.black_player_id,
      challenger: gameData.challenger_id
    });

    // Проверяем, что текущий пользователь - это тот, кого вызвали
    if (gameData.white_player_id !== req.user.id && gameData.black_player_id !== req.user.id) {
      console.log('  - ОШИБКА: Пользователь не участник игры');
      return res.status(403).json({ error: 'Вы не участник этой игры' });
    }

    if (gameData.challenger_id === req.user.id) {
      console.log('  - ОШИБКА: Нельзя принять свой вызов');
      return res.status(400).json({ error: 'Нельзя принять свой собственный вызов' });
    }

    console.log('  - Принятие успешно');

    // Проверяем баланс принимающего
    const acceptorBalance = await pool.query(
      'SELECT points FROM users WHERE id = $1',
      [req.user.id]
    );

    if (acceptorBalance.rows[0].points < gameData.bet_amount) {
      return res.status(400).json({ error: `Недостаточно баллов. Требуется: ${gameData.bet_amount}` });
    }

    // Списываем баллы у принимающего
    await pool.query(
      'UPDATE users SET points = points - $1 WHERE id = $2',
      [gameData.bet_amount, req.user.id]
    );

    // Записываем в историю баллов
    await pool.query(
      `INSERT INTO points_history (user_id, points_change, reason)
       VALUES ($1, $2, $3)`,
      [req.user.id, -gameData.bet_amount, `Ставка на шахматную игру #${gameId}`]
    );

    // Обновляем статус игры и инициализируем таймер (5 минут = 300 секунд)
    const result = await pool.query(
      `UPDATE chess_games 
       SET status = 'active', 
           started_at = NOW(),
           current_turn_start = NOW(),
           white_time_left = 300,
           black_time_left = 300
       WHERE id = $1
       RETURNING *`,
      [gameId]
    );

    res.json({ game: result.rows[0] });
  } catch (error) {
    console.error('Ошибка принятия вызова:', error);
    res.status(500).json({ error: 'Ошибка принятия вызова' });
  }
});

// Отклонить вызов
router.post('/decline/:gameId', authenticate, async (req, res) => {
  const { gameId } = req.params;

  try {
    const game = await pool.query(
      'SELECT * FROM chess_games WHERE id = $1 AND status = $2',
      [gameId, 'pending']
    );

    if (!game.rows.length) {
      return res.status(404).json({ error: 'Игра не найдена' });
    }

    const gameData = game.rows[0];

    if (gameData.white_player_id !== req.user.id && gameData.black_player_id !== req.user.id) {
      return res.status(403).json({ error: 'Вы не участник этой игры' });
    }

    if (gameData.challenger_id === req.user.id) {
      return res.status(400).json({ error: 'Нельзя отклонить свой собственный вызов' });
    }

    // Возвращаем баллы челленджеру
    await pool.query(
      'UPDATE users SET points = points + $1 WHERE id = $2',
      [gameData.bet_amount, gameData.challenger_id]
    );

    // Записываем в историю баллов
    await pool.query(
      `INSERT INTO points_history (user_id, points_change, reason)
       VALUES ($1, $2, $3)`,
      [gameData.challenger_id, gameData.bet_amount, `Возврат ставки (отклонен вызов) игра #${gameId}`]
    );

    await pool.query(
      'UPDATE chess_games SET status = $1 WHERE id = $2',
      ['declined', gameId]
    );

    res.json({ message: 'Вызов отклонён' });
  } catch (error) {
    console.error('Ошибка отклонения вызова:', error);
    res.status(500).json({ error: 'Ошибка отклонения вызова' });
  }
});

// Получить данные игры
router.get('/game/:gameId', authenticate, async (req, res) => {
  const { gameId } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        cg.*,
        u1.username as white_username,
        u1.full_name as white_full_name,
        u1.avatar_url as white_avatar,
        u1.avatar_frame as white_player_frame,
        u1.profile_banner as white_player_banner,
        u1.username_style as white_username_style,
        u2.username as black_username,
        u2.full_name as black_full_name,
        u2.avatar_url as black_avatar,
        u2.avatar_frame as black_player_frame,
        u2.profile_banner as black_player_banner,
        u2.username_style as black_username_style
      FROM chess_games cg
      LEFT JOIN users u1 ON cg.white_player_id = u1.id
      LEFT JOIN users u2 ON cg.black_player_id = u2.id
      WHERE cg.id = $1`,
      [gameId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Игра не найдена' });
    }

    const game = result.rows[0];

    // Проверяем, что пользователь - участник игры
    if (game.white_player_id !== req.user.id && game.black_player_id !== req.user.id) {
      return res.status(403).json({ error: 'Вы не участник этой игры' });
    }

    res.json({ game });
  } catch (error) {
    console.error('Ошибка получения игры:', error);
    res.status(500).json({ error: 'Ошибка получения игры' });
  }
});

// Сделать ход
router.post('/move/:gameId', authenticate, async (req, res) => {
  const { gameId } = req.params;
  const { move, position } = req.body;

  console.log(`♟️ === НАЧАЛО ОБРАБОТКИ ХОДА ===`);
  console.log(`♟️ Game ID: ${gameId}`);
  console.log(`♟️ User ID: ${req.user.id}`);
  console.log(`♟️ Move: ${move}`);

  try {
    const game = await pool.query(
      'SELECT * FROM chess_games WHERE id = $1 AND status = $2',
      [gameId, 'active']
    );

    if (!game.rows.length) {
      console.log(`❌ Игра не найдена или не активна`);
      return res.status(404).json({ error: 'Активная игра не найдена' });
    }

    const gameData = game.rows[0];
    console.log(`♟️ Игра найдена:`, {
      white: gameData.white_player_id,
      black: gameData.black_player_id,
      white_time: gameData.white_time_left,
      black_time: gameData.black_time_left,
      current_turn_start: gameData.current_turn_start,
      move_history_type: typeof gameData.move_history,
      move_history_value: gameData.move_history
    });

    // Проверяем, что ход делает правильный игрок
    const currentTurn = gameData.position.split(' ')[1]; // 'w' или 'b'
    const isWhiteTurn = currentTurn === 'w';
    const currentPlayerId = isWhiteTurn ? gameData.white_player_id : gameData.black_player_id;

    console.log(`♟️ Проверка хода:`, {
      currentTurn,
      isWhiteTurn,
      currentPlayerId,
      requestUserId: req.user.id
    });

    if (currentPlayerId !== req.user.id) {
      console.log(`❌ Не ваш ход!`);
      return res.status(400).json({ error: 'Сейчас не ваш ход' });
    }

    // Проверяем таймер (профессиональная система - 5 минут на всю игру)
    if (gameData.current_turn_start) {
      const timeSpent = Math.floor((Date.now() - new Date(gameData.current_turn_start).getTime()) / 1000);
      const currentTimeLeft = isWhiteTurn ? gameData.white_time_left : gameData.black_time_left;
      const newTimeLeft = currentTimeLeft - timeSpent;

      console.log(`⏱️ Таймер - Игрок: ${isWhiteTurn ? 'white' : 'black'}, Осталось: ${currentTimeLeft}с, Потрачено: ${timeSpent}с, Новое значение: ${newTimeLeft}с`);

      // Если время закончилось (меньше или равно 0)
      if (newTimeLeft <= 0) {
        console.log(`⏱️ ТАЙМАУТ! Игрок ${currentPlayerId} превысил лимит времени`);
        
        // Определяем победителя (противник текущего игрока)
        const winnerId = isWhiteTurn ? gameData.black_player_id : gameData.white_player_id;
        const winnerColor = isWhiteTurn ? 'black' : 'white';

        // Завершаем игру из-за таймаута
        await pool.query(
          `UPDATE chess_games 
           SET status = 'finished', result = $1, end_reason = 'timeout', ended_at = NOW()
           WHERE id = $2`,
          [winnerColor, gameId]
        );

        // Выплачиваем выигрыш победителю
        if (gameData.bet_amount > 0) {
          const totalPot = gameData.bet_amount * 2;
          const commission = Math.floor(totalPot * 0.05);
          const winnerPayout = totalPot - commission;

          await pool.query(
            'UPDATE users SET points = points + $1 WHERE id = $2',
            [winnerPayout, winnerId]
          );

          await pool.query(
            `INSERT INTO points_history (user_id, points_change, reason)
             VALUES ($1, $2, $3)`,
            [winnerId, winnerPayout, `Выигрыш в шахматы (таймаут противника, игра #${gameId})`]
          );
        }

        return res.status(400).json({ 
          error: 'Время истекло! Вы проиграли.',
          timeout: true,
          winner: winnerColor
        });
      }

      // Обновляем оставшееся время игрока (не может быть меньше 0)
      const finalTimeLeft = Math.max(0, newTimeLeft);
      if (isWhiteTurn) {
        await pool.query(
          'UPDATE chess_games SET white_time_left = $1 WHERE id = $2',
          [finalTimeLeft, gameId]
        );
      } else {
        await pool.query(
          'UPDATE chess_games SET black_time_left = $1 WHERE id = $2',
          [finalTimeLeft, gameId]
        );
      }
    } else {
      console.log(`⏱️ current_turn_start отсутствует для игры ${gameId}, пропускаем проверку таймера`);
    }

    // Обновляем позицию, историю ходов и сбрасываем таймер для следующего хода
    let moveHistory = [];
    try {
      moveHistory = gameData.move_history ? 
        (typeof gameData.move_history === 'string' ? JSON.parse(gameData.move_history) : gameData.move_history) 
        : [];
    } catch (e) {
      console.log(`⚠️ Ошибка парсинга move_history:`, e.message);
      moveHistory = [];
    }
    
    moveHistory.push(move);
    console.log(`♟️ История ходов обновлена, всего ходов: ${moveHistory.length}`);

    const result = await pool.query(
      `UPDATE chess_games 
       SET position = $1, 
           move_history = $2, 
           last_move_at = NOW(),
           current_turn_start = NOW()
       WHERE id = $3
       RETURNING *`,
      [position, JSON.stringify(moveHistory), gameId]
    );

    console.log(`⏱️ Ход сохранён для игры ${gameId}, новые таймеры - white: ${result.rows[0].white_time_left}s, black: ${result.rows[0].black_time_left}s`);

    res.json({ game: result.rows[0] });
  } catch (error) {
    console.error('❌ Ошибка выполнения хода:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ error: 'Ошибка выполнения хода', details: error.message });
  }
});

// Завершить игру (мат, пат, сдаться)
router.post('/end/:gameId', authenticate, async (req, res) => {
  const { gameId } = req.params;
  const { result: gameResult, reason } = req.body;

  try {
    const game = await pool.query(
      'SELECT * FROM chess_games WHERE id = $1 AND status = $2',
      [gameId, 'active']
    );

    if (!game.rows.length) {
      return res.status(404).json({ error: 'Активная игра не найдена' });
    }

    const gameData = game.rows[0];

    if (gameData.white_player_id !== req.user.id && gameData.black_player_id !== req.user.id) {
      return res.status(403).json({ error: 'Вы не участник этой игры' });
    }

    // Обновляем статус игры
    await pool.query(
      `UPDATE chess_games 
       SET status = 'finished', result = $1, end_reason = $2, ended_at = NOW()
       WHERE id = $3`,
      [gameResult, reason, gameId]
    );

    // Выплачиваем выигрыш с учетом комиссии 5%
    if (gameResult !== 'draw' && gameData.bet_amount > 0) {
      const totalPot = gameData.bet_amount * 2; // Общий банк
      const commission = Math.floor(totalPot * 0.05); // 5% комиссия
      const winnerPayout = totalPot - commission; // Выигрыш после комиссии

      let winnerId;
      if (gameResult === 'white') {
        winnerId = gameData.white_player_id;
      } else if (gameResult === 'black') {
        winnerId = gameData.black_player_id;
      }

      if (winnerId) {
        // Начисляем выигрыш победителю
        await pool.query(
          'UPDATE users SET points = points + $1 WHERE id = $2',
          [winnerPayout, winnerId]
        );

        // Записываем в историю баллов
        await pool.query(
          `INSERT INTO points_history (user_id, points_change, reason)
           VALUES ($1, $2, $3)`,
          [winnerId, winnerPayout, `Выигрыш в шахматы (игра #${gameId}, комиссия 5%: ${commission} баллов)`]
        );

        console.log(`♟️ Игра #${gameId} завершена. Победитель ${winnerId} получил ${winnerPayout} баллов (комиссия ${commission})`);
      }
    } else if (gameResult === 'draw' && gameData.bet_amount > 0) {
      // При ничьей возвращаем ставки обоим игрокам
      await pool.query(
        'UPDATE users SET points = points + $1 WHERE id IN ($2, $3)',
        [gameData.bet_amount, gameData.white_player_id, gameData.black_player_id]
      );

      // Записываем в историю баллов для обоих
      await pool.query(
        `INSERT INTO points_history (user_id, points_change, reason)
         VALUES 
          ($1, $2, $3),
          ($4, $5, $6)`,
        [
          gameData.white_player_id, gameData.bet_amount, `Возврат ставки (ничья) игра #${gameId}`,
          gameData.black_player_id, gameData.bet_amount, `Возврат ставки (ничья) игра #${gameId}`
        ]
      );

      console.log(`♟️ Игра #${gameId} завершена ничьей. Ставки возвращены обоим игрокам`);
    }

    res.json({ message: 'Игра завершена' });
  } catch (error) {
    console.error('Ошибка завершения игры:', error);
    res.status(500).json({ error: 'Ошибка завершения игры' });
  }
});

// Получить историю всех шахматных игр (для админа)
router.get('/history', authenticate, async (req, res) => {
  try {
    const limit = req.query.limit || 50;
    const result = await pool.query(
      `SELECT 
        cg.*,
        u1.username as white_player_username,
        u2.username as black_player_username
      FROM chess_games cg
      LEFT JOIN users u1 ON cg.white_player_id = u1.id
      LEFT JOIN users u2 ON cg.black_player_id = u2.id
      ORDER BY cg.created_at DESC
      LIMIT $1`,
      [limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения истории шахмат:', error);
    res.status(500).json({ error: 'Ошибка получения истории' });
  }
});

export default router;
