import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store } from './app/store';
import { selectIsAuthenticated } from './features/auth/authSlice';
import { Toaster } from 'react-hot-toast';

import Login from './features/auth/Login';
import Dashboard from './pages/Dashboard';
import LRManagement from './pages/LRManagement';
import LRForm from './pages/LRForm';
import HPAManagement from './pages/HPAManagement';
import HPAForm from './pages/HPAForm';
import ActiveHPADashboard from './pages/ActiveHPADashboard';
import Payments from './pages/Payments';
import POD from './pages/POD';
import Billing from './pages/Billing';
import BillingTemplates from './pages/BillingTemplates';
import ClientPayments from './pages/ClientPayments';
import OutstandingReports from './pages/OutstandingReports';
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

// Root redirect component - redirects based on auth state
function RootRedirect() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

// Catch-all redirect component - redirects based on auth state
function CatchAllRedirect() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

function AppRoutes() {
  return (
    <Router>
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          // Default options
          duration: 4000,
          style: {
            background: '#fff',
            color: '#363636',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          // Success toast style
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          // Error toast style
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
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

        <Route path="/lr/create" element={
          <ProtectedRoute>
            <DashboardLayout>
              <LRForm />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/lr/edit/:id" element={
          <ProtectedRoute>
            <DashboardLayout>
              <LRForm />
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

        <Route path="/hpa/create" element={
          <ProtectedRoute>
            <DashboardLayout>
              <HPAForm />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/hpa/edit/:id" element={
          <ProtectedRoute>
            <DashboardLayout>
              <HPAForm />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/active-hpas" element={
          <ProtectedRoute>
            <DashboardLayout>
              <ActiveHPADashboard />
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

        <Route path="/billing-templates" element={
          <ProtectedRoute>
            <DashboardLayout>
              <BillingTemplates />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/client-payments" element={
          <ProtectedRoute>
            <DashboardLayout>
              <ClientPayments />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/receipts" element={
          <ProtectedRoute>
            <DashboardLayout>
                {/* Receipts removed */}
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

        <Route path="/outstanding-reports" element={
          <ProtectedRoute>
            <DashboardLayout>
              <OutstandingReports />
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

        {/* Redirect root based on auth state */}
        <Route path="/" element={<RootRedirect />} />

        {/* Catch all - redirect based on auth state */}
        <Route path="*" element={<CatchAllRedirect />} />
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
