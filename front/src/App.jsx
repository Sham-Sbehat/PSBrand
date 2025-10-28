import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { AppProvider, useApp } from './context/AppContext';
import theme from './theme/theme';
import RoleSelection from './pages/RoleSelection';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import DesignManagerDashboard from './pages/DesignManagerDashboard';
import PreparerDashboard from './pages/PreparerDashboard';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user } = useApp();

  console.log('ProtectedRoute check:', { user, allowedRole });

  // Check if user is authenticated
  if (!user) {
    console.log('No user found, redirecting to home');
    return <Navigate to="/" replace />;
  }

  const getUserRoleString = (roleNumber) => {
    switch (roleNumber) {
      case 1: return "admin";
      case 2: return "designer";
      case 3: return "preparer";
      case 4: return "designmanager";
      default: return "unknown";
    }
  };

  const userRoleString = getUserRoleString(user?.role);
  const isRoleAllowed = Array.isArray(allowedRole) 
    ? allowedRole.includes(userRoleString)
    : userRoleString === allowedRole;
  
  console.log('Role check:', { userRoleString, allowedRole, isRoleAllowed });
  
  if (allowedRole && !isRoleAllowed) {
    console.log('Role not allowed, redirecting to home');
    return <Navigate to="/" replace />;
  }

  console.log('Access granted');
  return children;
};

function AppContent() {
  const { user } = useApp();
  
  // Auto-redirect based on user role
  const getDefaultRoute = () => {
    if (!user) return "/";
    
    switch (user.role) {
      case 1: return "/admin";
      case 2: return "/employee";
      case 3: return "/preparer";
      case 4: return "/designmanager";
      default: return "/";
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          user ? <Navigate to={getDefaultRoute()} replace /> : <RoleSelection />
        } />
        <Route path="/login" element={<Login />} />
        <Route
          path="/employee"
          element={
            <ProtectedRoute allowedRole="designer">
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
         <Route
          path="/preparer"
          element={
            <ProtectedRoute allowedRole="preparer">
              <PreparerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/designmanager"
          element={
            <ProtectedRoute allowedRole="designmanager">
              <DesignManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
