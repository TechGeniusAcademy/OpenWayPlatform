import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { BsFileText } from 'react-icons/bs';

function TesterTests() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      const response = await api.get('/tests');
      setTests(response.data.tests || []);
    } catch (error) {
      console.error('Ошибка загрузки тестов:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tester-users">
      <h1><BsFileText /> Tests Testing</h1>
      {loading ? <div className="loading">Загрузка...</div> : (
        <div className="users-table">
          <div className="table-header">
            <span>ID</span>
            <span>Название</span>
            <span>Вопросов</span>
            <span>Длительность</span>
          </div>
          {tests.map(test => (
            <div key={test.id} className="table-row">
              <span>#{test.id}</span>
              <span><strong>{test.title}</strong></span>
              <span>{test.questions?.length || 0} вопросов</span>
              <span>{test.duration} мин</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TesterTests;
