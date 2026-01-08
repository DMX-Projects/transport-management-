import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store } from './app/store';
import { selectIsAuthenticated } from './features/auth/authSlice';

import Login from './features/auth/Login';
import Dashboard from './pages/Dashboard';
import LRManagement from './pages/LRManagement';
import HPAManagement from './pages/HPAManagement';
import Payments from './pages/Payments';
import POD from './pages/POD';
import Billing from './pages/Billing';
import Receipts from './pages/Receipts';
import Reports from './pages/Reports';
import Masters from './pages/Masters';
import DashboardLayout from './components/layout/DashboardLayout';

// Protected Route Component
function ProtectedRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Public Route Component (redirect to dashboard if already logged in)
function PublicRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />

        {/* Protected Routes - All wrapped in DashboardLayout */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/lr" element={
          <ProtectedRoute>
            <DashboardLayout>
              <LRManagement />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/hpa" element={
          <ProtectedRoute>
            <DashboardLayout>
              <HPAManagement />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/payments" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Payments />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/pod" element={
          <ProtectedRoute>
            <DashboardLayout>
              <POD />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/billing" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Billing />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/receipts" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Receipts />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Reports />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/masters" element={
          <ProtectedRoute>
            <DashboardLayout>
              <Masters />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppRoutes />
    </Provider>
  );
}

export default App;
