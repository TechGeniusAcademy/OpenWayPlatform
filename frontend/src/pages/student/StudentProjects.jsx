import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './StudentProjects.module.css';
import { AiOutlinePlus, AiOutlineCode, AiOutlineDelete, AiOutlineSend } from 'react-icons/ai';
import { VscFiles } from 'react-icons/vsc';
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

  const createNewProject = async () => {
    const name = prompt('Введите название проекта:');
    if (!name || !name.trim()) return;
    
    const description = prompt('Введите описание проекта (необязательно):');
    
    try {
      const newProject = await createProject({
        name: name.trim(),
        description: description?.trim() || '',
        language: 'html'
      });
      
      // Добавляем проект в список и открываем IDE
      setProjects(prev => [newProject, ...prev]);
      navigate(`/student/ide/${newProject.id}`, { state: { project: newProject } });
    } catch (err) {
      console.error('Failed to create project:', err);
      alert('Ошибка при создании проекта');
    }
  };

  const openProject = (project) => {
    navigate(`/student/ide/${project.id}`, { state: { project } });
  };

  const handleDeleteProject = async (projectId, e) => {
    e.stopPropagation();
    
    console.log('Deleting project with ID:', projectId);
    
    if (!projectId) {
      alert('Ошибка: ID проекта не определен');
      return;
    }
    
    if (!confirm('Вы уверены, что хотите удалить этот проект? Все файлы будут безвозвратно удалены.')) {
      return;
    }

    try {
      await deleteProject(projectId);
      setProjects(prev => prev.filter(p => (p.id || p._id) !== projectId));
      // Очищаем также localStorage для этого проекта
      localStorage.removeItem(`studentIDE_project_${projectId}`);
      alert('Проект успешно удален');
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('Ошибка при удалении проекта: ' + (err.response?.data?.message || err.message));
    }
  };

  const openSubmitModal = (project, e) => {
    e.stopPropagation();
    setSelectedProject(project);
    setShowSubmitModal(true);
    setSubmissionType('homework');
    setSelectedHomework(null);
  };

  const handleSubmitProject = async () => {
    if (submissionType === 'homework' && !selectedHomework) {
      alert('Выберите домашнее задание');
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
      alert('Проект успешно отправлен на проверку!');
      setShowSubmitModal(false);
    } catch (err) {
      console.error('Failed to submit project:', err);
      alert('Ошибка при отправке проекта: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.student-projects}>
      <div className={styles.page-header}>
        <div className={styles.header-content}>
          <h1>Мои проекты</h1>
          <p>Управляйте своими проектами программирования</p>
        </div>
        <button className={styles.create-project-btn} onClick={createNewProject}>
          <AiOutlinePlus />
          Новый проект
        </button>
      </div>

      {loading && (
        <div className={styles.loading-message}>Загрузка проектов...</div>
      )}

      {error && (
        <div className={styles.error-message}>{error}</div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className={styles.empty-message}>
          <h2>У вас пока нет проектов</h2>
          <p>Создайте свой первый проект, нажав кнопку "Новый проект"</p>
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <div className={styles.projects-grid}>
          {projects.map(project => (
            <div key={project.id || project._id} className={styles.project-card} onClick={() => openProject(project)}>
              <div className={styles.project-header}>
                <div className={styles.project-info}>
                  <h3 className={styles.project-name}>{project.name}</h3>
                  <p className={styles.project-description}>{project.description}</p>
                </div>
                <div className={styles.project-actions}>
                  <button className={styles.action-btn} onClick={(e) => { e.stopPropagation(); openProject(project); }} title="Открыть в IDE">
                    <AiOutlineCode />
                  </button>
                  <button className="action-btn submit" onClick={(e) => openSubmitModal(project, e)} title="Отправить на проверку">
                    <AiOutlineSend />
                  </button>
                  <button className="action-btn delete" onClick={(e) => handleDeleteProject(project.id || project._id, e)} title="Удалить">
                    <AiOutlineDelete />
                  </button>
                </div>
              </div>

              <div className={styles.project-meta}>
                <div className={styles.language-info}>
                  <span className={styles.language-name}>{project.language}</span>
                </div>
                <div className={styles.files-count}>
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
        <div className={styles.submit-modal-overlay} onClick={() => setShowSubmitModal(false)}>
          <div className={styles.submit-modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modal-header}>
              <h2>Отправить проект на проверку</h2>
              <button onClick={() => setShowSubmitModal(false)}>×</button>
            </div>

            <div className={styles.modal-body}>
              <div className={styles.project-info-display}>
                <h3>{selectedProject?.name}</h3>
                <p>{selectedProject?.description}</p>
              </div>

              <div className={styles.submission-type-selector}>
                <label className={styles.radio-option}>
                  <input
                    type="radio"
                    name="submissionType"
                    value="homework"
                    checked={submissionType === 'homework'}
                    onChange={(e) => setSubmissionType(e.target.value)}
                  />
                  <div className={styles.radio-content}>
                    <strong>Домашнее задание</strong>
                    <span>Отправить как выполнение ДЗ</span>
                  </div>
                </label>

                <label className={styles.radio-option}>
                  <input
                    type="radio"
                    name="submissionType"
                    value="project"
                    checked={submissionType === 'project'}
                    onChange={(e) => setSubmissionType(e.target.value)}
                  />
                  <div className={styles.radio-content}>
                    <strong>Личный проект</strong>
                    <span>Отправить на проверку как проект</span>
                  </div>
                </label>
              </div>

              {submissionType === 'homework' && (
                <div className={styles.homework-selector}>
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

            <div className={styles.modal-footer}>
              <button onClick={() => setShowSubmitModal(false)} className={styles.btn-cancel}>
                Отмена
              </button>
              <button 
                onClick={handleSubmitProject} 
                className={styles.btn-submit}
                disabled={submitting || (submissionType === 'homework' && !selectedHomework)}
              >
                {submitting ? 'Отправка...' : 'Отправить на проверку'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentProjects;