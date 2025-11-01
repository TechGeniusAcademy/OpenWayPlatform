const fs = require('fs');
const path = require('path');

// Функция для конвертации className в CSS Modules
function convertToModules(content) {
  // Заменяем простые className="text" на className={styles.text}
  content = content.replace(/className="([a-zA-Z0-9-_]+)"/g, 'className={styles.$1}');
  
  // Заменяем className с несколькими классами: className="class1 class2" на className={`${styles.class1} ${styles.class2}`}
  content = content.replace(/className=\{styles\.([a-zA-Z0-9-_]+)\s+([a-zA-Z0-9-_\s]+)\}/g, (match, first, rest) => {
    const classes = [first, ...rest.trim().split(/\s+/)];
    return `className={\`\${${classes.map(c => `styles.${c}`).join('} \${')}\}\`}`;
  });
  
  // Заменяем className с динамическими классами
  content = content.replace(/className=\{`([^`]*)\$\{([^}]+)\}([^`]*)styles\.([a-zA-Z0-9-_]+)([^`]*)`\}/g, 
    (match, before, dynamic, middle, className, after) => {
      return `className={\`${before}\${${dynamic}}${middle}\${styles.${className}}${after}\`}`;
    });
  
  return content;
}

// Получаем путь к файлу из аргументов
const filePath = process.argv[2];

if (!filePath) {
  console.error('Использование: node convert-to-modules.js <path-to-jsx-file>');
  process.exit(1);
}

const fullPath = path.resolve(filePath);

if (!fs.existsSync(fullPath)) {
  console.error(`Файл не найден: ${fullPath}`);
  process.exit(1);
}

const content = fs.readFileSync(fullPath, 'utf-8');
const converted = convertToModules(content);

fs.writeFileSync(fullPath, converted);
console.log(`✅ Файл конвертирован: ${filePath}`);
