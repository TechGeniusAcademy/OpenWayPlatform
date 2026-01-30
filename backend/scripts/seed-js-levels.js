import pool from '../config/database.js';

const levels = [
  {
    title: 'Сумма двух чисел',
    description: 'Научитесь складывать числа',
    difficulty: 1,
    points_reward: 10,
    task_description: `Напишите функцию solution(a, b), которая принимает два числа и возвращает их сумму.

Пример:
solution(2, 3) → 5
solution(-1, 1) → 0`,
    initial_code: `function solution(a, b) {
  // Ваш код здесь
  
}`,
    solution_code: `function solution(a, b) {
  return a + b;
}`,
    tests: [
      { input: [2, 3], expected: 5 },
      { input: [0, 0], expected: 0 },
      { input: [-5, 5], expected: 0 },
      { input: [100, 200], expected: 300 }
    ],
    hints: ['Используйте оператор +', 'return a + b'],
    order_index: 1
  },
  {
    title: 'Чётное или нечётное',
    description: 'Определите чётность числа',
    difficulty: 1,
    points_reward: 15,
    task_description: `Напишите функцию solution(n), которая возвращает "even" если число чётное, и "odd" если нечётное.

Пример:
solution(4) → "even"
solution(7) → "odd"`,
    initial_code: `function solution(n) {
  // Ваш код здесь
  
}`,
    solution_code: `function solution(n) {
  return n % 2 === 0 ? "even" : "odd";
}`,
    tests: [
      { input: [4], expected: 'even' },
      { input: [7], expected: 'odd' },
      { input: [0], expected: 'even' },
      { input: [-3], expected: 'odd' }
    ],
    hints: ['Используйте оператор % (остаток от деления)', 'n % 2 === 0 означает чётное число'],
    order_index: 2
  },
  {
    title: 'Максимум из трёх',
    description: 'Найдите наибольшее число',
    difficulty: 1,
    points_reward: 15,
    task_description: `Напишите функцию solution(a, b, c), которая возвращает наибольшее из трёх чисел.

Пример:
solution(1, 5, 3) → 5
solution(-1, -5, -3) → -1`,
    initial_code: `function solution(a, b, c) {
  // Ваш код здесь
  
}`,
    solution_code: `function solution(a, b, c) {
  return Math.max(a, b, c);
}`,
    tests: [
      { input: [1, 5, 3], expected: 5 },
      { input: [10, 10, 10], expected: 10 },
      { input: [-1, -5, -3], expected: -1 },
      { input: [0, 100, 50], expected: 100 }
    ],
    hints: ['Можно использовать Math.max()', 'Или сравнивать через if/else'],
    order_index: 3
  },
  {
    title: 'Перевернуть строку',
    description: 'Работа со строками',
    difficulty: 2,
    points_reward: 20,
    task_description: `Напишите функцию solution(str), которая возвращает перевёрнутую строку.

Пример:
solution("hello") → "olleh"
solution("JavaScript") → "tpircSavaJ"`,
    initial_code: `function solution(str) {
  // Ваш код здесь
  
}`,
    solution_code: `function solution(str) {
  return str.split("").reverse().join("");
}`,
    tests: [
      { input: ['hello'], expected: 'olleh' },
      { input: ['JavaScript'], expected: 'tpircSavaJ' },
      { input: ['a'], expected: 'a' },
      { input: ['12345'], expected: '54321' }
    ],
    hints: ['Преобразуйте строку в массив: str.split("")', 'Переверните массив: .reverse()', 'Соедините обратно: .join("")'],
    order_index: 4
  },
  {
    title: 'Сумма массива',
    description: 'Работа с массивами',
    difficulty: 2,
    points_reward: 20,
    task_description: `Напишите функцию solution(arr), которая возвращает сумму всех элементов массива.

Пример:
solution([1, 2, 3]) → 6
solution([10, -5, 5]) → 10`,
    initial_code: `function solution(arr) {
  // Ваш код здесь
  
}`,
    solution_code: `function solution(arr) {
  return arr.reduce((sum, n) => sum + n, 0);
}`,
    tests: [
      { input: [[1, 2, 3]], expected: 6 },
      { input: [[10, -5, 5]], expected: 10 },
      { input: [[]], expected: 0 },
      { input: [[100]], expected: 100 }
    ],
    hints: ['Можно использовать цикл for', 'Или метод reduce()', 'arr.reduce((sum, n) => sum + n, 0)'],
    order_index: 5
  },
  {
    title: 'FizzBuzz',
    description: 'Классическая задача',
    difficulty: 2,
    points_reward: 25,
    task_description: `Напишите функцию solution(n), которая возвращает:
- "FizzBuzz" если n делится на 3 и на 5
- "Fizz" если n делится только на 3
- "Buzz" если n делится только на 5
- само число n (как строку) в остальных случаях

Пример:
solution(15) → "FizzBuzz"
solution(9) → "Fizz"
solution(10) → "Buzz"
solution(7) → "7"`,
    initial_code: `function solution(n) {
  // Ваш код здесь
  
}`,
    solution_code: `function solution(n) {
  if (n % 15 === 0) return "FizzBuzz";
  if (n % 3 === 0) return "Fizz";
  if (n % 5 === 0) return "Buzz";
  return String(n);
}`,
    tests: [
      { input: [15], expected: 'FizzBuzz' },
      { input: [9], expected: 'Fizz' },
      { input: [10], expected: 'Buzz' },
      { input: [7], expected: '7' },
      { input: [30], expected: 'FizzBuzz' }
    ],
    hints: ['Проверяйте делимость на 15 первой (3 и 5)', 'Используйте оператор %', 'Не забудьте вернуть число как строку: String(n)'],
    order_index: 6
  },
  {
    title: 'Палиндром',
    description: 'Проверка на палиндром',
    difficulty: 3,
    points_reward: 30,
    task_description: `Напишите функцию solution(str), которая возвращает true если строка является палиндромом (читается одинаково слева направо и справа налево), иначе false.
Игнорируйте регистр букв.

Пример:
solution("radar") → true
solution("hello") → false
solution("Level") → true`,
    initial_code: `function solution(str) {
  // Ваш код здесь
  
}`,
    solution_code: `function solution(str) {
  const s = str.toLowerCase();
  return s === s.split("").reverse().join("");
}`,
    tests: [
      { input: ['radar'], expected: true },
      { input: ['hello'], expected: false },
      { input: ['Level'], expected: true },
      { input: ['A'], expected: true },
      { input: ['ab'], expected: false }
    ],
    hints: ['Приведите строку к нижнему регистру: toLowerCase()', 'Сравните строку с её перевёрнутой версией'],
    order_index: 7
  },
  {
    title: 'Факториал',
    description: 'Рекурсия или цикл',
    difficulty: 3,
    points_reward: 30,
    task_description: `Напишите функцию solution(n), которая возвращает факториал числа n.
Факториал n! = 1 * 2 * 3 * ... * n
Факториал 0 равен 1.

Пример:
solution(5) → 120
solution(0) → 1
solution(3) → 6`,
    initial_code: `function solution(n) {
  // Ваш код здесь
  
}`,
    solution_code: `function solution(n) {
  if (n <= 1) return 1;
  return n * solution(n - 1);
}`,
    tests: [
      { input: [5], expected: 120 },
      { input: [0], expected: 1 },
      { input: [1], expected: 1 },
      { input: [3], expected: 6 },
      { input: [7], expected: 5040 }
    ],
    hints: ['Факториал можно вычислить рекурсивно: n! = n * (n-1)!', 'Базовый случай: 0! = 1! = 1', 'Или используйте цикл for'],
    order_index: 8
  }
];

async function seedLevels() {
  console.log('🚀 Добавление уровней JS игры...\n');
  
  try {
    for (const level of levels) {
      const result = await pool.query(
        `INSERT INTO js_game_levels 
         (title, description, difficulty, points_reward, task_description, initial_code, solution_code, tests, hints, order_index, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [
          level.title,
          level.description,
          level.difficulty,
          level.points_reward,
          level.task_description,
          level.initial_code,
          level.solution_code,
          JSON.stringify(level.tests),
          JSON.stringify(level.hints),
          level.order_index
        ]
      );
      
      if (result.rows.length > 0) {
        console.log(`✅ Добавлен: ${level.title} (ID: ${result.rows[0].id})`);
      } else {
        console.log(`⏭️  Пропущен (уже существует): ${level.title}`);
      }
    }
    
    console.log('\n🎉 Готово! Все уровни добавлены.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
}

seedLevels();
