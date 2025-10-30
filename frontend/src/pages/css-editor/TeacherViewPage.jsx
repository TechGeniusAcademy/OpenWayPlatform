import React from 'react';
import TeacherLayout from '../../components/TeacherLayout';
import TeacherHome from '../teacher/TeacherHome';
import ReadOnlyWrapper from './ReadOnlyWrapper';
import './ViewPage.css';

function TeacherViewPage() {
  return (
    <div className="view-page-wrapper">
      <div className="view-page-banner">
        <h2>👨‍🏫 Teacher View (Read-Only)</h2>
        <p>Inspect CSS styles in the teacher interface. Use <kbd>Ctrl+Shift+I</kbd> to toggle inspector.</p>
      </div>
      <div className="view-page-content">
        <ReadOnlyWrapper roleName="Teacher">
          <TeacherLayout>
            <TeacherHome />
          </TeacherLayout>
        </ReadOnlyWrapper>
      </div>
    </div>
  );
}

export default TeacherViewPage;
