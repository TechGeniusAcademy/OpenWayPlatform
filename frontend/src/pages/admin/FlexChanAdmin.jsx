import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import styles from './FlexChanAdmin.module.css';
import { 
  FaPlus, 
  FaPencilAlt, 
  FaTrash, 
  FaSave, 
  FaTimes, 
  FaEye,
  FaArrowUp,
  FaArrowDown,
  FaStar,
  FaUsers,
  FaGamepad,
  FaChartBar,
  FaCode,
  FaCopy
} from 'react-icons/fa';

const GRID_SIZE = 10;

// Компонент визуального редактора сетки
function GridEditor({ items, targets, onItemsChange, onTargetsChange }) {
  const [mode, setMode] = useState('items'); // items, targets
  const [selectedType, setSelectedType] = useState('girl');
  
  const handleCellClick = (row, col) => {
    if (mode === 'items') {
      // Проверяем, есть ли уже элемент в этой ячейке
      const existingIndex = items.findIndex(
        item => item.startPos.row === row && item.startPos.col === col
      );
      
      if (existingIndex !== -1) {
        // Удаляем элемент
        const newItems = items.filter((_, i) => i !== existingIndex);
        onItemsChange(newItems);
      } else {
        // Добавляем элемент
        const newItems = [...items, { type: selectedType, startPos: { row, col } }];
        onItemsChange(newItems);
      }
    } else {
      // Targets mode
      const existingIndex = targets.findIndex(
        t => t.row === row && t.col === col
      );
      
      if (existingIndex !== -1) {
        const newTargets = targets.filter((_, i) => i !== existingIndex);
        onTargetsChange(newTargets);
      } else {
        const newTargets = [...targets, { row, col }];
        onTargetsChange(newTargets);
      }
    }
  };
  
  return (
    <div className={styles.gridEditor}>
      <div className={styles.gridControls}>
        <div className={styles.modeToggle}>
          <button 
            className={`${styles.modeBtn} ${mode === 'items' ? styles.active : ''}`}
            onClick={() => setMode('items')}
          >
            👤 Персонажи
          </button>
          <button 
            className={`${styles.modeBtn} ${mode === 'targets' ? styles.active : ''}`}
            onClick={() => setMode('targets')}
          >
            🎯 Цели
          </button>
        </div>
        
        {mode === 'items' && (
          <div className={styles.typeSelector}>
            <button 
              className={`${styles.typeBtn} ${selectedType === 'girl' ? styles.active : ''}`}
              onClick={() => setSelectedType('girl')}
            >
              <img src="/flexchan/normalface.svg" alt="Girl" />
              Girl
            </button>
            <button 
              className={`${styles.typeBtn} ${selectedType === 'boy' ? styles.active : ''}`}
              onClick={() => setSelectedType('boy')}
            >
              <img src="/flexchan/boy_normalface.svg" alt="Boy" />
              Boy
            </button>
          </div>
        )}
      </div>
      
      <div className={styles.gridPreview}>
        {Array(GRID_SIZE).fill(null).map((_, rowIndex) => (
          <div key={rowIndex} className={styles.gridRow}>
            {Array(GRID_SIZE).fill(null).map((_, colIndex) => {
              const item = items.find(
                i => i.startPos.row === rowIndex && i.startPos.col === colIndex
              );
              const isTarget = targets.some(
                t => t.row === rowIndex && t.col === colIndex
              );
              
              return (
                <div
                  key={colIndex}
                  className={`${styles.gridCell} ${isTarget ? styles.targetCell : ''}`}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                >
                  {item && (
                    <img 
                      src={`/flexchan/${item.type === 'boy' ? 'boy_' : ''}normalface.svg`}
                      alt={item.type}
                      className={styles.cellImage}
                    />
                  )}
                  {isTarget && !item && (
                    <span className={styles.targetMarker}>🎯</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      <div className={styles.gridLegend}>
        <span><img src="/flexchan/normalface.svg" alt="" /> = Стартовая позиция персонажа</span>
        <span>🎯 = Целевая позиция</span>
      </div>
    </div>
  );
}

// Компонент превью уровня
function LevelPreview({ level }) {
  const [code, setCode] = useState('');
  const [itemPositions, setItemPositions] = useState([]);
  
  useEffect(() => {
    if (level) {
      setCode(level.initial_code?.replace(/\{\{EDIT\}\}/g, '') || '');
      setItemPositions(
        (level.items || []).map(item => ({ 
          ...item, 
          currentPos: { ...item.startPos } 
        }))
      );
    }
  }, [level]);
  
  // Парсинг и симуляция flex
  const calculatePositions = useCallback((cssCode) => {
    if (!level) return;
    
    const flexProps = {};
    const containerMatch = cssCode.match(/\.container\s*\{([^}]*)\}/);
    
    if (containerMatch) {
      const props = containerMatch[1].split(';').filter(p => p.trim());
      props.forEach(prop => {
        const [key, value] = prop.split(':').map(s => s.trim());
        if (key && value) flexProps[key] = value;
      });
    }
    
    // Проверяем есть ли flex-свойства которые влияют на позиционирование
    const hasFlexPositioning = flexProps['justify-content'] || 
                               flexProps['align-items'] || 
                               flexProps['flex-direction'];
    
    const items = level.items || [];
    const newPositions = items.map((item, index) => {
      let col = item.startPos.col;
      let row = item.startPos.row;
      
      // Если нет flex-свойств, оставляем начальные позиции
      if (!hasFlexPositioning) {
        return { ...item, currentPos: { row, col } };
      }
      
      const direction = flexProps['flex-direction'] || 'row';
      const justifyContent = flexProps['justify-content'];
      const alignItems = flexProps['align-items'];
      
      if (direction === 'row' || direction === 'row-reverse') {
        switch (justifyContent) {
          case 'flex-end':
            col = 9 - (items.length - 1 - index);
            break;
          case 'center':
            col = Math.floor((10 - items.length) / 2) + index;
            break;
          case 'space-between':
            col = items.length > 1 ? Math.round(index * 9 / (items.length - 1)) : 0;
            break;
          case 'flex-start':
            col = index;
            break;
          default:
            col = item.startPos.col;
        }
        
        switch (alignItems) {
          case 'flex-end':
            row = 9;
            break;
          case 'center':
            row = 4;
            break;
          default:
            row = item.startPos.row;
        }
        
        if (direction === 'row-reverse') col = 9 - col;
      }
      
      if (direction === 'column' || direction === 'column-reverse') {
        switch (justifyContent) {
          case 'flex-end':
            row = 9 - (items.length - 1 - index);
            break;
          case 'center':
            row = Math.floor((10 - items.length) / 2) + index;
            break;
          case 'flex-start':
            row = index;
            break;
          default:
            row = item.startPos.row;
        }
        
        switch (alignItems) {
          case 'flex-end':
            col = 9;
            break;
          case 'center':
            col = 4;
            break;
          default:
            col = item.startPos.col;
        }
        
        if (direction === 'column-reverse') row = 9 - row;
      }
      
      col = Math.max(0, Math.min(9, col));
      row = Math.max(0, Math.min(9, row));
      
      return { ...item, currentPos: { row, col } };
    });
    
    setItemPositions(newPositions);
  }, [level]);
  
  useEffect(() => {
    if (code) {
      calculatePositions(code);
    }
  }, [code, calculatePositions]);
  
  if (!level) return null;
  
  return (
    <div className={styles.previewContainer}>
      <h4>Превью уровня</h4>
      
      <div className={styles.previewGrid}>
        {Array(GRID_SIZE).fill(null).map((_, rowIndex) => (
          <div key={rowIndex} className={styles.previewRow}>
            {Array(GRID_SIZE).fill(null).map((_, colIndex) => {
              const isTarget = (level.targets || []).some(
                t => t.row === rowIndex && t.col === colIndex
              );
              const item = itemPositions.find(
                i => i.currentPos?.row === rowIndex && i.currentPos?.col === colIndex
              );
              
              return (
                <div
                  key={colIndex}
                  className={`${styles.previewCell} ${isTarget ? styles.targetCell : ''}`}
                >
                  {item && (
                    <img 
                      src={`/flexchan/${item.type === 'boy' ? 'boy_' : ''}normalface.svg`}
                      alt={item.type}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      <div className={styles.testCode}>
        <label>Тест CSS (введите решение):</label>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Введите CSS для проверки..."
        />
      </div>
      
      <div className={styles.solutionHint}>
        <strong>Ожидаемое решение:</strong>
        <ul>
          {(level.solution || []).map((sol, i) => (
            <li key={i}><code>{sol}</code></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Модальное окно редактирования уровня
function LevelModal({ level, onSave, onClose }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    initial_code: '.container {\n  display: flex;\n  {{EDIT}}\n}',
    solution: [''],
    items: [],
    targets: [],
    hint: '',
    points: 10,
    difficulty: 'medium',
    level_order: 1
  });
  
  useEffect(() => {
    if (level) {
      setForm({
        title: level.title || '',
        description: level.description || '',
        initial_code: level.initial_code || '.container {\n  display: flex;\n  {{EDIT}}\n}',
        solution: Array.isArray(level.solution) ? level.solution : 
          (typeof level.solution === 'string' ? JSON.parse(level.solution) : ['']),
        items: Array.isArray(level.items) ? level.items : 
          (typeof level.items === 'string' ? JSON.parse(level.items) : []),
        targets: Array.isArray(level.targets) ? level.targets : 
          (typeof level.targets === 'string' ? JSON.parse(level.targets) : []),
        hint: level.hint || '',
        points: level.points || 10,
        difficulty: level.difficulty || 'medium',
        level_order: level.level_order || 1
      });
    }
  }, [level]);
  
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSolutionChange = (index, value) => {
    const newSolution = [...form.solution];
    newSolution[index] = value;
    setForm(prev => ({ ...prev, solution: newSolution }));
  };
  
  const addSolution = () => {
    setForm(prev => ({ ...prev, solution: [...prev.solution, ''] }));
  };
  
  const removeSolution = (index) => {
    setForm(prev => ({ 
      ...prev, 
      solution: prev.solution.filter((_, i) => i !== index) 
    }));
  };
  
  const handleSubmit = () => {
    if (!form.title || !form.initial_code || form.solution.every(s => !s)) {
      alert('Заполните обязательные поля: Название, Код, Решение');
      return;
    }
    onSave(form);
  };
  
  const insertEditMarker = () => {
    const textarea = document.getElementById('initialCodeTextarea');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = form.initial_code;
    const newText = text.substring(0, start) + '{{EDIT}}' + text.substring(end);
    handleChange('initial_code', newText);
  };
  
  // Шаблоны кода
  const codeTemplates = [
    { 
      name: 'Простой (1 свойство)', 
      code: '.container {\n  display: flex;\n  {{EDIT}}\n}' 
    },
    { 
      name: '2 свойства', 
      code: '.container {\n  display: flex;\n  {{EDIT}}\n  {{EDIT}}\n}' 
    },
    { 
      name: '3 свойства', 
      code: '.container {\n  display: flex;\n  {{EDIT}}\n  {{EDIT}}\n  {{EDIT}}\n}' 
    },
    { 
      name: 'С селектором .girl', 
      code: '.container {\n  display: flex;\n  {{EDIT}}\n}\n.girl {\n  {{EDIT}}\n}' 
    },
    { 
      name: 'С селекторами .girl и .boy', 
      code: '.container {\n  display: flex;\n  {{EDIT}}\n}\n.girl {\n  {{EDIT}}\n}\n.boy {\n  {{EDIT}}\n}' 
    },
    { 
      name: 'С flex-wrap', 
      code: '.container {\n  display: flex;\n  flex-wrap: wrap;\n  {{EDIT}}\n}' 
    }
  ];
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>{level ? 'Редактировать уровень' : 'Создать уровень'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        
        <div className={styles.modalContent}>
          <div className={styles.formGrid}>
            {/* Левая колонка - основные данные */}
            <div className={styles.formColumn}>
              <div className={styles.formGroup}>
                <label>Название уровня *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="например: justify-content: center"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Описание задания</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Что нужно сделать ученику"
                />
              </div>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Баллы за прохождение</label>
                  <input
                    type="number"
                    value={form.points}
                    onChange={(e) => handleChange('points', parseInt(e.target.value))}
                    min="1"
                    max="100"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Сложность</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => handleChange('difficulty', e.target.value)}
                  >
                    <option value="easy">Лёгкий</option>
                    <option value="medium">Средний</option>
                    <option value="hard">Сложный</option>
                    <option value="expert">Эксперт</option>
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label>Порядок</label>
                  <input
                    type="number"
                    value={form.level_order}
                    onChange={(e) => handleChange('level_order', parseInt(e.target.value))}
                    min="1"
                  />
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label>Подсказка</label>
                <input
                  type="text"
                  value={form.hint}
                  onChange={(e) => handleChange('hint', e.target.value)}
                  placeholder="например: Используйте justify-content"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>
                  Начальный код * 
                  <span className={styles.codeHint}>
                    (используйте {'{{EDIT}}'} для редактируемых мест)
                  </span>
                </label>
                
                <div className={styles.templateButtons}>
                  {codeTemplates.map((tpl, i) => (
                    <button 
                      key={i}
                      type="button"
                      className={styles.templateBtn}
                      onClick={() => handleChange('initial_code', tpl.code)}
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
                
                <div className={styles.codeEditorWrapper}>
                  <textarea
                    id="initialCodeTextarea"
                    value={form.initial_code}
                    onChange={(e) => handleChange('initial_code', e.target.value)}
                    className={styles.codeTextarea}
                    rows={8}
                  />
                  <button 
                    type="button" 
                    className={styles.insertBtn}
                    onClick={insertEditMarker}
                  >
                    + Вставить {'{{EDIT}}'}
                  </button>
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label>
                  Правильные решения * 
                  <span className={styles.codeHint}>(варианты ответов)</span>
                </label>
                {form.solution.map((sol, index) => (
                  <div key={index} className={styles.solutionRow}>
                    <input
                      type="text"
                      value={sol}
                      onChange={(e) => handleSolutionChange(index, e.target.value)}
                      placeholder="например: justify-content: center"
                    />
                    {form.solution.length > 1 && (
                      <button 
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => removeSolution(index)}
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button"
                  className={styles.addSolutionBtn}
                  onClick={addSolution}
                >
                  <FaPlus /> Добавить вариант ответа
                </button>
              </div>
            </div>
            
            {/* Правая колонка - визуальный редактор */}
            <div className={styles.formColumn}>
              <div className={styles.formGroup}>
                <label>Расположение персонажей и целей</label>
                <GridEditor
                  items={form.items}
                  targets={form.targets}
                  onItemsChange={(items) => handleChange('items', items)}
                  onTargetsChange={(targets) => handleChange('targets', targets)}
                />
              </div>
              
              <LevelPreview level={form} />
            </div>
          </div>
        </div>
        
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Отмена
          </button>
          <button className={styles.saveBtn} onClick={handleSubmit}>
            <FaSave /> Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

// Главный компонент админки
export default function FlexChanAdmin() {
  const [levels, setLevels] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('levels');
  const [showModal, setShowModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const [previewLevel, setPreviewLevel] = useState(null);
  
  useEffect(() => {
    fetchLevels();
    fetchStats();
  }, []);
  
  const fetchLevels = async () => {
    try {
      const response = await api.get('/flexchan/levels');
      setLevels(response.data);
    } catch (error) {
      console.error('Error fetching levels:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchStats = async () => {
    try {
      const response = await api.get('/flexchan/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };
  
  const handleSaveLevel = async (form) => {
    try {
      if (editingLevel) {
        await api.put(`/flexchan/levels/${editingLevel.id}`, form);
      } else {
        await api.post('/flexchan/levels', form);
      }
      
      fetchLevels();
      fetchStats();
      setShowModal(false);
      setEditingLevel(null);
    } catch (error) {
      console.error('Error saving level:', error);
      alert('Ошибка сохранения уровня');
    }
  };
  
  const handleDeleteLevel = async (id) => {
    if (!confirm('Удалить этот уровень?')) return;
    
    try {
      await api.delete(`/flexchan/levels/${id}`);
      fetchLevels();
      fetchStats();
    } catch (error) {
      console.error('Error deleting level:', error);
      alert('Ошибка удаления уровня');
    }
  };
  
  const handleMoveLevel = async (id, direction) => {
    const currentIndex = levels.findIndex(l => l.id === id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === levels.length - 1)
    ) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newLevels = [...levels];
    [newLevels[currentIndex], newLevels[newIndex]] = [newLevels[newIndex], newLevels[currentIndex]];
    
    const reorderData = newLevels.map((l, i) => ({ id: l.id, order: i + 1 }));
    
    try {
      await api.post('/flexchan/levels/reorder', { levels: reorderData });
      fetchLevels();
    } catch (error) {
      console.error('Error reordering levels:', error);
    }
  };
  
  const handleDuplicateLevel = (level) => {
    setEditingLevel(null);
    setShowModal(true);
    // Заполним форму данными из уровня, но как новый
    setTimeout(() => {
      setEditingLevel({
        ...level,
        id: null,
        title: `${level.title} (копия)`,
        level_order: levels.length + 1
      });
    }, 100);
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
  
  const getDifficultyLabel = (diff) => {
    switch (diff) {
      case 'easy': return 'Лёгкий';
      case 'medium': return 'Средний';
      case 'hard': return 'Сложный';
      case 'expert': return 'Эксперт';
      default: return diff;
    }
  };
  
  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <img src="/flexchan/cardimg.svg" alt="FlexChan" className={styles.logo} />
          <div>
            <h1>FlexChan Admin</h1>
            <p>Управление уровнями CSS Flexbox игры</p>
          </div>
        </div>
        
        <button 
          className={styles.addBtn}
          onClick={() => {
            setEditingLevel(null);
            setShowModal(true);
          }}
        >
          <FaPlus /> Создать уровень
        </button>
      </div>
      
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'levels' ? styles.active : ''}`}
          onClick={() => setActiveTab('levels')}
        >
          <FaGamepad /> Уровни ({levels.length})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'stats' ? styles.active : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <FaChartBar /> Статистика
        </button>
      </div>
      
      {activeTab === 'levels' && (
        <div className={styles.levelsList}>
          {levels.length === 0 ? (
            <div className={styles.emptyState}>
              <FaGamepad size={48} />
              <h3>Нет уровней</h3>
              <p>Создайте первый уровень для игры FlexChan</p>
              <button 
                className={styles.addBtn}
                onClick={() => setShowModal(true)}
              >
                <FaPlus /> Создать уровень
              </button>
            </div>
          ) : (
            levels.map((level, index) => (
              <div key={level.id} className={styles.levelCard}>
                <div className={styles.levelOrder}>
                  <span>{level.level_order}</span>
                  <div className={styles.orderButtons}>
                    <button 
                      onClick={() => handleMoveLevel(level.id, 'up')}
                      disabled={index === 0}
                    >
                      <FaArrowUp />
                    </button>
                    <button 
                      onClick={() => handleMoveLevel(level.id, 'down')}
                      disabled={index === levels.length - 1}
                    >
                      <FaArrowDown />
                    </button>
                  </div>
                </div>
                
                <div className={styles.levelInfo}>
                  <div className={styles.levelHeader}>
                    <h3>{level.title}</h3>
                    <div className={styles.levelBadges}>
                      <span 
                        className={styles.difficultyBadge}
                        style={{ background: getDifficultyColor(level.difficulty) }}
                      >
                        {getDifficultyLabel(level.difficulty)}
                      </span>
                      <span className={styles.pointsBadge}>
                        <FaStar /> {level.points} баллов
                      </span>
                    </div>
                  </div>
                  
                  <p className={styles.levelDescription}>{level.description}</p>
                  
                  <div className={styles.levelMeta}>
                    <span>
                      <FaCode /> {(level.solution || []).length} решений
                    </span>
                    <span>
                      👤 {(level.items || []).length} персонажей
                    </span>
                    <span>
                      🎯 {(level.targets || []).length} целей
                    </span>
                    {level.hint && <span>💡 Есть подсказка</span>}
                  </div>
                  
                  {level.initial_code && (
                    <pre className={styles.codePreview}>
                      {level.initial_code.substring(0, 100)}
                      {level.initial_code.length > 100 && '...'}
                    </pre>
                  )}
                </div>
                
                <div className={styles.levelActions}>
                  <button 
                    className={styles.previewBtn}
                    onClick={() => setPreviewLevel(level)}
                    title="Превью"
                  >
                    <FaEye />
                  </button>
                  <button 
                    className={styles.editBtn}
                    onClick={() => {
                      setEditingLevel(level);
                      setShowModal(true);
                    }}
                    title="Редактировать"
                  >
                    <FaPencilAlt />
                  </button>
                  <button 
                    className={styles.copyBtn}
                    onClick={() => handleDuplicateLevel(level)}
                    title="Дублировать"
                  >
                    <FaCopy />
                  </button>
                  <button 
                    className={styles.deleteBtn}
                    onClick={() => handleDeleteLevel(level.id)}
                    title="Удалить"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      {activeTab === 'stats' && stats && (
        <div className={styles.statsContainer}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <FaGamepad className={styles.statIcon} />
              <div className={styles.statValue}>{stats.totalLevels}</div>
              <div className={styles.statLabel}>Всего уровней</div>
            </div>
            <div className={styles.statCard}>
              <FaStar className={styles.statIcon} />
              <div className={styles.statValue}>{stats.totalCompletions}</div>
              <div className={styles.statLabel}>Прохождений</div>
            </div>
            <div className={styles.statCard}>
              <FaCode className={styles.statIcon} />
              <div className={styles.statValue}>{stats.totalAttempts}</div>
              <div className={styles.statLabel}>Всего попыток</div>
            </div>
            <div className={styles.statCard}>
              <FaUsers className={styles.statIcon} />
              <div className={styles.statValue}>{stats.uniquePlayers}</div>
              <div className={styles.statLabel}>Игроков</div>
            </div>
          </div>
          
          {stats.levelStats && stats.levelStats.length > 0 && (
            <div className={styles.levelStatsTable}>
              <h3>Статистика по уровням</h3>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Название</th>
                    <th>Сложность</th>
                    <th>Баллы</th>
                    <th>Попыток</th>
                    <th>Прошли</th>
                    <th>Ср. попыток</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.levelStats.map(level => (
                    <tr key={level.id}>
                      <td>{level.level_order}</td>
                      <td>{level.title}</td>
                      <td>
                        <span 
                          className={styles.difficultyBadge}
                          style={{ background: getDifficultyColor(level.difficulty) }}
                        >
                          {getDifficultyLabel(level.difficulty)}
                        </span>
                      </td>
                      <td>{level.points}</td>
                      <td>{level.total_attempts || 0}</td>
                      <td>{level.completions || 0}</td>
                      <td>{level.avg_attempts || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {stats.topPlayers && stats.topPlayers.length > 0 && (
            <div className={styles.topPlayers}>
              <h3>Топ игроков</h3>
              <div className={styles.playersList}>
                {stats.topPlayers.map((player, index) => (
                  <div key={player.id} className={styles.playerCard}>
                    <span className={styles.playerRank}>#{index + 1}</span>
                    <img 
                      src={player.avatar_url || '/default-avatar.png'} 
                      alt={player.name}
                      className={styles.playerAvatar}
                    />
                    <div className={styles.playerInfo}>
                      <span className={styles.playerName}>{player.name}</span>
                      <span className={styles.playerStats}>
                        {player.completed_levels} уровней • {player.earned_points} баллов
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {showModal && (
        <LevelModal
          level={editingLevel}
          onSave={handleSaveLevel}
          onClose={() => {
            setShowModal(false);
            setEditingLevel(null);
          }}
        />
      )}
      
      {previewLevel && (
        <div className={styles.previewModal}>
          <div className={styles.previewModalContent}>
            <button 
              className={styles.closeBtn}
              onClick={() => setPreviewLevel(null)}
            >
              <FaTimes />
            </button>
            <h2>Превью: {previewLevel.title}</h2>
            <LevelPreview level={previewLevel} />
          </div>
        </div>
      )}
    </div>
  );
}
