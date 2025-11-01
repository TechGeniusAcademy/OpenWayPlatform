import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../../utils/api';
import { BsFolderCheck, BsEyeFill, BsCheckCircle, BsXCircle, BsClock } from 'react-icons/bs';
import styles from './TeacherProjects.module.css';

function TeacherProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [grade, setGrade] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/projects');
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error('Ошибка загрузки проектов:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const viewProject = (project) => {
    setSelectedProject(project);
    setFeedback(project.feedback || '');
    setGrade(project.grade || '');
    setShowModal(true);
  };

  const handleEvaluate = async (status) => {
    try {
      await api.put(`/projects/${selectedProject.id}`, {
        status,
        feedback,
        grade: grade ? parseInt(grade) : null
      });

      alert('Проект оценен!');
      setShowModal(false);
      loadProjects();
    } catch (error) {
      console.error('Ошибка оценки:', error);
      alert('Не удалось оценить проект');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="status-badge pending"><BsClock /> На проверке</span>;
      case 'approved':
        return <span className="status-badge approved"><BsCheckCircle /> Принято</span>;
      case 'rejected':
        return <span className="status-badge rejected"><BsXCircle /> Отклонено</span>;
      default:
        return <span className={styles['status-badge']}>{status}</span>;
    }
  };

  if (loading) {
    return <div className={styles['teacher-projects-loading']}>Загрузка...</div>;
  }

  return (
    <div className={styles['teacher-projects']}>
      <div className={styles['projects-header']}>
        <h1>Проверка проектов</h1>
        <div className={styles.stats}>
          <span>Всего проектов: {projects?.length || 0}</span>
          <span className={styles['pending-count']}>
            На проверке: {projects?.filter(p => p.status === 'pending').length || 0}
          </span>
        </div>
      </div>

      <div className={styles['projects-grid']}>
        {!projects || projects.length === 0 ? (
          <div className={styles['no-projects']}>
            <BsFolderCheck />
            <p>Нет проектов</p>
          </div>
        ) : (
          projects.map(project => (
            <div key={project.id} className={`project-card ${project.status}`}>
              <div className={styles['project-header']}>
                <h3>{project.title}</h3>
                {getStatusBadge(project.status)}
              </div>
              
              <div className={styles['project-info']}>
                <div className={styles['info-row']}>
                  <strong>Студент:</strong>
                  <span>{project.student_name}</span>
                </div>
                <div className={styles['info-row']}>
                  <strong>Группа:</strong>
                  <span>{project.group_name || '-'}</span>
                </div>
                <div className={styles['info-row']}>
                  <strong>Дата сдачи:</strong>
                  <span>{new Date(project.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
                {project.grade && (
                  <div className={styles['info-row']}>
                    <strong>Оценка:</strong>
                    <span className={styles.grade}>{project.grade}/100</span>
                  </div>
                )}
              </div>

              <p className={styles['project-description']}>
                {project.description?.substring(0, 100)}...
              </p>

              <button 
                className={styles['view-project-btn']}
                onClick={() => viewProject(project)}
              >
                <BsEyeFill /> Проверить
              </button>
            </div>
          ))
        )}
      </div>

      {/* Модал проверки */}
      {showModal && selectedProject && (
        <div className={styles['modal-overlay']} onClick={() => setShowModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className={styles['modal-header']}>
              <h2>Проверка проекта</h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <div className={styles['modal-body']}>
              <div className={styles['project-details']}>
                <h3>{selectedProject.title}</h3>
                {getStatusBadge(selectedProject.status)}
                
                <div className={styles['detail-section']}>
                  <h4>Информация</h4>
                  <div className={styles['detail-grid']}>
                    <div><strong>Студент:</strong> {selectedProject.student_name}</div>
                    <div><strong>Группа:</strong> {selectedProject.group_name || '-'}</div>
                    <div><strong>Дата:</strong> {new Date(selectedProject.created_at).toLocaleDateString('ru-RU')}</div>
                  </div>
                </div>

                <div className={styles['detail-section']}>
                  <h4>Описание</h4>
                  <p>{selectedProject.description}</p>
                </div>

                {selectedProject.github_url && (
                  <div className={styles['detail-section']}>
                    <h4>GitHub</h4>
                    <a 
                      href={selectedProject.github_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles['github-link']}
                    >
                      {selectedProject.github_url}
                    </a>
                  </div>
                )}

                {selectedProject.files && selectedProject.files.length > 0 && (
                  <div className={styles['detail-section']}>
                    <h4>Файлы проекта</h4>
                    <div className={styles['files-list']}>
                      {selectedProject.files.map((file, idx) => (
                        <a 
                          key={idx}
                          href={`${BASE_URL}${file.path}`}
                          download
                          className={styles['file-item']}
                        >
                          📄 {file.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles['detail-section']}>
                  <h4>Оценка</h4>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="Оценка (0-100)"
                    className={styles['grade-input']}
                  />
                </div>

                <div className={styles['detail-section']}>
                  <h4>Обратная связь</h4>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Комментарий для студента..."
                    rows="5"
                    className={styles['feedback-textarea']}
                  />
                </div>

                <div className={styles['action-buttons']}>
                  <button 
                    className={styles['btn-approve']}
                    onClick={() => handleEvaluate('approved')}
                  >
                    <BsCheckCircle /> Принять
                  </button>
                  <button 
                    className={styles['btn-reject']}
                    onClick={() => handleEvaluate('rejected')}
                  >
                    <BsXCircle /> Отклонить
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherProjects;
