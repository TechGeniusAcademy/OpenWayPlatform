import { Routes, Route } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import UsersManagement from '../components/UsersManagement';
import GroupsManagement from '../components/GroupsManagement';
import Leaderboard from '../components/Leaderboard';
import AdminChat from '../components/AdminChat';

import TestsManagement from '../components/TestsManagement';
import HomeworksManagement from '../components/HomeworksManagement';

function AdminDashboard() {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<UsersManagement />} />
        <Route path="/groups" element={<GroupsManagement />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/chat" element={<AdminChat />} />
        <Route path="/tests" element={<TestsManagement />} />
        <Route path="/homeworks" element={<HomeworksManagement />} />
        {/* Здесь можно добавлять новые маршруты */}
      </Routes>
    </AdminLayout>
  );
}

export default AdminDashboard;
