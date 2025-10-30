import { Routes, Route } from 'react-router-dom';
import TeacherLayout from '../../components/TeacherLayout';
import ReadOnlyWrapper from './ReadOnlyWrapper';
import TeacherHome from '../teacher/TeacherHome';
import TeacherGroups from '../teacher/TeacherGroups';
import TeacherStudents from '../teacher/TeacherStudents';
import TeacherTests from '../teacher/TeacherTests';
import TeacherHomeworks from '../teacher/TeacherHomeworks';
import TeacherProjects from '../teacher/TeacherProjects';
import TeacherTyping from '../teacher/TeacherTyping';
import './ViewPage.css';

function TeacherViewRouter() {
  return (
    <div className="view-page-wrapper">
      <div className="view-page-banner">
        <h2>👨‍🏫 Teacher View (Read-Only)</h2>
        <p>Inspect CSS styles in the teacher interface. Use <kbd>Ctrl+Shift+I</kbd> to toggle inspector.</p>
      </div>
      <div className="view-page-content">
        <ReadOnlyWrapper roleName="Teacher" basePath="/css-editor/teacher-view">
          <TeacherLayout>
            <Routes>
              <Route index element={<TeacherHome />} />
              <Route path="groups" element={<TeacherGroups />} />
              <Route path="students" element={<TeacherStudents />} />
              <Route path="tests" element={<TeacherTests />} />
              <Route path="homeworks" element={<TeacherHomeworks />} />
              <Route path="projects" element={<TeacherProjects />} />
              <Route path="typing" element={<TeacherTyping />} />
            </Routes>
          </TeacherLayout>
        </ReadOnlyWrapper>
      </div>
    </div>
  );
}

export default TeacherViewRouter;
