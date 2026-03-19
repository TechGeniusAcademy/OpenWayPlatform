import { useState, useEffect, useRef, useCallback } from "react";
import {
  FaServer, FaPlus, FaTrash, FaGlobe, FaCopy, FaCheck,
  FaExternalLinkAlt, FaUpload, FaEye, FaEyeSlash,
  FaFolder, FaFolderOpen, FaFolderPlus, FaTimes, FaInfoCircle,
  FaRocket, FaArrowLeft, FaFile, FaFileCode, FaFileAlt,
  FaImage, FaMusic, FaFilm, FaChevronRight, FaChevronDown,
  FaEdit, FaCut, FaLink, FaSave,
} from "react-icons/fa";
import api from "../../utils/api";
import styles from "./StudentHosting.module.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function copyToClipboard(text) {
  navigator.clipboard?.writeText(text).catch(() => {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  });
}

function formatBytes(bytes) {
  if (!bytes) return "0 Б";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1048576).toFixed(1)} МБ`;
}

const TEXT_EXTS = new Set(['html','htm','css','js','mjs','json','txt','svg','webmanifest','xml','md']);
function isTextFile(name) {
  return TEXT_EXTS.has(name.split('.').pop()?.toLowerCase() || '');
}

function getFileIcon(item, isOpen) {
  if (item.type === 'dir') return isOpen
    ? <FaFolderOpen style={{ color: '#f59e0b' }} />
    : <FaFolder style={{ color: '#f59e0b' }} />;
  const ext = item.name.split('.').pop()?.toLowerCase();
  if (['html','htm'].includes(ext)) return <FaFileCode style={{ color: '#f97316' }} />;
  if (ext === 'css') return <FaFileCode style={{ color: '#3b82f6' }} />;
  if (['js','mjs','ts'].includes(ext)) return <FaFileCode style={{ color: '#eab308' }} />;
  if (['json','txt','md','xml'].includes(ext)) return <FaFileAlt style={{ color: '#94a3b8' }} />;
  if (['png','jpg','jpeg','gif','webp','ico','avif','svg'].includes(ext)) return <FaImage style={{ color: '#22c55e' }} />;
  if (['mp3','ogg','wav'].includes(ext)) return <FaMusic style={{ color: '#a78bfa' }} />;
  if (['mp4','webm'].includes(ext)) return <FaFilm style={{ color: '#ec4899' }} />;
  return <FaFile style={{ color: '#64748b' }} />;
}

const EMPTY_CREATE = { name: '', description: '' };

// ─── File tree node (recursive) ──────────────────────────────────────────────
function FileTreeNode({ item, depth, expandedDirs, onContextMenu, onToggle }) {
  const isDir = item.type === 'dir';
  const isExpanded = expandedDirs.has(item.path);
  return (
    <>
      <div
        className={`${styles.treeNode} ${isDir ? styles.treeNodeDir : styles.treeNodeFile}`}
        style={{ paddingLeft: 10 + depth * 18 }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, item); }}
        onClick={isDir ? () => onToggle(item.path) : undefined}
      >
        <span className={styles.treeChevron}>
          {isDir ? (isExpanded ? <FaChevronDown /> : <FaChevronRight />) : null}
        </span>
        <span className={styles.treeIcon}>{getFileIcon(item, isExpanded)}</span>
        <span className={styles.treeName}>{item.name}</span>
        {!isDir && <span className={styles.treeSize}>{formatBytes(item.size)}</span>}
      </div>
      {isDir && isExpanded && (item.children || []).map(child => (
        <FileTreeNode
          key={child.path}
          item={child}
          depth={depth + 1}
          expandedDirs={expandedDirs}
          onContextMenu={onContextMenu}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function StudentHosting() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSite, setSelectedSite] = useState(null);
  const [fileTree, setFileTree] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState(new Set());

  // Create site modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [createFiles, setCreateFiles] = useState([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [dragging, setDragging] = useState(false);

  // Context menu
  const [contextMenu, setContextMenu] = useState(null); // { x, y, item }

  // Edit file modal
  const [editModal, setEditModal] = useState(null); // { item, content, original, loading, saving, error }

  // Rename modal
  const [renameModal, setRenameModal] = useState(null); // { item, value, error }

  // Move modal
  const [moveModal, setMoveModal] = useState(null); // { item, dest, error }

  // New item modal
  const [newItemModal, setNewItemModal] = useState(null); // { type, parentPath, name, error, creating }

  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState('');

  const fileInputRef = useRef(null);
  const createInputRef = useRef(null);

  // ─── API ───────────────────────────────────────────────────────────────────
  const loadSites = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/hosting');
      setSites(res.data.sites || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось загрузить сайты.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSites(); }, [loadSites]);

  const loadFileTree = useCallback(async (site) => {
    try {
      setFilesLoading(true);
      const res = await api.get(`/hosting/${site.id}/files`);
      setFileTree(res.data.tree || []);
    } catch {
      setFileTree([]);
    } finally {
      setFilesLoading(false);
    }
  }, []);

  const selectSite = (site) => {
    setSelectedSite(site);
    setExpandedDirs(new Set());
    loadFileTree(site);
  };

  // ─── Context menu ──────────────────────────────────────────────────────────
  const openContextMenu = (e, item) => setContextMenu({ x: e.clientX, y: e.clientY, item });
  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    return () => { window.removeEventListener('click', close); window.removeEventListener('contextmenu', close); };
  }, [contextMenu]);

  // ─── Edit ──────────────────────────────────────────────────────────────────
  const openEditor = async (item) => {
    closeContextMenu();
    setEditModal({ item, content: '', original: '', loading: true, saving: false, error: '' });
    try {
      const res = await api.get(`/hosting/${selectedSite.id}/file`, { params: { p: item.path } });
      setEditModal(m => ({ ...m, content: res.data.content, original: res.data.content, loading: false }));
    } catch (err) {
      setEditModal(m => ({ ...m, error: err.response?.data?.error || 'Не удалось открыть файл', loading: false }));
    }
  };

  const saveEditor = async () => {
    if (!editModal || editModal.saving) return;
    setEditModal(m => ({ ...m, saving: true, error: '' }));
    try {
      await api.put(`/hosting/${selectedSite.id}/file`, { content: editModal.content }, { params: { p: editModal.item.path } });
      setEditModal(m => ({ ...m, original: m.content, saving: false }));
      loadFileTree(selectedSite);
    } catch (err) {
      setEditModal(m => ({ ...m, error: err.response?.data?.error || 'Ошибка сохранения', saving: false }));
    }
  };

  const onEditorKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveEditor(); }
  };

  // ─── Rename ────────────────────────────────────────────────────────────────
  const openRename = (item) => { closeContextMenu(); setRenameModal({ item, value: item.name, error: '' }); };

  const submitRename = async () => {
    if (!renameModal?.value.trim()) { setRenameModal(m => ({ ...m, error: 'Введите имя' })); return; }
    const { item, value } = renameModal;
    const parts = item.path.split('/');
    parts[parts.length - 1] = value.trim();
    try {
      await api.post(`/hosting/${selectedSite.id}/rename`, { from: item.path, to: parts.join('/') });
      setRenameModal(null);
      loadFileTree(selectedSite);
    } catch (err) {
      setRenameModal(m => ({ ...m, error: err.response?.data?.error || 'Ошибка переименования' }));
    }
  };

  // ─── Move ──────────────────────────────────────────────────────────────────
  const openMove = (item) => { closeContextMenu(); setMoveModal({ item, dest: item.path, error: '' }); };

  const submitMove = async () => {
    const { item, dest } = moveModal;
    if (!dest.trim() || dest.trim() === item.path) { setMoveModal(m => ({ ...m, error: 'Введите новый путь' })); return; }
    try {
      await api.post(`/hosting/${selectedSite.id}/rename`, { from: item.path, to: dest.trim() });
      setMoveModal(null);
      loadFileTree(selectedSite);
    } catch (err) {
      setMoveModal(m => ({ ...m, error: err.response?.data?.error || 'Ошибка перемещения' }));
    }
  };

  // ─── Delete item ───────────────────────────────────────────────────────────
  const deleteItem = async (item) => {
    closeContextMenu();
    const label = item.type === 'dir' ? `папку «${item.name}» и всё её содержимое` : `файл «${item.name}»`;
    if (!window.confirm(`Удалить ${label}?`)) return;
    try {
      await api.delete(`/hosting/${selectedSite.id}/item`, { params: { p: item.path } });
      loadFileTree(selectedSite);
    } catch (err) { alert(err.response?.data?.error || 'Ошибка удаления'); }
  };

  // ─── New item ──────────────────────────────────────────────────────────────
  const openNewItem = (type, parentPath = '') => { closeContextMenu(); setNewItemModal({ type, parentPath, name: '', error: '', creating: false }); };

  const submitNewItem = async () => {
    if (!newItemModal?.name.trim()) { setNewItemModal(m => ({ ...m, error: 'Введите имя' })); return; }
    const { type, parentPath, name } = newItemModal;
    const fullPath = parentPath ? `${parentPath}/${name.trim()}` : name.trim();
    setNewItemModal(m => ({ ...m, creating: true, error: '' }));
    try {
      if (type === 'dir') {
        await api.post(`/hosting/${selectedSite.id}/mkdir`, { dir: fullPath });
      } else {
        const ext = name.trim().split('.').pop()?.toLowerCase();
        let content = '';
        if (ext === 'html') content = `<!DOCTYPE html>\n<html lang="ru">\n<head>\n  <meta charset="UTF-8">\n  <title>Страница</title>\n</head>\n<body>\n  \n</body>\n</html>`;
        else if (ext === 'css') content = '/* Стили */\n';
        else if (['js','mjs'].includes(ext)) content = '// JavaScript\n';
        await api.post(`/hosting/${selectedSite.id}/touch`, { path: fullPath, content });
      }
      setNewItemModal(null);
      loadFileTree(selectedSite);
      if (type === 'dir') setExpandedDirs(prev => new Set([...prev, parentPath || fullPath]));
    } catch (err) {
      setNewItemModal(m => ({ ...m, creating: false, error: err.response?.data?.error || 'Ошибка создания' }));
    }
  };

  // ─── Copy URL ──────────────────────────────────────────────────────────────
  const handleCopy = (url, key) => { copyToClipboard(url); setCopied(key); setTimeout(() => setCopied(''), 1800); };
  const copyFileUrl = (item) => { closeContextMenu(); handleCopy(`${selectedSite.url}${item.path}`, item.path); };

  // ─── Toggle folder ─────────────────────────────────────────────────────────
  const toggleDir = useCallback((dirPath) => {
    setExpandedDirs(prev => { const n = new Set(prev); n.has(dirPath) ? n.delete(dirPath) : n.add(dirPath); return n; });
  }, []);

  // ─── Site CRUD ─────────────────────────────────────────────────────────────
  const togglePublic = async (site, e) => {
    e.stopPropagation();
    try {
      const res = await api.patch(`/hosting/${site.id}`, { is_public: !site.is_public });
      const updated = res.data.site;
      setSites(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
      if (selectedSite?.id === updated.id) setSelectedSite(s => ({ ...s, ...updated }));
    } catch {}
  };

  const deleteSite = async (site, e) => {
    e.stopPropagation();
    if (!window.confirm(`Удалить сайт «${site.name}»? Это удалит все файлы.`)) return;
    try {
      await api.delete(`/hosting/${site.id}`);
      setSites(prev => prev.filter(s => s.id !== site.id));
      if (selectedSite?.id === site.id) { setSelectedSite(null); setFileTree([]); }
    } catch {}
  };

  const handleUploadFiles = async (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length || !selectedSite) return;
    const fd = new FormData();
    picked.forEach(f => fd.append('files', f));
    try {
      setUploading(true);
      await api.post(`/hosting/${selectedSite.id}/files`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await loadFileTree(selectedSite);
    } catch (err) { alert(err.response?.data?.error || 'Ошибка загрузки'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) { setCreateError('Введите название'); return; }
    if (!createFiles.length) { setCreateError('Добавьте хотя бы один файл'); return; }
    const fd = new FormData();
    fd.append('name', createForm.name.trim());
    fd.append('description', createForm.description.trim());
    createFiles.forEach(f => fd.append('files', f));
    try {
      setCreating(true); setCreateError('');
      const res = await api.post('/hosting', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const newSite = res.data.site;
      setSites(prev => [newSite, ...prev]);
      setShowCreate(false); setCreateForm(EMPTY_CREATE); setCreateFiles([]);
      selectSite(newSite);
    } catch (err) { setCreateError(err.response?.data?.error || 'Ошибка создания сайта'); }
    finally { setCreating(false); }
  };

  const openCreate = () => { setShowCreate(true); setCreateError(''); setCreateForm(EMPTY_CREATE); setCreateFiles([]); };

  const onDropCreate = (e) => {
    e.preventDefault(); setDragging(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    setCreateFiles(prev => { const names = new Set(prev.map(f => f.name)); return [...prev, ...dropped.filter(f => !names.has(f.name))]; });
  };

  function countFiles(tree) {
    let n = 0;
    for (const item of tree) { if (item.type === 'file') n++; else n += countFiles(item.children || []); }
    return n;
  }

  // ─── Render helpers ────────────────────────────────────────────────────────
  const renderCreateModal = () => (
    <div className={styles.modalOverlay} onClick={() => setShowCreate(false)}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span><FaServer /> Создать сайт</span>
          <button className={styles.modalClose} onClick={() => setShowCreate(false)}><FaTimes /></button>
        </div>
        <form onSubmit={handleCreateSubmit} className={styles.modalForm}>
          <label className={styles.formLabel}>
            Название *
            <input className={styles.formInput} placeholder="Мой крутой сайт" value={createForm.name}
              onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} maxLength={120} autoFocus />
          </label>
          <label className={styles.formLabel}>
            Описание
            <textarea className={styles.formTextarea} rows={2} placeholder="Краткое описание (необязательно)"
              value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} />
          </label>
          <div className={styles.formLabel}>Файлы *</div>
          <div className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDropCreate}
            onClick={() => createInputRef.current?.click()}
          >
            <FaUpload className={styles.dropzoneIcon} />
            <span>Перетащи файлы или <u>кликни для выбора</u></span>
            <span className={styles.dropzoneHint}>.html, .css, .js, картинки…</span>
            <input ref={createInputRef} type="file" multiple style={{ display: 'none' }}
              accept=".html,.htm,.css,.js,.json,.png,.jpg,.jpeg,.gif,.svg,.webp,.ico,.woff,.woff2,.ttf,.otf,.mp3,.mp4,.webm,.ogg"
              onChange={e => {
                const picked = Array.from(e.target.files || []);
                setCreateFiles(prev => { const names = new Set(prev.map(f => f.name)); return [...prev, ...picked.filter(f => !names.has(f.name))]; });
                e.target.value = '';
              }}
            />
          </div>
          {createFiles.length > 0 && (
            <ul className={styles.pickedList}>
              {createFiles.map(f => (
                <li key={f.name} className={styles.pickedItem}>
                  <FaFile className={styles.pickedIcon} />
                  <span>{f.name}</span>
                  <span className={styles.pickedSize}>{formatBytes(f.size)}</span>
                  <button type="button" className={styles.pickedRemove}
                    onClick={() => setCreateFiles(prev => prev.filter(x => x.name !== f.name))}>
                    <FaTimes />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {createError && <div className={styles.formError}>{createError}</div>}
          <div className={styles.modalActions}>
            <button type="button" className={styles.btnSecondary} onClick={() => setShowCreate(false)}>Отмена</button>
            <button type="submit" className={styles.btnPrimary} disabled={creating}>{creating ? 'Создаём…' : 'Создать сайт'}</button>
          </div>
        </form>
      </div>
    </div>
  );

  // ─── Screens ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className={styles.centerScreen}>
      <div className={styles.spinner} />
      <p className={styles.spinnerText}>Загрузка…</p>
    </div>
  );

  if (error) return (
    <div className={styles.centerScreen}>
      <div className={styles.errorBox}>
        <p>{error}</p>
        <button className={styles.btnPrimary} onClick={loadSites}>Повторить</button>
      </div>
    </div>
  );

  if (!selectedSite && sites.length === 0) return (
    <>
      <div className={styles.onboarding}>
        <div className={styles.onboardingCard}>
          <FaRocket className={styles.onboardingIcon} />
          <h2 className={styles.onboardingTitle}>Разверни свой сайт</h2>
          <p className={styles.onboardingDesc}>Загрузи HTML, CSS и JS файлы — получишь публичную ссылку за секунды.</p>
          <ul className={styles.onboardingSteps}>
            <li><span className={styles.stepNum}>1</span> Нажми «Создать сайт»</li>
            <li><span className={styles.stepNum}>2</span> Введи название и загрузи файлы (включая <code>index.html</code>)</li>
            <li><span className={styles.stepNum}>3</span> Получи публичную ссылку и открой сайт в браузере</li>
          </ul>
          <button className={styles.btnBig} onClick={openCreate}><FaPlus /> Создать первый сайт</button>
        </div>
      </div>
      {showCreate && renderCreateModal()}
    </>
  );

  // ─── Main layout ───────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}><FaServer /> Мои сайты</span>
          <button className={styles.btnCreate} onClick={openCreate}><FaPlus /> Новый</button>
        </div>
        <ul className={styles.siteList}>
          {sites.map(site => (
            <li key={site.id}
              className={`${styles.siteItem} ${selectedSite?.id === site.id ? styles.siteItemActive : ''}`}
              onClick={() => selectSite(site)}
            >
              <div className={styles.siteItemTop}>
                <span className={styles.siteName}>{site.name}</span>
                <div className={styles.siteActions}>
                  <button className={styles.iconBtn} title={site.is_public ? 'Скрыть' : 'Опубликовать'} onClick={e => togglePublic(site, e)}>
                    {site.is_public ? <FaEye /> : <FaEyeSlash />}
                  </button>
                  <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} title="Удалить" onClick={e => deleteSite(site, e)}>
                    <FaTrash />
                  </button>
                </div>
              </div>
              <div className={styles.siteSlug}>/{site.slug}/</div>
            </li>
          ))}
        </ul>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <main className={styles.main}>
        {!selectedSite ? (
          <div className={styles.placeholder}>
            <FaFolder className={styles.placeholderIcon} />
            <p>Выбери сайт из списка слева</p>
          </div>
        ) : (
          <>
            <div className={styles.mainHeader}>
              <button className={styles.btnBack} onClick={() => { setSelectedSite(null); setFileTree([]); }}>
                <FaArrowLeft /> Назад
              </button>
              <div className={styles.mainHeaderLeft}>
                <h2 className={styles.mainTitle}>{selectedSite.name}</h2>
                {selectedSite.description && <p className={styles.mainDesc}>{selectedSite.description}</p>}
              </div>
            </div>

            <div className={styles.urlBox}>
              <span className={styles.urlLabel}><FaGlobe /> Публичный URL:</span>
              <code className={styles.urlCode}>{selectedSite.url}</code>
              <button className={styles.iconBtn} onClick={() => handleCopy(selectedSite.url, 'url')}>
                {copied === 'url' ? <FaCheck style={{ color: '#22c55e' }} /> : <FaCopy />}
              </button>
              <a className={styles.iconBtn} href={selectedSite.url} target="_blank" rel="noopener noreferrer"><FaExternalLinkAlt /></a>
            </div>

            <div className={styles.filesSection}>
              {/* Toolbar */}
              <div className={styles.filesSectionHeader}>
                <span className={styles.filesSectionTitle}>
                  <FaFolder /> Файловый менеджер
                  {!filesLoading && <span className={styles.fileCount}>{countFiles(fileTree)} файл(ов)</span>}
                </span>
                <div className={styles.fmToolbar}>
                  <button className={styles.toolBtn} onClick={() => openNewItem('file')} title="Новый файл">
                    <FaFile /> Файл
                  </button>
                  <button className={styles.toolBtn} onClick={() => openNewItem('dir')} title="Новая папка">
                    <FaFolderPlus /> Папка
                  </button>
                  <button className={styles.toolBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <FaUpload /> {uploading ? 'Загрузка…' : 'Загрузить'}
                  </button>
                </div>
                <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
                  accept=".html,.htm,.css,.js,.json,.png,.jpg,.jpeg,.gif,.svg,.webp,.ico,.woff,.woff2,.ttf,.otf,.mp3,.mp4,.webm,.ogg"
                  onChange={handleUploadFiles}
                />
              </div>

              {/* File tree */}
              <div className={styles.fileTree}>
                {filesLoading ? (
                  <div className={styles.loadingMsg}>Загрузка файлов…</div>
                ) : fileTree.length === 0 ? (
                  <div className={styles.noFiles}>
                    <FaUpload style={{ fontSize: 28, color: '#4c1d95', marginBottom: 8 }} />
                    <p>Файлов нет</p>
                    <p style={{ fontSize: 13, color: '#64748b' }}>Загрузи файлы или создай новый через кнопки выше</p>
                  </div>
                ) : (
                  fileTree.map(item => (
                    <FileTreeNode
                      key={item.path}
                      item={item}
                      depth={0}
                      expandedDirs={expandedDirs}
                      onContextMenu={openContextMenu}
                      onToggle={toggleDir}
                    />
                  ))
                )}
              </div>
            </div>

            <div className={styles.infoBox}>
              <FaInfoCircle />
              <span>Правая кнопка мыши по файлу/папке — контекстное меню. Главная страница: <strong>index.html</strong>.</span>
            </div>
          </>
        )}
      </main>

      {/* ── Context menu ──────────────────────────────────────────────── */}
      {contextMenu && (
        <ul className={styles.contextMenu} style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}>
          {contextMenu.item.type === 'file' && isTextFile(contextMenu.item.name) && (
            <li className={styles.contextMenuItem} onClick={() => openEditor(contextMenu.item)}>
              <FaEdit /> Редактировать
            </li>
          )}
          <li className={styles.contextMenuItem} onClick={() => openRename(contextMenu.item)}>
            <FaEdit style={{ opacity: 0.7 }} /> Переименовать
          </li>
          <li className={styles.contextMenuItem} onClick={() => openMove(contextMenu.item)}>
            <FaCut /> Переместить
          </li>
          {contextMenu.item.type === 'file' && (
            <li className={styles.contextMenuItem} onClick={() => copyFileUrl(contextMenu.item)}>
              <FaLink /> Копировать ссылку
            </li>
          )}
          {contextMenu.item.type === 'dir' && (
            <>
              <li className={styles.contextMenuDivider} />
              <li className={styles.contextMenuItem} onClick={() => openNewItem('file', contextMenu.item.path)}>
                <FaFile /> Новый файл сюда
              </li>
              <li className={styles.contextMenuItem} onClick={() => openNewItem('dir', contextMenu.item.path)}>
                <FaFolderPlus /> Новая папка сюда
              </li>
            </>
          )}
          <li className={styles.contextMenuDivider} />
          <li className={`${styles.contextMenuItem} ${styles.contextMenuItemDanger}`} onClick={() => deleteItem(contextMenu.item)}>
            <FaTrash /> Удалить
          </li>
        </ul>
      )}

      {/* ── Create site modal ─────────────────────────────────────────── */}
      {showCreate && renderCreateModal()}

      {/* ── Code editor modal ─────────────────────────────────────────── */}
      {editModal && (
        <div className={styles.modalOverlay} onClick={() => setEditModal(null)}>
          <div className={styles.editorModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span><FaFileCode /> {editModal.item?.name}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className={styles.btnPrimary}
                  onClick={saveEditor}
                  disabled={editModal.saving || editModal.loading || editModal.content === editModal.original}
                  style={{ padding: '6px 14px', fontSize: 13 }}>
                  <FaSave /> {editModal.saving ? 'Сохранение…' : 'Сохранить'}
                </button>
                <button className={styles.modalClose} onClick={() => setEditModal(null)}><FaTimes /></button>
              </div>
            </div>
            {editModal.loading ? (
              <div className={styles.loadingMsg} style={{ padding: 40 }}>Загрузка файла…</div>
            ) : editModal.error ? (
              <div className={styles.formError} style={{ margin: 16 }}>{editModal.error}</div>
            ) : (
              <textarea
                className={styles.editorTextarea}
                value={editModal.content}
                onChange={e => setEditModal(m => ({ ...m, content: e.target.value }))}
                onKeyDown={onEditorKeyDown}
                spellCheck={false}
                autoComplete="off"
              />
            )}
            <div className={styles.editorFooter}>
              <span>{(editModal.content || '').length} символов · {(editModal.content || '').split('\n').length} строк</span>
              <span style={{ color: '#475569' }}>Ctrl+S — сохранить · Esc — закрыть</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Rename modal ──────────────────────────────────────────────── */}
      {renameModal && (
        <div className={styles.modalOverlay} onClick={() => setRenameModal(null)}>
          <div className={styles.modalSm} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span><FaEdit style={{ opacity: 0.7 }} /> Переименовать</span>
              <button className={styles.modalClose} onClick={() => setRenameModal(null)}><FaTimes /></button>
            </div>
            <div className={styles.modalForm}>
              <label className={styles.formLabel}>
                Новое имя
                <input className={styles.formInput} value={renameModal.value} autoFocus
                  onChange={e => setRenameModal(m => ({ ...m, value: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setRenameModal(null); }}
                />
              </label>
              {renameModal.error && <div className={styles.formError}>{renameModal.error}</div>}
              <div className={styles.modalActions}>
                <button className={styles.btnSecondary} onClick={() => setRenameModal(null)}>Отмена</button>
                <button className={styles.btnPrimary} onClick={submitRename}>Переименовать</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Move modal ────────────────────────────────────────────────── */}
      {moveModal && (
        <div className={styles.modalOverlay} onClick={() => setMoveModal(null)}>
          <div className={styles.modalSm} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span><FaCut /> Переместить «{moveModal.item.name}»</span>
              <button className={styles.modalClose} onClick={() => setMoveModal(null)}><FaTimes /></button>
            </div>
            <div className={styles.modalForm}>
              <div className={styles.moveHint}>Текущий путь: <code>{moveModal.item.path}</code></div>
              <label className={styles.formLabel}>
                Новый путь
                <input className={styles.formInput} value={moveModal.dest} autoFocus
                  placeholder="например: css/style.css"
                  onChange={e => setMoveModal(m => ({ ...m, dest: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') submitMove(); if (e.key === 'Escape') setMoveModal(null); }}
                />
              </label>
              {moveModal.error && <div className={styles.formError}>{moveModal.error}</div>}
              <div className={styles.modalActions}>
                <button className={styles.btnSecondary} onClick={() => setMoveModal(null)}>Отмена</button>
                <button className={styles.btnPrimary} onClick={submitMove}>Переместить</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── New item modal ────────────────────────────────────────────── */}
      {newItemModal && (
        <div className={styles.modalOverlay} onClick={() => setNewItemModal(null)}>
          <div className={styles.modalSm} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span>{newItemModal.type === 'dir' ? <><FaFolderPlus /> Новая папка</> : <><FaFile /> Новый файл</>}</span>
              <button className={styles.modalClose} onClick={() => setNewItemModal(null)}><FaTimes /></button>
            </div>
            <div className={styles.modalForm}>
              {newItemModal.parentPath && (
                <div className={styles.moveHint}>В папке: <code>/{newItemModal.parentPath}/</code></div>
              )}
              <label className={styles.formLabel}>
                {newItemModal.type === 'dir' ? 'Имя папки' : 'Имя файла'}
                <input className={styles.formInput} value={newItemModal.name} autoFocus
                  placeholder={newItemModal.type === 'dir' ? 'css' : 'index.html'}
                  onChange={e => setNewItemModal(m => ({ ...m, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') submitNewItem(); if (e.key === 'Escape') setNewItemModal(null); }}
                />
              </label>
              {newItemModal.error && <div className={styles.formError}>{newItemModal.error}</div>}
              <div className={styles.modalActions}>
                <button className={styles.btnSecondary} onClick={() => setNewItemModal(null)}>Отмена</button>
                <button className={styles.btnPrimary} onClick={submitNewItem} disabled={newItemModal.creating}>
                  {newItemModal.creating ? 'Создание…' : 'Создать'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
