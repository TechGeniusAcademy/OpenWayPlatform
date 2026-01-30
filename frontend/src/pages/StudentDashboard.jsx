import { Routes, Route } from 'react-router-dom';
import StudentLayout from '../components/StudentLayout';
import StudentHome from './student/StudentHome';
import StudentProfile from './student/StudentProfile';
import StudentGroup from './student/StudentGroup';
import StudentCourses from './student/StudentCourses';
import CourseDetail from './student/CourseDetail';
import LessonViewer from './student/LessonViewer';
import StudentTyping from './student/StudentTyping';
import Chat from './student/Chat';
import Leaderboard from '../components/Leaderboard';
import StudentTests from './student/StudentTests';
import StudentHomeworks from './student/StudentHomeworks';
import Shop from './student/Shop';
import KnowledgeBase from './student/KnowledgeBase';
import StudentUpdates from './student/StudentUpdates';
import Games from './student/Games';
import DesignEditor from '../components/DesignEditor';
import StudentTechnicalSpecs from './student/StudentTechnicalSpecs';
import StudentExtra from './student/StudentExtra';
import styles from './StudentDashboard.module.css';

function StudentDashboard() {
  return (
    <Routes>
      <Route path="/" element={<StudentLayout><StudentHome /></StudentLayout>} />
      <Route path="profile" element={<StudentLayout><StudentProfile /></StudentLayout>} />
      <Route path="group" element={<StudentLayout><StudentGroup /></StudentLayout>} />
      <Route path="courses" element={<StudentLayout><StudentCourses /></StudentLayout>} />
      <Route path="courses/:id" element={<StudentLayout><CourseDetail /></StudentLayout>} />
      <Route path="courses/:courseId/lessons/:lessonId" element={<StudentLayout><LessonViewer /></StudentLayout>} />
      <Route path="typing" element={<StudentLayout><StudentTyping /></StudentLayout>} />
      <Route path="leaderboard" element={<StudentLayout><Leaderboard /></StudentLayout>} />
      <Route path="chat" element={<StudentLayout><Chat /></StudentLayout>} />
      <Route path="tests" element={<StudentLayout><StudentTests /></StudentLayout>} />
      <Route path="homeworks" element={<StudentLayout><StudentHomeworks /></StudentLayout>} />
      <Route path="shop" element={<StudentLayout><Shop /></StudentLayout>} />
      <Route path="knowledge" element={<StudentLayout><KnowledgeBase /></StudentLayout>} />
      <Route path="updates" element={<StudentLayout><StudentUpdates /></StudentLayout>} />
      <Route path="games" element={<StudentLayout><Games /></StudentLayout>} />
      <Route path="design" element={<DesignEditor />} />
      <Route path="technical-specs" element={<StudentLayout><StudentTechnicalSpecs /></StudentLayout>} />
      <Route path="extra" element={<StudentLayout><StudentExtra /></StudentLayout>} />
    </Routes>
  );
}

export default StudentDashboard;
