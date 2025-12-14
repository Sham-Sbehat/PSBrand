import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, CircularProgress, Box } from '@mui/material';
import { AppProvider, useApp } from './context/AppContext';
import theme from './theme/theme';

// Lazy load pages for code splitting (reduces initial bundle size)
const RoleSelection = lazy(() => import('./pages/RoleSelection'));
const EmployeeDashboard = lazy(() => import('./pages/EmployeeDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Login = lazy(() => import('./pages/Login'));
const DesignManagerDashboard = lazy(() => import('./pages/DesignManagerDashboard'));
const PreparerDashboard = lazy(() => import('./pages/PreparerDashboard'));
const PackagerDashboard = lazy(() => import('./pages/PackagerDashboard'));
const DailyOrders = lazy(() => import('./pages/DailyOrders'));

// Loading component for lazy loaded pages
const PageLoader = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
    }}
  >
    <CircularProgress />
  </Box>
);

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
      case 5: return "packager";
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
  const { user } = useApp();
  
  // Auto-redirect based on user role
  const getDefaultRoute = () => {
    if (!user) return "/";
    
    switch (user.role) {
      case 1: return "/admin";
      case 2: return "/employee";
      case 3: return "/preparer";
      case 4: return "/designmanager";
      case 5: return "/packager";
      default: return "/";
    }
  };

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
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
            path="/admin/daily-orders"
            element={
              <ProtectedRoute allowedRole="admin">
                <DailyOrders />
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
          <Route
            path="/packager"
            element={
              <ProtectedRoute allowedRole="packager">
                <PackagerDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
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
