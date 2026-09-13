import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, logoutUser } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore token from localStorage on mount
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      if (token && userData && userData !== 'undefined' && userData !== 'null') {
        const parsed = JSON.parse(userData);
        if (parsed && typeof parsed === 'object') {
          setUser(parsed);
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } catch (err) {
      console.warn('Invalid stored session, clearing storage:', err);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (emailOrName, password) => {
    try {
      setError(null);
      const response = await loginUser(emailOrName, password);
      
      // Support both { data: { token, user } } and { token, user }
      const token = response?.data?.token || response?.token;
      const userData = response?.data?.user || response?.user || (response?.data?.role ? response.data : null);
      
      if (!token || !userData) {
        throw new Error('Serverdan foydalanuvchi ma\'lumotlari to\'liq kelmadi.');
      }
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      return userData;
    } catch (err) {
      const message = err.message || 'Login xatosi yuz berdi';
      setError(message);
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
