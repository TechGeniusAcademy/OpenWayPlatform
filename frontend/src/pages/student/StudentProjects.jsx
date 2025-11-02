import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './StudentProjects.module.css';
import { AiOutlinePlus, AiOutlineCode, AiOutlineDelete, AiOutlineSend, AiOutlineProject, AiOutlineHtml5, AiOutlineCheckCircle, AiOutlineCloseCircle, AiOutlineWarning } from 'react-icons/ai';
import { VscFiles } from 'react-icons/vsc';
import { FaJs, FaPython, FaReact } from 'react-icons/fa';
import { getAllProjects, createProject, deleteProject } from '../../services/projectService';
import api from '../../utils/api';

function StudentProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [submissionType, setSubmissionType] = useState('homework');
  const [homeworks, setHomeworks] = useState([]);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Новые состояния для модальных окон
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationContent, setNotificationContent] = useState({ type: 'success', message: '' });
  const [newProjectData, setNewProjectData] = useState({ name: '', description: '', language: 'html' });

  // Загрузка проектов с сервера
  useEffect(() => {
    loadProjects();
    loadHomeworks();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await getAllProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Не удалось загрузить проекты');
    } finally {
      setLoading(false);
    }
  };

  const loadHomeworks = async () => {
    try {
      const response = await api.get('/homeworks/my');
      setHomeworks(response.data);
    } catch (err) {
      console.error('Failed to load homeworks:', err);
    }
  };

  const openCreateModal = () => {
    setNewProjectData({ name: '', description: '', language: 'html' });
    setShowCreateModal(true);
  };

  const createNewProject = async () => {
    if (!newProjectData.name.trim()) {
      showNotification('error', 'Пожалуйста, введите название проекта');
      return;
    }
    
    try {
      const newProject = await createProject({
        name: newProjectData.name.trim(),
        description: newProjectData.description.trim(),
        language: newProjectData.language
      });
      
      // Добавляем проект в список и открываем IDE
      setProjects(prev => [newProject, ...prev]);
      setShowCreateModal(false);
      showNotification('success', 'Проект успешно создан!');
      
      // Переход в IDE через небольшую задержку
      setTimeout(() => {
        navigate(`/student/ide/${newProject.id}`, { state: { project: newProject } });
      }, 1000);
    } catch (err) {
      console.error('Failed to create project:', err);
      showNotification('error', 'Ошибка при создании проекта');
    }
  };

  const openProject = (project) => {
    navigate(`/student/ide/${project.id}`, { state: { project } });
  };

  const openDeleteModal = (project, e) => {
    e.stopPropagation();
    
    if (!project.id && !project._id) {
      showNotification('error', 'Ошибка: ID проекта не определен');
      return;
    }
    
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };

  const confirmDeleteProject = async () => {
    const projectId = projectToDelete.id || projectToDelete._id;
    
    try {
      await deleteProject(projectId);
      setProjects(prev => prev.filter(p => (p.id || p._id) !== projectId));
      // Очищаем также localStorage для этого проекта
      localStorage.removeItem(`studentIDE_project_${projectId}`);
      setShowDeleteModal(false);
      showNotification('success', 'Проект успешно удален');
    } catch (err) {
      console.error('Failed to delete project:', err);
      showNotification('error', 'Ошибка при удалении проекта: ' + (err.response?.data?.message || err.message));
    }
  };

  const openSubmitModal = (project, e) => {
    e.stopPropagation();
    setSelectedProject(project);
    setShowSubmitModal(true);
    setSubmissionType('homework');
    setSelectedHomework(null);
  };

  const showNotification = (type, message) => {
    setNotificationContent({ type, message });
    setShowNotificationModal(true);
    
    // Автоматически закрываем уведомление через 3 секунды
    setTimeout(() => {
      setShowNotificationModal(false);
    }, 3000);
  };

  const handleSubmitProject = async () => {
    if (submissionType === 'homework' && !selectedHomework) {
      showNotification('error', 'Выберите домашнее задание');
      return;
    }

    setSubmitting(true);
    try {
      const submissionData = {
        project_id: selectedProject.id,
        project_name: selectedProject.name,
        type: submissionType,
        homework_id: submissionType === 'homework' ? selectedHomework : null
      };

      await api.post('/submissions', submissionData);
      setShowSubmitModal(false);
      showNotification('success', 'Проект успешно отправлен на проверку!');
    } catch (err) {
      console.error('Failed to submit project:', err);
      showNotification('error', 'Ошибка при отправке проекта: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Вычисление статистики проектов
  const getStats = () => {
    const totalProjects = projects.length;
    const htmlProjects = projects.filter(p => p.language?.toLowerCase() === 'html').length;
    const jsProjects = projects.filter(p => p.language?.toLowerCase() === 'javascript' || p.language?.toLowerCase() === 'js').length;
    const pythonProjects = projects.filter(p => p.language?.toLowerCase() === 'python').length;
    const totalFiles = projects.reduce((sum, p) => sum + (p.files_count || p.filesCount || 0), 0);

    return { totalProjects, htmlProjects, jsProjects, pythonProjects, totalFiles };
  };

  const stats = getStats();

  return (
    <div className={styles['student-projects']}>
      <div className={styles['page-header']}>
        <div className={styles['header-content']}>
          <h1>Мои проекты</h1>
          <p>Управляйте своими проектами программирования</p>
        </div>
        <button className={styles['create-project-btn']} onClick={openCreateModal}>
          <AiOutlinePlus />
          Новый проект
        </button>
      </div>

      {loading && (
        <div className={styles['loading-message']}>Загрузка проектов...</div>
      )}

      {error && (
        <div className={styles['error-message']}>{error}</div>
      )}

      {!loading && !error && projects.length > 0 && (
        <div className={styles['stats-section']}>
          <div className={styles['stat-card']}>
            <div className={styles['stat-icon']} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <AiOutlineProject />
            </div>
            <div className={styles['stat-info']}>
              <div className={styles['stat-value']}>{stats.totalProjects}</div>
              <div className={styles['stat-label']}>Всего проектов</div>
            </div>
          </div>

          <div className={styles['stat-card']}>
            <div className={styles['stat-icon']} style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
              <AiOutlineHtml5 />
            </div>
            <div className={styles['stat-info']}>
              <div className={styles['stat-value']}>{stats.htmlProjects}</div>
              <div className={styles['stat-label']}>HTML проектов</div>
            </div>
          </div>

          <div className={styles['stat-card']}>
            <div className={styles['stat-icon']} style={{ background: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)' }}>
              <FaJs />
            </div>
            <div className={styles['stat-info']}>
              <div className={styles['stat-value']}>{stats.jsProjects}</div>
              <div className={styles['stat-label']}>JS проектов</div>
            </div>
          </div>

          <div className={styles['stat-card']}>
            <div className={styles['stat-icon']} style={{ background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' }}>
              <FaPython />
            </div>
            <div className={styles['stat-info']}>
              <div className={styles['stat-value']}>{stats.pythonProjects}</div>
              <div className={styles['stat-label']}>Python проектов</div>
            </div>
          </div>

          <div className={styles['stat-card']}>
            <div className={styles['stat-icon']} style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
              <VscFiles />
            </div>
            <div className={styles['stat-info']}>
              <div className={styles['stat-value']}>{stats.totalFiles}</div>
              <div className={styles['stat-label']}>Всего файлов</div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className={styles['empty-message']}>
          <h2>У вас пока нет проектов</h2>
          <p>Создайте свой первый проект, нажав кнопку "Новый проект"</p>
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <div className={styles['projects-grid']}>
          {projects.map(project => (
            <div key={project.id || project._id} className={styles['project-card']} onClick={() => openProject(project)}>
              <div className={styles['project-header']}>
                <div className={styles['project-info']}>
                  <h3 className={styles['project-name']}>{project.name}</h3>
                  <p className={styles['project-description']}>{project.description}</p>
                </div>
                <div className={styles['project-actions']}>
                  <button className={styles['action-btn']} onClick={(e) => { e.stopPropagation(); openProject(project); }} title="Открыть в IDE">
                    <AiOutlineCode />
                  </button>
                  <button className={`${styles['action-btn']} ${styles['submit']}`} onClick={(e) => openSubmitModal(project, e)} title="Отправить на проверку">
                    <AiOutlineSend />
                  </button>
                  <button className={`${styles['action-btn']} ${styles['delete']}`} onClick={(e) => openDeleteModal(project, e)} title="Удалить">
                    <AiOutlineDelete />
                  </button>
                </div>
              </div>

              <div className={styles['project-meta']}>
                <div className={styles['language-info']}>
                  <span className={styles['language-name']}>{project.language}</span>
                </div>
                <div className={styles['files-count']}>
                  <VscFiles />
                  {project.files_count || project.filesCount || 0} файлов
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно отправки проекта */}
      {showSubmitModal && (
        <div className={styles['submit-modal-overlay']} onClick={() => setShowSubmitModal(false)}>
          <div className={styles['submit-modal']} onClick={e => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>Отправить проект на проверку</h2>
              <button onClick={() => setShowSubmitModal(false)}>×</button>
            </div>

            <div className={styles['modal-body']}>
              <div className={styles['project-info-display']}>
                <h3>{selectedProject?.name}</h3>
                <p>{selectedProject?.description}</p>
              </div>

              <div className={styles['submission-type-selector']}>
                <label className={styles['radio-option']}>
                  <input
                    type="radio"
                    name="submissionType"
                    value="homework"
                    checked={submissionType === 'homework'}
                    onChange={(e) => setSubmissionType(e.target.value)}
                  />
                  <div className={styles['radio-content']}>
                    <strong>Домашнее задание</strong>
                    <span>Отправить как выполнение ДЗ</span>
                  </div>
                </label>

                <label className={styles['radio-option']}>
                  <input
                    type="radio"
                    name="submissionType"
                    value="project"
                    checked={submissionType === 'project'}
                    onChange={(e) => setSubmissionType(e.target.value)}
                  />
                  <div className={styles['radio-content']}>
                    <strong>Личный проект</strong>
                    <span>Отправить на проверку как проект</span>
                  </div>
                </label>
              </div>

              {submissionType === 'homework' && (
                <div className={styles['homework-selector']}>
                  <label>Выберите домашнее задание:</label>
                  <select
                    value={selectedHomework || ''}
                    onChange={(e) => setSelectedHomework(e.target.value)}
                  >
                    <option value="">-- Выберите ДЗ --</option>
                    {homeworks.map(hw => (
                      <option key={hw.id} value={hw.id}>
                        {hw.title} (до {new Date(hw.due_date).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className={styles['modal-footer']}>
              <button onClick={() => setShowSubmitModal(false)} className={styles['btn-cancel']}>
                Отмена
              </button>
              <button 
                onClick={handleSubmitProject} 
                className={styles['btn-submit']}
                disabled={submitting || (submissionType === 'homework' && !selectedHomework)}
              >
                {submitting ? 'Отправка...' : 'Отправить на проверку'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания проекта */}
      {showCreateModal && (
        <div className={styles['modal-overlay']} onClick={() => setShowCreateModal(false)}>
          <div className={styles['modal-content']} onClick={e => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>Создать новый проект</h2>
              <button onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <div className={styles['modal-body']}>
              <div className={styles['form-group']}>
                <label>Название проекта *</label>
                <input
                  type="text"
                  placeholder="Введите название проекта"
                  value={newProjectData.name}
                  onChange={(e) => setNewProjectData(prev => ({ ...prev, name: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className={styles['form-group']}>
                <label>Описание проекта</label>
                <textarea
                  placeholder="Введите описание проекта (необязательно)"
                  value={newProjectData.description}
                  onChange={(e) => setNewProjectData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className={styles['form-group']}>
                <label>Язык программирования *</label>
                <select
                  value={newProjectData.language}
                  onChange={(e) => setNewProjectData(prev => ({ ...prev, language: e.target.value }))}
                >
                  <option value="html">HTML/CSS/JS</option>
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="react">React</option>
                </select>
              </div>
            </div>

            <div className={styles['modal-footer']}>
              <button onClick={() => setShowCreateModal(false)} className={styles['btn-cancel']}>
                Отмена
              </button>
              <button onClick={createNewProject} className={styles['btn-primary']}>
                Создать проект
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления */}
      {showDeleteModal && (
        <div className={styles['modal-overlay']} onClick={() => setShowDeleteModal(false)}>
          <div className={styles['modal-content']} onClick={e => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>Подтверждение удаления</h2>
              <button onClick={() => setShowDeleteModal(false)}>×</button>
            </div>

            <div className={styles['modal-body']}>
              <div className={styles['delete-warning']}>
                <AiOutlineWarning />
                <div>
                  <h3>Вы уверены, что хотите удалить проект?</h3>
                  <p><strong>{projectToDelete?.name}</strong></p>
                  <p>Все файлы будут безвозвратно удалены. Это действие нельзя отменить.</p>
                </div>
              </div>
            </div>

            <div className={styles['modal-footer']}>
              <button onClick={() => setShowDeleteModal(false)} className={styles['btn-cancel']}>
                Отмена
              </button>
              <button onClick={confirmDeleteProject} className={styles['btn-danger']}>
                Удалить проект
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно уведомлений */}
      {showNotificationModal && (
        <div className={styles['modal-overlay']} onClick={() => setShowNotificationModal(false)}>
          <div className={styles['notification-modal']} onClick={e => e.stopPropagation()}>
            <div className={`${styles['notification-content']} ${styles[notificationContent.type]}`}>
              <div className={styles['notification-icon']}>
                {notificationContent.type === 'success' && <AiOutlineCheckCircle />}
                {notificationContent.type === 'error' && <AiOutlineCloseCircle />}
              </div>
              <div className={styles['notification-text']}>
                <h3>{notificationContent.type === 'success' ? 'Успешно!' : 'Ошибка!'}</h3>
                <p>{notificationContent.message}</p>
              </div>
              <button onClick={() => setShowNotificationModal(false)} className={styles['notification-close']}>
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentProjects;