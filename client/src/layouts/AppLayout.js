import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/navigation/Sidebar';
import Topbar from '../components/navigation/Topbar';
import { CelebrationToast } from '../components/common/Celebration';

const AppLayout = () => {
  const [toastMessage, setToastMessage] = useState(null);

  const showCelebration = (msg) => {
    setToastMessage(msg || 'Shipped ✦ nice work');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar onTaskCreated={() => window.dispatchEvent(new Event('duster:refresh-tasks'))} />
        <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
          <Outlet context={{ showCelebration }} />
        </main>
      </div>

      {toastMessage && (
        <CelebrationToast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
};

export default AppLayout;
