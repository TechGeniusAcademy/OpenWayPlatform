import { useState, useEffect, useRef } from 'react';
import QuillEditor from '../../components/QuillEditor';
import api from '../../utils/api';
import {
  FaBook, FaCalendar, FaTrophy, FaTimes, FaEdit, FaPen, FaEye,
  FaInbox, FaCoins, FaCheckCircle, FaHourglass, FaClock, FaPaperclip,
  FaTrash, FaDownload, FaFilePdf, FaFileWord, FaFileExcel,
  FaFilePowerpoint, FaFileArchive, FaFileImage, FaFileCode, FaFileAlt,
  FaGlobe, FaPalette, FaBolt, FaFilter,
} from 'react-icons/fa';
import {
  AiOutlineCheckCircle, AiOutlineClockCircle, AiOutlineExclamationCircle,
  AiOutlineInbox, AiOutlineStar,
} from 'react-icons/ai';
import { MdAssignment, MdOutlinePendingActions } from 'react-icons/md';
import { HiOutlineDocumentText } from 'react-icons/hi';
import styles from './StudentHomeworks.module.css';

function StudentHomeworks() {
  const [homeworks, setHomeworks] = useState([]);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [userSubmission, setUserSubmission] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const fileInputRef = useRef(null);

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ font: [] }],
      [{ size: ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ['link', 'image', 'video'],
      ['clean'],
    ],
  };

  useEffect(() => { fetchHomeworks(); }, []);

  const fetchHomeworks = async () => {
    try {
      setPageLoading(true);
      const response = await api.get('/homeworks/student/assigned');
      setHomeworks(response.data.homeworks || []);
    } catch (error) {
      console.error('Ошибка загрузки домашних заданий:', error);
    } finally {
      setPageLoading(false);
    }
  };

  const openSubmitModal = async (homework) => {
    setSelectedHomework(homework);
    setShowSubmitModal(true);
    setSubmissionText('');
    setUserSubmission(null);
    setSelectedFiles([]);
    setExistingAttachments([]);
    try {
      const response = await api.get(`/homeworks/${homework.id}/submission`);
      if (response.data) {
        setUserSubmission(response.data);
        setSubmissionText(response.data.submission_text);
        if (response.data.attachments) {
          const attachments = typeof response.data.attachments === 'string'
            ? JSON.parse(response.data.attachments)
            : response.data.attachments;
          setExistingAttachments(attachments || []);
        }
      }
    } catch {
      // no submission yet
    }
  };

  const closeModal = () => {
    setShowSubmitModal(false);
    setSelectedHomework(null);
    setSubmissionText('');
    setUserSubmission(null);
    setSelectedFiles([]);
    setExistingAttachments([]);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const maxSize = 50 * 1024 * 1024;
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        alert(`Файл "${file.name}" слишком большой. Максимум 50MB`);
        return false;
      }
      return true;
    });
    setSelectedFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => setSelectedFiles(prev => prev.filter((_, i) => i !== index));

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const icons = {
      pdf: <FaFilePdf style={{ color: '#e74c3c' }} />,
      doc: <FaFileWord style={{ color: '#2980b9' }} />,
      docx: <FaFileWord style={{ color: '#2980b9' }} />,
      xls: <FaFileExcel style={{ color: '#27ae60' }} />,
      xlsx: <FaFileExcel style={{ color: '#27ae60' }} />,
      ppt: <FaFilePowerpoint style={{ color: '#e67e22' }} />,
      pptx: <FaFilePowerpoint style={{ color: '#e67e22' }} />,
      zip: <FaFileArchive style={{ color: '#9b59b6' }} />,
      rar: <FaFileArchive style={{ color: '#9b59b6' }} />,
      '7z': <FaFileArchive style={{ color: '#9b59b6' }} />,
      jpg: <FaFileImage style={{ color: '#1abc9c' }} />,
      jpeg: <FaFileImage style={{ color: '#1abc9c' }} />,
      png: <FaFileImage style={{ color: '#1abc9c' }} />,
      gif: <FaFileImage style={{ color: '#1abc9c' }} />,
      webp: <FaFileImage style={{ color: '#1abc9c' }} />,
      html: <FaGlobe style={{ color: '#e44d26' }} />,
      css: <FaPalette style={{ color: '#264de4' }} />,
      js: <FaBolt style={{ color: '#f7df1e' }} />,
      txt: <FaFileAlt style={{ color: '#7f8c8d' }} />,
      json: <FaFileCode style={{ color: '#f39c12' }} />,
    };
    return icons[ext] || <FaPaperclip style={{ color: '#95a5a6' }} />;
  };

  const handleSubmit = async () => {
    if (!submissionText.trim() && selectedFiles.length === 0 && existingAttachments.length === 0) {
      alert('Пожалуйста, введите ответ или прикрепите файлы');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('submissionText', submissionText);
      selectedFiles.forEach(file => formData.append('files', file));
      await api.post(`/homeworks/${selectedHomework.id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Работа успешно отправлена!');
      closeModal();
      fetchHomeworks();
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка отправки работы');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const isOverdue = (deadline) => new Date(deadline) < new Date();

  const filteredHomeworks = homeworks.filter(hw => {
    if (filter === 'all') return true;
    if (filter === 'active') return hw.status === 'active' && !hw.submission_status;
    if (filter === 'submitted') return hw.submission_status === 'pending';
    if (filter === 'accepted') return hw.submission_status === 'accepted';
    if (filter === 'rejected') return hw.submission_status === 'rejected';
    return true;
  });

  const stats = {
    total: homeworks.length,
    active: homeworks.filter(hw => hw.status === 'active' && !hw.submission_status).length,
    submitted: homeworks.filter(hw => hw.submission_status === 'pending').length,
    accepted: homeworks.filter(hw => hw.submission_status === 'accepted').length,
    rejected: homeworks.filter(hw => hw.submission_status === 'rejected').length,
    totalPoints: homeworks
      .filter(hw => hw.submission_status === 'accepted')
      .reduce((sum, hw) => sum + (hw.points_earned || 0), 0),
  };

  const getSubmissionChip = (sub_status) => {
    if (!sub_status) return null;
    const map = {
      pending:  { label: 'На проверке', cls: styles.chipPending },
      accepted: { label: 'Принято',     cls: styles.chipAccepted },
      rejected: { label: 'Отклонено',   cls: styles.chipRejected },
    };
    const s = map[sub_status];
    if (!s) return null;
    return <span className={`${styles.chip} ${s.cls}`}>{s.label}</span>;
  };

  // Loading
  if (pageLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.spinnerWrap}>
          <div className={styles.spinner} />
          <p>Загрузка заданий...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderIcon}><MdAssignment /></div>
        <div>
          <h1 className={styles.pageTitle}>Домашние задания</h1>
          <p className={styles.pageSub}>Выполняйте задания и получайте баллы</p>
        </div>
      </div>

      {/* Stat tiles */}
      <div className={styles.statsRow}>
        <div className={styles.statTile}>
          <span className={styles.statTileIcon}><FaBook /></span>
          <span className={styles.statTileVal}>{stats.total}</span>
          <span className={styles.statTileLabel}>Всего</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statTileIcon}><AiOutlineClockCircle /></span>
          <span className={styles.statTileVal}>{stats.active}</span>
          <span className={styles.statTileLabel}>Активные</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statTileIcon}><MdOutlinePendingActions /></span>
          <span className={styles.statTileVal}>{stats.submitted}</span>
          <span className={styles.statTileLabel}>На проверке</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statTileIcon}><AiOutlineCheckCircle /></span>
          <span className={styles.statTileVal}>{stats.accepted}</span>
          <span className={styles.statTileLabel}>Принято</span>
        </div>
        <div className={styles.statTile}>
          <span className={styles.statTileIcon}><FaTrophy /></span>
          <span className={styles.statTileVal}>{stats.totalPoints}</span>
          <span className={styles.statTileLabel}>Баллов</span>
        </div>
      </div>

      {/* Filter chips */}
      <div className={styles.filterBar}>
        {[
          { key: 'all',       label: `Все (${stats.total})` },
          { key: 'active',    label: `Активные (${stats.active})` },
          { key: 'submitted', label: `На проверке (${stats.submitted})` },
          { key: 'accepted',  label: `Принято (${stats.accepted})` },
          { key: 'rejected',  label: `Отклонено (${stats.rejected})` },
        ].map(f => (
          <button
            key={f.key}
            className={`${styles.filterChip} ${filter === f.key ? styles.filterChipActive : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filteredHomeworks.length === 0 ? (
        <div className={styles.emptyState}>
          <AiOutlineInbox className={styles.emptyIcon} />
          <h3>Нет заданий</h3>
          <p>{homeworks.length === 0 ? 'Преподаватель ещё не назначил задания' : 'Нет заданий с выбранным фильтром'}</p>
        </div>
      ) : (
        <div className={styles.hwGrid}>
          {filteredHomeworks.map(hw => {
            const overdue = isOverdue(hw.deadline) && hw.status === 'active' && !hw.submission_status;
            const statusStrip = hw.submission_status === 'accepted' ? styles.stripAccepted
              : hw.submission_status === 'rejected' ? styles.stripRejected
              : hw.submission_status === 'pending' ? styles.stripPending
              : overdue ? styles.stripOverdue
              : styles.stripActive;

            return (
              <div key={hw.id} className={styles.hwCard}>
                <div className={`${styles.hwStrip} ${statusStrip}`} />
                <div className={styles.hwCardInner}>
                  <div className={styles.hwCardHead}>
                    <h3 className={styles.hwTitle}>{hw.title}</h3>
                    <div className={styles.hwBadges}>
                      {hw.status !== 'active' && (
                        <span className={styles.chipClosed}>Закрыто</span>
                      )}
                      {overdue && <span className={styles.chipOverdue}>Просрочено</span>}
                      {getSubmissionChip(hw.submission_status)}
                    </div>
                  </div>

                  <div
                    className={styles.hwDesc}
                    dangerouslySetInnerHTML={{ __html: hw.description }}
                  />

                  <div className={styles.hwMeta}>
                    <span className={styles.hwMetaItem}>
                      <FaCalendar />
                      <span>Дедлайн: <strong>{formatDate(hw.deadline)}</strong></span>
                    </span>
                    <span className={styles.hwMetaItem}>
                      <FaCoins />
                      <span>{hw.points} баллов</span>
                    </span>
                    {hw.submission_status === 'accepted' && hw.points_earned !== null && (
                      <span className={`${styles.hwMetaItem} ${styles.hwMetaEarned}`}>
                        <FaTrophy />
                        <span>Получено: <strong>{hw.points_earned}</strong></span>
                      </span>
                    )}
                  </div>

                  {hw.submission_status === 'rejected' && hw.reason && (
                    <div className={styles.rejectionNote}>
                      <FaTimes /> <span><strong>Причина:</strong> {hw.reason}</span>
                    </div>
                  )}

                  <div className={styles.hwCardFooter}>
                    {hw.status === 'active' && (
                      <button className={styles.btnSubmit} onClick={() => openSubmitModal(hw)}>
                        {hw.submission_status
                          ? <><FaEdit /> Изменить ответ</>
                          : <><FaPen /> Сдать работу</>}
                      </button>
                    )}
                    {hw.status !== 'active' && !hw.submission_status && (
                      <span className={styles.textMuted}>Время сдачи истекло</span>
                    )}
                    {hw.submission_status && (
                      <button className={styles.btnView} onClick={() => openSubmitModal(hw)}>
                        <FaEye /> Посмотреть ответ
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit / View Modal */}
      {showSubmitModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <div className={styles.modalHeaderIcon}><HiOutlineDocumentText /></div>
                <div>
                  <h3 className={styles.modalTitle}>{selectedHomework?.title}</h3>
                  {userSubmission && (
                    <div className={styles.modalSubStatus}>
                      {getSubmissionChip(userSubmission.status)}
                      {userSubmission.status === 'accepted' && (
                        <span className={styles.modalPoints}>
                          <FaTrophy /> +{userSubmission.points_earned} баллов
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button className={styles.modalClose} onClick={closeModal}><FaTimes /></button>
            </div>

            <div className={styles.modalBody}>
              {/* Task description */}
              <div className={styles.modalSection}>
                <div className={styles.modalSectionTitle}><FaBook /> Задание</div>
                <div
                  className={styles.taskDescBody}
                  dangerouslySetInnerHTML={{ __html: selectedHomework?.description }}
                />
              </div>

              {/* Submission info (if exists) */}
              {userSubmission && (
                <div className={styles.modalSection}>
                  <div className={styles.modalSectionTitle}>
                    <AiOutlineClockCircle /> Информация о сдаче
                  </div>
                  <div className={styles.submissionMeta}>
                    <span>Отправлено: <strong>{formatDate(userSubmission.submitted_at)}</strong></span>
                    {userSubmission.checked_at && (
                      <span>Проверено: <strong>{formatDate(userSubmission.checked_at)}</strong></span>
                    )}
                  </div>
                  {userSubmission.status === 'rejected' && userSubmission.reason && (
                    <div className={styles.rejectionNote}>
                      <FaTimes /> <span><strong>Причина отклонения:</strong> {userSubmission.reason}</span>
                    </div>
                  )}
                </div>
              )}

              {selectedHomework?.status === 'active' ? (
                <>
                  {/* Answer editor */}
                  <div className={styles.modalSection}>
                    <div className={styles.modalSectionTitle}><FaPen /> Ваш ответ</div>
                    <QuillEditor
                      value={submissionText}
                      onChange={setSubmissionText}
                      modules={quillModules}
                      placeholder="Напишите ваш ответ здесь..."
                    />
                  </div>

                  {/* File attachments */}
                  <div className={styles.modalSection}>
                    <div className={styles.modalSectionTitle}>
                      <FaPaperclip /> Файлы (до 10, макс. 50MB каждый)
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      multiple
                      style={{ display: 'none' }}
                      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.zip,.rar,.7z,.txt,.html,.css,.js,.json,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    />
                    <button
                      type="button"
                      className={styles.btnAttach}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FaPaperclip /> Выбрать файлы
                    </button>

                    {existingAttachments.length > 0 && (
                      <div className={styles.filesList}>
                        <p className={styles.filesLabel}>Ранее прикреплённые:</p>
                        {existingAttachments.map((file, i) => (
                          <div key={`ex-${i}`} className={styles.fileItem}>
                            <span className={styles.fileIcon}>{getFileIcon(file.originalName || file.filename)}</span>
                            <span className={styles.fileName}>{file.originalName || file.filename}</span>
                            <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                            <a
                              href={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${file.path}`}
                              target="_blank" rel="noopener noreferrer"
                              className={styles.fileAction}
                            ><FaDownload /></a>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedFiles.length > 0 && (
                      <div className={styles.filesList}>
                        <p className={styles.filesLabel}>Новые файлы:</p>
                        {selectedFiles.map((file, i) => (
                          <div key={`nw-${i}`} className={styles.fileItem}>
                            <span className={styles.fileIcon}>{getFileIcon(file.name)}</span>
                            <span className={styles.fileName}>{file.name}</span>
                            <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                            <button
                              type="button"
                              className={styles.fileAction}
                              onClick={() => removeFile(i)}
                            ><FaTrash /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.modalFooter}>
                    <button className={styles.btnGhost} onClick={closeModal}>Отмена</button>
                    <button
                      className={styles.btnPrimary}
                      onClick={handleSubmit}
                      disabled={loading || (!submissionText.trim() && selectedFiles.length === 0 && existingAttachments.length === 0)}
                    >
                      {loading ? 'Отправка...' : userSubmission ? 'Обновить ответ' : 'Отправить'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* View-only answer */}
                  {submissionText && (
                    <div className={styles.modalSection}>
                      <div className={styles.modalSectionTitle}><FaEye /> Ваш ответ</div>
                      <div className={styles.taskDescBody} dangerouslySetInnerHTML={{ __html: submissionText }} />
                    </div>
                  )}

                  {existingAttachments.length > 0 && (
                    <div className={styles.modalSection}>
                      <div className={styles.modalSectionTitle}><FaPaperclip /> Прикреплённые файлы</div>
                      <div className={styles.filesList}>
                        {existingAttachments.map((file, i) => (
                          <div key={i} className={styles.fileItem}>
                            <span className={styles.fileIcon}>{getFileIcon(file.originalName || file.filename)}</span>
                            <span className={styles.fileName}>{file.originalName || file.filename}</span>
                            <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                            <a
                              href={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${file.path}`}
                              target="_blank" rel="noopener noreferrer"
                              className={styles.fileAction}
                            ><FaDownload /></a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={styles.modalFooter}>
                    <button className={styles.btnGhost} onClick={closeModal}>Закрыть</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentHomeworks;
