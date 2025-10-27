import { useState, useEffect } from 'react';
import { BsActivity } from 'react-icons/bs';

function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    apiResponseTime: 0,
    wsLatency: 0,
    memoryUsage: 0,
    cpuUsage: 0
  });

  useEffect(() => {
    // Mock данные - в реальности нужен backend endpoint
    const interval = setInterval(() => {
      setMetrics({
        apiResponseTime: Math.floor(Math.random() * 100) + 50,
        wsLatency: Math.floor(Math.random() * 50) + 10,
        memoryUsage: Math.floor(Math.random() * 40) + 30,
        cpuUsage: Math.floor(Math.random() * 60) + 20
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="tester-home">
      <h1 style={{ color: 'white' }}><BsActivity /> Performance Monitor</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <h3>API Response Time</h3>
            <p className="stat-value">{metrics.apiResponseTime}ms</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <h3>WebSocket Latency</h3>
            <p className="stat-value">{metrics.wsLatency}ms</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <h3>Memory Usage</h3>
            <p className="stat-value">{metrics.memoryUsage}%</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <h3>CPU Usage</h3>
            <p className="stat-value">{metrics.cpuUsage}%</p>
          </div>
        </div>
      </div>

      <div className="testing-tips">
        <h3>📊 Метрики производительности</h3>
        <ul>
          <li><strong>API Response Time:</strong> Среднее время ответа API</li>
          <li><strong>WebSocket Latency:</strong> Задержка WebSocket соединения</li>
          <li><strong>Memory Usage:</strong> Использование памяти сервером</li>
          <li><strong>CPU Usage:</strong> Загрузка процессора</li>
        </ul>
      </div>
    </div>
  );
}

export default PerformanceMonitor;
