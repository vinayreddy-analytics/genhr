// Token management utilities

export const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

export const getUserType = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userType');
  }
  return null;
};

export const getUserEmail = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userEmail');
  }
  return null;
};

export const isLoggedIn = () => {
  const token = getToken();
  return !!token;
};

export const logout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    localStorage.removeItem('userEmail');
    window.location.href = '/login';
  }
};

export const getAuthHeaders = () => {
  const token = getToken();
  return token ? {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  } : {
    'Content-Type': 'application/json'
  };
};