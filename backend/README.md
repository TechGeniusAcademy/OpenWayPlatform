# Backend API

## Технологический стек

### Основные технологии:
- **Node.js** + **Express.js** - Backend сервер
- **PostgreSQL** - Основная база данных (пользователи, курсы, чаты, проекты)
- **MongoDB** - База данных для тестов
- **Socket.IO** - WebSocket для реального времени (чат, уведомления)
- **Docker** - Контейнеризация PostgreSQL баз данных для студентов
- **JWT** - Аутентификация

## Установка и запуск

### 1. Установка зависимостей
```bash
npm install
```

### 2. Настройка баз данных

#### PostgreSQL (основная БД):
1. Установите PostgreSQL если еще не установлен
2. Создайте базу данных:
```sql
CREATE DATABASE hakaton_db;
```

#### MongoDB (для тестов):
1. Установите MongoDB или используйте MongoDB Atlas
2. Создайте базу данных `test_db`

#### Docker (для студенческих БД):
1. Установите Docker Desktop
2. Docker используется для создания изолированных PostgreSQL контейнеров для каждого студента

### 3. Настройка переменных окружения
1. Скопируйте `.env.example` в `.env`
2. Укажите свои данные:

```env
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=hakaton_db

# MongoDB
MONGODB_URI=mongodb://localhost:27017/test_db

# JWT
JWT_SECRET=your_jwt_secret_key

# Server
PORT=5000
NODE_ENV=development

# Docker (для студенческих БД)
DOCKER_HOST=tcp://localhost:2375
```

### 4. Инициализация баз данных

#### Автоматическая инициализация:
При первом запуске сервер автоматически создаст все необходимые таблицы в PostgreSQL:
- users (пользователи)
- groups (группы студентов)
- courses (курсы)
- lessons (уроки)
- homeworks (домашние задания)
- homework_submissions (сдача ДЗ)
- tests (тесты)
- test_attempts (попытки прохождения)
- chats (чаты)
- chat_participants (участники чатов)
- messages (сообщения)
- projects (проекты студентов)
- project_submissions (сдача проектов)
- shop_items (магазин: темы, плагины, рамки)
- user_inventory (инвентарь студентов)
- points_history (история начисления баллов)

### 5. Запуск сервера
```bash
# Режим разработки (с автоперезагрузкой)
npm run dev

# Продакшн режим
npm start
```

Сервер запустится на `http://localhost:5000`

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
