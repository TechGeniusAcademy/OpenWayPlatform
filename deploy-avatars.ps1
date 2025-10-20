# Скрипт деплоя функционала аватаров на сервер

Write-Host "🚀 Начинаем деплой аватаров на openway.kz..." -ForegroundColor Green

# Подключаемся к серверу и выполняем команды
ssh ubuntu@194.110.55.56 @"
    echo '📦 Переходим в директорию проекта...'
    cd /var/www/openway
    
    echo '📥 Получаем последние изменения из GitHub...'
    git pull origin main
    
    echo '🗄️ Применяем миграцию для avatar_url...'
    cd backend
    PGPASSWORD='00000000' psql -U openway_user -d openway_platform -f migrations/add-avatar-field.sql
    
    echo '📁 Создаем директорию для аватаров...'
    mkdir -p uploads/avatars
    chmod 755 uploads/avatars
    
    echo '🔨 Собираем frontend...'
    cd ../frontend
    npm run build
    
    echo '🔄 Перезапускаем PM2...'
    cd ..
    pm2 restart all
    
    echo '✅ Деплой завершен успешно!'
"@

Write-Host "`n✅ Деплой аватаров завершен!" -ForegroundColor Green
Write-Host "🌐 Проверьте: https://openway.kz" -ForegroundColor Cyan
