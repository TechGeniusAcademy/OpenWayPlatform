# 🚀 Инструкция по развертыванию (Deployment)

## Технологический стек

### Backend:
- **Node.js** v18+ с Express.js
- **PostgreSQL** 15+ (основная БД: пользователи, курсы, чаты, проекты)
- **MongoDB** 7+ (тесты и результаты тестирования)
- **Socket.IO** (WebSocket для чата и реального времени)
- **Docker** (для создания изолированных БД студентов)

### Frontend:
- **React** 18+ с Vite
- **Monaco Editor** (встроенная IDE)
- **Socket.IO Client** (WebSocket клиент)
- **Nginx** (веб-сервер для продакшн)

---

## 📋 Предварительные требования

1. **Docker** и **Docker Compose** установлены
2. **Git** для клонирования репозитория
3. Открытые порты:
   - `80` (HTTP)
   - `443` (HTTPS, опционально)
   - `5000` (Backend API)
   - `5432` (PostgreSQL)
   - `27017` (MongoDB)

---

## 🛠️ Быстрый старт с Docker Compose

### 1. Клонирование репозитория

```bash
git clone https://github.com/TechGeniusAcademy/OpenWayPlatform.git
cd OpenWayPlatform
```

### 2. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```bash
cp .env.example .env
```

Отредактируйте `.env` и укажите свои данные:

```env
# PostgreSQL
DB_PASSWORD=your_secure_postgres_password

# JWT
JWT_SECRET=your_very_secure_random_jwt_secret_key_change_this

# Первый администратор
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_secure_admin_password
ADMIN_FULL_NAME=Главный Администратор
```

### 3. Запуск всех сервисов

```bash
docker-compose up -d
```

Это запустит:
- ✅ PostgreSQL (порт 5432)
- ✅ MongoDB (порт 27017)
- ✅ Backend API (порт 5000)
- ✅ Frontend (порт 80)

### 4. Проверка статуса

```bash
docker-compose ps
```

Все сервисы должны быть в статусе `Up`.

### 5. Просмотр логов

```bash
# Все логи
docker-compose logs -f

# Только backend
docker-compose logs -f backend

# Только frontend
docker-compose logs -f frontend
```

### 6. Доступ к приложению

Откройте браузер и перейдите на:
- **Frontend**: `http://localhost` или `http://your-server-ip`
- **Backend API**: `http://localhost:5000/api`

Войдите с данными администратора из `.env`:
- **Email**: тот что указали в `ADMIN_EMAIL`
- **Пароль**: тот что указали в `ADMIN_PASSWORD`

---

## 🔧 Ручная установка (без Docker)

### Backend

#### 1. Установка PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Создание БД
sudo -u postgres psql
CREATE DATABASE hakaton_db;
CREATE USER postgres WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE hakaton_db TO postgres;
\q
```

#### 2. Установка MongoDB

```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### 3. Установка Docker (для студенческих БД)

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

#### 4. Настройка Backend

```bash
cd backend

# Установка зависимостей
npm install

# Настройка .env
cp .env.example .env
nano .env  # Укажите свои данные

# Запуск
npm run dev  # Разработка
npm start    # Продакшн
```

#### 5. Настройка PM2 (для продакшн)

```bash
npm install -g pm2

cd backend
pm2 start server.js --name hakaton-backend
pm2 startup
pm2 save
```

### Frontend

#### 1. Сборка

```bash
cd frontend

# Установка зависимостей
npm install

# Настройка .env.production
nano .env.production
# Укажите: VITE_API_URL=http://your-server-ip:5000

# Сборка
npm run build
```

#### 2. Настройка Nginx

```bash
sudo apt install nginx

# Копируем конфиг
sudo cp nginx.conf /etc/nginx/sites-available/hakaton
sudo ln -s /etc/nginx/sites-available/hakaton /etc/nginx/sites-enabled/

# Копируем собранное приложение
sudo mkdir -p /var/www/hakaton
sudo cp -r dist/* /var/www/hakaton/

# Перезапускаем nginx
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔐 Настройка HTTPS (SSL)

### С помощью Let's Encrypt (Certbot)

```bash
sudo apt install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Автообновление
sudo certbot renew --dry-run
```

### В docker-compose

Раскомментируйте SSL секцию в `docker-compose.yml` и добавьте volumes с сертификатами:

```yaml
volumes:
  - ./ssl/cert.pem:/etc/nginx/ssl/cert.pem
  - ./ssl/key.pem:/etc/nginx/ssl/key.pem
```

---

## 📊 Мониторинг и обслуживание

### Проверка работоспособности

```bash
# Backend healthcheck
curl http://localhost:5000/api/health

# PostgreSQL
docker exec hakaton_postgres pg_isready -U postgres

# MongoDB
docker exec hakaton_mongodb mongosh --eval "db.runCommand('ping')"
```

### Резервное копирование

#### PostgreSQL

```bash
# Backup
docker exec hakaton_postgres pg_dump -U postgres hakaton_db > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i hakaton_postgres psql -U postgres hakaton_db < backup_20241024.sql
```

#### MongoDB

```bash
# Backup
docker exec hakaton_mongodb mongodump --out /backup

# Restore
docker exec hakaton_mongodb mongorestore /backup
```

### Обновление приложения

```bash
# Остановка сервисов
docker-compose down

# Получение обновлений
git pull origin main

# Пересборка и запуск
docker-compose up -d --build

# Проверка логов
docker-compose logs -f
```

---

## 🐛 Решение проблем

### Backend не запускается

```bash
# Проверьте логи
docker-compose logs backend

# Проверьте подключение к БД
docker exec hakaton_postgres psql -U postgres -d hakaton_db -c "SELECT 1;"
```

### WebSocket не работает (чат)

1. Проверьте, что порты не блокированы файрволом
2. В nginx.conf должны быть настройки для `/socket.io`
3. Проверьте CORS настройки в `backend/server.js`

### Docker контейнеры для студентов не создаются

```bash
# Проверьте доступ к Docker socket
ls -la /var/run/docker.sock

# Дайте права (осторожно!)
sudo chmod 666 /var/run/docker.sock
```

---

## 📱 Настройка для продакшн

### 1. Безопасность

- ✅ Используйте сильные пароли в `.env`
- ✅ Настройте файрвол (UFW/iptables)
- ✅ Включите HTTPS
- ✅ Регулярно обновляйте зависимости
- ✅ Настройте rate limiting в nginx

### 2. Производительность

```nginx
# В nginx.conf добавьте кэширование
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g;
proxy_cache my_cache;
proxy_cache_valid 200 1h;
```

### 3. Мониторинг

Рекомендуется установить:
- **Prometheus** + **Grafana** - метрики
- **ELK Stack** - логи
- **PM2 Monitoring** - Node.js процессы

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи: `docker-compose logs`
2. Изучите документацию: `backend/README.md`
3. Создайте issue на GitHub

**Автор**: TechGeniusAcademy  
**Репозиторий**: https://github.com/TechGeniusAcademy/OpenWayPlatform
