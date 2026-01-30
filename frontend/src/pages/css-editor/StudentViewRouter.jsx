import { Routes, Route } from 'react-router-dom';
import StudentLayout from '../../components/StudentLayout';
import ReadOnlyWrapper from './ReadOnlyWrapper';
import StudentHome from '../student/StudentHome';
import StudentProfile from '../student/StudentProfile';
import StudentGroup from '../student/StudentGroup';
import StudentCourses from '../student/StudentCourses';
import StudentTyping from '../student/StudentTyping';
import Chat from '../student/Chat';
import Leaderboard from '../../components/Leaderboard';
import StudentTests from '../student/StudentTests';
import StudentHomeworks from '../student/StudentHomeworks';
import Shop from '../student/Shop';
import KnowledgeBase from '../student/KnowledgeBase';
import StudentUpdates from '../student/StudentUpdates';
import Games from '../student/Games';
import './ViewPage.css';

function StudentViewRouter() {
  return (
    <div className="view-page-wrapper">
      <div className="view-page-banner">
        <h2>👨‍🎓 Student View (Read-Only)</h2>
        <p>Inspect CSS styles in the student interface. Use <kbd>Ctrl+Shift+I</kbd> to toggle inspector.</p>
      </div>
      <div className="view-page-content">
        <ReadOnlyWrapper roleName="Student" basePath="/css-editor/student-view">
          <StudentLayout>
            <Routes>
              <Route index element={<StudentHome />} />
              <Route path="profile" element={<StudentProfile />} />
              <Route path="group" element={<StudentGroup />} />
              <Route path="courses" element={<StudentCourses />} />
              <Route path="typing" element={<StudentTyping />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="chat" element={<Chat />} />
              <Route path="tests" element={<StudentTests />} />
              <Route path="homeworks" element={<StudentHomeworks />} />
              <Route path="shop" element={<Shop />} />
              <Route path="knowledge" element={<KnowledgeBase />} />
              <Route path="updates" element={<StudentUpdates />} />
              <Route path="games" element={<Games />} />
            </Routes>
          </StudentLayout>
        </ReadOnlyWrapper>
      </div>
    </div>
  );
}

export default StudentViewRouter;
