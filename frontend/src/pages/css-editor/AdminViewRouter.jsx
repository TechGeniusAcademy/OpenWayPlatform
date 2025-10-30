import { Routes, Route } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import ReadOnlyWrapper from './ReadOnlyWrapper';
import UsersManagement from '../../components/UsersManagement';
import GroupsManagement from '../../components/GroupsManagement';
import Leaderboard from '../../components/Leaderboard';
import AdminChat from '../../components/AdminChat';
import TestsManagement from '../../components/TestsManagement';
import HomeworksManagement from '../../components/HomeworksManagement';
import TypingManagement from '../../components/TypingManagement';
import GameManagement from '../../components/GameManagement';
import ShopManagement from '../../components/ShopManagement';
import KnowledgeBaseManagement from '../../components/KnowledgeBaseManagement';
import UpdatesManagement from '../../components/UpdatesManagement';
import AdminSubmissions from '../admin/AdminSubmissions';
import './ViewPage.css';

function AdminViewRouter() {
  return (
    <div className="view-page-wrapper">
      <div className="view-page-banner">
        <h2>👑 Admin View (Read-Only)</h2>
        <p>Inspect CSS styles in the admin interface. Use <kbd>Ctrl+Shift+I</kbd> to toggle inspector.</p>
      </div>
      <div className="view-page-content">
        <ReadOnlyWrapper roleName="Admin" basePath="/css-editor/admin-view">
          <AdminLayout>
            <Routes>
              <Route index element={<UsersManagement />} />
              <Route path="groups" element={<GroupsManagement />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="chat" element={<AdminChat />} />
              <Route path="tests" element={<TestsManagement />} />
              <Route path="homeworks" element={<HomeworksManagement />} />
              <Route path="typing" element={<TypingManagement />} />
              <Route path="game" element={<GameManagement />} />
              <Route path="shop" element={<ShopManagement />} />
              <Route path="knowledge" element={<KnowledgeBaseManagement />} />
              <Route path="updates" element={<UpdatesManagement />} />
              <Route path="submissions" element={<AdminSubmissions />} />
            </Routes>
          </AdminLayout>
        </ReadOnlyWrapper>
      </div>
    </div>
  );
}

export default AdminViewRouter;
