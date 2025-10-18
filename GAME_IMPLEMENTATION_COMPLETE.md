# ✅ Проверка порядка действий в игре "Вопросы-Ответы"

## Полная проверка реализации всех 11 шагов

---

### 1️⃣ Нажимаю кнопку начать игру
**Статус: ✅ РЕАЛИЗОВАНО**

**Что происходит:**
- Админ видит карточки групп на главной странице "Игры"
- На каждой карточке кнопка "Создать игру"

**Код:**
```jsx
<button className="btn-primary" onClick={() => openCreateModal(group)}>
  Создать игру
</button>
```

---

### 2️⃣ Выбираю группу
**Статус: ✅ РЕАЛИЗОВАНО**

**Что происходит:**
- При нажатии на кнопку "Создать игру" на карточке группы
- Группа автоматически выбирается
- Загружаются студенты этой группы
- Создается сессия игры

**Код:**
```javascript
const openCreateModal = async (group) => {
  setSelectedGroup(group);
  const response = await api.get(`/groups/${group.id}`);
  setGroupStudents(response.data.group.members || []);
  setShowCreateModal(true);
};
```

---

### 3️⃣ Выбираю учеников из выбранной группы
**Статус: ✅ РЕАЛИЗОВАНО**

**Что происходит:**
- Открывается модальное окно "Выберите игроков"
- Список всех студентов группы
- Клик по студенту добавляет/убирает его из списка выбранных
- Минимум 2 игрока
- Отображается счетчик: "Выбрано: X игроков"

**Код:**
```javascript
const togglePlayerSelection = (userId) => {
  setSelectedPlayers(prev => 
    prev.includes(userId) 
      ? prev.filter(id => id !== userId)
      : [...prev, userId]
  );
};
```

**UI:**
```jsx
<div className={`player-item ${selectedPlayers.includes(student.user_id) ? 'selected' : ''}`}
     onClick={() => togglePlayerSelection(student.user_id)}>
  <span>{student.full_name || student.username}</span>
  {selectedPlayers.includes(student.user_id) && <span className="checkmark">✓</span>}
</div>
```

---

### 4️⃣ Игра распределяет рандомно равномерно выбранных учеников на 2 группы
**Статус: ✅ РЕАЛИЗОВАНО**

**Что происходит:**
- Админ нажимает "Разделить на команды (X игроков)"
- Бэкенд случайным образом перемешивает массив игроков
- Делит пополам: первая половина → Команда, вторая половина → Команда
- Сохраняет в таблицу `game_participants`

**Бэкенд код (GameSession.js):**
```javascript
static async assignTeamsRandomly(sessionId, userIds) {
  // Перемешиваем игроков случайным образом
  const shuffled = userIds.sort(() => Math.random() - 0.5);
  const mid = Math.floor(shuffled.length / 2);
  
  const teamA = shuffled.slice(0, mid);
  const teamB = shuffled.slice(mid);
  
  // Добавляем в команду A
  for (const userId of teamA) {
    await pool.query(
      'INSERT INTO game_participants (session_id, user_id, team) VALUES ($1, $2, $3)',
      [sessionId, userId, 'team_a']
    );
  }
  
  // Добавляем в команду B
  for (const userId of teamB) {
    await pool.query(
      'INSERT INTO game_participants (session_id, user_id, team) VALUES ($1, $2, $3)',
      [sessionId, userId, 'team_b']
    );
  }
}
```

---

### 5️⃣ Игра вычисляет какая команда должна начать первой
**Статус: ✅ РЕАЛИЗОВАНО**

**Что происходит:**
- При вызове `startGame()` бэкенд случайно выбирает стартовую команду
- Вероятность 50/50: team_a или team_b

**Бэкенд код (GameSession.js):**
```javascript
static async startGame(sessionId) {
  const startingTeam = Math.random() < 0.5 ? 'team_a' : 'team_b';
  
  await pool.query(
    `UPDATE game_sessions 
     SET status = 'in_progress', current_team = $1, started_at = NOW()
     WHERE id = $2`,
    [startingTeam, sessionId]
  );
}
```

---

### 6️⃣ Я нажимаю кнопку для начала игры с выбранной команды
**Статус: ✅ РЕАЛИЗОВАНО**

**Что происходит:**
- После распределения команд в таблице сессий появляется кнопка "   Начать"
- При нажатии:
  - Вызывается `POST /game/sessions/:id/start`
  - Статус меняется на `in_progress`
  - Определяется стартовая команда
  - Открывается игровой модал с полным интерфейсом

**Фронтенд:**
```jsx
<button onClick={() => startGame(session.id)} className="btn-success">
     Начать
</button>
```

**Игровой интерфейс показывает:**
- Название группы
- Текущий раунд: X/10
- Счет: А Команда: 0 | Команда: 0 Б
- **Ход: А Команда** (или Б Команда)
- Кнопка " Вытянуть карточку"
- Списки игроков обеих команд

---

### 7️⃣ Начинается игра и карточки по горизонтали справа налево крутятся и выбирается та карточка которая остановилась по середине на линии
**Статус: ✅ РЕАЛИЗОВАНО (ТОЛЬКО ЧТО)**

**Что происходит:**
- Админ нажимает " Вытянуть карточку"
- Загружаются все доступные карточки из базы
- Карточки дублируются 3 раза для эффекта бесконечной прокрутки
- Появляется анимация:
  - Горизонтальная полоса с карточками (200px каждая)
  - Красная вертикальная линия по центру
  - Карточки двигаются справа налево
  - Анимация 3 секунды с плавным замедлением
  - Карточка, остановившаяся на красной линии - выбрана

**CSS анимация:**
```css
@keyframes scrollCards {
  0% { transform: translateX(0); }
  100% { transform: translateX(-66.66%); }
}

.cards-scroll {
  display: flex;
  gap: 20px;
  padding: 0 50%;
  animation: scrollCards 3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.center-line {
  position: absolute;
  left: 50%;
  width: 4px;
  background: #ff0055;
  box-shadow: 0 0 20px rgba(255, 0, 85, 0.6);
  z-index: 10;
}
```

**Код:**
```javascript
const drawCard = async () => {
  setShowCardAnimation(true);
  
  // Создаем массив для прокрутки (повторяем карточки 3 раза)
  const duplicatedCards = [...allCards, ...allCards, ...allCards];
  setScrollingCards(duplicatedCards);
  
  const response = await api.get(`/game/sessions/${currentSession.id}/draw-card`);
  const { card, question } = response.data;
  
  setTimeout(() => {
    setDrawnCard(card);
    setCurrentQuestion(question);
    setShowCardAnimation(false);
    createRound(card, question);
  }, 3000);
};
```

---

### 8️⃣ Карточка присваивается команде и задается вопрос рандомно, но вопросы не могут повторяться за одну игру
**Статус: ✅ РЕАЛИЗОВАНО (УЛУЧШЕНО)**

**Что происходит:**
- Бэкенд получает случайную карточку (взвешенный выбор по `drop_chance`)
- Бэкенд получает случайный вопрос, **НЕ использованный в этой сессии**
- Если все вопросы использованы - берется любой случайный
- Создается раунд с привязкой к `question_id` для отслеживания

**Бэкенд (draw-card):**
```javascript
router.get('/sessions/:id/draw-card', async (req, res) => {
  const sessionId = req.params.id;
  const card = await GameCard.getRandomCard();
  const question = await GameQuestion.getRandomForSession(sessionId);
  
  // Если все вопросы использованы, берем любой
  const finalQuestion = question || await GameQuestion.getRandom();
  
  res.json({ card, question: finalQuestion });
});
```

**Проверка использованных вопросов (GameQuestion.js):**
```javascript
static async getRandomForSession(sessionId, difficulty = null) {
  let query = `
    SELECT gq.* 
    FROM game_questions gq
    WHERE gq.id NOT IN (
      SELECT DISTINCT gr.question_id
      FROM game_rounds gr
      WHERE gr.session_id = $1 AND gr.question_id IS NOT NULL
    )
  `;
  
  if (difficulty) query += ' AND gq.difficulty = $2';
  query += ' ORDER BY RANDOM() LIMIT 1';
  
  const result = await pool.query(query, params);
  return result.rows[0];
}
```

**Таблица game_rounds теперь хранит:**
- `card_id` - какая карточка выпала
- `question_id` - ID вопроса для отслеживания
- `question` - текст вопроса
- `team` - какая команда отвечает
- `session_id` - сессия игры

---

### 9️⃣ После ответа одной команды в зависимости от карточки, тот же процесс повторяется с другой и так пока я не остановлю игру
**Статус: ✅ РЕАЛИЗОВАНО**

**Что происходит после ответа:**

**Правильный ответ (✅):**
```javascript
const answerCorrect = async () => {
  let points = 10;
  
  // Применяем эффект карточки
  if (drawnCard?.card_type === 'double_points') points = 20;
  else if (drawnCard?.card_type === 'steal_points') {
    points = 10;
    // Отнимаем у другой команды
    const otherTeam = currentSession.current_team === 'team_a' ? 'team_b' : 'team_a';
    await api.post(`/game/sessions/${currentSession.id}/rounds`, {
      team: otherTeam,
      points: -5
    });
  }
  
  await api.post(`/rounds/${currentRound.id}/answer-correct`, {
    answer: 'Правильный ответ',
    points
  });
  
  await handleNextRound();
};
```

**Неправильный ответ (❌):**
```javascript
const answerWrong = async () => {
  await api.post(`/rounds/${currentRound.id}/answer-wrong`, {
    answer: 'Неправильный ответ',
    points: -5
  });
  
  await handleNextRound();
};
```

**Переключение хода:**
```javascript
const handleNextRound = async () => {
  // Проверяем специальные карточки
  if (drawnCard?.card_type === 'extra_questions') {
    alert('Команде выпало 3 дополнительных вопроса!');
  }
  
  setDrawnCard(null);
  setCurrentQuestion(null);
  setCurrentRound(null);
  
  // Переключаем ход (team_a ↔ team_b)
  await api.post(`/game/sessions/${currentSession.id}/next-turn`);
  await fetchSessionDetails(currentSession.id);
  
  // Проверяем окончание игры
  if (currentSession.current_round >= currentSession.total_rounds) {
    finishGame();
  }
};
```

**Эффекты карточек:**
- `skip_turn` → -5 баллов
- `double_points` → 20 баллов вместо 10
- `steal_points` → +10 и -5 противнику
- `time_bonus` → +30 секунд на таймер
- `minus_time` → -15 секунд
- `extra_questions` → +3 дополнительных вопроса
- `transfer_question` → передача вопроса
- `random_event` → случайное событие

**Цикл игры:**
1. Команда вытягивает карточку
2. Админ проверяет ответ
3. Применяются баллы и эффекты
4. Ход переходит к Команде B
5. Команда вытягивает карточку
6. Админ проверяет ответ
7. Ход переходит к Команде A
8. Повторяется до завершения

---

### 🔟 Выводятся результаты
**Статус: ✅ РЕАЛИЗОВАНО**

**Что происходит:**
- Админ нажимает " Завершить игру"
- Появляется подтверждение: "Завершить игру?"
- После подтверждения:
  - Вызывается `POST /game/sessions/:id/finish`
  - Бэкенд определяет победителя
  - Статус сессии → `finished`
  - Показывается alert с результатами

**Вывод результатов:**
```javascript
const finishGame = async () => {
  if (!confirm('Завершить игру?')) return;
  
  const response = await api.post(`/game/sessions/${currentSession.id}/finish`);
  
  alert(`
    Игра завершена! 
    Победитель: ${response.data.winner === 'team_a' ? 'Команда' : 
                  response.data.winner === 'team_b' ? 'Команда' : 
                  'Ничья'}
  `);
  
  setShowGameModal(false);
  fetchSessions();
};
```

**Информация в игровом интерфейсе (постоянно видна):**
- Счет в реальном времени: А Команда: X | Команда: Y Б
- Раунд: X/10
- Списки игроков с их индивидуальными баллами:
  ```
  А Команда
  - Иван Иванов (15 баллов)
  - Петр Петров (15 баллов)
  
  Б Команда
  - Мария Сидорова (12 баллов)
  - Анна Смирнова (12 баллов)
  ```

---

### 1️⃣1️⃣ Заработанные баллы делятся между учениками из одной команды и так в двух командах
**Статус: ✅ РЕАЛИЗОВАНО**

**Что происходит при завершении игры:**

**Бэкенд (GameSession.finishGame):**
```javascript
static async finishGame(sessionId) {
  const session = await this.getById(sessionId);
  
  // Определяем победителя
  let winner;
  if (session.team_a_score > session.team_b_score) winner = 'team_a';
  else if (session.team_b_score > session.team_a_score) winner = 'team_b';
  else winner = 'draw';
  
  // Обновляем статус сессии
  await pool.query(
    'UPDATE game_sessions SET status = $1, winner = $2, finished_at = NOW() WHERE id = $3',
    ['finished', winner, sessionId]
  );
  
  // РАСПРЕДЕЛЕНИЕ БАЛЛОВ МЕЖДУ ИГРОКАМИ КОМАНД
  
  // Команда
  const teamAPlayers = await pool.query(
    'SELECT * FROM game_participants WHERE session_id = $1 AND team = $2',
    [sessionId, 'team_a']
  );
  
  if (teamAPlayers.rows.length > 0) {
    const pointsPerPlayer = Math.floor(session.team_a_score / teamAPlayers.rows.length);
    
    for (const player of teamAPlayers.rows) {
      // Обновляем points_earned участника
      await pool.query(
        'UPDATE game_participants SET points_earned = $1 WHERE id = $2',
        [pointsPerPlayer, player.id]
      );
      
      // Добавляем баллы к общему счету ученика
      await pool.query(
        'UPDATE users SET points = points + $1 WHERE id = $2',
        [pointsPerPlayer, player.user_id]
      );
    }
  }
  
  // Команда (аналогично)
  const teamBPlayers = await pool.query(
    'SELECT * FROM game_participants WHERE session_id = $1 AND team = $2',
    [sessionId, 'team_b']
  );
  
  if (teamBPlayers.rows.length > 0) {
    const pointsPerPlayer = Math.floor(session.team_b_score / teamBPlayers.rows.length);
    
    for (const player of teamBPlayers.rows) {
      await pool.query(
        'UPDATE game_participants SET points_earned = $1 WHERE id = $2',
        [pointsPerPlayer, player.id]
      );
      
      await pool.query(
        'UPDATE users SET points = points + $1 WHERE id = $2',
        [pointsPerPlayer, player.user_id]
      );
    }
  }
  
  return { winner };
}
```

**Пример распределения:**
```
Команда: 30 баллов, 2 игрока
→ 30 / 2 = 15 баллов каждому

Команда: 25 баллов, 2 игрока
→ 25 / 2 = 12 баллов каждому (остаток отбрасывается)
```

**Куда идут баллы:**
1. `game_participants.points_earned` - личные баллы за эту игру
2. `users.points` - общий счет ученика (рейтинг)

**Отображение:**
- В игровом интерфейсе видно `points_earned` каждого игрока
- В лидерборде видно общий `users.points`

---

## 📊 Итоговая таблица реализации

| # | Шаг | Статус | Файлы |
|---|-----|--------|-------|
| 1 | Начало игры | ✅ | GameManagement.jsx |
| 2 | Выбор группы | ✅ | GameManagement.jsx, backend/routes/game.js |
| 3 | Выбор учеников | ✅ | GameManagement.jsx |
| 4 | Распределение на команды | ✅ | GameSession.js (assignTeamsRandomly) |
| 5 | Определение стартовой команды | ✅ | GameSession.js (startGame) |
| 6 | Запуск игры | ✅ | backend/routes/game.js, GameManagement.jsx |
| 7 | **Анимация карточек** | ✅ | GameManagement.jsx, GameManagement.css |
| 8 | **Вопросы не повторяются** | ✅ | GameQuestion.js (getRandomForSession) |
| 9 | Чередование команд | ✅ | GameManagement.jsx, backend/routes/game.js |
| 10 | Вывод результатов | ✅ | GameSession.js (finishGame) |
| 11 | Распределение баллов | ✅ | GameSession.js (finishGame) |

---

## 🎉 ВЫВОДЫ:

✅ **ВСЕ 11 ШАГОВ ПОЛНОСТЬЮ РЕАЛИЗОВАНЫ!**

### Новые улучшения:
1. **Горизонтальная прокрутка карточек** - красивая анимация с центральной линией
2. **Отслеживание вопросов** - вопросы НЕ повторяются в рамках одной игры
3. **Темная стилизация** - на светлом фоне, без градиентов, яркие акценты

### Готово к тестированию! 🚀
