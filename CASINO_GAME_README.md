# 🎰 Казино Рулетка - Документация

## Описание
Онлайн мультиплеер казино рулетка для студентов, где можно делать ставки баллами и выигрывать!

## Функции

### Backend API

#### Модель `CasinoGame`
- `create(roomId, creatorId)` - Создать новую игру
- `getById(gameId)` - Получить игру по ID
- `getActiveGames()` - Получить список активных игр
- `addBet(gameId, userId, betType, betValue, amount)` - Добавить ставку
- `updateStatus(gameId, status)` - Обновить статус игры
- `spin(gameId, result)` - Запустить спин и сохранить результат
- `getUserHistory(userId, limit)` - История игр пользователя
- `getStatistics()` - Статистика (для админа)

#### Маршруты `/api/casino`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/games` | Получить список активных игр |
| POST | `/games/create` | Создать новую игру |
| GET | `/games/:gameId` | Информация об игре |
| POST | `/games/:gameId/bet` | Сделать ставку |
| POST | `/games/:gameId/start-betting` | Начать прием ставок (только создатель) |
| POST | `/games/:gameId/spin` | Запустить колесо (только создатель) |
| GET | `/history` | История игр пользователя |
| GET | `/statistics` | Статистика (только админ) |

#### Структура таблицы `casino_games`

```sql
CREATE TABLE casino_games (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(100) NOT NULL,
  creator_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(20) CHECK (status IN ('waiting', 'betting', 'spinning', 'completed')),
  bets JSONB DEFAULT '[]',
  result INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  spun_at TIMESTAMP
);
```

### Frontend

#### Компонент `CasinoRoulette`

**Состояния игры:**
- `waiting` - Ожидание начала приема ставок
- `betting` - Прием ставок открыт
- `spinning` - Колесо крутится
- `completed` - Игра завершена

**Типы ставок:**
- `number` - Ставка на конкретное число (0-36), выплата x36
- `color` - Ставка на цвет (red/black), выплата x2
- `even` - Ставка на четное, выплата x2
- `odd` - Ставка на нечетное, выплата x2

**Socket.IO события:**
- `casino:game-created` - Новая игра создана
- `casino:bet-placed` - Ставка сделана
- `casino:betting-started` - Прием ставок начался
- `casino:spin-result` - Результат спина

## Как играть

1. **Создать игру** - Нажать "Создать новую игру"
2. **Начать прием ставок** - Создатель жмёт "Начать прием ставок"
3. **Сделать ставки** - Игроки выбирают число/цвет и сумму
4. **Запустить колесо** - Создатель жмёт "Запустить колесо"
5. **Получить результат** - Система автоматически начислит выигрыш

## Интеграция

### В `server.js`:
```javascript
import casinoRoutes from './routes/casino.js';
app.use('/api/casino', casinoRoutes);
app.set('io', io); // Доступ к Socket.IO в маршрутах
```

### В `Games.jsx`:
```javascript
import CasinoRoulette from '../../components/CasinoRoulette';

const games = [
  {
    id: 'casino-roulette',
    title: 'Казино Рулетка',
    icon: '🎰',
    description: 'Играй в рулетку за баллы!',
    color: '#ffd700',
    available: true
  }
];
```

## Файловая структура

```
backend/
  models/
    CasinoGame.js          # Модель игры
  routes/
    casino.js              # API маршруты
  migrations/
    create_casino_games.sql # SQL миграция
  apply-casino-migration.js # Скрипт миграции

frontend/
  src/
    components/
      CasinoRoulette.jsx   # Компонент казино
      CasinoRoulette.css   # Стили
    pages/
      student/
        Games.jsx          # Интеграция в страницу игр
```

## Баллы и выплаты

| Тип ставки | Описание | Выплата |
|-----------|----------|---------|
| Число (0-36) | Ставка на точное число | x36 |
| Красное | Красные номера | x2 |
| Черное | Черные номера | x2 |
| Четное | Четные числа (кроме 0) | x2 |
| Нечетное | Нечетные числа | x2 |

## Красные числа
1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36

## Черные числа
2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35

## Зеленое число
0 (зеро)

## Примечания

- Минимальная ставка: 1 балл
- Максимальная ставка: текущий баланс пользователя
- Одна ставка на игрока за раунд (можно обновить)
- Создатель игры управляет процессом
- Real-time обновления через Socket.IO
- История последних 10 игр

## TODO (возможные улучшения)

- [ ] Таймер на размещение ставок
- [ ] Звуковые эффекты
- [ ] Анимация выигрыша
- [ ] Чат в игре
- [ ] Рейтинг игроков
- [ ] Статистика выигрышей
- [ ] Автоматический запуск следующего раунда
- [ ] VIP-комнаты с повышенными ставками
