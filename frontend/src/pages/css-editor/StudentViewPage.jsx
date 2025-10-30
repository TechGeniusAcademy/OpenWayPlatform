import React from 'react';
import StudentLayout from '../../components/StudentLayout';
import StudentHome from '../student/StudentHome';
import ReadOnlyWrapper from './ReadOnlyWrapper';
import './ViewPage.css';

function StudentViewPage() {
  return (
    <div className="view-page-wrapper">
      <div className="view-page-banner">
        <h2>👨‍🎓 Student View (Read-Only)</h2>
        <p>Inspect CSS styles in the student interface. Use <kbd>Ctrl+Shift+I</kbd> to toggle inspector.</p>
      </div>
      <div className="view-page-content">
        <ReadOnlyWrapper roleName="Student">
          <StudentLayout>
            <StudentHome />
          </StudentLayout>
        </ReadOnlyWrapper>
      </div>
    </div>
  );
}

export default StudentViewPage;
