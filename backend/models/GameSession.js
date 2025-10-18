import pool from '../config/database.js';

class GameSession {
  // Создать новую игровую сессию
  static async create(groupId, createdBy, totalRounds = 10) {
    const result = await pool.query(
      `INSERT INTO game_sessions (group_id, created_by, total_rounds, status)
       VALUES ($1, $2, $3, 'preparing')
       RETURNING *`,
      [groupId, createdBy, totalRounds]
    );
    
    return result.rows[0];
  }

  // Получить сессию по ID
  static async getById(id) {
    const result = await pool.query(
      `SELECT gs.*, g.name as group_name,
              (SELECT json_agg(json_build_object(
                'id', gp.id,
                'user_id', gp.user_id,
                'username', u.username,
                'full_name', u.full_name,
                'team', gp.team,
                'points_earned', gp.points_earned
              ))
              FROM game_participants gp
              JOIN users u ON gp.user_id = u.id
              WHERE gp.session_id = gs.id) as participants
       FROM game_sessions gs
       JOIN groups g ON gs.group_id = g.id
       WHERE gs.id = $1`,
      [id]
    );
    
    return result.rows[0];
  }

  // Получить все активные сессии
  static async getActive() {
    const result = await pool.query(
      `SELECT gs.*, g.name as group_name,
              COUNT(gp.id) as player_count
       FROM game_sessions gs
       JOIN groups g ON gs.group_id = g.id
       LEFT JOIN game_participants gp ON gs.id = gp.session_id
       WHERE gs.status IN ('preparing', 'in_progress')
       GROUP BY gs.id, g.name
       ORDER BY gs.created_at DESC`
    );
    
    return result.rows;
  }

  // Получить все сессии
  static async getAll() {
    const result = await pool.query(
      `SELECT gs.*, g.name as group_name,
              COUNT(gp.id) as player_count
       FROM game_sessions gs
       JOIN groups g ON gs.group_id = g.id
       LEFT JOIN game_participants gp ON gs.id = gp.session_id
       GROUP BY gs.id, g.name
       ORDER BY gs.created_at DESC`
    );
    
    return result.rows;
  }

  // Добавить участника
  static async addParticipant(sessionId, userId, team) {
    const result = await pool.query(
      `INSERT INTO game_participants (session_id, user_id, team)
       VALUES ($1, $2, $3)
       ON CONFLICT (session_id, user_id) DO UPDATE SET team = $3
       RETURNING *`,
      [sessionId, userId, team]
    );
    
    return result.rows[0];
  }

  // Получить участников сессии
  static async getParticipants(sessionId) {
    const result = await pool.query(
      `SELECT gp.*, u.username, u.full_name
       FROM game_participants gp
       JOIN users u ON gp.user_id = u.id
       WHERE gp.session_id = $1
       ORDER BY gp.team, u.full_name`,
      [sessionId]
    );
    
    return result.rows;
  }

  // Разделить игроков на команды случайным образом
  static async assignTeamsRandomly(sessionId, userIds) {
    // Перемешиваем массив игроков
    const shuffled = [...userIds].sort(() => Math.random() - 0.5);
    const middle = Math.ceil(shuffled.length / 2);
    
    const teamA = shuffled.slice(0, middle);
    const teamB = shuffled.slice(middle);

    // Добавляем игроков в команды
    for (const userId of teamA) {
      await this.addParticipant(sessionId, userId, 'team_a');
    }
    
    for (const userId of teamB) {
      await this.addParticipant(sessionId, userId, 'team_b');
    }

    return { teamA, teamB };
  }

  // Начать игру
  static async startGame(sessionId) {
    // Выбираем случайную команду для начала
    const startingTeam = Math.random() < 0.5 ? 'team_a' : 'team_b';
    
    const result = await pool.query(
      `UPDATE game_sessions 
       SET status = 'in_progress', current_team = $1, started_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [startingTeam, sessionId]
    );
    
    return result.rows[0];
  }

  // Обновить счет команды
  static async updateScore(sessionId, team, points) {
    const field = team === 'team_a' ? 'team_a_score' : 'team_b_score';
    
    const result = await pool.query(
      `UPDATE game_sessions 
       SET ${field} = ${field} + $1
       WHERE id = $2
       RETURNING *`,
      [points, sessionId]
    );
    
    return result.rows[0];
  }

  // Добавить баллы участникам команды
  static async addPointsToTeam(sessionId, team, points) {
    await pool.query(
      `UPDATE game_participants 
       SET points_earned = points_earned + $1
       WHERE session_id = $2 AND team = $3`,
      [points, sessionId, team]
    );
  }

  // Переключить ход на другую команду
  static async switchTurn(sessionId) {
    const session = await this.getById(sessionId);
    const newTeam = session.current_team === 'team_a' ? 'team_b' : 'team_a';
    
    const result = await pool.query(
      `UPDATE game_sessions 
       SET current_team = $1, current_round = current_round + 1
       WHERE id = $2
       RETURNING *`,
      [newTeam, sessionId]
    );
    
    return result.rows[0];
  }

  // Завершить игру
  static async finishGame(sessionId) {
    const session = await this.getById(sessionId);
    
    // Определяем победителя
    const winner = session.team_a_score > session.team_b_score ? 'team_a' : 
                   session.team_b_score > session.team_a_score ? 'team_b' : 'draw';

    // Начисляем финальные баллы участникам в систему баллов
    const participants = await this.getParticipants(sessionId);
    
    for (const participant of participants) {
      if (participant.points_earned > 0) {
        await pool.query(
          `UPDATE users SET points = points + $1 WHERE id = $2`,
          [participant.points_earned, participant.user_id]
        );
      }
    }
    
    const result = await pool.query(
      `UPDATE game_sessions 
       SET status = 'finished', finished_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [sessionId]
    );
    
    return { session: result.rows[0], winner };
  }

  // Удалить сессию
  static async delete(id) {
    await pool.query('DELETE FROM game_sessions WHERE id = $1', [id]);
  }
}

export default GameSession;
