import React from 'react';

export const ClearDataButton: React.FC = () => {
  const clearAllData = () => {
    if (window.confirm('This will delete all your notes and folders. Are you sure?')) {
      // Clear localStorage
      localStorage.clear();

      // Reload the app
      window.location.reload();
    }
  };

  return (
    <button
      onClick={clearAllData}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '10px 20px',
        background: '#ff4444',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        zIndex: 9999,
        fontSize: '12px'
      }}
    >
      Clear All Data (Dev)
    </button>
  );
};