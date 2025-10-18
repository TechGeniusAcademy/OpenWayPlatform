# 🚀 Быстрый деплой OpenWay Platform

## Для первого деплоя:

### 1. На сервере (194.110.55.56):
```bash
# Установка необходимого ПО
curl -fsSL https://raw.githubusercontent.com/TechGeniusAcademy/OpenWayPlatform/main/scripts/setup-server.sh | bash

# Клонирование проекта
cd /var/www/openway
git clone https://github.com/TechGeniusAcademy/OpenWayPlatform.git .

# Настройка .env
cd backend
nano .env  # Вставьте настройки из .env.production и измените пароли!

# Запуск
chmod +x ../deploy.sh
../deploy.sh
```

### 2. Настройка SSL:
```bash
sudo certbot --nginx -d openway.kz -d www.openway.kz
```

---

## Для обновлений (после push в GitHub):

### На локальной машине:
```bash
git add .
git commit -m "Описание изменений"
git push origin main
```

### На сервере:
```bash
cd /var/www/openway
./deploy.sh
```

**Готово!** 🎉

---

## Быстрая проверка работоспособности:

```bash
# Статус PM2
pm2 status

# Логи приложения
pm2 logs openway-backend --lines 50

# Проверка сайта
curl https://openway.kz
```
