# Crash Game - Исправление AuthContext

## Проблема
При загрузке Crash игры возникала ошибка: `[CRASH] No userId or token found`

### Причина
Код пытался получить `userId` из `localStorage`:
```javascript
const userId = localStorage.getItem('userId');
```

Но `AuthContext` никогда не сохраняет `userId` в localStorage - только токен. Объект пользователя хранится в React state.

## Решение

### 1. Импорт AuthContext
```javascript
import { useAuth } from '../context/AuthContext';
```

### 2. Использование useAuth хука
```javascript
const { user } = useAuth();
```

### 3. Замена всех обращений к localStorage.getItem('userId')

**WebSocket подключение (строка 74-90):**
```javascript
// БЫЛО:
const userId = parseInt(localStorage.getItem('userId'));

// СТАЛО:
const userId = user.id;

// Добавлена проверка загрузки user:
if (!user) {
  console.log('[CRASH] Waiting for user to load...');
  return;
}
```

**Обработчик crash:current-game (строка 194):**
```javascript
// БЫЛО:
const userId = parseInt(localStorage.getItem('userId'));
const myBet = data.bets.find(bet => bet.user_id === userId && bet.status === 'active');

// СТАЛО:
if (user && user.id) {
  const myBet = data.bets.find(bet => bet.user_id === user.id && bet.status === 'active');
  if (myBet) {
    setCurrentBet(myBet);
  }
}
```

### 4. Обновление зависимостей useEffect
```javascript
// БЫЛО:
}, []);

// СТАЛО:
}, [user]); // Подключаемся когда user загружен
```

### 5. Добавлен Loading State
```javascript
// Проверяем загружен ли пользователь
if (!user) {
  return (
    <div className="crash-game">
      <div className="crash-header">
        <h1>🚀 Crash Game</h1>
      </div>
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Загрузка...</p>
      </div>
    </div>
  );
}
```

### 6. Улучшение fetchBalance
```javascript
const fetchBalance = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token || !user) {
      console.error('[CRASH] No token or user');
      return 0;
    }
    
    const response = await fetch(`${API_URL}/api/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('[CRASH] User data:', data);
      console.log('[CRASH] User balance:', data.points);
      setBalance(data.points);
      return data.points;
    }
    return 0;
  } catch (error) {
    console.error('[CRASH] Error fetching balance:', error);
    return 0;
  }
};
```

## Результат

✅ Исправлена ошибка аутентификации
✅ userId корректно получается из AuthContext
✅ Добавлен loading state пока пользователь загружается
✅ WebSocket подключается только когда user загружен
✅ Все проверки наличия user перед использованием user.id

## Как работает

1. Компонент монтируется
2. Проверяет `if (!user)` - показывает "Загрузка..."
3. AuthContext загружает пользователя
4. useEffect срабатывает с зависимостью `[user]`
5. Подключается WebSocket с `user.id`
6. Регистрирует socket: `socket.emit('register', userId)`
7. Присоединяется к игре: `socket.emit('crash:join')`
8. Получает текущее состояние игры
9. Готово к ставкам!

## Тестирование

1. Перезагрузите фронтенд
2. Откройте Crash игру
3. Проверьте консоль браузера:
   - `[CRASH] Connecting with userId: X`
   - `[CRASH] User object: {id: X, username: "..."}`
   - `[CRASH] Connected to Crash game, socket ID: ...`
   - `[CRASH] Registering with userId: X`

4. Проверьте консоль сервера:
   - `✅ Пользователь X зарегистрирован`
   - `[CRASH] Place bet request from socket: ...`

5. Попробуйте сделать ставку
6. Проверьте обновление баланса
