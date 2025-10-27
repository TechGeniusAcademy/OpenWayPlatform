import { useState, useEffect } from 'react';
import { BsJournalCode } from 'react-icons/bs';

function SystemLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Mock данные
    setLogs([
      { id: 1, level: 'info', message: 'Server started on port 5000', time: new Date().toISOString() },
      { id: 2, level: 'warn', message: 'High memory usage detected', time: new Date().toISOString() },
      { id: 3, level: 'error', message: 'Failed to connect to database', time: new Date().toISOString() }
    ]);
  }, []);

  return (
    <div className="tester-users">
      <h1><BsJournalCode /> System Logs</h1>
      <div className="users-table">
        <div className="table-header">
          <span>Время</span>
          <span>Уровень</span>
          <span>Сообщение</span>
        </div>
        {logs.map(log => (
          <div key={log.id} className="table-row">
            <span>{new Date(log.time).toLocaleTimeString()}</span>
            <span className={`role-badge ${log.level}`}>{log.level}</span>
            <span>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SystemLogs;
