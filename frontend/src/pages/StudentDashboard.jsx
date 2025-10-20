import { Routes, Route } from 'react-router-dom';
import StudentLayout from '../components/StudentLayout';
import StudentHome from './student/StudentHome';
import StudentProfile from './student/StudentProfile';
import StudentGroup from './student/StudentGroup';
import StudentCourses from './student/StudentCourses';
import StudentTyping from './student/StudentTyping';
import Chat from './student/Chat';
import Leaderboard from '../components/Leaderboard';
import StudentTests from './student/StudentTests';
import StudentHomeworks from './student/StudentHomeworks';
import Shop from './student/Shop';
import './StudentDashboard.css';

function StudentDashboard() {
  return (
    <StudentLayout>
      <Routes>
        <Route path="/" element={<StudentHome />} />
        <Route path="/profile" element={<StudentProfile />} />
        <Route path="/group" element={<StudentGroup />} />
        <Route path="/courses" element={<StudentCourses />} />
        <Route path="/typing" element={<StudentTyping />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/tests" element={<StudentTests />} />
        <Route path="/homeworks" element={<StudentHomeworks />} />
        <Route path="/shop" element={<Shop />} />
      </Routes>
    </StudentLayout>
  );
}

export default StudentDashboard;
