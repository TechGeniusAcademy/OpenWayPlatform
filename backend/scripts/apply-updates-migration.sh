#!/bin/bash

# Скрипт для применения миграции fix_updates_table.sql на продакшене
# Использование: cd /var/www/openway/backend/scripts && bash apply-updates-migration.sh

echo "🔄 Применение миграции для таблицы updates..."

# Применяем миграцию напрямую через psql
psql postgresql://openway_user:Aq123123@localhost:5432/openway_db -f ../migrations/fix_updates_table.sql

if [ $? -eq 0 ]; then
    echo "✅ Миграция успешно применена!"
    echo "🔄 Перезапуск бэкенд сервера..."
    pm2 restart openway-backend
    echo "✅ Готово!"
else
    echo "❌ Ошибка применения миграции!"
    exit 1
fi
