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
import KnowledgeBase from './student/KnowledgeBase';
import StudentUpdates from './student/StudentUpdates';
import StudentIDE from './student/StudentIDE';
import StudentProjects from './student/StudentProjects';
import StudentDatabases from './student/StudentDatabases';
import StudentPlugins from './student/StudentPlugins';
import StudentThemes from './student/StudentThemes';
import Games from './student/Games';
import DesignEditor from '../components/DesignEditor';
import StudentTechnicalSpecs from './student/StudentTechnicalSpecs';
import styles from './StudentDashboard.module.css';

function StudentDashboard() {
  return (
    <Routes>
      {/* IDE Routes - БЕЗ Layout, полный экран */}
      <Route path="ide/:projectId" element={<StudentIDE />} />
      
      {/* Все остальные routes - С Layout */}
      <Route path="/" element={<StudentLayout><StudentHome /></StudentLayout>} />
      <Route path="profile" element={<StudentLayout><StudentProfile /></StudentLayout>} />
      <Route path="group" element={<StudentLayout><StudentGroup /></StudentLayout>} />
      <Route path="courses" element={<StudentLayout><StudentCourses /></StudentLayout>} />
      <Route path="typing" element={<StudentLayout><StudentTyping /></StudentLayout>} />
      <Route path="leaderboard" element={<StudentLayout><Leaderboard /></StudentLayout>} />
      <Route path="chat" element={<StudentLayout><Chat /></StudentLayout>} />
      <Route path="tests" element={<StudentLayout><StudentTests /></StudentLayout>} />
      <Route path="homeworks" element={<StudentLayout><StudentHomeworks /></StudentLayout>} />
      <Route path="shop" element={<StudentLayout><Shop /></StudentLayout>} />
      <Route path="knowledge" element={<StudentLayout><KnowledgeBase /></StudentLayout>} />
      <Route path="updates" element={<StudentLayout><StudentUpdates /></StudentLayout>} />
      <Route path="projects" element={<StudentLayout><StudentProjects /></StudentLayout>} />
      <Route path="databases" element={<StudentLayout><StudentDatabases /></StudentLayout>} />
      <Route path="plugins" element={<StudentLayout><StudentPlugins /></StudentLayout>} />
      <Route path="themes" element={<StudentLayout><StudentThemes /></StudentLayout>} />
      <Route path="games" element={<StudentLayout><Games /></StudentLayout>} />
      <Route path="design" element={<DesignEditor />} />
      <Route path="technical-specs" element={<StudentLayout><StudentTechnicalSpecs /></StudentLayout>} />
    </Routes>
  );
}

export default StudentDashboard;
