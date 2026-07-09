import React, { createContext, useState, useEffect, useContext, useRef } from 'react';

export const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('crm_token'));
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [currency, setCurrencyState] = useState(localStorage.getItem('crm_currency') || 'NGN');
  const pollTimerRef = useRef(null);

  const exchangeRate = 1600; // 1 USD = 1600 NGN

  function setCurrency(newCurrency) {
    localStorage.setItem('crm_currency', newCurrency);
    setCurrencyState(newCurrency);
  }

  function formatCurrency(val) {
    if (currency === 'NGN') {
      return '₦' + Math.round(val * exchangeRate).toLocaleString();
    }
    return '$' + Math.round(val).toLocaleString();
  }

  function toDisplayValue(val) {
    if (val === undefined || val === null || val === '') return '';
    if (currency === 'NGN') {
      return Math.round(val * exchangeRate);
    }
    return Math.round(val);
  }

  function toDatabaseValue(val) {
    if (currency === 'NGN') {
      return val / exchangeRate;
    }
    return val;
  }

  // Helper to store/remove token
  function handleTokenChange(newToken) {
    if (newToken) {
      localStorage.setItem('crm_token', newToken);
      setToken(newToken);
    } else {
      localStorage.removeItem('crm_token');
      setToken(null);
      setUser(null);
      setNotifications([]);
    }
  }

  // Wrapper for authenticated API calls
  async function apiCall(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        // If unauthorized or token expired, clear auth
        if (response.status === 401 || response.status === 403) {
          handleTokenChange(null);
        }
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error(`API Call to ${endpoint} failed:`, error.message);
      throw error;
    }
  }

  // Login handler
  async function login(email, password) {
    try {
      const data = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      handleTokenChange(data.token);
      setUser(data.user);
      return data.user;
    } catch (error) {
      throw error;
    }
  }

  // Signup handler
  async function signup(signupData) {
    try {
      const data = await apiCall('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(signupData),
      });
      handleTokenChange(data.token);
      setUser(data.user);
      return data.user;
    } catch (error) {
      throw error;
    }
  }

  // Logout handler
  function logout() {
    handleTokenChange(null);
  }

  // Fetch current user details
  async function fetchCurrentUser() {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiCall('/api/auth/me');
      setUser({
        id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
        companyId: data.companyId,
      });
    } catch (error) {
      console.error('Failed to restore session:', error.message);
      handleTokenChange(null);
    } finally {
      setLoading(false);
    }
  }

  // Fetch notifications list
  async function fetchNotifications() {
    if (!token) return;
    try {
      const data = await apiCall('/api/notifications');
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error.message);
    }
  }

  // Mark notification read
  async function markNotificationRead(id) {
    try {
      const updated = await apiCall(`/api/notifications/${id}`, {
        method: 'PUT',
      });
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, read: true } : n))
      );
      return updated;
    } catch (error) {
      console.error('Failed to mark notification as read:', error.message);
    }
  }

  // Mark all notifications read
  async function markAllNotificationsRead() {
    try {
      await apiCall('/api/notifications/read-all', {
        method: 'PUT',
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error.message);
    }
  }

  // Check token on mount
  useEffect(() => {
    fetchCurrentUser();
  }, [token]);

  // Notifications polling setup
  useEffect(() => {
    if (user) {
      fetchNotifications();
      pollTimerRef.current = setInterval(fetchNotifications, 15000); // Poll every 15s
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    }
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [user]);

  const value = {
    user,
    token,
    loading,
    notifications,
    login,
    signup,
    logout,
    apiCall,
    fetchNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    currency,
    setCurrency,
    formatCurrency,
    toDisplayValue,
    toDatabaseValue,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
