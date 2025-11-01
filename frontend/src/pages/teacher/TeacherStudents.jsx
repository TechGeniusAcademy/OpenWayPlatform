import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../../utils/api';
import { BsSearch, BsEyeFill } from 'react-icons/bs';
import styles from './TeacherStudents.module.css';

function TeacherStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users?role=student');
      setStudents(response.data.users);
    } catch (error) {
      console.error('Ошибка загрузки учеников:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => 
    student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const viewStudent = (student) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  if (loading) {
    return <div className={styles.teacher-students-loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.teacher-students}>
      <div className={styles.students-header}>
        <h1>Список учеников</h1>
        <div className={styles.search-box}>
          <BsSearch />
          <input
            type="text"
            placeholder="Поиск по имени, логину или email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.students-table-container}>
        <table className={styles.students-table}>
          <thead>
            <tr>
              <th>Аватар</th>
              <th>ФИО</th>
              <th>Логин</th>
              <th>Email</th>
              <th>Баллы</th>
              <th>Дата регистрации</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                  {searchQuery ? 'Ученики не найдены' : 'Нет учеников'}
                </td>
              </tr>
            ) : (
              filteredStudents.map(student => (
                <tr key={student.id}>
                  <td>
                    {student.avatar_url ? (
                      <img 
                        src={`${BASE_URL}${student.avatar_url}`} 
                        alt="" 
                        className={styles.student-avatar}
                      />
                    ) : (
                      <div className={styles.avatar-placeholder}>
                        {(student.full_name || student.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td>{student.full_name || '-'}</td>
                  <td>{student.username}</td>
                  <td>{student.email}</td>
                  <td>
                    <span className={styles.points-badge}>{student.points || 0} 💎</span>
                  </td>
                  <td>{new Date(student.created_at).toLocaleDateString('ru-RU')}</td>
                  <td>
                    <button 
                      className={styles.view-btn}
                      onClick={() => viewStudent(student)}
                      title="Просмотр"
                    >
                      <BsEyeFill /> Просмотр
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Модал просмотра */}
      {showModal && selectedStudent && (
        <div className={styles.modal-overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal-content} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modal-header}>
              <h2>Информация об ученике</h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className={styles.modal-body}>
              <div className={styles.student-details}>
                {selectedStudent.avatar_url ? (
                  <img 
                    src={`${BASE_URL}${selectedStudent.avatar_url}`} 
                    alt="" 
                    className={styles.detail-avatar}
                  />
                ) : (
                  <div className={styles.detail-avatar-placeholder}>
                    {(selectedStudent.full_name || selectedStudent.username).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={styles.detail-info}>
                  <div className={styles.detail-row}>
                    <strong>ФИО:</strong>
                    <span>{selectedStudent.full_name || '-'}</span>
                  </div>
                  <div className={styles.detail-row}>
                    <strong>Логин:</strong>
                    <span>{selectedStudent.username}</span>
                  </div>
                  <div className={styles.detail-row}>
                    <strong>Email:</strong>
                    <span>{selectedStudent.email}</span>
                  </div>
                  <div className={styles.detail-row}>
                    <strong>Баллы:</strong>
                    <span className={styles.points-large}>{selectedStudent.points || 0} 💎</span>
                  </div>
                  <div className={styles.detail-row}>
                    <strong>Дата регистрации:</strong>
                    <span>{new Date(selectedStudent.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherStudents;
