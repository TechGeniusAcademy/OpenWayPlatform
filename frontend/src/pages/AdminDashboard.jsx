import { Routes, Route } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import UsersManagement from '../components/UsersManagement';
import GroupsManagement from '../components/GroupsManagement';
import Leaderboard from '../components/Leaderboard';
import AdminChat from '../components/AdminChat';
import TestsManagement from '../components/TestsManagement';
import HomeworksManagement from '../components/HomeworksManagement';
import TypingManagement from '../components/TypingManagement';
import GameManagement from '../components/GameManagement';
import ShopManagement from '../components/ShopManagement';
import KnowledgeBaseManagement from '../components/KnowledgeBaseManagement';
import UpdatesManagement from '../components/UpdatesManagement';
import AdminSubmissions from './admin/AdminSubmissions';
import GamesManagement from './admin/GamesManagement';
import AdminCourses from './admin/AdminCourses';
import CourseLessons from './admin/CourseLessons';
import FlexChanAdmin from './admin/FlexChanAdmin';
import LayoutGameManagement from '../components/LayoutGameManagement';
import JSGameManagement from '../components/JSGameManagement';
import UserLevelsManagement from '../components/UserLevelsManagement';
import MusicManagement from './admin/MusicManagement';
import MoviesManagement from './admin/MoviesManagement';
import ScheduleManagement from '../components/ScheduleManagement';

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
        <Route path="/typing" element={<TypingManagement />} />
        <Route path="/game" element={<GameManagement />} />
        <Route path="/games" element={<GamesManagement />} />
        <Route path="/shop" element={<ShopManagement />} />
        <Route path="/knowledge" element={<KnowledgeBaseManagement />} />
        <Route path="/updates" element={<UpdatesManagement />} />
        <Route path="/submissions" element={<AdminSubmissions />} />
        <Route path="/courses" element={<AdminCourses />} />
        <Route path="/courses/:courseId/lessons" element={<CourseLessons />} />
        <Route path="/flexchan" element={<FlexChanAdmin />} />
        <Route path="/layout-game" element={<LayoutGameManagement />} />
        <Route path="/js-game" element={<JSGameManagement />} />
        <Route path="/user-levels" element={<UserLevelsManagement />} />
        <Route path="/music" element={<MusicManagement />} />
        <Route path="/movies" element={<MoviesManagement />} />
        <Route path="/schedule" element={<ScheduleManagement />} />
        {/* Здесь можно добавлять новые маршруты */}
      </Routes>
    </AdminLayout>
  );
}

export default AdminDashboard;
