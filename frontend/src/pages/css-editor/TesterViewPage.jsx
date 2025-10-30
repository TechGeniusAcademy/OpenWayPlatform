import React from 'react';
import TesterLayout from '../../components/TesterLayout';
import TesterHome from '../tester/TesterHome';
import ReadOnlyWrapper from './ReadOnlyWrapper';
import './ViewPage.css';

function TesterViewPage() {
  return (
    <div className="view-page-wrapper">
      <div className="view-page-banner">
        <h2>🧪 Tester View (Read-Only)</h2>
        <p>Inspect CSS styles in the tester interface. Use <kbd>Ctrl+Shift+I</kbd> to toggle inspector.</p>
      </div>
      <div className="view-page-content">
        <ReadOnlyWrapper roleName="Tester">
          <TesterLayout>
            <TesterHome />
          </TesterLayout>
        </ReadOnlyWrapper>
      </div>
    </div>
  );
}

export default TesterViewPage;
