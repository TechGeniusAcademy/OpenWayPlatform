import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Replicate from 'replicate';

// Инициализация AI клиентов
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY
});

// ============================================
// CODE ASSISTANT FUNCTIONS (Groq - Llama 3.3)
// ============================================

/**
 * Объяснить код
 * @param {string} code - Код для объяснения
 * @param {string} language - Язык программирования
 * @returns {Promise<string>} Объяснение кода
 */
export async function explainCode(code, language = 'javascript') {
  try {
    const prompt = `Ты опытный преподаватель программирования. Объясни следующий ${language} код простым и понятным языком. Объясни что делает код, как он работает, и какие концепции используются.

Код:
\`\`\`${language}
${code}
\`\`\`

Дай подробное объяснение на русском языке.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Ты опытный преподаватель программирования. Объясняй код простым и понятным языком, используя примеры из реальной жизни.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    return completion.choices[0]?.message?.content || 'Не удалось объяснить код';
  } catch (error) {
    console.error('Error explaining code:', error);
    throw new Error('Ошибка при объяснении кода: ' + error.message);
  }
}

/**
 * Исправить ошибки в коде
 * @param {string} code - Код с ошибкой
 * @param {string} error - Сообщение об ошибке
 * @param {string} language - Язык программирования
 * @returns {Promise<object>} {fixedCode, explanation}
 */
export async function fixCode(code, error, language = 'javascript') {
  try {
    const prompt = `Ты опытный программист. У меня есть ${language} код с ошибкой. Исправь код и объясни что было не так.

Код с ошибкой:
\`\`\`${language}
${code}
\`\`\`

Ошибка:
${error}

Верни ответ в формате:
1. Исправленный код (в блоке кода)
2. Объяснение проблемы
3. Как избежать такой ошибки в будущем`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Ты опытный программист. Исправляй ошибки в коде и давай полезные объяснения.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const response = completion.choices[0]?.message?.content || '';
    
    // Извлекаем исправленный код из блока кода
    const codeBlockMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
    const fixedCode = codeBlockMatch ? codeBlockMatch[1] : code;
    
    return {
      fixedCode,
      explanation: response
    };
  } catch (error) {
    console.error('Error fixing code:', error);
    throw new Error('Ошибка при исправлении кода: ' + error.message);
  }
}

/**
 * Оптимизировать код
 * @param {string} code - Код для оптимизации
 * @param {string} language - Язык программирования
 * @returns {Promise<object>} {optimizedCode, improvements}
 */
export async function optimizeCode(code, language = 'javascript') {
  try {
    const prompt = `Ты эксперт по оптимизации кода. Проанализируй следующий ${language} код и оптимизируй его.

Код:
\`\`\`${language}
${code}
\`\`\`

Верни:
1. Оптимизированный код (в блоке кода)
2. Список улучшений
3. Объяснение почему эти изменения улучшают код`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Ты эксперт по оптимизации кода. Фокусируйся на производительности, читаемости и best practices.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 2000
    });

    const response = completion.choices[0]?.message?.content || '';
    const codeBlockMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
    const optimizedCode = codeBlockMatch ? codeBlockMatch[1] : code;
    
    return {
      optimizedCode,
      improvements: response
    };
  } catch (error) {
    console.error('Error optimizing code:', error);
    throw new Error('Ошибка при оптимизации кода: ' + error.message);
  }
}

/**
 * Добавить комментарии к коду
 * @param {string} code - Код для комментирования
 * @param {string} language - Язык программирования
 * @returns {Promise<string>} Код с комментариями
 */
export async function addComments(code, language = 'javascript') {
  try {
    const prompt = `Добавь подробные и полезные комментарии к следующему ${language} коду. Комментарии должны объяснять что делает код, а не просто повторять очевидное.

Код:
\`\`\`${language}
${code}
\`\`\`

Верни только код с комментариями в блоке кода, без дополнительных объяснений.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Ты добавляешь полезные комментарии к коду. Комментарии должны быть информативными и помогать понять логику кода.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const response = completion.choices[0]?.message?.content || '';
    const codeBlockMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
    
    return codeBlockMatch ? codeBlockMatch[1] : response;
  } catch (error) {
    console.error('Error adding comments:', error);
    throw new Error('Ошибка при добавлении комментариев: ' + error.message);
  }
}

/**
 * Сгенерировать код по описанию
 * @param {string} description - Описание желаемой функциональности
 * @param {string} language - Язык программирования
 * @returns {Promise<object>} {code, explanation}
 */
export async function generateCode(description, language = 'javascript') {
  try {
    const prompt = `Создай ${language} код по следующему описанию:

${description}

Верни:
1. Рабочий код (в блоке кода)
2. Краткое объяснение как его использовать
3. Примеры использования (если применимо)`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Ты эксперт-программист. Создаешь чистый, эффективный и хорошо структурированный ${language} код с best practices.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 2000
    });

    const response = completion.choices[0]?.message?.content || '';
    const codeBlockMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
    const generatedCode = codeBlockMatch ? codeBlockMatch[1] : '';
    
    return {
      code: generatedCode,
      explanation: response
    };
  } catch (error) {
    console.error('Error generating code:', error);
    throw new Error('Ошибка при генерации кода: ' + error.message);
  }
}

/**
 * Общий чат с AI (для вопросов по программированию)
 * @param {string} message - Сообщение пользователя
 * @param {Array} history - История сообщений (опционально)
 * @returns {Promise<string>} Ответ AI
 */
export async function chatWithAI(message, history = []) {
  try {
    // Валидация и очистка истории
    const cleanHistory = Array.isArray(history) 
      ? history
          .filter(msg => msg && typeof msg === 'object' && msg.role && msg.content)
          .map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: String(msg.content || '')
          }))
      : [];

    const messages = [
      {
        role: 'system',
        content: 'Ты опытный наставник по программированию. Помогаешь студентам понять концепции, решать проблемы и учиться программированию. Отвечаешь на русском языке, используешь простые объяснения и примеры.'
      },
      ...cleanHistory,
      {
        role: 'user',
        content: message
      }
    ];

    console.log('Sending to Groq:', { messageCount: messages.length });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 1500
    });

    return completion.choices[0]?.message?.content || 'Извините, не смог сформировать ответ';
  } catch (error) {
    console.error('Error in chat:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Проверяем конкретные типы ошибок
    if (error.message?.includes('API key')) {
      throw new Error('Ошибка авторизации API. Проверьте ключ GROQ_API_KEY');
    }
    if (error.message?.includes('rate limit')) {
      throw new Error('Превышен лимит запросов. Попробуйте позже');
    }
    
    throw new Error('Ошибка при общении с AI: ' + error.message);
  }
}

// ==================================================
// HOMEWORK CHECKER & CODE REVIEW (Gemini)
// ==================================================

/**
 * Проверить домашнее задание
 * @param {string} studentCode - Код студента
 * @param {string} taskDescription - Описание задания
 * @param {string} language - Язык программирования
 * @returns {Promise<object>} {score, feedback, suggestions}
 */
export async function checkHomework(studentCode, taskDescription, language = 'javascript') {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Ты проверяешь домашнее задание по программированию. Оцени код студента.

Задание:
${taskDescription}

Код студента:
\`\`\`${language}
${studentCode}
\`\`\`

Верни оценку в формате:
1. Оценка (от 1 до 10)
2. Что сделано правильно
3. Что нужно исправить
4. Рекомендации по улучшению
5. Соблюдены ли best practices

Будь конструктивным и помогай студенту учиться.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Извлекаем оценку из ответа
    const scoreMatch = response.match(/оценка[:\s]*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 5;

    return {
      score,
      feedback: response,
      suggestions: response
    };
  } catch (error) {
    console.error('Error checking homework:', error);
    throw new Error('Ошибка при проверке домашнего задания: ' + error.message);
  }
}

/**
 * Code Review с рекомендациями
 * @param {string} code - Код для ревью
 * @param {string} language - Язык программирования
 * @returns {Promise<object>} {rating, issues, recommendations}
 */
export async function reviewCode(code, language = 'javascript') {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Проведи code review для следующего ${language} кода. Оцени качество и дай рекомендации.

Код:
\`\`\`${language}
${code}
\`\`\`

Проверь:
1. Безопасность
2. Производительность
3. Читаемость
4. Code style
5. Архитектурные решения
6. Потенциальные баги

Верни детальный отчет с оценкой от 1 до 10 и конкретными рекомендациями.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    const ratingMatch = response.match(/оценка[:\s]*(\d+)/i);
    const rating = ratingMatch ? parseInt(ratingMatch[1]) : 5;

    return {
      rating,
      review: response,
      issues: response,
      recommendations: response
    };
  } catch (error) {
    console.error('Error reviewing code:', error);
    throw new Error('Ошибка при ревью кода: ' + error.message);
  }
}

// Экспортируем все функции
export default {
  explainCode,
  fixCode,
  optimizeCode,
  addComments,
  generateCode,
  chatWithAI,
  checkHomework,
  reviewCode
};
