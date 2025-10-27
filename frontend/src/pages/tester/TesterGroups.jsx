import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { BsCollection } from 'react-icons/bs';

function TesterGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const response = await api.get('/groups');
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error('Ошибка загрузки групп:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tester-users">
      <h1><BsCollection /> Groups Testing</h1>
      {loading ? <div className="loading">Загрузка...</div> : (
        <div className="users-table">
          <div className="table-header">
            <span>ID</span>
            <span>Название</span>
            <span>Участники</span>
            <span>Создано</span>
          </div>
          {groups.map(group => (
            <div key={group.id} className="table-row">
              <span>#{group.id}</span>
              <span><strong>{group.name}</strong></span>
              <span>{group.student_count || 0} студентов</span>
              <span>{new Date(group.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TesterGroups;
