import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Все маршруты требуют аутентификации
router.use(authenticate);

// Список всех достижений с определённым порядком по категориям
const ACHIEVEMENTS_DATA = [
  // ==================== ТЕСТЫ ====================
  { code: 'test_first', title: 'Новичок тестов', description: 'Пройти первый тест', category: 'tests', icon: 'AiOutlineCheckCircle', icon_color: '#4CAF50', rarity: 'common', points_reward: 10, experience_reward: 5, requirement_type: 'tests_completed', requirement_value: 1, order_index: 1 },
  { code: 'test_perfect', title: 'Отличник', description: 'Получить 100% в тесте', category: 'tests', icon: 'AiOutlineStar', icon_color: '#FFD700', rarity: 'rare', points_reward: 25, experience_reward: 15, requirement_type: 'test_perfect_score', requirement_value: 1, order_index: 2 },
  { code: 'test_perfectionist', title: 'Перфекционист', description: 'Получить 100% в 5 тестах подряд', category: 'tests', icon: 'AiOutlineCrown', icon_color: '#9C27B0', rarity: 'epic', points_reward: 100, experience_reward: 50, requirement_type: 'test_perfect_streak', requirement_value: 5, order_index: 3 },
  { code: 'test_marathon', title: 'Тестовый марафонец', description: 'Пройти 10 тестов за день', category: 'tests', icon: 'AiOutlineThunderbolt', icon_color: '#FF9800', rarity: 'rare', points_reward: 50, experience_reward: 30, requirement_type: 'tests_daily', requirement_value: 10, order_index: 4 },
  { code: 'test_master', title: 'Мастер тестов', description: 'Пройти 50 тестов', category: 'tests', icon: 'AiOutlineTrophy', icon_color: '#E91E63', rarity: 'epic', points_reward: 150, experience_reward: 75, requirement_type: 'tests_completed', requirement_value: 50, order_index: 5 },
  { code: 'test_genius', title: 'Гений тестирования', description: 'Пройти 100 тестов', category: 'tests', icon: 'FaBrain', icon_color: '#673AB7', rarity: 'legendary', points_reward: 300, experience_reward: 150, requirement_type: 'tests_completed', requirement_value: 100, order_index: 6 },
  { code: 'test_flawless', title: 'Без ошибок', description: 'Пройти тест без единой ошибки с первой попытки', category: 'tests', icon: 'AiOutlineCheck', icon_color: '#00BCD4', rarity: 'rare', points_reward: 30, experience_reward: 20, requirement_type: 'test_first_try_perfect', requirement_value: 1, order_index: 7 },
  { code: 'test_speed', title: 'Скоростной', description: 'Пройти тест менее чем за 1 минуту', category: 'tests', icon: 'AiOutlineClockCircle', icon_color: '#FF5722', rarity: 'rare', points_reward: 40, experience_reward: 25, requirement_type: 'test_speed_1min', requirement_value: 1, order_index: 8 },
  { code: 'test_lightning', title: 'Молниеносный', description: 'Пройти тест менее чем за 30 секунд', category: 'tests', icon: 'BsLightningChargeFill', icon_color: '#FFEB3B', rarity: 'epic', points_reward: 75, experience_reward: 40, requirement_type: 'test_speed_30sec', requirement_value: 1, order_index: 9 },
  { code: 'test_persistent', title: 'Упорный', description: 'Пересдать тест 5 раз и наконец пройти', category: 'tests', icon: 'AiOutlineReload', icon_color: '#795548', rarity: 'common', points_reward: 20, experience_reward: 10, requirement_type: 'test_retries', requirement_value: 5, order_index: 10 },

  // ==================== ДОМАШНИЕ ЗАДАНИЯ ====================
  { code: 'hw_first', title: 'Первая сдача', description: 'Сдать первое домашнее задание', category: 'homework', icon: 'AiOutlineFileText', icon_color: '#4CAF50', rarity: 'common', points_reward: 10, experience_reward: 5, requirement_type: 'homework_submitted', requirement_value: 1, order_index: 11 },
  { code: 'hw_diligent', title: 'Исполнительный', description: 'Сдать 10 домашних заданий', category: 'homework', icon: 'AiOutlineFileDone', icon_color: '#2196F3', rarity: 'common', points_reward: 30, experience_reward: 20, requirement_type: 'homework_submitted', requirement_value: 10, order_index: 12 },
  { code: 'hw_hardworking', title: 'Трудолюбивый', description: 'Сдать 50 домашних заданий', category: 'homework', icon: 'AiOutlineFileProtect', icon_color: '#9C27B0', rarity: 'epic', points_reward: 150, experience_reward: 75, requirement_type: 'homework_submitted', requirement_value: 50, order_index: 13 },
  { code: 'hw_punctual', title: 'Пунктуальный', description: 'Сдать 10 ДЗ до дедлайна', category: 'homework', icon: 'AiOutlineClockCircle', icon_color: '#4CAF50', rarity: 'rare', points_reward: 50, experience_reward: 30, requirement_type: 'homework_on_time', requirement_value: 10, order_index: 14 },
  { code: 'hw_always_ontime', title: 'Всегда вовремя', description: 'Ни разу не просрочить ДЗ (минимум 20 сданных)', category: 'homework', icon: 'AiOutlineSchedule', icon_color: '#00BCD4', rarity: 'epic', points_reward: 100, experience_reward: 50, requirement_type: 'homework_never_late', requirement_value: 20, order_index: 15 },
  { code: 'hw_night_owl', title: 'Ночная сова', description: 'Сдать ДЗ после полуночи', category: 'homework', icon: 'BsMoonStars', icon_color: '#3F51B5', rarity: 'common', points_reward: 15, experience_reward: 10, requirement_type: 'homework_night', requirement_value: 1, order_index: 16 },
  { code: 'hw_early_bird', title: 'Ранняя пташка', description: 'Сдать ДЗ до 7 утра', category: 'homework', icon: 'BsSunrise', icon_color: '#FF9800', rarity: 'common', points_reward: 15, experience_reward: 10, requirement_type: 'homework_early', requirement_value: 1, order_index: 17 },
  { code: 'hw_last_minute', title: 'За 5 минут до', description: 'Сдать ДЗ менее чем за 5 минут до дедлайна', category: 'homework', icon: 'AiOutlineWarning', icon_color: '#f44336', rarity: 'rare', points_reward: 25, experience_reward: 15, requirement_type: 'homework_last_minute', requirement_value: 1, order_index: 18 },
  { code: 'hw_ahead', title: 'Опережающий', description: 'Сдать ДЗ за неделю до дедлайна', category: 'homework', icon: 'AiOutlineRocket', icon_color: '#E91E63', rarity: 'rare', points_reward: 35, experience_reward: 20, requirement_type: 'homework_week_early', requirement_value: 1, order_index: 19 },

  // ==================== КУРСЫ И ОБУЧЕНИЕ ====================
  { code: 'course_first_step', title: 'Первый шаг', description: 'Начать свой первый курс', category: 'courses', icon: 'AiOutlinePlayCircle', icon_color: '#4CAF50', rarity: 'common', points_reward: 10, experience_reward: 5, requirement_type: 'course_started', requirement_value: 1, order_index: 20 },
  { code: 'course_curious', title: 'Любознательный', description: 'Просмотреть 10 уроков', category: 'courses', icon: 'AiOutlineEye', icon_color: '#2196F3', rarity: 'common', points_reward: 25, experience_reward: 15, requirement_type: 'lessons_viewed', requirement_value: 10, order_index: 21 },
  { code: 'course_diligent', title: 'Прилежный ученик', description: 'Просмотреть 50 уроков', category: 'courses', icon: 'AiOutlineBook', icon_color: '#9C27B0', rarity: 'rare', points_reward: 75, experience_reward: 40, requirement_type: 'lessons_viewed', requirement_value: 50, order_index: 22 },
  { code: 'course_expert', title: 'Эксперт', description: 'Просмотреть 100 уроков', category: 'courses', icon: 'AiOutlineRead', icon_color: '#E91E63', rarity: 'epic', points_reward: 150, experience_reward: 75, requirement_type: 'lessons_viewed', requirement_value: 100, order_index: 23 },
  { code: 'course_master', title: 'Мастер знаний', description: 'Просмотреть 500 уроков', category: 'courses', icon: 'FaGraduationCap', icon_color: '#673AB7', rarity: 'legendary', points_reward: 500, experience_reward: 250, requirement_type: 'lessons_viewed', requirement_value: 500, order_index: 24 },
  { code: 'course_graduate', title: 'Выпускник', description: 'Завершить первый курс полностью', category: 'courses', icon: 'AiOutlineFileDone', icon_color: '#4CAF50', rarity: 'rare', points_reward: 100, experience_reward: 50, requirement_type: 'courses_completed', requirement_value: 1, order_index: 25 },
  { code: 'course_collector', title: 'Коллекционер знаний', description: 'Завершить 5 курсов', category: 'courses', icon: 'AiOutlineAppstore', icon_color: '#FF9800', rarity: 'epic', points_reward: 300, experience_reward: 150, requirement_type: 'courses_completed', requirement_value: 5, order_index: 26 },
  { code: 'course_academic', title: 'Академик', description: 'Завершить 10 курсов', category: 'courses', icon: 'FaUniversity', icon_color: '#795548', rarity: 'legendary', points_reward: 500, experience_reward: 250, requirement_type: 'courses_completed', requirement_value: 10, order_index: 27 },

  // ==================== ШАХМАТЫ ====================
  { code: 'chess_first_move', title: 'Первый ход', description: 'Сыграть первую партию в шахматы', category: 'chess', icon: 'FaChess', icon_color: '#607D8B', rarity: 'common', points_reward: 10, experience_reward: 5, requirement_type: 'chess_games_played', requirement_value: 1, order_index: 28 },
  { code: 'chess_winner', title: 'Шахматист', description: 'Выиграть первую партию', category: 'chess', icon: 'FaChessKing', icon_color: '#4CAF50', rarity: 'common', points_reward: 20, experience_reward: 10, requirement_type: 'chess_wins', requirement_value: 1, order_index: 29 },
  { code: 'chess_trainee', title: 'Гроссмейстер в обучении', description: 'Выиграть 10 партий', category: 'chess', icon: 'FaChessQueen', icon_color: '#9C27B0', rarity: 'rare', points_reward: 50, experience_reward: 30, requirement_type: 'chess_wins', requirement_value: 10, order_index: 30 },
  { code: 'chess_master', title: 'Шахматный мастер', description: 'Выиграть 50 партий', category: 'chess', icon: 'FaChessKnight', icon_color: '#E91E63', rarity: 'epic', points_reward: 150, experience_reward: 75, requirement_type: 'chess_wins', requirement_value: 50, order_index: 31 },
  { code: 'chess_champion', title: 'Чемпион', description: 'Выиграть 100 партий', category: 'chess', icon: 'FaCrown', icon_color: '#FFD700', rarity: 'legendary', points_reward: 300, experience_reward: 150, requirement_type: 'chess_wins', requirement_value: 100, order_index: 32 },
  { code: 'chess_ai_slayer', title: 'Победитель ИИ', description: 'Победить ИИ на сложном уровне', category: 'chess', icon: 'AiOutlineRobot', icon_color: '#f44336', rarity: 'epic', points_reward: 100, experience_reward: 50, requirement_type: 'chess_ai_hard_win', requirement_value: 1, order_index: 33 },
  { code: 'chess_quick_mate', title: 'Быстрая победа', description: 'Поставить мат менее чем за 10 ходов', category: 'chess', icon: 'BsLightningChargeFill', icon_color: '#FF9800', rarity: 'rare', points_reward: 40, experience_reward: 25, requirement_type: 'chess_quick_mate', requirement_value: 1, order_index: 34 },
  { code: 'chess_scholars_mate', title: 'Детский мат', description: 'Поставить мат за 4 хода', category: 'chess', icon: 'FaChild', icon_color: '#00BCD4', rarity: 'rare', points_reward: 50, experience_reward: 30, requirement_type: 'chess_4_move_mate', requirement_value: 1, order_index: 35 },
  { code: 'chess_resilient', title: 'Стойкий', description: 'Сыграть вничью после проигрышной позиции', category: 'chess', icon: 'AiOutlineHeart', icon_color: '#E91E63', rarity: 'rare', points_reward: 35, experience_reward: 20, requirement_type: 'chess_comeback_draw', requirement_value: 1, order_index: 36 },
  { code: 'chess_online_warrior', title: 'Онлайн воин', description: 'Выиграть 10 онлайн партий', category: 'chess', icon: 'AiOutlineGlobal', icon_color: '#2196F3', rarity: 'rare', points_reward: 60, experience_reward: 35, requirement_type: 'chess_online_wins', requirement_value: 10, order_index: 37 },
  { code: 'chess_unbeatable', title: 'Непобедимый', description: 'Выиграть 5 партий подряд', category: 'chess', icon: 'FaShieldAlt', icon_color: '#673AB7', rarity: 'epic', points_reward: 80, experience_reward: 45, requirement_type: 'chess_win_streak', requirement_value: 5, order_index: 38 },

  // ==================== FLEXCHAN (CSS Flexbox) ====================
  { code: 'flex_beginner', title: 'Flex начинающий', description: 'Пройти первый уровень FlexChan', category: 'flexchan', icon: 'BsGrid3X3Gap', icon_color: '#4CAF50', rarity: 'common', points_reward: 10, experience_reward: 5, requirement_type: 'flexchan_levels', requirement_value: 1, order_index: 39 },
  { code: 'flex_amateur', title: 'Flex любитель', description: 'Пройти 10 уровней', category: 'flexchan', icon: 'BsGridFill', icon_color: '#2196F3', rarity: 'common', points_reward: 30, experience_reward: 20, requirement_type: 'flexchan_levels', requirement_value: 10, order_index: 40 },
  { code: 'flex_pro', title: 'Flex профи', description: 'Пройти 25 уровней', category: 'flexchan', icon: 'BsGrid1X2Fill', icon_color: '#9C27B0', rarity: 'rare', points_reward: 75, experience_reward: 40, requirement_type: 'flexchan_levels', requirement_value: 25, order_index: 41 },
  { code: 'flex_master', title: 'Flex мастер', description: 'Пройти 50 уровней', category: 'flexchan', icon: 'MdOutlineViewModule', icon_color: '#E91E63', rarity: 'epic', points_reward: 150, experience_reward: 75, requirement_type: 'flexchan_levels', requirement_value: 50, order_index: 42 },
  { code: 'flex_guru', title: 'Flex гуру', description: 'Пройти все уровни FlexChan', category: 'flexchan', icon: 'FaGem', icon_color: '#673AB7', rarity: 'legendary', points_reward: 300, experience_reward: 150, requirement_type: 'flexchan_all_levels', requirement_value: 1, order_index: 43 },
  { code: 'flex_speed', title: 'Быстрый Flex', description: 'Пройти уровень менее чем за 30 секунд', category: 'flexchan', icon: 'AiOutlineThunderbolt', icon_color: '#FF9800', rarity: 'rare', points_reward: 40, experience_reward: 25, requirement_type: 'flexchan_speed', requirement_value: 1, order_index: 44 },
  { code: 'flex_flawless', title: 'Flex без ошибок', description: 'Пройти 10 уровней с первой попытки', category: 'flexchan', icon: 'AiOutlineCheck', icon_color: '#00BCD4', rarity: 'rare', points_reward: 50, experience_reward: 30, requirement_type: 'flexchan_first_try', requirement_value: 10, order_index: 45 },
  { code: 'flex_persistent', title: 'Упорный верстальщик', description: 'Пройти сложный уровень после 10 попыток', category: 'flexchan', icon: 'AiOutlineReload', icon_color: '#795548', rarity: 'common', points_reward: 25, experience_reward: 15, requirement_type: 'flexchan_many_attempts', requirement_value: 10, order_index: 46 },

  // ==================== JAVASCRIPT GAME ====================
  { code: 'js_hello', title: 'console.log("Hello")', description: 'Решить первую задачу JS', category: 'jsgame', icon: 'SiJavascript', icon_color: '#F7DF1E', rarity: 'common', points_reward: 10, experience_reward: 5, requirement_type: 'jsgame_levels', requirement_value: 1, order_index: 47 },
  { code: 'js_junior', title: 'Junior Developer', description: 'Решить 10 задач', category: 'jsgame', icon: 'FaCode', icon_color: '#4CAF50', rarity: 'common', points_reward: 30, experience_reward: 20, requirement_type: 'jsgame_levels', requirement_value: 10, order_index: 48 },
  { code: 'js_middle', title: 'Middle Developer', description: 'Решить 25 задач', category: 'jsgame', icon: 'FaLaptopCode', icon_color: '#2196F3', rarity: 'rare', points_reward: 75, experience_reward: 40, requirement_type: 'jsgame_levels', requirement_value: 25, order_index: 49 },
  { code: 'js_senior', title: 'Senior Developer', description: 'Решить 50 задач', category: 'jsgame', icon: 'FaUserTie', icon_color: '#9C27B0', rarity: 'epic', points_reward: 150, experience_reward: 75, requirement_type: 'jsgame_levels', requirement_value: 50, order_index: 50 },
  { code: 'js_techlead', title: 'Tech Lead', description: 'Решить все задачи JavaScript', category: 'jsgame', icon: 'FaCrown', icon_color: '#FFD700', rarity: 'legendary', points_reward: 300, experience_reward: 150, requirement_type: 'jsgame_all_levels', requirement_value: 1, order_index: 51 },
  { code: 'js_dan1', title: '1 Дан', description: 'Достичь 1 дана в JavaScript', category: 'jsgame', icon: 'GiBlackBelt', icon_color: '#ffffff', rarity: 'common', points_reward: 50, experience_reward: 30, requirement_type: 'jsgame_dan', requirement_value: 1, order_index: 52 },
  { code: 'js_dan5', title: '5 Дан', description: 'Достичь 5 дана в JavaScript', category: 'jsgame', icon: 'GiBlackBelt', icon_color: '#FFD700', rarity: 'epic', points_reward: 150, experience_reward: 75, requirement_type: 'jsgame_dan', requirement_value: 5, order_index: 53 },
  { code: 'js_dan8', title: '8 Дан', description: 'Достичь максимального 8 дана', category: 'jsgame', icon: 'GiBlackBelt', icon_color: '#f44336', rarity: 'legendary', points_reward: 500, experience_reward: 250, requirement_type: 'jsgame_dan', requirement_value: 8, order_index: 54 },
  { code: 'js_clean', title: 'Чистый код', description: 'Решить задачу оптимальным способом', category: 'jsgame', icon: 'AiOutlineCode', icon_color: '#00BCD4', rarity: 'rare', points_reward: 40, experience_reward: 25, requirement_type: 'jsgame_optimal', requirement_value: 1, order_index: 55 },
  { code: 'js_algorithm', title: 'Алгоритмист', description: 'Решить 10 алгоритмических задач', category: 'jsgame', icon: 'AiOutlineFunction', icon_color: '#E91E63', rarity: 'rare', points_reward: 60, experience_reward: 35, requirement_type: 'jsgame_algorithm', requirement_value: 10, order_index: 56 },

  // ==================== ВЕРСТКА (LAYOUT GAME) ====================
  { code: 'layout_first', title: 'Первый макет', description: 'Сверстать первый макет', category: 'layout', icon: 'FaCode', icon_color: '#4CAF50', rarity: 'common', points_reward: 10, experience_reward: 5, requirement_type: 'layout_completed', requirement_value: 1, order_index: 57 },
  { code: 'layout_coder', title: 'Верстальщик', description: 'Сверстать 10 макетов', category: 'layout', icon: 'FaHtml5', icon_color: '#E44D26', rarity: 'common', points_reward: 30, experience_reward: 20, requirement_type: 'layout_completed', requirement_value: 10, order_index: 58 },
  { code: 'layout_master', title: 'Мастер верстки', description: 'Сверстать 25 макетов', category: 'layout', icon: 'FaCss3Alt', icon_color: '#1572B6', rarity: 'rare', points_reward: 75, experience_reward: 40, requirement_type: 'layout_completed', requirement_value: 25, order_index: 59 },
  { code: 'layout_perfect', title: 'Pixel Perfect', description: 'Получить 100% совпадение', category: 'layout', icon: 'AiOutlineCheck', icon_color: '#4CAF50', rarity: 'rare', points_reward: 50, experience_reward: 30, requirement_type: 'layout_perfect', requirement_value: 1, order_index: 60 },
  { code: 'layout_5_perfect', title: '5 из 5', description: 'Получить 100% совпадение 5 раз подряд', category: 'layout', icon: 'AiOutlineStar', icon_color: '#FFD700', rarity: 'epic', points_reward: 100, experience_reward: 50, requirement_type: 'layout_perfect_streak', requirement_value: 5, order_index: 61 },
  { code: 'layout_speed', title: 'Скоростной верстальщик', description: 'Сверстать макет за 5 минут', category: 'layout', icon: 'AiOutlineThunderbolt', icon_color: '#FF9800', rarity: 'rare', points_reward: 45, experience_reward: 25, requirement_type: 'layout_speed', requirement_value: 1, order_index: 62 },

  // ==================== БИТВА ЗНАНИЙ (QUIZ BATTLE) ====================
  { code: 'quiz_first', title: 'Первый бой', description: 'Сыграть первую битву', category: 'quiz', icon: 'MdOutlineQuiz', icon_color: '#607D8B', rarity: 'common', points_reward: 10, experience_reward: 5, requirement_type: 'quiz_battles', requirement_value: 1, order_index: 63 },
  { code: 'quiz_winner', title: 'Победитель', description: 'Выиграть первую битву', category: 'quiz', icon: 'AiOutlineTrophy', icon_color: '#4CAF50', rarity: 'common', points_reward: 20, experience_reward: 10, requirement_type: 'quiz_wins', requirement_value: 1, order_index: 64 },
  { code: 'quiz_champion', title: 'Чемпион викторины', description: 'Выиграть 10 битв', category: 'quiz', icon: 'FaMedal', icon_color: '#FFD700', rarity: 'rare', points_reward: 75, experience_reward: 40, requirement_type: 'quiz_wins', requirement_value: 10, order_index: 65 },
  { code: 'quiz_legend', title: 'Легенда знаний', description: 'Выиграть 50 битв', category: 'quiz', icon: 'FaCrown', icon_color: '#9C27B0', rarity: 'epic', points_reward: 200, experience_reward: 100, requirement_type: 'quiz_wins', requirement_value: 50, order_index: 66 },
  { code: 'quiz_unbeatable', title: 'Непобедимый эрудит', description: 'Выиграть 10 битв подряд', category: 'quiz', icon: 'FaShieldAlt', icon_color: '#673AB7', rarity: 'legendary', points_reward: 300, experience_reward: 150, requirement_type: 'quiz_win_streak', requirement_value: 10, order_index: 67 },
  { code: 'quiz_quick', title: 'Быстрый ум', description: 'Ответить правильно за 2 секунды', category: 'quiz', icon: 'BsLightningChargeFill', icon_color: '#FFEB3B', rarity: 'rare', points_reward: 40, experience_reward: 25, requirement_type: 'quiz_quick_answer', requirement_value: 1, order_index: 68 },
  { code: 'quiz_streak', title: 'Серия побед', description: 'Выиграть 5 битв подряд', category: 'quiz', icon: 'AiOutlineFire', icon_color: '#FF5722', rarity: 'rare', points_reward: 60, experience_reward: 35, requirement_type: 'quiz_win_streak', requirement_value: 5, order_index: 69 },
  { code: 'quiz_comeback', title: 'Камбэк', description: 'Выиграть битву отставая на 3 очка', category: 'quiz', icon: 'AiOutlineRise', icon_color: '#E91E63', rarity: 'epic', points_reward: 80, experience_reward: 45, requirement_type: 'quiz_comeback', requirement_value: 1, order_index: 70 },

  // ==================== ПОКЕР ====================
  { code: 'poker_first', title: 'Новичок покера', description: 'Сыграть первую раздачу', category: 'poker', icon: 'GiPokerHand', icon_color: '#607D8B', rarity: 'common', points_reward: 10, experience_reward: 5, requirement_type: 'poker_hands', requirement_value: 1, order_index: 71 },
  { code: 'poker_bluffer', title: 'Блефер', description: 'Выиграть раздачу на блефе', category: 'poker', icon: 'GiCardRandom', icon_color: '#9C27B0', rarity: 'rare', points_reward: 40, experience_reward: 25, requirement_type: 'poker_bluff_win', requirement_value: 1, order_index: 72 },
  { code: 'poker_fullhouse', title: 'Фулл Хаус', description: 'Собрать Full House', category: 'poker', icon: 'GiCardAceHearts', icon_color: '#E91E63', rarity: 'rare', points_reward: 50, experience_reward: 30, requirement_type: 'poker_full_house', requirement_value: 1, order_index: 73 },
  { code: 'poker_flush', title: 'Флеш', description: 'Собрать Flush', category: 'poker', icon: 'GiHearts', icon_color: '#f44336', rarity: 'common', points_reward: 30, experience_reward: 20, requirement_type: 'poker_flush', requirement_value: 1, order_index: 74 },
  { code: 'poker_straight', title: 'Стрит', description: 'Собрать Straight', category: 'poker', icon: 'GiSpades', icon_color: '#212121', rarity: 'common', points_reward: 25, experience_reward: 15, requirement_type: 'poker_straight', requirement_value: 1, order_index: 75 },
  { code: 'poker_royal', title: 'Роял Флеш', description: 'Собрать Royal Flush', category: 'poker', icon: 'FaCrown', icon_color: '#FFD700', rarity: 'legendary', points_reward: 500, experience_reward: 250, requirement_type: 'poker_royal_flush', requirement_value: 1, order_index: 76, is_secret: true },
  { code: 'poker_allin', title: 'All-in победа', description: 'Выиграть пойдя олл-ин', category: 'poker', icon: 'GiTwoCoins', icon_color: '#FF9800', rarity: 'rare', points_reward: 45, experience_reward: 25, requirement_type: 'poker_allin_win', requirement_value: 1, order_index: 77 },
  { code: 'poker_cold', title: 'Хладнокровный', description: 'Выиграть 10 раздач подряд', category: 'poker', icon: 'AiOutlineHeart', icon_color: '#00BCD4', rarity: 'epic', points_reward: 100, experience_reward: 50, requirement_type: 'poker_win_streak', requirement_value: 10, order_index: 78 },

  // ==================== КЛАВИАТУРНЫЙ ТРЕНАЖЕР ====================
  { code: 'typing_first', title: 'Первые слова', description: 'Завершить первую тренировку', category: 'typing', icon: 'FaKeyboard', icon_color: '#607D8B', rarity: 'common', points_reward: 10, experience_reward: 5, requirement_type: 'typing_sessions', requirement_value: 1, order_index: 79 },
  { code: 'typing_30wpm', title: 'Ученик печати', description: 'Достичь 30 WPM', category: 'typing', icon: 'BsKeyboardFill', icon_color: '#4CAF50', rarity: 'common', points_reward: 25, experience_reward: 15, requirement_type: 'typing_wpm', requirement_value: 30, order_index: 80 },
  { code: 'typing_50wpm', title: 'Быстрые пальцы', description: 'Достичь 50 WPM', category: 'typing', icon: 'AiOutlineThunderbolt', icon_color: '#2196F3', rarity: 'rare', points_reward: 50, experience_reward: 30, requirement_type: 'typing_wpm', requirement_value: 50, order_index: 81 },
  { code: 'typing_80wpm', title: 'Профессионал', description: 'Достичь 80 WPM', category: 'typing', icon: 'FaRocket', icon_color: '#9C27B0', rarity: 'epic', points_reward: 100, experience_reward: 50, requirement_type: 'typing_wpm', requirement_value: 80, order_index: 82 },
  { code: 'typing_100wpm', title: 'Машинистка', description: 'Достичь 100 WPM', category: 'typing', icon: 'BsLightningChargeFill', icon_color: '#E91E63', rarity: 'epic', points_reward: 150, experience_reward: 75, requirement_type: 'typing_wpm', requirement_value: 100, order_index: 83 },
  { code: 'typing_120wpm', title: 'Скоростной демон', description: 'Достичь 120 WPM', category: 'typing', icon: 'FaFire', icon_color: '#FF5722', rarity: 'legendary', points_reward: 300, experience_reward: 150, requirement_type: 'typing_wpm', requirement_value: 120, order_index: 84 },
  { code: 'typing_perfect', title: 'Безошибочный', description: 'Завершить тренировку со 100% точностью', category: 'typing', icon: 'AiOutlineCheck', icon_color: '#4CAF50', rarity: 'rare', points_reward: 40, experience_reward: 25, requirement_type: 'typing_perfect', requirement_value: 1, order_index: 85 },
  { code: 'typing_marathon', title: 'Марафонец печати', description: 'Напечатать 10000 символов за день', category: 'typing', icon: 'AiOutlineFieldNumber', icon_color: '#FF9800', rarity: 'rare', points_reward: 60, experience_reward: 35, requirement_type: 'typing_chars_daily', requirement_value: 10000, order_index: 86 },

  // ==================== МАГАЗИН И КОСМЕТИКА ====================
  { code: 'shop_first', title: 'Первая покупка', description: 'Купить первый предмет в магазине', category: 'shop', icon: 'AiOutlineShoppingCart', icon_color: '#4CAF50', rarity: 'common', points_reward: 10, experience_reward: 5, requirement_type: 'shop_purchases', requirement_value: 1, order_index: 87 },
  { code: 'shop_10', title: 'Шопоголик', description: 'Купить 10 предметов', category: 'shop', icon: 'AiOutlineShopping', icon_color: '#E91E63', rarity: 'rare', points_reward: 50, experience_reward: 30, requirement_type: 'shop_purchases', requirement_value: 10, order_index: 88 },
  { code: 'shop_25', title: 'Коллекционер', description: 'Купить 25 предметов', category: 'shop', icon: 'AiOutlineAppstore', icon_color: '#9C27B0', rarity: 'epic', points_reward: 100, experience_reward: 50, requirement_type: 'shop_purchases', requirement_value: 25, order_index: 89 },
  { code: 'shop_all', title: 'Владелец всего', description: 'Купить все предметы в магазине', category: 'shop', icon: 'FaGem', icon_color: '#673AB7', rarity: 'legendary', points_reward: 500, experience_reward: 250, requirement_type: 'shop_all_items', requirement_value: 1, order_index: 90 },
  { code: 'shop_frame', title: 'Стильный', description: 'Установить рамку для аватара', category: 'shop', icon: 'AiOutlineBorder', icon_color: '#00BCD4', rarity: 'common', points_reward: 15, experience_reward: 10, requirement_type: 'cosmetic_frame', requirement_value: 1, order_index: 91 },
  { code: 'shop_banner', title: 'Уникальный', description: 'Установить баннер профиля', category: 'shop', icon: 'AiOutlinePicture', icon_color: '#FF9800', rarity: 'common', points_reward: 15, experience_reward: 10, requirement_type: 'cosmetic_banner', requirement_value: 1, order_index: 92 },

  // ==================== БАЛЛЫ И ОПЫТ ====================
  { code: 'points_10', title: 'Первые баллы', description: 'Заработать первые 10 баллов', category: 'economy', icon: 'AiOutlineWallet', icon_color: '#4CAF50', rarity: 'common', points_reward: 5, experience_reward: 5, requirement_type: 'total_points', requirement_value: 10, order_index: 93 },
  { code: 'points_100', title: 'Сотня', description: 'Накопить 100 баллов', category: 'economy', icon: 'AiOutlineDollar', icon_color: '#2196F3', rarity: 'common', points_reward: 10, experience_reward: 10, requirement_type: 'total_points', requirement_value: 100, order_index: 94 },
  { code: 'points_1000', title: 'Тысячник', description: 'Накопить 1000 баллов', category: 'economy', icon: 'FaCoins', icon_color: '#FFD700', rarity: 'rare', points_reward: 50, experience_reward: 30, requirement_type: 'total_points', requirement_value: 1000, order_index: 95 },
  { code: 'points_5000', title: 'Богач', description: 'Накопить 5000 баллов', category: 'economy', icon: 'FaGem', icon_color: '#E91E63', rarity: 'epic', points_reward: 100, experience_reward: 50, requirement_type: 'total_points', requirement_value: 5000, order_index: 96 },
  { code: 'points_10000', title: 'Миллионер', description: 'Накопить 10000 баллов', category: 'economy', icon: 'FaCrown', icon_color: '#673AB7', rarity: 'legendary', points_reward: 250, experience_reward: 125, requirement_type: 'total_points', requirement_value: 10000, order_index: 97 },
  { code: 'level_2', title: 'Первый уровень', description: 'Достичь 2 уровня', category: 'economy', icon: 'AiOutlineRise', icon_color: '#4CAF50', rarity: 'common', points_reward: 20, experience_reward: 10, requirement_type: 'user_level', requirement_value: 2, order_index: 98 },
  { code: 'level_10', title: 'Опытный', description: 'Достичь 10 уровня', category: 'economy', icon: 'AiOutlineLineChart', icon_color: '#2196F3', rarity: 'rare', points_reward: 75, experience_reward: 40, requirement_type: 'user_level', requirement_value: 10, order_index: 99 },
  { code: 'level_25', title: 'Ветеран', description: 'Достичь 25 уровня', category: 'economy', icon: 'FaMedal', icon_color: '#9C27B0', rarity: 'epic', points_reward: 150, experience_reward: 75, requirement_type: 'user_level', requirement_value: 25, order_index: 100 },
  { code: 'level_max', title: 'Легенда', description: 'Достичь максимального уровня', category: 'economy', icon: 'FaCrown', icon_color: '#FFD700', rarity: 'legendary', points_reward: 500, experience_reward: 250, requirement_type: 'user_level_max', requirement_value: 1, order_index: 101 },

  // ==================== РЕЙТИНГ И ТОП ====================
  { code: 'top_10', title: 'В топе', description: 'Попасть в топ-10 группы', category: 'ranking', icon: 'AiOutlineOrderedList', icon_color: '#4CAF50', rarity: 'common', points_reward: 30, experience_reward: 20, requirement_type: 'rank_top', requirement_value: 10, order_index: 102 },
  { code: 'top_3', title: 'Бронза', description: 'Занять 3 место в топе', category: 'ranking', icon: 'FaMedal', icon_color: '#CD7F32', rarity: 'rare', points_reward: 75, experience_reward: 40, requirement_type: 'rank_top', requirement_value: 3, order_index: 103 },
  { code: 'top_2', title: 'Серебро', description: 'Занять 2 место в топе', category: 'ranking', icon: 'FaMedal', icon_color: '#C0C0C0', rarity: 'epic', points_reward: 100, experience_reward: 50, requirement_type: 'rank_top', requirement_value: 2, order_index: 104 },
  { code: 'top_1', title: 'Золото', description: 'Занять 1 место в топе', category: 'ranking', icon: 'FaCrown', icon_color: '#FFD700', rarity: 'legendary', points_reward: 200, experience_reward: 100, requirement_type: 'rank_top', requirement_value: 1, order_index: 105 },
  { code: 'top_week', title: 'Чемпион недели', description: 'Быть первым неделю подряд', category: 'ranking', icon: 'FaTrophy', icon_color: '#9C27B0', rarity: 'legendary', points_reward: 300, experience_reward: 150, requirement_type: 'rank_week', requirement_value: 1, order_index: 106 },
  { code: 'top_month', title: 'Чемпион месяца', description: 'Быть первым месяц подряд', category: 'ranking', icon: 'FaGem', icon_color: '#673AB7', rarity: 'mythic', points_reward: 1000, experience_reward: 500, requirement_type: 'rank_month', requirement_value: 1, order_index: 107 },

  // ==================== СЕРИИ И STREAK ====================
  { code: 'streak_3', title: 'Три дня подряд', description: 'Заходить 3 дня подряд', category: 'streak', icon: 'AiOutlineCalendar', icon_color: '#4CAF50', rarity: 'common', points_reward: 15, experience_reward: 10, requirement_type: 'login_streak', requirement_value: 3, order_index: 108 },
  { code: 'streak_7', title: 'Неделя активности', description: 'Заходить 7 дней подряд', category: 'streak', icon: 'AiOutlineFire', icon_color: '#FF9800', rarity: 'common', points_reward: 35, experience_reward: 20, requirement_type: 'login_streak', requirement_value: 7, order_index: 109 },
  { code: 'streak_14', title: 'Две недели', description: 'Заходить 14 дней подряд', category: 'streak', icon: 'FaFire', icon_color: '#FF5722', rarity: 'rare', points_reward: 75, experience_reward: 40, requirement_type: 'login_streak', requirement_value: 14, order_index: 110 },
  { code: 'streak_30', title: 'Месяц онлайн', description: 'Заходить 30 дней подряд', category: 'streak', icon: 'AiOutlineHeart', icon_color: '#E91E63', rarity: 'epic', points_reward: 150, experience_reward: 75, requirement_type: 'login_streak', requirement_value: 30, order_index: 111 },
  { code: 'streak_100', title: '100 дней', description: 'Заходить 100 дней подряд', category: 'streak', icon: 'FaCrown', icon_color: '#673AB7', rarity: 'legendary', points_reward: 500, experience_reward: 250, requirement_type: 'login_streak', requirement_value: 100, order_index: 112 },

  // ==================== ИГРЫ ОБЩИЕ ====================
  { code: 'games_first', title: 'Игрок', description: 'Сыграть в первую игру', category: 'games', icon: 'IoGameController', icon_color: '#4CAF50', rarity: 'common', points_reward: 10, experience_reward: 5, requirement_type: 'games_played', requirement_value: 1, order_index: 113 },
  { code: 'games_all', title: 'Геймер', description: 'Сыграть во все доступные игры', category: 'games', icon: 'FaGamepad', icon_color: '#9C27B0', rarity: 'rare', points_reward: 75, experience_reward: 40, requirement_type: 'games_all_played', requirement_value: 1, order_index: 114 },
  { code: 'games_10h', title: 'Игровой маньяк', description: 'Провести 10 часов в играх', category: 'games', icon: 'AiOutlineClockCircle', icon_color: '#2196F3', rarity: 'rare', points_reward: 50, experience_reward: 30, requirement_type: 'games_hours', requirement_value: 10, order_index: 115 },
  { code: 'games_50h', title: 'Легенда аркад', description: 'Провести 50 часов в играх', category: 'games', icon: 'FaTrophy', icon_color: '#E91E63', rarity: 'epic', points_reward: 150, experience_reward: 75, requirement_type: 'games_hours', requirement_value: 50, order_index: 116 },
  { code: 'games_master', title: 'Мастер игр', description: 'Достичь максимального результата в любой игре', category: 'games', icon: 'FaGem', icon_color: '#673AB7', rarity: 'legendary', points_reward: 200, experience_reward: 100, requirement_type: 'games_max_score', requirement_value: 1, order_index: 117 },

  // ==================== СЕКРЕТНЫЕ ====================
  { code: 'secret_night', title: 'Полуночник', description: 'Зайти на платформу ровно в полночь', category: 'secret', icon: 'BsMoonStars', icon_color: '#3F51B5', rarity: 'rare', points_reward: 50, experience_reward: 25, requirement_type: 'secret_midnight', requirement_value: 1, order_index: 118, is_secret: true },
  { code: 'secret_birthday', title: 'С Днём Рождения!', description: 'Зайти в свой день рождения', category: 'secret', icon: 'GiPartyPopper', icon_color: '#E91E63', rarity: 'rare', points_reward: 100, experience_reward: 50, requirement_type: 'secret_birthday', requirement_value: 1, order_index: 119, is_secret: true },
  { code: 'secret_explorer', title: 'Исследователь', description: 'Посетить все страницы платформы', category: 'secret', icon: 'AiOutlineCompass', icon_color: '#00BCD4', rarity: 'epic', points_reward: 75, experience_reward: 40, requirement_type: 'secret_all_pages', requirement_value: 1, order_index: 120, is_secret: true }
];

// Инициализация достижений в БД
const initializeAchievements = async () => {
  try {
    for (const achievement of ACHIEVEMENTS_DATA) {
      await pool.query(`
        INSERT INTO achievements (code, title, description, category, icon, icon_color, rarity, points_reward, experience_reward, requirement_type, requirement_value, is_secret, order_index)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (code) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          icon = EXCLUDED.icon,
          icon_color = EXCLUDED.icon_color,
          rarity = EXCLUDED.rarity,
          points_reward = EXCLUDED.points_reward,
          experience_reward = EXCLUDED.experience_reward,
          requirement_type = EXCLUDED.requirement_type,
          requirement_value = EXCLUDED.requirement_value,
          is_secret = EXCLUDED.is_secret,
          order_index = EXCLUDED.order_index
      `, [
        achievement.code,
        achievement.title,
        achievement.description,
        achievement.category,
        achievement.icon,
        achievement.icon_color,
        achievement.rarity,
        achievement.points_reward,
        achievement.experience_reward,
        achievement.requirement_type,
        achievement.requirement_value,
        achievement.is_secret || false,
        achievement.order_index
      ]);
    }
    console.log('✅ Достижения инициализированы');
  } catch (error) {
    console.error('❌ Ошибка инициализации достижений:', error);
  }
};

// Получить все достижения с прогрессом пользователя
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Инициализируем достижения если их нет
    const checkAchievements = await pool.query('SELECT COUNT(*) FROM achievements');
    if (parseInt(checkAchievements.rows[0].count) === 0) {
      await initializeAchievements();
    }
    
    const result = await pool.query(`
      SELECT 
        a.*,
        ua.earned_at,
        CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as earned
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
      ORDER BY a.order_index ASC
    `, [userId]);
    
    res.json({
      achievements: result.rows,
      total: result.rows.length,
      earned: result.rows.filter(a => a.earned).length
    });
  } catch (error) {
    console.error('Ошибка получения достижений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить достижения по категории
router.get('/category/:category', async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.params;
    
    const result = await pool.query(`
      SELECT 
        a.*,
        ua.earned_at,
        CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as earned
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
      WHERE a.category = $2
      ORDER BY a.order_index ASC
    `, [userId, category]);
    
    res.json({ achievements: result.rows });
  } catch (error) {
    console.error('Ошибка получения достижений по категории:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить полученные достижения пользователя
router.get('/earned', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT 
        a.*,
        ua.earned_at
      FROM achievements a
      JOIN user_achievements ua ON a.id = ua.achievement_id
      WHERE ua.user_id = $1
      ORDER BY ua.earned_at DESC
    `, [userId]);
    
    res.json({ achievements: result.rows });
  } catch (error) {
    console.error('Ошибка получения полученных достижений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Выдать достижение пользователю (внутренний метод)
const awardAchievement = async (userId, achievementCode) => {
  try {
    // Проверяем, есть ли уже это достижение у пользователя
    const existingCheck = await pool.query(`
      SELECT ua.id FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1 AND a.code = $2
    `, [userId, achievementCode]);
    
    if (existingCheck.rows.length > 0) {
      return null; // Уже есть это достижение
    }
    
    // Получаем достижение
    const achievement = await pool.query(
      'SELECT * FROM achievements WHERE code = $1',
      [achievementCode]
    );
    
    if (achievement.rows.length === 0) {
      return null;
    }
    
    const ach = achievement.rows[0];
    
    // Выдаём достижение
    await pool.query(
      'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2)',
      [userId, ach.id]
    );
    
    // Начисляем награды
    if (ach.points_reward > 0 || ach.experience_reward > 0) {
      await pool.query(
        'UPDATE users SET points = points + $1, experience = COALESCE(experience, 0) + $2 WHERE id = $3',
        [ach.points_reward, ach.experience_reward, userId]
      );
      
      // Записываем в историю
      if (ach.points_reward > 0) {
        await pool.query(
          'INSERT INTO points_history (user_id, points_change, reason) VALUES ($1, $2, $3)',
          [userId, ach.points_reward, `Достижение: ${ach.title}`]
        );
      }
    }
    
    return ach;
  } catch (error) {
    console.error('Ошибка выдачи достижения:', error);
    return null;
  }
};

// Проверить и выдать достижения (POST запрос от клиента)
router.post('/check', async (req, res) => {
  try {
    const userId = req.user.id;
    const newAchievements = [];
    
    // Получаем статистику пользователя
    const userStats = await getUserStats(userId);
    console.log('📊 Статистика пользователя', userId, ':', userStats);
    
    // Инициализируем достижения если их нет
    const checkAchievements = await pool.query('SELECT COUNT(*) FROM achievements');
    if (parseInt(checkAchievements.rows[0].count) === 0) {
      console.log('⚙️ Инициализируем достижения...');
      await initializeAchievements();
    }
    
    // Проверяем все достижения
    const allAchievements = await pool.query('SELECT * FROM achievements ORDER BY order_index');
    console.log('📋 Всего достижений в БД:', allAchievements.rows.length);
    
    for (const ach of allAchievements.rows) {
      // Проверяем, есть ли уже это достижение
      const hasAchievement = await pool.query(
        'SELECT id FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
        [userId, ach.id]
      );
      
      if (hasAchievement.rows.length > 0) continue;
      
      // Проверяем условие
      const isEarned = checkAchievementCondition(ach, userStats);
      
      if (isEarned) {
        console.log('🏆 Выдаём достижение:', ach.code, ach.title);
        const awarded = await awardAchievement(userId, ach.code);
        if (awarded) {
          newAchievements.push(awarded);
        }
      }
    }
    
    console.log('✅ Новых достижений выдано:', newAchievements.length);
    
    res.json({
      newAchievements,
      count: newAchievements.length,
      stats: userStats // Добавляем статистику для отладки
    });
  } catch (error) {
    console.error('Ошибка проверки достижений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить статистику пользователя для проверки достижений
const getUserStats = async (userId) => {
  const stats = {};
  
  try {
    // Баллы и уровень
    const userResult = await pool.query(
      'SELECT points, experience FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length > 0) {
      stats.total_points = userResult.rows[0].points || 0;
      stats.experience = userResult.rows[0].experience || 0;
    }
    
    // Тесты
    const testsResult = await pool.query(
      'SELECT COUNT(*) FROM test_attempts WHERE user_id = $1 AND completed_at IS NOT NULL',
      [userId]
    );
    stats.tests_completed = parseInt(testsResult.rows[0].count);
    
    // Домашние задания
    const homeworkResult = await pool.query(
      'SELECT COUNT(*) FROM homework_submissions WHERE user_id = $1',
      [userId]
    );
    stats.homework_submitted = parseInt(homeworkResult.rows[0].count);
    
    // FlexChan
    const flexchanResult = await pool.query(
      'SELECT COUNT(*) FROM flexchan_progress WHERE user_id = $1 AND completed = true',
      [userId]
    );
    stats.flexchan_levels = parseInt(flexchanResult.rows[0].count);
    
    // JS Game
    const jsgameResult = await pool.query(
      "SELECT COUNT(*) FROM js_game_progress WHERE user_id = $1 AND status = 'passed'",
      [userId]
    );
    stats.jsgame_levels = parseInt(jsgameResult.rows[0].count);
    
    // Шахматы
    const chessResult = await pool.query(
      'SELECT COUNT(*) FROM chess_games WHERE (white_player_id = $1 OR black_player_id = $1)',
      [userId]
    );
    stats.chess_games_played = parseInt(chessResult.rows[0].count);
    
    // Подсчёт побед в шахматах - победитель определяется через result и позицию игрока
    const chessWinsResult = await pool.query(
      `SELECT COUNT(*) FROM chess_games 
       WHERE (result = 'white' AND white_player_id = $1) 
          OR (result = 'black' AND black_player_id = $1)`,
      [userId]
    );
    stats.chess_wins = parseInt(chessWinsResult.rows[0].count);
    
    // Typing
    const typingResult = await pool.query(
      'SELECT MAX(wpm) as max_wpm, COUNT(*) as sessions FROM typing_results WHERE user_id = $1',
      [userId]
    );
    stats.typing_wpm = typingResult.rows[0].max_wpm || 0;
    stats.typing_sessions = parseInt(typingResult.rows[0].sessions);
    
    // Покупки в магазине
    const shopResult = await pool.query(
      'SELECT COUNT(*) FROM user_purchases WHERE user_id = $1',
      [userId]
    );
    stats.shop_purchases = parseInt(shopResult.rows[0].count);
    
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
  }
  
  return stats;
};

// Проверить условие достижения
const checkAchievementCondition = (achievement, stats) => {
  const { requirement_type, requirement_value } = achievement;
  
  switch (requirement_type) {
    case 'tests_completed':
      return stats.tests_completed >= requirement_value;
    case 'homework_submitted':
      return stats.homework_submitted >= requirement_value;
    case 'flexchan_levels':
      return stats.flexchan_levels >= requirement_value;
    case 'jsgame_levels':
      return stats.jsgame_levels >= requirement_value;
    case 'chess_games_played':
      return stats.chess_games_played >= requirement_value;
    case 'chess_wins':
      return stats.chess_wins >= requirement_value;
    case 'typing_wpm':
      return stats.typing_wpm >= requirement_value;
    case 'typing_sessions':
      return stats.typing_sessions >= requirement_value;
    case 'total_points':
      return stats.total_points >= requirement_value;
    case 'shop_purchases':
      return stats.shop_purchases >= requirement_value;
    default:
      return false;
  }
};

// Админ: переинициализировать достижения
router.post('/admin/reinit', requireAdmin, async (req, res) => {
  try {
    await initializeAchievements();
    res.json({ message: 'Достижения переинициализированы' });
  } catch (error) {
    console.error('Ошибка переинициализации:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Админ: выдать достижение пользователю
router.post('/admin/award', requireAdmin, async (req, res) => {
  try {
    const { userId, achievementCode } = req.body;
    
    const result = await awardAchievement(userId, achievementCode);
    
    if (result) {
      res.json({ message: 'Достижение выдано', achievement: result });
    } else {
      res.status(400).json({ error: 'Не удалось выдать достижение' });
    }
  } catch (error) {
    console.error('Ошибка выдачи достижения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
export { awardAchievement, getUserStats };
