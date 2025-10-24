FROM node:18-alpine

WORKDIR /app

# Копируем package файлы
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем остальные файлы
COPY . .

# Создаем директории для загрузок
RUN mkdir -p uploads/avatars uploads/homework-files uploads/chat-files projects

# Открываем порт
EXPOSE 5000

# Запускаем сервер
CMD ["node", "server.js"]
