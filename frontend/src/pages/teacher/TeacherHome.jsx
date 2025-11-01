import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { BsPeopleFill, BsClipboardCheck, BsFileEarmarkText, BsFolderCheck } from 'react-icons/bs';
import styles from './TeacherHome.module.css';

function TeacherHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalGroups: 0,
    totalTests: 0,
    totalHomeworks: 0,
    pendingProjects: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [studentsRes, groupsRes, testsRes, homeworksRes, projectsRes] = await Promise.all([
        api.get('/users?role=student'),
        api.get('/groups'),
        api.get('/tests'),
        api.get('/homeworks'),
        api.get('/projects')
      ]);

      setStats({
        totalStudents: studentsRes.data.users?.length || 0,
        totalGroups: groupsRes.data.groups?.length || 0,
        totalTests: testsRes.data.tests?.length || 0,
        totalHomeworks: homeworksRes.data.homeworks?.length || 0,
        pendingProjects: projectsRes.data.projects?.filter(p => p.status === 'pending')?.length || 0
      });
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.teacher-home-loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.teacher-home}>
      <div className={styles.home-header}>
        <h1>Добро пожаловать, {user?.full_name || user?.username}! 👨‍🏫</h1>
        <p>Панель управления преподавателя</p>
      </div>

      <div className={styles.stats-grid}>
        <div className={styles.stat-card}>
          <div className={styles.stat-icon} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <BsPeopleFill />
          </div>
          <div className={styles.stat-info}>
            <h3>{stats.totalStudents}</h3>
            <p>Учеников</p>
          </div>
        </div>

        <div className={styles.stat-card}>
          <div className={styles.stat-icon} style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <BsPeopleFill />
          </div>
          <div className={styles.stat-info}>
            <h3>{stats.totalGroups}</h3>
            <p>Групп</p>
          </div>
        </div>

        <div className={styles.stat-card}>
          <div className={styles.stat-icon} style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <BsClipboardCheck />
          </div>
          <div className={styles.stat-info}>
            <h3>{stats.totalTests}</h3>
            <p>Тестов</p>
          </div>
        </div>

        <div className={styles.stat-card}>
          <div className={styles.stat-icon} style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <BsFileEarmarkText />
          </div>
          <div className={styles.stat-info}>
            <h3>{stats.totalHomeworks}</h3>
            <p>Домашних заданий</p>
          </div>
        </div>

        <div className="stat-card highlight">
          <div className={styles.stat-icon} style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
            <BsFolderCheck />
          </div>
          <div className={styles.stat-info}>
            <h3>{stats.pendingProjects}</h3>
            <p>Проектов на проверке</p>
          </div>
        </div>
      </div>

      <div className={styles.quick-actions}>
        <h2>Быстрые действия</h2>
        <div className={styles.actions-grid}>
          <button className={styles.action-btn} onClick={() => window.location.href = '/teacher/groups'}>
            <BsPeopleFill />
            <span>Управление группами</span>
          </button>
          <button className={styles.action-btn} onClick={() => window.location.href = '/teacher/tests'}>
            <BsClipboardCheck />
            <span>Создать тест</span>
          </button>
          <button className={styles.action-btn} onClick={() => window.location.href = '/teacher/homeworks'}>
            <BsFileEarmarkText />
            <span>Задать ДЗ</span>
          </button>
          <button className={styles.action-btn} onClick={() => window.location.href = '/teacher/projects'}>
            <BsFolderCheck />
            <span>Проверить проекты</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default TeacherHome;
