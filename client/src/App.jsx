import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthProvider, { useAuth } from './context/AuthContext.jsx';

// Component Layouts
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';

// Page Imports
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Contacts from './pages/Contacts.jsx';
import Pipeline from './pages/Pipeline.jsx';
import Tickets from './pages/Tickets.jsx';
import Settings from './pages/Settings.jsx';

// Helper component for private routes
function PrivateRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container flex-center">
        <div className="spinner"></div>
        <p>Verifying secure MERN session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Layout wrapper for authenticated users
function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  function toggleSidebar() {
    setSidebarOpen(prev => !prev);
  }

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="main-content">
        <Topbar toggleSidebar={toggleSidebar} />
        <main className="content-body">
          <Routes>
            <Route path="dashboard" element={<Dashboard />} />
            
            <Route path="contacts" element={
              <PrivateRoute allowedRoles={['Admin', 'Sales Rep', 'Support Agent']}>
                <Contacts />
              </PrivateRoute>
            } />
            
            <Route path="pipeline" element={
              <PrivateRoute allowedRoles={['Admin', 'Sales Rep']}>
                <Pipeline />
              </PrivateRoute>
            } />
            
            <Route path="tickets" element={
              <PrivateRoute allowedRoles={['Admin', 'Support Agent']}>
                <Tickets />
              </PrivateRoute>
            } />
            
            <Route path="settings" element={
              <PrivateRoute allowedRoles={['Admin']}>
                <Settings />
              </PrivateRoute>
            } />
            
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Client Portal Routes */}
          <Route path="/*" element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
