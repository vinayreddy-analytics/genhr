import { logout, getUserEmail, getUserType } from '../utils/auth';

export default function LogoutButton() {
  const userEmail = getUserEmail();
  const userType = getUserType();

  const handleLogout = () => {
    const confirmLogout = window.confirm('Are you sure you want to sign out?');
    if (confirmLogout) {
      logout();
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '2px'
      }}>
        <span style={{ 
          fontSize: '12px', 
          color: '#666',
          backgroundColor: userType === 'candidate' ? '#e3f2fd' : '#f3e5f5',
          padding: '2px 8px',
          borderRadius: '10px',
          textTransform: 'capitalize'
        }}>
          {userType}
        </span>
        <span style={{ 
          fontSize: '14px', 
          color: '#333',
          fontWeight: '500'
        }}>
          👤 {userEmail}
        </span>
      </div>
      <button
        onClick={handleLogout}
        style={{
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        Sign Out
      </button>
    </div>
  );
}