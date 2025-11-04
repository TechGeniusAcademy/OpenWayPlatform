import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as aiService from '../services/aiService.js';

const router = express.Router();

// ============================================
// CODE ASSISTANT ENDPOINTS
// ============================================

/**
 * POST /api/ai/explain-code
 * Объяснить код
 */
router.post('/explain-code', authenticate, async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Код не предоставлен' });
    }

    const explanation = await aiService.explainCode(code, language || 'javascript');

    res.json({
      success: true,
      explanation
    });
  } catch (error) {
    console.error('Error in explain-code:', error);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при объяснении кода',
      error: error.message 
    });
  }
});

/**
 * POST /api/ai/fix-code
 * Исправить ошибки в коде
 */
router.post('/fix-code', authenticate, async (req, res) => {
  try {
    const { code, error, language } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Код не предоставлен' });
    }

    const result = await aiService.fixCode(code, error || 'Неизвестная ошибка', language || 'javascript');

    res.json({
      success: true,
      fixedCode: result.fixedCode,
      explanation: result.explanation
    });
  } catch (error) {
    console.error('Error in fix-code:', error);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при исправлении кода',
      error: error.message 
    });
  }
});

/**
 * POST /api/ai/optimize-code
 * Оптимизировать код
 */
router.post('/optimize-code', authenticate, async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Код не предоставлен' });
    }

    const result = await aiService.optimizeCode(code, language || 'javascript');

    res.json({
      success: true,
      optimizedCode: result.optimizedCode,
      improvements: result.improvements
    });
  } catch (error) {
    console.error('Error in optimize-code:', error);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при оптимизации кода',
      error: error.message 
    });
  }
});

/**
 * POST /api/ai/add-comments
 * Добавить комментарии к коду
 */
router.post('/add-comments', authenticate, async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Код не предоставлен' });
    }

    const commentedCode = await aiService.addComments(code, language || 'javascript');

    res.json({
      success: true,
      commentedCode
    });
  } catch (error) {
    console.error('Error in add-comments:', error);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при добавлении комментариев',
      error: error.message 
    });
  }
});

/**
 * POST /api/ai/generate-code
 * Сгенерировать код по описанию
 */
router.post('/generate-code', authenticate, async (req, res) => {
  try {
    const { description, language } = req.body;

    if (!description) {
      return res.status(400).json({ message: 'Описание не предоставлено' });
    }

    const result = await aiService.generateCode(description, language || 'javascript');

    res.json({
      success: true,
      code: result.code,
      explanation: result.explanation
    });
  } catch (error) {
    console.error('Error in generate-code:', error);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при генерации кода',
      error: error.message 
    });
  }
});

/**
 * POST /api/ai/chat
 * Общий чат с AI помощником
 */
router.post('/chat', authenticate, async (req, res) => {
  try {
    const { message, history, code, language } = req.body;

    if (!message) {
      return res.status(400).json({ 
        success: false,
        message: 'Сообщение не предоставлено' 
      });
    }

    // Добавляем контекст кода если есть
    let contextMessage = message;
    if (code) {
      contextMessage = `Контекст:\n\`\`\`${language || 'javascript'}\n${code}\n\`\`\`\n\nВопрос: ${message}`;
    }

    const response = await aiService.chatWithAI(contextMessage, history || []);

    res.json({
      success: true,
      response
    });
  } catch (error) {
    console.error('Error in chat:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при общении с AI',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ============================================
// HOMEWORK & CODE REVIEW ENDPOINTS
// ============================================

/**
 * POST /api/ai/check-homework
 * Проверить домашнее задание
 */
router.post('/check-homework', authenticate, async (req, res) => {
  try {
    const { code, taskDescription, language } = req.body;

    if (!code || !taskDescription) {
      return res.status(400).json({ message: 'Код и описание задания обязательны' });
    }

    const result = await aiService.checkHomework(code, taskDescription, language || 'javascript');

    res.json({
      success: true,
      score: result.score,
      feedback: result.feedback,
      suggestions: result.suggestions
    });
  } catch (error) {
    console.error('Error in check-homework:', error);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при проверке домашнего задания',
      error: error.message 
    });
  }
});

/**
 * POST /api/ai/review-code
 * Code review с рекомендациями
 */
router.post('/review-code', authenticate, async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Код не предоставлен' });
    }

    const result = await aiService.reviewCode(code, language || 'javascript');

    res.json({
      success: true,
      rating: result.rating,
      review: result.review,
      issues: result.issues,
      recommendations: result.recommendations
    });
  } catch (error) {
    console.error('Error in review-code:', error);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка при ревью кода',
      error: error.message 
    });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

/**
 * GET /api/ai/health
 * Проверка работоспособности AI сервисов
 */
router.get('/health', authenticate, async (req, res) => {
  try {
    const health = {
      status: 'ok',
      services: {
        groq: process.env.GROQ_API_KEY ? 'configured' : 'not configured',
        replicate: process.env.REPLICATE_API_KEY ? 'configured' : 'not configured',
        gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not configured'
      },
      timestamp: new Date().toISOString()
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
});

export default router;
