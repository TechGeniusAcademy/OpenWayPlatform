# 🚀 Инструкция по деплою OpenWay Platform

## Информация о сервере
- **IP**: 194.110.55.56
- **Домен**: openway.kz
- **ОС**: Ubuntu
- **Стек**: Node.js + React + PostgreSQL + Nginx + PM2

---

## 📋 Предварительные требования на сервере

### 1. Подключение к серверу
```bash
ssh root@194.110.55.56
# или
ssh your_user@194.110.55.56
```

### 2. Установка необходимого ПО

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Установка PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Установка Nginx
sudo apt install -y nginx

# Установка PM2 глобально
sudo npm install -g pm2

# Установка Git
sudo apt install -y git
```

### 3. Настройка PostgreSQL

```bash
# Войти в PostgreSQL
sudo -u postgres psql

# Выполнить SQL команды:
CREATE DATABASE openway_platform;
CREATE USER openway_user WITH PASSWORD 'ВАШ_СЛОЖНЫЙ_ПАРОЛЬ';
GRANT ALL PRIVILEGES ON DATABASE openway_platform TO openway_user;
\q
```

### 4. Настройка Firewall

```bash
# Разрешить HTTP, HTTPS и SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 📦 Первоначальный деплой

### 1. Создание директории проекта

```bash
# Создать директорию для проекта
sudo mkdir -p /var/www/openway
sudo chown -R $USER:$USER /var/www/openway
cd /var/www/openway
```

### 2. Клонирование репозитория

```bash
# Клонировать репозиторий (замените на ваш URL)
git clone https://github.com/TechGeniusAcademy/OpenWayPlatform.git .

# Или через SSH (если настроили SSH ключи)
git clone git@github.com:TechGeniusAcademy/OpenWayPlatform.git .
```

### 3. Настройка Backend

```bash
cd /var/www/openway/backend

# Скопировать production env файл
cp .env.production .env

# ВАЖНО: Отредактировать .env файл с реальными данными!
nano .env

# Изменить:
# - DB_PASSWORD (пароль от PostgreSQL)
# - JWT_SECRET (случайная строка минимум 32 символа)
# - ADMIN_PASSWORD (пароль администратора)

# Установить зависимости
npm install --production

# Создать необходимые директории
mkdir -p uploads/avatars uploads/cards logs

# Инициализировать базу данных (запустится автоматически при старте)
```

### 4. Настройка Frontend

```bash
cd /var/www/openway/frontend

# Создать .env.production файл
cat > .env.production << 'EOF'
VITE_API_URL=https://openway.kz/api
EOF

# Установить зависимости
npm install

# Собрать production версию
npm run build
```

### 5. Запуск Backend с PM2

```bash
cd /var/www/openway/backend

# Запустить приложение
pm2 start ecosystem.config.js

# Сохранить конфигурацию PM2
pm2 save

# Настроить автозапуск при перезагрузке сервера
pm2 startup
# Скопируйте и выполните команду, которую выдаст PM2
```

### 6. Настройка Nginx

```bash
# Скопировать конфигурацию Nginx
sudo cp /var/www/openway/nginx/openway.kz.conf /etc/nginx/sites-available/openway.kz

# Создать символическую ссылку
sudo ln -s /etc/nginx/sites-available/openway.kz /etc/nginx/sites-enabled/

# Удалить дефолтную конфигурацию (если есть)
sudo rm /etc/nginx/sites-enabled/default

# Проверить конфигурацию Nginx
sudo nginx -t

# Перезапустить Nginx
sudo systemctl restart nginx
```

### 7. Установка SSL сертификата (Let's Encrypt)

```bash
# Установить Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получить сертификат
sudo certbot --nginx -d openway.kz -d www.openway.kz

# Выбрать опцию 2 (перенаправление на HTTPS)

# Или использовать подготовленную SSL конфигурацию:
# После получения сертификата:
sudo cp /var/www/openway/nginx/openway.kz-ssl.conf /etc/nginx/sites-available/openway.kz
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔄 Обновление проекта (при новых изменениях)

### Способ 1: Автоматический (с использованием скрипта)

```bash
# На сервере
cd /var/www/openway
chmod +x deploy.sh
./deploy.sh
```

### Способ 2: Ручной

```bash
# 1. Получить изменения
cd /var/www/openway
git pull origin main

# 2. Обновить Backend
cd backend
npm install --production
pm2 reload ecosystem.config.js

# 3. Обновить Frontend
cd ../frontend
npm install
npm run build

# 4. Проверить статус
pm2 status
```

---

## 🛠️ Полезные команды

### PM2
```bash
# Просмотр логов
pm2 logs openway-backend

# Просмотр статуса
pm2 status

# Перезапуск
pm2 restart openway-backend

# Остановка
pm2 stop openway-backend

# Мониторинг
pm2 monit
```

### Nginx
```bash
# Проверка конфигурации
sudo nginx -t

# Перезапуск
sudo systemctl restart nginx

# Просмотр логов
sudo tail -f /var/log/nginx/openway_error.log
sudo tail -f /var/log/nginx/openway_access.log
```

### PostgreSQL
```bash
# Подключение к БД
sudo -u postgres psql -d openway_platform

# Создание бэкапа
sudo -u postgres pg_dump openway_platform > backup_$(date +%Y%m%d).sql

# Восстановление из бэкапа
sudo -u postgres psql openway_platform < backup_20241018.sql
```

### Git
```bash
# Проверка статуса
git status

# Посмотреть коммиты
git log --oneline -10

# Откатить к определенному коммиту
git reset --hard COMMIT_HASH
```

---

## 🔐 Безопасность

### 1. Настройка SSH (опционально, но рекомендуется)

```bash
# Создать SSH ключ на локальной машине (если еще нет)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Скопировать публичный ключ на сервер
ssh-copy-id root@194.110.55.56

# На сервере: отключить вход по паролю
sudo nano /etc/ssh/sshd_config
# Изменить: PasswordAuthentication no
sudo systemctl restart sshd
```

### 2. Настройка автоматического обновления SSL

```bash
# Certbot автоматически создаст cron задачу
# Проверить можно так:
sudo certbot renew --dry-run
```

### 3. Регулярные бэкапы

```bash
# Создать cron задачу для бэкапов БД
crontab -e

# Добавить строку (бэкап каждый день в 3:00)
0 3 * * * sudo -u postgres pg_dump openway_platform > /var/backups/openway_$(date +\%Y\%m\%d).sql
```

---

## 📊 Мониторинг

### Проверка работоспособности

```bash
# Проверить работу Backend
curl http://localhost:5000/api/health

# Проверить работу Frontend
curl https://openway.kz

# Проверить статус всех сервисов
sudo systemctl status nginx
sudo systemctl status postgresql
pm2 status
```

### Просмотр использования ресурсов

```bash
# CPU и память
htop
# или
top

# Диск
df -h

# PM2 monitoring
pm2 monit
```

---

## 🐛 Решение проблем

### Backend не запускается
```bash
# Проверить логи
pm2 logs openway-backend

# Проверить порт
sudo netstat -tlnp | grep 5000

# Проверить .env файл
cd /var/www/openway/backend
cat .env
```

### Frontend показывает ошибки API
```bash
# Проверить конфигурацию Nginx
sudo nginx -t

# Проверить логи Nginx
sudo tail -f /var/log/nginx/openway_error.log

# Проверить CORS настройки в backend
```

### База данных не подключается
```bash
# Проверить статус PostgreSQL
sudo systemctl status postgresql

# Проверить подключение
sudo -u postgres psql -d openway_platform

# Проверить права пользователя
sudo -u postgres psql
\du
```

---

## 📞 Контакты и поддержка

При возникновении проблем:
1. Проверить логи PM2: `pm2 logs`
2. Проверить логи Nginx: `sudo tail -f /var/log/nginx/openway_error.log`
3. Проверить статус сервисов: `pm2 status && sudo systemctl status nginx`

**Email**: alkawmaga@gmail.com

---

## ✅ Чеклист после деплоя

- [ ] Сервер доступен по SSH
- [ ] Node.js, PostgreSQL, Nginx установлены
- [ ] База данных создана и настроена
- [ ] Проект склонирован из Git
- [ ] .env файлы настроены с реальными данными
- [ ] Backend запущен через PM2
- [ ] Frontend собран и развернут
- [ ] Nginx настроен и запущен
- [ ] SSL сертификат получен и настроен
- [ ] Сайт открывается по адресу https://openway.kz
- [ ] Можно войти в админ-панель
- [ ] PM2 настроен на автозапуск
- [ ] Скрипт deploy.sh работает корректно


# На сервере выполните:
cd /var/www/openway
git pull origin main
cd frontend
npm install
npm run build
pm2 restart openway-backend
pm2 status
pm2 logs openway-backend --lines 30