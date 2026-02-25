#!/bin/bash

# Скрипт деплоя OpenWay Platform
# Запускать на сервере в директории проекта

echo "🚀 Начало деплоя OpenWay Platform..."

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Проверка, что скрипт запущен из правильной директории
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Ошибка: Запустите скрипт из корневой директории проекта${NC}"
    exit 1
fi

# 1. Получение последних изменений из Git
echo -e "${YELLOW}📥 Получение изменений из Git...${NC}"
git pull origin main
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Ошибка при получении изменений из Git${NC}"
    exit 1
fi

# 2. Установка зависимостей Backend
echo -e "${YELLOW}📦 Установка зависимостей Backend...${NC}"
cd backend
npm install --production
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Ошибка при установке зависимостей Backend${NC}"
    exit 1
fi

# 3. Создание необходимых директорий
echo -e "${YELLOW}📁 Создание директорий для uploads...${NC}"
mkdir -p uploads/avatars uploads/cards logs

# 4. Установка зависимостей Frontend
echo -e "${YELLOW}📦 Установка зависимостей Frontend...${NC}"
cd ../frontend
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Ошибка при установке зависимостей Frontend${NC}"
    exit 1
fi

# 5. Сборка Frontend
echo -e "${YELLOW}🔨 Сборка Frontend...${NC}"
export NODE_OPTIONS=--max-old-space-size=4096
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Ошибка при сборке Frontend${NC}"
    exit 1
fi

# 6. Перезапуск Backend с PM2
echo -e "${YELLOW}🔄 Перезапуск Backend...${NC}"
cd ../backend
pm2 reload ecosystem.config.cjs --update-env
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  PM2 процесс не найден, запускаем заново...${NC}"
    pm2 start ecosystem.config.cjs
fi

# 7. Сохранение PM2 конфигурации
pm2 save

# 8. Проверка статуса
echo -e "${YELLOW}📊 Статус приложения:${NC}"
pm2 status

echo -e "${GREEN}✅ Деплой завершен успешно!${NC}"
echo -e "${GREEN}🌐 Сайт доступен по адресу: https://openway.kz${NC}"
echo -e "${YELLOW}📝 Для просмотра логов используйте: pm2 logs openway-backend${NC}"
