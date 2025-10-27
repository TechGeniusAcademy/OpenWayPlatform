import { Routes, Route } from 'react-router-dom';
import TesterLayout from '../components/TesterLayout';
import TesterHome from './tester/TesterHome';
import TesterUsers from './tester/TesterUsers';
import TesterGroups from './tester/TesterGroups';
import TesterTests from './tester/TesterTests';
import TesterChat from './tester/TesterChat';
import SystemLogs from './tester/SystemLogs';
import BugReports from './tester/BugReports';
import PerformanceMonitor from './tester/PerformanceMonitor';

function TesterDashboard() {
  return (
    <Routes>
      <Route element={<TesterLayout />}>
        <Route index element={<TesterHome />} />
        <Route path="users" element={<TesterUsers />} />
        <Route path="groups" element={<TesterGroups />} />
        <Route path="tests" element={<TesterTests />} />
        <Route path="chat" element={<TesterChat />} />
        <Route path="logs" element={<SystemLogs />} />
        <Route path="bugs" element={<BugReports />} />
        <Route path="performance" element={<PerformanceMonitor />} />
      </Route>
    </Routes>
  );
}

export default TesterDashboard;
