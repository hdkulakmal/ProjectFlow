import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentGroup from './pages/student/StudentGroup';
import StudentSupervisorRequests from './pages/student/StudentSupervisorRequests';
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <p className="text-sm font-medium text-primary">Loading ProjectFlow...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Temporary Placeholder Dashboard Component for Coordinator
function DashboardPlaceholder({ title, role }) {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl border border-outline-variant shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">{title}</h1>
          <button
            onClick={logout}
            className="px-4 py-2 bg-error text-white rounded-lg text-sm font-semibold hover:opacity-90"
          >
            Logout
          </button>
        </div>
        <p className="text-on-surface mb-2">
          Logged in as: <strong>{user?.fullName}</strong> ({role})
        </p>
        <p className="text-sm text-outline">Email: {user?.email}</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Student Routes */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/group"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <StudentGroup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/supervisor-requests"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <StudentSupervisorRequests />
              </ProtectedRoute>
            }
          />
          <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />

          {/* Supervisor Protected Route */}
          <Route
            path="/supervisor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Supervisor']}>
                <SupervisorDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/supervisor" element={<Navigate to="/supervisor/dashboard" replace />} />

          {/* Coordinator Protected Route */}
          <Route
            path="/coordinator/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Coordinator']}>
                <DashboardPlaceholder title="Coordinator Dashboard" role="Coordinator" />
              </ProtectedRoute>
            }
          />
          <Route path="/coordinator" element={<Navigate to="/coordinator/dashboard" replace />} />

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}