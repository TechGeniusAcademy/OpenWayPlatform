#!/bin/bash

# Скрипт для применения миграции fix_updates_table.sql на продакшене
# Использование: ./apply-updates-migration.sh

echo "🔄 Применение миграции для таблицы updates..."

# Переходим в директорию migrations
cd /var/www/openway/backend/migrations

# Применяем миграцию
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f fix_updates_table.sql

if [ $? -eq 0 ]; then
    echo "✅ Миграция успешно применена!"
else
    echo "❌ Ошибка применения миграции!"
    exit 1
fi

echo "🔄 Перезапуск бэкенд сервера..."
pm2 restart openway-backend

echo "✅ Готово!"
