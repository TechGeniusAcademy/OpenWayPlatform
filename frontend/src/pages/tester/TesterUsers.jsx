import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { BsPeople, BsSearch, BsEyeFill } from 'react-icons/bs';
import './TesterUsers.css';

function TesterUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="tester-users">
      <div className="users-header">
        <h1><BsPeople /> Users Testing</h1>
        <div className="search-box">
          <BsSearch />
          <input
            type="text"
            placeholder="Поиск пользователей..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : (
        <div className="users-table">
          <div className="table-header">
            <span>ID</span>
            <span>Имя</span>
            <span>Email</span>
            <span>Роль</span>
            <span>Баллы</span>
            <span>Регистрация</span>
          </div>
          {filteredUsers.map(user => (
            <div key={user.id} className="table-row">
              <span>#{user.id}</span>
              <span><strong>{user.full_name || user.username}</strong></span>
              <span>{user.email}</span>
              <span className={`role-badge ${user.role}`}>{user.role}</span>
              <span className="points">{user.points || 0}</span>
              <span>{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TesterUsers;
