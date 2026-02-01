import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './FlexChan.module.css';
import { FaArrowLeft, FaLock, FaStar, FaPlay, FaRedo } from 'react-icons/fa';
import api from '../utils/api';

const GRID_SIZE = 10;

// Маркер для редактируемых мест: {{EDIT}}
// Уровни игры - постепенное усложнение
const levels = [
  // Уровни 1-10: justify-content
  {
    id: 1,
    title: 'justify-content: flex-end',
    description: 'Переместите элементы в конец контейнера',
    initialCode: '.container {\n  display: flex;\n  {{EDIT}}\n}',
    solution: ['justify-content: flex-end', 'justify-content:flex-end'],
    items: [{ type: 'girl', startPos: { row: 4, col: 0 } }],
    targets: [{ row: 4, col: 9 }],
    hint: 'Используйте justify-content'
  },
  {
    id: 2,
    title: 'justify-content: center',
    description: 'Переместите элементы в центр',
    initialCode: '.container {\n  display: flex;\n  {{EDIT}}\n}',
    solution: ['justify-content: center', 'justify-content:center'],
    items: [{ type: 'girl', startPos: { row: 4, col: 0 } }],
    targets: [{ row: 4, col: 4 }],
    hint: 'Используйте justify-content'
  },
  {
    id: 3,
    title: 'justify-content: space-between',
    description: 'Распределите элементы с пространством между ними',
    initialCode: '.container {\n  display: flex;\n  {{EDIT}}\n}',
    solution: ['justify-content: space-between', 'justify-content:space-between'],
    items: [
      { type: 'girl', startPos: { row: 4, col: 4 } },
      { type: 'boy', startPos: { row: 4, col: 5 } }
    ],
    targets: [{ row: 4, col: 0 }, { row: 4, col: 9 }],
    hint: 'Используйте justify-content'
  },
  {
    id: 4,
    title: 'justify-content: space-around',
    description: 'Распределите элементы с равным пространством вокруг',
    initialCode: '.container {\n  display: flex;\n  {{EDIT}}\n}',
    solution: ['justify-content: space-around', 'justify-content:space-around'],
    items: [
      { type: 'girl', startPos: { row: 4, col: 0 } },
      { type: 'boy', startPos: { row: 4, col: 1 } }
    ],
    targets: [{ row: 4, col: 2 }, { row: 4, col: 7 }],
    hint: 'Используйте justify-content'
  },
  {
    id: 5,
    title: 'justify-content: space-evenly',
    description: 'Распределите элементы с равными промежутками',
    initialCode: '.container {\n  display: flex;\n  {{EDIT}}\n}',
    solution: ['justify-content: space-evenly', 'justify-content:space-evenly'],
    items: [
      { type: 'girl', startPos: { row: 4, col: 0 } },
      { type: 'boy', startPos: { row: 4, col: 1 } }
    ],
    targets: [{ row: 4, col: 3 }, { row: 4, col: 6 }],
    hint: 'Используйте justify-content'
  },
  // Уровни 6-15: align-items
  {
    id: 6,
    title: 'align-items: flex-end',
    description: 'Переместите элементы вниз',
    initialCode: '.container {\n  display: flex;\n  {{EDIT}}\n}',
    solution: ['align-items: flex-end', 'align-items:flex-end'],
    items: [{ type: 'girl', startPos: { row: 0, col: 4 } }],
    targets: [{ row: 9, col: 4 }],
    hint: 'Используйте align-items'
  },
  {
    id: 7,
    title: 'align-items: center',
    description: 'Переместите элементы в центр по вертикали',
    initialCode: '.container {\n  display: flex;\n  {{EDIT}}\n}',
    solution: ['align-items: center', 'align-items:center'],
    items: [{ type: 'girl', startPos: { row: 0, col: 4 } }],
    targets: [{ row: 4, col: 4 }],
    hint: 'Используйте align-items'
  },
  {
    id: 8,
    title: 'Комбинация justify + align',
    description: 'Переместите элемент в правый нижний угол',
    initialCode: '.container {\n  display: flex;\n  {{EDIT}}\n  {{EDIT}}\n}',
    solution: ['justify-content: flex-end', 'align-items: flex-end'],
    items: [{ type: 'girl', startPos: { row: 0, col: 0 } }],
    targets: [{ row: 9, col: 9 }],
    hint: 'Комбинируйте justify-content и align-items'
  },
  {
    id: 9,
    title: 'Центрирование',
    description: 'Поместите элемент точно в центр',
    initialCode: '.container {\n  display: flex;\n  {{EDIT}}\n  {{EDIT}}\n}',
    solution: ['justify-content: center', 'align-items: center'],
    items: [{ type: 'girl', startPos: { row: 0, col: 0 } }],
    targets: [{ row: 4, col: 4 }],
    hint: 'Комбинируйте justify-content и align-items'
  },
  {
    id: 10,
    title: 'Несколько элементов',
    description: 'Поместите оба элемента в центр по вертикали, распределив по краям',
    initialCode: '.container {\n  display: flex;\n  {{EDIT}}\n  {{EDIT}}\n}',
    solution: ['justify-content: space-between', 'align-items: center'],
    items: [
      { type: 'girl', startPos: { row: 0, col: 0 } },
      { type: 'boy', startPos: { row: 0, col: 1 } }
    ],
    targets: [{ row: 4, col: 0 }, { row: 4, col: 9 }],
    hint: 'Используйте justify-content и align-items'
  },
  // Уровни 11-20: flex-direction
  {
    id: 11,
    title: 'flex-direction: column',
    description: 'Расположите элементы в колонку',
    initialCode: '.container {\n  display: flex;\n  {{EDIT}}\n}',
    solution: ['flex-direction: column', 'flex-direction:column'],
    items: [
      { type: 'girl', startPos: { row: 4, col: 0 } },
      { type: 'boy', startPos: { row: 4, col: 1 } }
    ],
    targets: [{ row: 0, col: 0 }, { row: 1, col: 0 }],
    hint: 'Используйте flex-direction'
  },
  {
    id: 12,
    title: 'flex-direction: column-reverse',
    description: 'Расположите элементы в обратную колонку',
    initialCode: '.container {\n  display: flex;\n  {{EDIT}}\n}',
    solution: ['flex-direction: column-reverse', 'flex-direction:column-reverse'],
    items: [
      { type: 'girl', startPos: { row: 0, col: 0 } },
      { type: 'boy', startPos: { row: 1, col: 0 } }
    ],
    targets: [{ row: 9, col: 0 }, { row: 8, col: 0 }],
    hint: 'Используйте flex-direction'
  },
  {
    id: 13,
    title: 'flex-direction: row-reverse',
    description: 'Расположите элементы в обратном порядке',
    initialCode: '.container {\n  display: flex;\n  {{EDIT}}\n}',
    solution: ['flex-direction: row-reverse', 'flex-direction:row-reverse'],
    items: [
      { type: 'girl', startPos: { row: 4, col: 0 } },
      { type: 'boy', startPos: { row: 4, col: 1 } }
    ],
    targets: [{ row: 4, col: 9 }, { row: 4, col: 8 }],
    hint: 'Используйте flex-direction'
  },
  {
    id: 14,
    title: 'column + justify-content',
    description: 'Расположите элементы в колонку в центре',
    initialCode: '.container {\n  display: flex;\n  {{EDIT}}\n  {{EDIT}}\n}',
    solution: ['flex-direction: column', 'justify-content: center'],
    items: [
      { type: 'girl', startPos: { row: 0, col: 0 } },
      { type: 'boy', startPos: { row: 0, col: 1 } }
    ],
    targets: [{ row: 4, col: 0 }, { row: 5, col: 0 }],
    hint: 'Комбинируйте flex-direction и justify-content'
  },
  {
    id: 15,
    title: 'column + align-items',
    description: 'Расположите элементы в колонку по центру горизонтали',
    initialCode: '.container {\n  display: flex;\n  {{EDIT}}\n  {{EDIT}}\n}',
    solution: ['flex-direction: column', 'align-items: center'],
    items: [
      { type: 'girl', startPos: { row: 0, col: 0 } },
      { type: 'boy', startPos: { row: 1, col: 0 } }
    ],
    targets: [{ row: 0, col: 4 }, { row: 1, col: 4 }],
    hint: 'Комбинируйте flex-direction и align-items'
  },
  // Уровни 16-25: flex-wrap
  {
    id: 16,
    title: 'flex-wrap: wrap',
    description: 'Разрешите перенос элементов',
    initialCode: '.container {\n  display: flex;\n  {{EDIT}}\n}',
    solution: ['flex-wrap: wrap', 'flex-wrap:wrap'],
    items: [
      { type: 'girl', startPos: { row: 0, col: 0 } },
      { type: 'boy', startPos: { row: 0, col: 1 } }
    ],
    targets: [{ row: 0, col: 0 }, { row: 1, col: 0 }],
    hint: 'Используйте flex-wrap'
  },
  {
    id: 17,
    title: 'flex-wrap: wrap-reverse',
    description: 'Перенос элементов в обратном направлении',
    initialCode: '.container {\n  display: flex;\n  {{EDIT}}\n}',
    solution: ['flex-wrap: wrap-reverse', 'flex-wrap:wrap-reverse'],
    items: [
      { type: 'girl', startPos: { row: 0, col: 0 } },
      { type: 'boy', startPos: { row: 0, col: 1 } }
    ],
    targets: [{ row: 9, col: 0 }, { row: 8, col: 0 }],
    hint: 'Используйте flex-wrap'
  },
  {
    id: 18,
    title: 'wrap + justify',
    description: 'Перенос с выравниванием по центру',
    initialCode: '.container {\n  display: flex;\n  {{EDIT}}\n  {{EDIT}}\n}',
    solution: ['flex-wrap: wrap', 'justify-content: center'],
    items: [
      { type: 'girl', startPos: { row: 0, col: 0 } },
      { type: 'boy', startPos: { row: 0, col: 1 } }
    ],
    targets: [{ row: 0, col: 4 }, { row: 1, col: 4 }],
    hint: 'Комбинируйте flex-wrap и justify-content'
  },
  {
    id: 19,
    title: 'align-content: center',
    description: 'Выровняйте строки по центру',
    initialCode: '.container {\n  display: flex;\n  flex-wrap: wrap;\n  {{EDIT}}\n}',
    solution: ['align-content: center', 'align-content:center'],
    items: [
      { type: 'girl', startPos: { row: 0, col: 0 } },
      { type: 'boy', startPos: { row: 1, col: 0 } }
    ],
    targets: [{ row: 4, col: 0 }, { row: 5, col: 0 }],
    hint: 'Используйте align-content'
  },
  {
    id: 20,
    title: 'align-content: space-between',
    description: 'Распределите строки с пространством между ними',
    initialCode: '.container {\n  display: flex;\n  flex-wrap: wrap;\n  {{EDIT}}\n}',
    solution: ['align-content: space-between', 'align-content:space-between'],
    items: [
      { type: 'girl', startPos: { row: 0, col: 0 } },
      { type: 'boy', startPos: { row: 1, col: 0 } }
    ],
    targets: [{ row: 0, col: 0 }, { row: 9, col: 0 }],
    hint: 'Используйте align-content'
  },
  // Уровни 21-30: gap
  {
    id: 21,
    title: 'gap',
    description: 'Добавьте промежуток между элементами',
    initialCode: '.container {\n  display: flex;\n  {{EDIT}}\n}',
    solution: ['gap: 2', 'gap:2', 'gap: 20%'],
    items: [
      { type: 'girl', startPos: { row: 4, col: 0 } },
      { type: 'boy', startPos: { row: 4, col: 1 } }
    ],
    targets: [{ row: 4, col: 0 }, { row: 4, col: 3 }],
    hint: 'Используйте gap'
  },
  {
    id: 22,
    title: 'row-gap + column-gap',
    description: 'Добавьте разные промежутки',
    initialCode: '.container {\n  display: flex;\n  flex-wrap: wrap;\n  {{EDIT}}\n  {{EDIT}}\n}',
    solution: ['row-gap:', 'column-gap:'],
    items: [
      { type: 'girl', startPos: { row: 0, col: 0 } },
      { type: 'boy', startPos: { row: 0, col: 1 } }
    ],
    targets: [{ row: 0, col: 0 }, { row: 2, col: 2 }],
    hint: 'Используйте row-gap и column-gap'
  },
  // Уровни 23-35: order
  {
    id: 23,
    title: 'order',
    description: 'Измените порядок элементов с помощью order',
    initialCode: '.container {\n  display: flex;\n}\n.girl {\n  {{EDIT}}\n}',
    solution: ['order: 1', 'order:1', 'order: 2'],
    items: [
      { type: 'girl', startPos: { row: 4, col: 0 } },
      { type: 'boy', startPos: { row: 4, col: 1 } }
    ],
    targets: [{ row: 4, col: 1 }, { row: 4, col: 0 }],
    hint: 'Используйте order для .girl'
  },
  {
    id: 24,
    title: 'order: -1',
    description: 'Переместите элемент в начало',
    initialCode: '.container {\n  display: flex;\n}\n.boy {\n  {{EDIT}}\n}',
    solution: ['order: -1', 'order:-1'],
    items: [
      { type: 'girl', startPos: { row: 4, col: 0 } },
      { type: 'boy', startPos: { row: 4, col: 1 } }
    ],
    targets: [{ row: 4, col: 1 }, { row: 4, col: 0 }],
    hint: 'Используйте отрицательный order для .boy'
  },
  {
    id: 25,
    title: 'Комплексный уровень 1',
    description: 'Центрируйте элементы и поменяйте их местами',
    initialCode: '.container {\n  display: flex;\n  {{EDIT}}\n  {{EDIT}}\n}\n.girl {\n  {{EDIT}}\n}',
    solution: ['justify-content: center', 'align-items: center', 'order:'],
    items: [
      { type: 'girl', startPos: { row: 0, col: 0 } },
      { type: 'boy', startPos: { row: 0, col: 1 } }
    ],
    targets: [{ row: 4, col: 5 }, { row: 4, col: 4 }],
    hint: 'Комбинируйте несколько свойств'
  },
  // Генерируем остальные уровни
  ...generateAdvancedLevels()
];

// Генерация продвинутых уровней 26-100
function generateAdvancedLevels() {
  const advancedLevels = [];
  const properties = [
    { prop: 'justify-content', values: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'] },
    { prop: 'align-items', values: ['flex-start', 'flex-end', 'center', 'stretch', 'baseline'] },
    { prop: 'flex-direction', values: ['row', 'row-reverse', 'column', 'column-reverse'] },
    { prop: 'flex-wrap', values: ['nowrap', 'wrap', 'wrap-reverse'] },
    { prop: 'align-content', values: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'stretch'] }
  ];
  
  for (let i = 26; i <= 100; i++) {
    const numProperties = Math.min(Math.floor((i - 20) / 15) + 2, 4);
    const numItems = Math.min(Math.floor((i - 20) / 25) + 1, 3);
    
    const selectedProps = [];
    for (let j = 0; j < numProperties; j++) {
      const propGroup = properties[j % properties.length];
      const value = propGroup.values[i % propGroup.values.length];
      selectedProps.push(`${propGroup.prop}: ${value}`);
    }
    
    const items = [];
    const targets = [];
    for (let k = 0; k < numItems; k++) {
      items.push({
        type: k % 2 === 0 ? 'girl' : 'boy',
        startPos: { row: k, col: k }
      });
      targets.push({ row: (i + k) % 10, col: (i * 2 + k) % 10 });
    }
    
    // Генерируем initialCode с маркерами {{EDIT}}
    const editLines = '  {{EDIT}}\n'.repeat(numProperties);
    
    advancedLevels.push({
      id: i,
      title: `Уровень ${i}`,
      description: `Комплексное задание с ${numProperties} свойствами`,
      initialCode: '.container {\n  display: flex;\n' + editLines + '}',
      solution: selectedProps,
      items,
      targets,
      hint: 'Комбинируйте изученные свойства'
    });
  }
  
  return advancedLevels;
}

// Компонент защищённого редактора кода
function ProtectedCodeEditor({ initialCode, onChange, disabled }) {
  // Парсим код на части: статичные и редактируемые
  const parseCode = (code) => {
    const parts = [];
    const regex = /\{\{EDIT\}\}/g;
    let lastIndex = 0;
    let match;
    let editIndex = 0;
    
    while ((match = regex.exec(code)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'static', value: code.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'editable', id: editIndex++, value: '' });
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < code.length) {
      parts.push({ type: 'static', value: code.slice(lastIndex) });
    }
    
    return parts;
  };
  
  const [parts, setParts] = useState(() => parseCode(initialCode));
  const [editableValues, setEditableValues] = useState({});
  
  // Сбрасываем при смене уровня
  useEffect(() => {
    const newParts = parseCode(initialCode);
    setParts(newParts);
    setEditableValues({});
  }, [initialCode]);
  
  // Собираем полный код и отправляем наверх
  useEffect(() => {
    let fullCode = '';
    parts.forEach(part => {
      if (part.type === 'static') {
        fullCode += part.value;
      } else {
        fullCode += editableValues[part.id] || '';
      }
    });
    onChange(fullCode);
  }, [editableValues, parts, onChange]);
  
  const handleInputChange = (id, value) => {
    // Запрещаем ввод после точки с запятой
    // Если есть ;, обрезаем всё что после неё
    let cleanValue = value;
    const semicolonIndex = value.indexOf(';');
    if (semicolonIndex !== -1) {
      cleanValue = value.slice(0, semicolonIndex + 1);
    }
    
    setEditableValues(prev => ({ ...prev, [id]: cleanValue }));
  };
  
  return (
    <div className={styles.protectedEditor}>
      {parts.map((part, index) => {
        if (part.type === 'static') {
          return (
            <span key={index} className={styles.staticCode}>
              {part.value}
            </span>
          );
        } else {
          return (
            <input
              key={index}
              type="text"
              className={styles.editableInput}
              value={editableValues[part.id] || ''}
              onChange={(e) => handleInputChange(part.id, e.target.value)}
              placeholder="введите свойство..."
              disabled={disabled}
              spellCheck={false}
            />
          );
        }
      })}
    </div>
  );
}

function FlexChan() {
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedLevels, setCompletedLevels] = useState(() => {
    const saved = localStorage.getItem('flexchan_completed');
    return saved ? JSON.parse(saved) : [];
  });
  const [code, setCode] = useState('');
  const [errorCount, setErrorCount] = useState(0);
  const [gameState, setGameState] = useState('playing'); // playing, won, lost
  const [itemPositions, setItemPositions] = useState([]);
  const [earnedPoints, setEarnedPoints] = useState(0);

  // Загрузка уровней с сервера
  useEffect(() => {
    const fetchLevels = async () => {
      try {
        const response = await api.get('/flexchan/levels');
        if (response.data && response.data.length > 0) {
          // Преобразуем данные из БД в формат игры
          const formattedLevels = response.data.map(level => ({
            id: level.id,
            title: level.title,
            description: level.description,
            initialCode: level.initial_code,
            solution: typeof level.solution === 'string' ? JSON.parse(level.solution) : level.solution,
            items: typeof level.items === 'string' ? JSON.parse(level.items) : level.items,
            targets: typeof level.targets === 'string' ? JSON.parse(level.targets) : level.targets,
            hint: level.hint,
            points: level.points || 10,
            difficulty: level.difficulty,
            levelOrder: level.level_order
          }));
          setLevels(formattedLevels);
        } else {
          // Используем захардкоженные уровни как fallback
          setLevels(defaultLevels);
        }
      } catch (error) {
        console.error('Error fetching levels:', error);
        setLevels(defaultLevels);
      } finally {
        setLoading(false);
      }
    };

    fetchLevels();
  }, []);

  // Загрузка прогресса с сервера
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await api.get('/flexchan/progress');
        if (response.data) {
          const completedIds = response.data
            .filter(p => p.completed)
            .map(p => p.level_id);
          if (completedIds.length > 0) {
            setCompletedLevels(prev => {
              const merged = [...new Set([...prev, ...completedIds])];
              return merged;
            });
          }
        }
      } catch (error) {
        // Если не авторизован - используем localStorage
        console.log('Using local progress');
      }
    };

    fetchProgress();
  }, []);

  // Получаем текущий уровень
  const currentLevel = selectedLevel ? levels.find(l => l.id === selectedLevel) : null;
  const totalLevels = levels.length;

  // Сохраняем прогресс
  useEffect(() => {
    localStorage.setItem('flexchan_completed', JSON.stringify(completedLevels));
  }, [completedLevels]);

  // Инициализация уровня
  useEffect(() => {
    if (currentLevel) {
      setCode(currentLevel.initialCode.replace(/\{\{EDIT\}\}/g, ''));
      setErrorCount(0);
      setGameState('playing');
      setItemPositions(currentLevel.items.map(item => ({ ...item, currentPos: { ...item.startPos } })));
    }
  }, [selectedLevel]);

  // Вычисление позиций на основе CSS
  const calculatePositions = useCallback((cssCode) => {
    if (!currentLevel) return;
    
    // Парсим CSS свойства из кода
    // ВАЖНО: принимаем только полностью написанные свойства (заканчивающиеся на ;)
    const flexProps = {};
    const itemProps = { girl: {}, boy: {} };
    
    // Функция для парсинга только завершённых свойств
    const parseCompleteProps = (cssBlock) => {
      const props = {};
      if (!cssBlock) return props;
      
      // Разбиваем по ; и берём только те части, которые имеют полную структуру key: value
      const statements = cssBlock.split(';');
      
      // Последний элемент после split может быть неполным (без ;), игнорируем его
      statements.forEach((statement, index) => {
        // Если это последний элемент и исходный текст не заканчивается на ;
        // значит это неполное свойство - пропускаем
        if (index === statements.length - 1 && !cssBlock.trim().endsWith(';')) {
          return;
        }
        
        const trimmed = statement.trim();
        if (!trimmed) return;
        
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex === -1) return;
        
        const key = trimmed.slice(0, colonIndex).trim();
        const value = trimmed.slice(colonIndex + 1).trim();
        
        // Проверяем что и ключ и значение не пустые
        if (key && value) {
          props[key] = value;
        }
      });
      
      return props;
    };
    
    // Разбиваем на блоки по селекторам
    const containerMatch = cssCode.match(/\.container\s*\{([^}]*)\}/);
    const girlMatch = cssCode.match(/\.girl\s*\{([^}]*)\}/);
    const boyMatch = cssCode.match(/\.boy\s*\{([^}]*)\}/);
    
    if (containerMatch) {
      Object.assign(flexProps, parseCompleteProps(containerMatch[1]));
    }
    
    if (girlMatch) {
      Object.assign(itemProps.girl, parseCompleteProps(girlMatch[1]));
    }
    
    if (boyMatch) {
      Object.assign(itemProps.boy, parseCompleteProps(boyMatch[1]));
    }
    
    // Получаем gap (в ячейках сетки)
    const gap = flexProps['gap'] ? parseInt(flexProps['gap']) || 0 : 0;
    
    // Проверяем есть ли flex-свойства которые влияют на позиционирование
    const hasFlexPositioning = flexProps['justify-content'] || 
                               flexProps['align-items'] || 
                               flexProps['flex-direction'] ||
                               gap > 0;
    
    const direction = flexProps['flex-direction'] || 'row';
    const justifyContent = flexProps['justify-content'] || 'flex-start';
    const alignItems = flexProps['align-items']; // НЕ задаём default - undefined означает "не менять"
    const hasAlignItems = !!flexProps['align-items']; // Флаг - был ли align-items задан явно
    
    // Сначала создаём элементы с order
    let itemsWithOrder = currentLevel.items.map((item, index) => {
      const order = itemProps[item.type]?.order ? parseInt(itemProps[item.type].order) : 0;
      const alignSelf = itemProps[item.type]?.['align-self'];
      return {
        ...item,
        originalIndex: index,
        order,
        alignSelf
      };
    });
    
    // Сортируем по order для правильного позиционирования
    itemsWithOrder.sort((a, b) => a.order - b.order);
    
    const itemCount = itemsWithOrder.length;
    
    // Вычисляем позиции
    const newPositions = itemsWithOrder.map((item, sortedIndex) => {
      let col = item.startPos.col;
      let row = item.startPos.row;
      
      // Если нет flex-свойств, оставляем начальные позиции
      if (!hasFlexPositioning) {
        return {
          ...item,
          currentPos: { row, col }
        };
      }
      
      // Горизонтальное направление (row, row-reverse)
      if (direction === 'row' || direction === 'row-reverse') {
        // justify-content (основная ось - горизонталь)
        switch (justifyContent) {
          case 'flex-start':
            col = sortedIndex * (1 + gap);
            break;
          case 'flex-end':
            col = 9 - (itemCount - 1 - sortedIndex) * (1 + gap);
            break;
          case 'center':
            const totalWidthRow = itemCount + (itemCount - 1) * gap;
            const startColCenter = Math.floor((10 - totalWidthRow) / 2);
            col = startColCenter + sortedIndex * (1 + gap);
            break;
          case 'space-between':
            if (itemCount > 1) {
              col = Math.round(sortedIndex * (9 / (itemCount - 1)));
            } else {
              col = 0;
            }
            break;
          case 'space-around':
            const spaceAround = 10 / itemCount;
            col = Math.round(spaceAround / 2 + sortedIndex * spaceAround);
            break;
          case 'space-evenly':
            col = Math.round((sortedIndex + 1) * 10 / (itemCount + 1)) - 1;
            break;
          default:
            col = sortedIndex * (1 + gap);
        }
        
        // align-items (поперечная ось - вертикаль)
        // Применяем только если align-items или align-self явно заданы
        const effectiveAlignItems = item.alignSelf || alignItems;
        if (effectiveAlignItems) {
          switch (effectiveAlignItems) {
            case 'flex-start':
              row = 0;
              break;
            case 'flex-end':
              row = 9;
              break;
            case 'center':
              row = 4;
              break;
            case 'stretch':
              row = 4; // Для визуализации stretch = center
              break;
            default:
              // Оставляем row как есть
              break;
          }
        }
        // Если align-items не задан, row остаётся из startPos
        
        if (direction === 'row-reverse') {
          col = 9 - col;
        }
      }
      
      // Вертикальное направление (column, column-reverse)
      if (direction === 'column' || direction === 'column-reverse') {
        // justify-content (основная ось - вертикаль)
        switch (justifyContent) {
          case 'flex-start':
            row = sortedIndex * (1 + gap);
            break;
          case 'flex-end':
            row = 9 - (itemCount - 1 - sortedIndex) * (1 + gap);
            break;
          case 'center':
            const totalHeightCol = itemCount + (itemCount - 1) * gap;
            const startRowCenter = Math.floor((10 - totalHeightCol) / 2);
            row = startRowCenter + sortedIndex * (1 + gap);
            break;
          case 'space-between':
            if (itemCount > 1) {
              row = Math.round(sortedIndex * (9 / (itemCount - 1)));
            } else {
              row = 0;
            }
            break;
          case 'space-around':
            const spaceAroundCol = 10 / itemCount;
            row = Math.round(spaceAroundCol / 2 + sortedIndex * spaceAroundCol);
            break;
          case 'space-evenly':
            row = Math.round((sortedIndex + 1) * 10 / (itemCount + 1)) - 1;
            break;
          default:
            row = sortedIndex * (1 + gap);
        }
        
        // align-items (поперечная ось - горизонталь)
        // Применяем только если align-items или align-self явно заданы
        const effectiveAlignItems = item.alignSelf || alignItems;
        if (effectiveAlignItems) {
          switch (effectiveAlignItems) {
            case 'flex-start':
              col = 0;
              break;
            case 'flex-end':
              col = 9;
              break;
            case 'center':
              col = 4;
              break;
            case 'stretch':
              col = 4; // Для визуализации stretch = center
              break;
            default:
              // Оставляем col как есть
              break;
          }
        }
        // Если align-items не задан, col остаётся из startPos
        
        if (direction === 'column-reverse') {
          row = 9 - row;
        }
      }
      
      // Ограничиваем значения
      col = Math.max(0, Math.min(9, col));
      row = Math.max(0, Math.min(9, row));
      
      return {
        ...item,
        currentPos: { row, col }
      };
    });
    
    // Возвращаем в оригинальном порядке для отображения, но с новыми позициями
    const finalPositions = currentLevel.items.map((item, index) => {
      const found = newPositions.find(p => p.originalIndex === index);
      return found || { ...item, currentPos: item.startPos };
    });
    
    setItemPositions(finalPositions);
  }, [currentLevel]);

  // Проверка решения
  const checkSolution = () => {
    if (!currentLevel) return;
    
    // Проверяем все ли свойства из solution присутствуют в коде
    const codeNormalized = code.toLowerCase().replace(/\s+/g, '');
    const allSolutionsPresent = currentLevel.solution.every(sol => {
      const solNormalized = sol.toLowerCase().replace(/\s+/g, '');
      return codeNormalized.includes(solNormalized);
    });
    
    // Проверяем позиции элементов
    const allInPosition = itemPositions.every((item, index) => {
      const target = currentLevel.targets[index];
      return item.currentPos.row === target.row && item.currentPos.col === target.col;
    });
    
    if (allInPosition || allSolutionsPresent) {
      setGameState('won');
      setEarnedPoints(currentLevel.points || 10);
      
      if (!completedLevels.includes(selectedLevel)) {
        setCompletedLevels([...completedLevels, selectedLevel]);
        
        // Сохраняем прогресс на сервер
        try {
          api.post('/flexchan/progress', {
            level_id: selectedLevel,
            completed: true,
            attempts: errorCount + 1
          });
        } catch (error) {
          console.error('Error saving progress:', error);
        }
      }
    } else {
      setErrorCount(prev => prev + 1);
      if (errorCount >= 2) {
        setGameState('lost');
      }
    }
  };

  const handleLevelSelect = (levelId) => {
    const levelIndex = levels.findIndex(l => l.id === levelId);
    const prevLevelId = levelIndex > 0 ? levels[levelIndex - 1].id : null;
    
    if (levelIndex === 0 || completedLevels.includes(prevLevelId)) {
      setSelectedLevel(levelId);
    }
  };

  const handleBack = () => {
    setSelectedLevel(null);
    setEarnedPoints(0);
  };

  const handleReset = () => {
    if (currentLevel) {
      setCode(currentLevel.initialCode);
      setErrorCount(0);
      setGameState('playing');
      setItemPositions(currentLevel.items.map(item => ({ ...item, currentPos: { ...item.startPos } })));
    }
  };

  const handleNextLevel = () => {
    const currentIndex = levels.findIndex(l => l.id === selectedLevel);
    if (currentIndex < levels.length - 1) {
      setSelectedLevel(levels[currentIndex + 1].id);
      setEarnedPoints(0);
    } else {
      setSelectedLevel(null);
      setEarnedPoints(0);
    }
  };

  const isLevelUnlocked = (levelId) => {
    const levelIndex = levels.findIndex(l => l.id === levelId);
    if (levelIndex === 0) return true;
    const prevLevelId = levels[levelIndex - 1]?.id;
    return completedLevels.includes(prevLevelId);
  };

  const getDifficultyColor = (diff) => {
    switch (diff) {
      case 'easy': return '#22c55e';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      case 'expert': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getFaceImage = (type) => {
    const prefix = type === 'boy' ? 'boy_' : '';
    
    if (gameState === 'won') {
      return `/flexchan/${prefix}goodface.svg`;
    } else if (errorCount >= 2) {
      return `/flexchan/${prefix}angryface.svg`;
    } else if (errorCount >= 1) {
      return `/flexchan/${prefix}missface.svg`;
    }
    return `/flexchan/${prefix}normalface.svg`;
  };

  // Обновляем позиции при изменении кода
  useEffect(() => {
    if (currentLevel && gameState === 'playing') {
      calculatePositions(code);
    }
  }, [code, currentLevel, gameState, calculatePositions]);

  // Загрузка
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <img src="/flexchan/cardimg.svg" alt="Loading" className={styles.loadingImage} />
          <p>Загрузка уровней...</p>
        </div>
      </div>
    );
  }

  // Экран выбора уровней
  if (selectedLevel === null) {
    return (
      <div className={styles.container}>
        <div className={styles.levelSelectArea}>
          <div className={styles.levelHeader}>
            <img src="/flexchan/cardimg.svg" alt="Flex Chan" className={styles.headerImage} />
            <h1>Flex Chan</h1>
            <p>Изучай CSS Flexbox играя!</p>
            <div className={styles.progressInfo}>
              <span>Пройдено: {completedLevels.length} / {totalLevels}</span>
            </div>
          </div>
          
          <div className={styles.levelsGrid}>
            {levels.map((level, index) => {
              const unlocked = isLevelUnlocked(level.id);
              const completed = completedLevels.includes(level.id);
              
              return (
                <button
                  key={level.id}
                  className={`${styles.levelButton} ${!unlocked ? styles.locked : ''} ${completed ? styles.completed : ''}`}
                  onClick={() => handleLevelSelect(level.id)}
                  disabled={!unlocked}
                  title={level.title}
                >
                  {unlocked ? (
                    <>
                      <span className={styles.levelNumber}>{index + 1}</span>
                      {completed && <FaStar className={styles.starIcon} />}
                      {level.points && (
                        <span className={styles.levelPoints}>+{level.points}</span>
                      )}
                    </>
                  ) : (
                    <FaLock className={styles.lockIcon} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Игровое поле
  const currentIndex = levels.findIndex(l => l.id === selectedLevel);
  
  return (
    <div className={styles.container}>
      <div className={styles.gameArea}>
        <div className={styles.gameHeader}>
          <button className={styles.backButton} onClick={handleBack}>
            <FaArrowLeft /> Назад
          </button>
          <div className={styles.levelInfo}>
            <span>Уровень {currentIndex + 1} / {totalLevels}</span>
            {currentLevel?.difficulty && (
              <span 
                className={styles.difficultyBadge}
                style={{ backgroundColor: getDifficultyColor(currentLevel.difficulty) }}
              >
                {currentLevel.difficulty === 'easy' && 'Лёгкий'}
                {currentLevel.difficulty === 'medium' && 'Средний'}
                {currentLevel.difficulty === 'hard' && 'Сложный'}
                {currentLevel.difficulty === 'expert' && 'Эксперт'}
              </span>
            )}
          </div>
          <button className={styles.resetButton} onClick={handleReset}>
            <FaRedo /> Сброс
          </button>
        </div>
        
        <div className={styles.levelTitle}>
          <h2>{currentLevel?.title}</h2>
          <p>{currentLevel?.description}</p>
        </div>

        <div className={styles.gameContent}>
          <div className={styles.gridContainer}>
            <div 
              className={styles.grid}
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`
              }}
            >
              {Array(GRID_SIZE).fill(null).map((_, rowIndex) =>
                Array(GRID_SIZE).fill(null).map((_, colIndex) => {
                  const isTarget = currentLevel?.targets.some(
                    t => t.row === rowIndex && t.col === colIndex
                  );
                  const itemHere = itemPositions.find(
                    item => item.currentPos.row === rowIndex && item.currentPos.col === colIndex
                  );
                  
                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`${styles.cell} ${isTarget ? styles.targetCell : ''}`}
                    >
                      {itemHere && (
                        <img 
                          src={getFaceImage(itemHere.type)} 
                          alt={itemHere.type}
                          className={styles.itemImage}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className={styles.codePanel}>
            <div className={styles.codeHeader}>
              <span>CSS</span>
              {currentLevel?.hint && (
                <span className={styles.hint}>💡 {currentLevel.hint}</span>
              )}
            </div>
            <ProtectedCodeEditor
              initialCode={currentLevel?.initialCode || ''}
              onChange={setCode}
              disabled={gameState !== 'playing'}
            />
            <button 
              className={styles.submitButton}
              onClick={checkSolution}
              disabled={gameState !== 'playing'}
            >
              <FaPlay /> Проверить
            </button>
          </div>
        </div>

        {gameState === 'won' && (
          <div className={styles.resultOverlay}>
            <div className={styles.resultModal}>
              <img src="/flexchan/goodface.svg" alt="Win" className={styles.resultImage} />
              <h2>🎉 Отлично!</h2>
              <p>Уровень {currentIndex + 1} пройден!</p>
              {earnedPoints > 0 && (
                <div className={styles.earnedPoints}>
                  +{earnedPoints} баллов
                </div>
              )}
              <div className={styles.resultButtons}>
                <button onClick={handleBack}>К уровням</button>
                {currentIndex < levels.length - 1 && (
                  <button onClick={handleNextLevel} className={styles.nextButton}>
                    Следующий уровень
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {gameState === 'lost' && (
          <div className={styles.resultOverlay}>
            <div className={styles.resultModal}>
              <img src="/flexchan/angryface.svg" alt="Lose" className={styles.resultImage} />
              <h2>😢 Попробуй ещё раз</h2>
              <p>Слишком много ошибок</p>
              <div className={styles.resultButtons}>
                <button onClick={handleReset}>Начать заново</button>
                <button onClick={handleBack}>К уровням</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FlexChan;