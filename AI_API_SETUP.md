# 🤖 Настройка AI API ключей для OpenWay Platform

## Этап 1: Получение API ключей

### 1. Groq API (для Code Assistant) ⚡
**Бесплатно:** 14,400 запросов/день, очень быстро

**Шаги:**
1. Перейдите на https://console.groq.com/
2. Зарегистрируйтесь через Google/GitHub
3. Перейдите в раздел "API Keys"
4. Нажмите "Create API Key"
5. Скопируйте ключ (начинается с `gsk_...`)
6. Добавьте в `backend/.env`: `GROQ_API_KEY=gsk_...`

**Используется для:**
- Объяснение кода
- Исправление ошибок
- Оптимизация кода
- Генерация кода
- AI чат-ассистент

---

### 2. Replicate API (для генерации изображений) 🎨
**Бесплатно:** 50 генераций/день

**Шаги:**
1. Перейдите на https://replicate.com/
2. Зарегистрируйтесь
3. Перейдите в https://replicate.com/account/api-tokens
4. Скопируйте токен (начинается с `r8_...`)
5. Добавьте в `backend/.env`: `REPLICATE_API_KEY=r8_...`

**Используется для:**
- Генерация обложек проектов
- Создание аватаров
- Генерация иллюстраций

**Модели:**
- `stability-ai/sdxl` - основная модель для изображений
- Высокое качество, ~10-20 секунд генерация

---

### 3. Google Gemini API (для анализа и документации) 📚
**Бесплатно:** 60 запросов/минуту, 1500 запросов/день

**Шаги:**
1. Перейдите на https://makersuite.google.com/app/apikey
2. Войдите с Google аккаунтом
3. Нажмите "Create API Key"
4. Выберите проект или создайте новый
5. Скопируйте ключ (начинается с `AIza...`)
6. Добавьте в `backend/.env`: `GEMINI_API_KEY=AIza...`

**Используется для:**
- Проверка домашних заданий
- Генерация документации
- Code review
- Генерация тестов и заданий
- Проверка на плагиат

---

## Проверка установки

После получения всех ключей, ваш `backend/.env` должен выглядеть так:

```env
# AI API Keys
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
REPLICATE_API_KEY=r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Тестирование

1. Перезапустите backend сервер:
```bash
cd backend
npm run dev
```

2. Проверьте консоль на наличие ошибок

3. После создания AI endpoints, можно протестировать через curl:

```bash
# Тест Groq API (Code Assistant)
curl -X POST http://localhost:5000/api/ai/explain-code \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"code": "console.log(\"Hello World\")", "language": "javascript"}'
```

## Ограничения бесплатных тарифов

| API | Лимит запросов | Лимит генераций | Скорость |
|-----|----------------|-----------------|----------|
| **Groq** | 14,400/день | - | ⚡⚡⚡ Очень быстро |
| **Replicate** | - | 50/день | ⚡⚡ Средне (10-20 сек) |
| **Gemini** | 1,500/день (60/мин) | - | ⚡⚡⚡ Быстро |

## Мониторинг использования

- **Groq:** https://console.groq.com/usage
- **Replicate:** https://replicate.com/account/billing
- **Gemini:** https://console.cloud.google.com/apis/dashboard

## Что дальше?

После настройки API ключей:

✅ **Этап 1 завершен!**

📌 **Следующий этап:** Создание AI Service (backend/services/aiService.js)

---

## Troubleshooting

**Ошибка "Invalid API key":**
- Проверьте, что ключ скопирован полностью
- Убедитесь, что нет пробелов в начале/конце
- Перезапустите backend сервер

**Ошибка "Rate limit exceeded":**
- Подождите до следующего дня
- Уменьшите количество запросов
- Добавьте кэширование (будет в этапе 21)

**Ошибка "API endpoint not found":**
- Убедитесь, что backend сервер запущен
- Проверьте, что routes подключены в server.js
- Убедитесь, что вы прошли аутентификацию

---

## Полезные ссылки

- **Groq Documentation:** https://console.groq.com/docs
- **Replicate Documentation:** https://replicate.com/docs
- **Gemini API Documentation:** https://ai.google.dev/docs

---

**Статус:** ✅ Этап 1 выполнен!
**Следующий шаг:** Создание AI Service для Code Assistant
