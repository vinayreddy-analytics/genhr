import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { isLoggedIn, getUserType, getUserEmail, getToken } from '../utils/auth';

export default function ProtectedRoute({ children, requiredUserType }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

useEffect(() => {
  const checkAuth = async () => {
    const token = getToken();
    
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      // Verify token with server
      const response = await fetch('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        // Token invalid/expired - redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('userType');
        localStorage.removeItem('userEmail');
        router.push('/login');
        return;
      }

      const data = await response.json();
      const userType = data.user.userType;

      if (requiredUserType && userType !== requiredUserType) {
        // Wrong user type - redirect to correct dashboard
        if (userType === 'candidate') {
          router.push('/candidate-dashboard');
        } else if (userType === 'recruiter') {
          router.push('/recruiterdashboard'); // Note: updated route name
        }
        return;
      }

      // User is authenticated and has correct type
      setIsAuthenticated(true);
      setIsLoading(false);

    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login');
    }
  };

  checkAuth();
}, [router, requiredUserType]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        <div>🔐 Checking authentication...</div>
      </div>
    );
  }

  // Show nothing if not authenticated (redirect in progress)
  if (!isAuthenticated) {
    return null;
  }

  // Show the protected content
  return children;
}