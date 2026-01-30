#!/bin/bash
# Скрипт настройки VPS для OpenWay Platform
# Запускать на VPS после первого входа

set -e

echo "🚀 Начинаем настройку VPS для OpenWay..."

# Обновление системы
echo "📦 Обновление системы..."
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
echo "📦 Установка Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Установка PostgreSQL
echo "📦 Установка PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Установка Nginx
echo "📦 Установка Nginx..."
sudo apt install -y nginx

# Установка Certbot для SSL
echo "📦 Установка Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Установка Git
echo "📦 Установка Git..."
sudo apt install -y git

# Установка PM2
echo "📦 Установка PM2..."
sudo npm install -g pm2

# Создание директории проекта
echo "📁 Создание директории проекта..."
sudo mkdir -p /var/www/openway
sudo chown -R ubuntu:ubuntu /var/www/openway

# Настройка PostgreSQL
echo "🗄️ Настройка PostgreSQL..."
sudo -u postgres psql -c "CREATE USER openway WITH PASSWORD 'OpenWay2026SecurePass!';" || true
sudo -u postgres psql -c "CREATE DATABASE openway_platform OWNER openway;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE openway_platform TO openway;" || true

# Клонирование репозитория (замените URL на ваш)
echo "📥 Клонирование репозитория..."
cd /var/www/openway
# git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git . || true

echo "✅ Базовая настройка завершена!"
echo ""
echo "Следующие шаги:"
echo "1. Склонируйте репозиторий: git clone YOUR_REPO_URL /var/www/openway"
echo "2. Настройте .env файл"
echo "3. Установите зависимости: npm install"
echo "4. Запустите миграции"
echo "5. Настройте Nginx"
echo "6. Получите SSL сертификат"
