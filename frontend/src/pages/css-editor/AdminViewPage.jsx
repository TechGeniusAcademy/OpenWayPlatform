import React from 'react';
import AdminLayout from '../../components/AdminLayout';
import UsersManagement from '../../components/UsersManagement';
import ReadOnlyWrapper from './ReadOnlyWrapper';
import './ViewPage.css';

function AdminViewPage() {
  return (
    <div className="view-page-wrapper">
      <div className="view-page-banner">
        <h2>👑 Admin View (Read-Only)</h2>
        <p>Inspect CSS styles in the admin interface. Use <kbd>Ctrl+Shift+I</kbd> to toggle inspector.</p>
      </div>
      <div className="view-page-content">
        <ReadOnlyWrapper roleName="Admin">
          <AdminLayout>
            <UsersManagement />
          </AdminLayout>
        </ReadOnlyWrapper>
      </div>
    </div>
  );
}

export default AdminViewPage;
