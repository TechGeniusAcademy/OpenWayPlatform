import { useState } from 'react';
import { BsBug } from 'react-icons/bs';

function BugReports() {
  const [bugs, setBugs] = useState([]);
  const [newBug, setNewBug] = useState({ title: '', description: '', severity: 'medium' });

  const addBug = () => {
    if (!newBug.title) return;
    setBugs([...bugs, { ...newBug, id: Date.now(), created_at: new Date().toISOString() }]);
    setNewBug({ title: '', description: '', severity: 'medium' });
  };

  return (
    <div className="tester-users">
      <h1><BsBug /> Bug Reports</h1>
      
      <div className="testing-tips" style={{ marginBottom: '20px' }}>
        <h3>Создать новый баг</h3>
        <input
          type="text"
          placeholder="Название бага"
          value={newBug.title}
          onChange={(e) => setNewBug({...newBug, title: e.target.value})}
          style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
        />
        <textarea
          placeholder="Описание"
          value={newBug.description}
          onChange={(e) => setNewBug({...newBug, description: e.target.value})}
          style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd', minHeight: '80px' }}
        />
        <select
          value={newBug.severity}
          onChange={(e) => setNewBug({...newBug, severity: e.target.value})}
          style={{ padding: '10px', marginRight: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <button onClick={addBug} className="action-btn stress" style={{ padding: '10px 20px' }}>
          Добавить баг
        </button>
      </div>

      <div className="users-table">
        <div className="table-header">
          <span>ID</span>
          <span>Название</span>
          <span>Серьезность</span>
          <span>Дата</span>
        </div>
        {bugs.map(bug => (
          <div key={bug.id} className="table-row">
            <span>#{bug.id}</span>
            <span><strong>{bug.title}</strong></span>
            <span className={`role-badge ${bug.severity}`}>{bug.severity}</span>
            <span>{new Date(bug.created_at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BugReports;
