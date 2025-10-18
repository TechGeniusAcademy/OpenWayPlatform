#!/bin/bash

# Скрипт автоматической настройки сервера для OpenWay Platform
# Использование: curl -fsSL <URL> | bash

set -e

echo "🚀 Начало настройки сервера для OpenWay Platform..."

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Обновление системы
echo -e "${YELLOW}📦 Обновление системы...${NC}"
sudo apt update && sudo apt upgrade -y

# Установка Node.js 20.x
echo -e "${YELLOW}📦 Установка Node.js 20.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Проверка установки Node.js
node -v
npm -v

# Установка PostgreSQL
echo -e "${YELLOW}📦 Установка PostgreSQL...${NC}"
sudo apt install -y postgresql postgresql-contrib

# Установка Nginx
echo -e "${YELLOW}📦 Установка Nginx...${NC}"
sudo apt install -y nginx

# Установка PM2
echo -e "${YELLOW}📦 Установка PM2...${NC}"
sudo npm install -g pm2

# Установка Certbot для SSL
echo -e "${YELLOW}📦 Установка Certbot...${NC}"
sudo apt install -y certbot python3-certbot-nginx

# Установка Git
echo -e "${YELLOW}📦 Установка Git...${NC}"
sudo apt install -y git

# Создание директории проекта
echo -e "${YELLOW}📁 Создание директории проекта...${NC}"
sudo mkdir -p /var/www/openway
sudo chown -R $USER:$USER /var/www/openway

# Настройка Firewall
echo -e "${YELLOW}🔥 Настройка Firewall...${NC}"
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Настройка PostgreSQL
echo -e "${YELLOW}🗄️  Настройка PostgreSQL...${NC}"
echo -e "${YELLOW}⚠️  Создайте базу данных вручную:${NC}"
echo "sudo -u postgres psql"
echo "CREATE DATABASE openway_platform;"
echo "CREATE USER openway_user WITH PASSWORD '00000000';"
echo "GRANT ALL PRIVILEGES ON DATABASE openway_platform TO openway_user;"
echo "\\q"

echo -e "${GREEN}✅ Базовая настройка сервера завершена!${NC}"
echo -e "${YELLOW}📝 Следующие шаги:${NC}"
echo "1. Настройте PostgreSQL (команды выше)"
echo "2. Клонируйте проект: cd /var/www/openway && git clone <repo-url> ."
echo "3. Настройте .env файлы"
echo "4. Запустите ./deploy.sh"
echo "5. Настройте SSL: sudo certbot --nginx -d openway.kz -d www.openway.kz"
