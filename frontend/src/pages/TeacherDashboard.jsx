import { Routes, Route, Navigate } from 'react-router-dom';
import TeacherLayout from '../components/TeacherLayout';
import TeacherHome from './teacher/TeacherHome';
import TeacherStudents from './teacher/TeacherStudents';
import TeacherGroups from './teacher/TeacherGroups';
import TeacherTests from './teacher/TeacherTests';
import TeacherHomeworks from './teacher/TeacherHomeworks';
import TeacherProjects from './teacher/TeacherProjects';
import TeacherTyping from './teacher/TeacherTyping';
import Leaderboard from '../components/Leaderboard';
import KnowledgeBase from './student/KnowledgeBase';
import Shop from './student/Shop';
import StudentUpdates from './student/StudentUpdates';
import Chat from './student/Chat';

function TeacherDashboard() {
  return (
    <Routes>
      <Route path="/" element={<TeacherLayout />}>
        <Route index element={<Navigate to="/teacher/home" replace />} />
        <Route path="home" element={<TeacherHome />} />
        <Route path="students" element={<TeacherStudents />} />
        <Route path="groups" element={<TeacherGroups />} />
        <Route path="tests" element={<TeacherTests />} />
        <Route path="homeworks" element={<TeacherHomeworks />} />
        <Route path="projects" element={<TeacherProjects />} />
        <Route path="typing" element={<TeacherTyping />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="knowledge-base" element={<KnowledgeBase />} />
        <Route path="shop" element={<Shop />} />
        <Route path="updates" element={<StudentUpdates />} />
        <Route path="chat" element={<Chat />} />
      </Route>
    </Routes>
  );
}

export default TeacherDashboard;
