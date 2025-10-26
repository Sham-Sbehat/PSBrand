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

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user } = useApp();

  // Check if user is authenticated
  if (!user) {
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
  
  if (allowedRole && !isRoleAllowed) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppContent() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RoleSelection />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/employee"
          element={
            <ProtectedRoute allowedRole={["designer", "preparer"]}>
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
