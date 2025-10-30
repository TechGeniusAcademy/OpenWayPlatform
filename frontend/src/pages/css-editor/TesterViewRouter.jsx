import { Routes, Route } from 'react-router-dom';
import TesterLayout from '../../components/TesterLayout';
import ReadOnlyWrapper from './ReadOnlyWrapper';
import TesterHome from '../tester/TesterHome';
import TesterUsers from '../tester/TesterUsers';
import TesterGroups from '../tester/TesterGroups';
import TesterTests from '../tester/TesterTests';
import TesterChat from '../tester/TesterChat';
import SystemLogs from '../tester/SystemLogs';
import BugReports from '../tester/BugReports';
import PerformanceMonitor from '../tester/PerformanceMonitor';
import './ViewPage.css';

function TesterViewRouter() {
  return (
    <div className="view-page-wrapper">
      <div className="view-page-banner">
        <h2>🧪 Tester View (Read-Only)</h2>
        <p>Inspect CSS styles in the tester interface. Use <kbd>Ctrl+Shift+I</kbd> to toggle inspector.</p>
      </div>
      <div className="view-page-content">
        <ReadOnlyWrapper roleName="Tester" basePath="/css-editor/tester-view">
          <TesterLayout>
            <Routes>
              <Route index element={<TesterHome />} />
              <Route path="users" element={<TesterUsers />} />
              <Route path="groups" element={<TesterGroups />} />
              <Route path="tests" element={<TesterTests />} />
              <Route path="chat" element={<TesterChat />} />
              <Route path="logs" element={<SystemLogs />} />
              <Route path="bugs" element={<BugReports />} />
              <Route path="performance" element={<PerformanceMonitor />} />
            </Routes>
          </TesterLayout>
        </ReadOnlyWrapper>
      </div>
    </div>
  );
}

export default TesterViewRouter;
