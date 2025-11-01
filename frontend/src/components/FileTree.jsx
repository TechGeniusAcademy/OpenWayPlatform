import { useState } from 'react';
import { 
  FaFolder, 
  FaFolderOpen, 
  FaFile, 
  FaJs, 
  FaPython, 
  FaHtml5, 
  FaCss3Alt,
  FaPhp,
  FaDatabase
} from 'react-icons/fa';
import { BiDotsVerticalRounded } from 'react-icons/bi';
import styles from './FileTree.module.css';

const FileTree = ({ 
  files, 
  onFileSelect, 
  onCreateFile, 
  onCreateFolder, 
  onDelete, 
  onRename,
  onMove,
  selectedFile 
}) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [contextMenu, setContextMenu] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const toggleFolder = (path) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return <FaJs className="file-icon js-icon" />;
      case 'py':
        return <FaPython className="file-icon py-icon" />;
      case 'html':
        return <FaHtml5 className="file-icon html-icon" />;
      case 'css':
        return <FaCss3Alt className="file-icon css-icon" />;
      case 'php':
        return <FaPhp className="file-icon php-icon" />;
      case 'sql':
        return <FaDatabase className="file-icon sql-icon" />;
      default:
        return <FaFile className={styles['file-icon']} />;
    }
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item: item
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleAction = (action, item) => {
    switch (action) {
      case 'rename':
        const newName = prompt('Введите новое имя:', item.name);
        if (newName && newName !== item.name) {
          onRename(item.path, newName);
        }
        break;
      case 'delete':
        if (confirm(`Удалить ${item.type === 'folder' ? 'папку' : 'файл'} "${item.name}"?`)) {
          onDelete(item.path);
        }
        break;
      case 'newFile':
        const fileName = prompt('Имя файла:');
        if (fileName) {
          onCreateFile(item.path, fileName);
        }
        break;
      case 'newFolder':
        const folderName = prompt('Имя папки:');
        if (folderName) {
          onCreateFolder(item.path, folderName);
        }
        break;
    }
    closeContextMenu();
  };

  // Drag and Drop handlers
  const handleDragStart = (e, item) => {
    e.stopPropagation();
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.path);
  };

  const handleDragOver = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Разрешаем drop только на папки и только если это не сам перетаскиваемый элемент
    if (item.type === 'folder' && draggedItem && item.path !== draggedItem.path) {
      // Проверяем, что не пытаемся переместить папку в саму себя или в свою подпапку
      if (!item.path.startsWith(draggedItem.path + '/')) {
        e.dataTransfer.dropEffect = 'move';
        setDropTarget(item.path);
      }
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
  };

  const handleDrop = (e, targetItem) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedItem && targetItem && targetItem.type === 'folder') {
      // Проверяем что не перемещаем в саму себя
      if (draggedItem.path !== targetItem.path && !targetItem.path.startsWith(draggedItem.path + '/')) {
        onMove(draggedItem.path, targetItem.path);
      }
    }
    
    setDraggedItem(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
  };

  const renderTree = (items, level = 0) => {
    return items.map((item) => {
      const isExpanded = expandedFolders.has(item.path);
      const isSelected = selectedFile === item.path;
      const isDragging = draggedItem?.path === item.path;
      const isDropTarget = dropTarget === item.path;

      if (item.type === 'folder') {
        return (
          <div key={item.path} className={styles['tree-item-wrapper']}>
            <div
              className={`tree-item folder ${isExpanded ? 'expanded' : ''} ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''}`}
              style={{ paddingLeft: `${level * 20 + 10}px` }}
              onClick={() => toggleFolder(item.path)}
              onContextMenu={(e) => handleContextMenu(e, item)}
              draggable={level > 0}
              onDragStart={(e) => handleDragStart(e, item)}
              onDragOver={(e) => handleDragOver(e, item)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, item)}
              onDragEnd={handleDragEnd}
            >
              {isExpanded ? <FaFolderOpen className={styles['folder-icon']} /> : <FaFolder className={styles['folder-icon']} />}
              <span className={styles['item-name']}>{item.name}</span>
              <BiDotsVerticalRounded 
                className={styles['more-icon']} 
                onClick={(e) => {
                  e.stopPropagation();
                  handleContextMenu(e, item);
                }}
              />
            </div>
            {isExpanded && item.children && (
              <div className={styles['folder-contents']}>
                {renderTree(item.children, level + 1)}
              </div>
            )}
          </div>
        );
      } else {
        return (
          <div
            key={item.path}
            className={`tree-item file ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
            style={{ paddingLeft: `${level * 20 + 10}px` }}
            onClick={() => onFileSelect(item)}
            onContextMenu={(e) => handleContextMenu(e, item)}
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            onDragEnd={handleDragEnd}
          >
            {getFileIcon(item.name)}
            <span className={styles['item-name']}>{item.name}</span>
            <BiDotsVerticalRounded 
              className={styles['more-icon']} 
              onClick={(e) => {
                e.stopPropagation();
                handleContextMenu(e, item);
              }}
            />
          </div>
        );
      }
    });
  };

  return (
    <div className={styles['file-tree']} onClick={closeContextMenu}>
      {renderTree(files)}
      
      {contextMenu && (
        <div
          className={styles['context-menu']}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.item.type === 'folder' && (
            <>
              <div onClick={() => handleAction('newFile', contextMenu.item)}>
                Новый файл
              </div>
              <div onClick={() => handleAction('newFolder', contextMenu.item)}>
                Новая папка
              </div>
              <div className={styles.separator}></div>
            </>
          )}
          <div onClick={() => handleAction('rename', contextMenu.item)}>
            Переименовать
          </div>
          <div onClick={() => handleAction('delete', contextMenu.item)}>
            Удалить
          </div>
        </div>
      )}
    </div>
  );
};

export default FileTree;
