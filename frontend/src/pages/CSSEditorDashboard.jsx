import { Routes, Route } from 'react-router-dom';
import CSSEditorLayout from '../components/CSSEditorLayout';
import CSSEditorHome from './css-editor/CSSEditorHome';
import StudentViewRouter from './css-editor/StudentViewRouter';
import TeacherViewRouter from './css-editor/TeacherViewRouter';
import AdminViewRouter from './css-editor/AdminViewRouter';
import TesterViewRouter from './css-editor/TesterViewRouter';

function CSSEditorDashboard() {
  return (
    <Routes>
      <Route element={<CSSEditorLayout />}>
        <Route index element={<CSSEditorHome />} />
        <Route path="student-view/*" element={<StudentViewRouter />} />
        <Route path="teacher-view/*" element={<TeacherViewRouter />} />
        <Route path="admin-view/*" element={<AdminViewRouter />} />
        <Route path="tester-view/*" element={<TesterViewRouter />} />
      </Route>
    </Routes>
  );
}

export default CSSEditorDashboard;
