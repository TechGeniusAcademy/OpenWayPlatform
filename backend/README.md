# Backend API

## Установка и запуск

### 1. Установка зависимостей
```bash
npm install
```

### 2. Настройка базы данных PostgreSQL
1. Установите PostgreSQL если еще не установлен
2. Создайте базу данных:
```sql
CREATE DATABASE hakaton_db;
```

### 3. Настройка переменных окружения
1. Скопируйте `.env.example` в `.env`
2. Укажите свои данные для подключения к PostgreSQL

### 4. Запуск сервера
```bash
# Режим разработки (с автоперезагрузкой)
npm run dev

# Продакшн режим
npm start
```

## API Endpoints

### Авторизация

#### POST /api/auth/login
Вход в систему
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### GET /api/auth/me
Получить данные текущего пользователя (требуется токен)

### Управление пользователями (только для админов)

#### GET /api/users
Получить всех пользователей

#### POST /api/users
Создать нового пользователя
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "password123",
  "role": "student",
  "full_name": "Иван Иванов"
}
```

#### GET /api/users/:id
Получить пользователя по ID

#### PUT /api/users/:id
Обновить пользователя

#### DELETE /api/users/:id
Удалить пользователя

## Роли пользователей
- `admin` - администратор (может управлять пользователями)
- `student` - ученик (доступ к личному кабинету)

## Создание первого администратора

После запуска сервера, база данных будет создана автоматически. Для создания первого администратора выполните SQL запрос напрямую в базе данных:

```sql
INSERT INTO users (username, email, password, role, full_name) 
VALUES (
  'admin', 
  'admin@example.com', 
  '$2a$10$8Jg8/0HZEQqHxqYCJ5VqVuqYqYQ5K5y8KhXhxJ3QZ4Z5Y0Y5Y0Y5Y', -- пароль: admin123
  'admin', 
  'Администратор'
);
```

Или через API после создания первого пользователя с ролью admin вручную в БД, вы сможете создавать остальных через админ-панель.
