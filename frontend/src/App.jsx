import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentGroup from './pages/student/StudentGroup';
import StudentSupervisorRequests from './pages/student/StudentSupervisorRequests';
import StudentTimeline from './pages/student/StudentTimeline';
import StudentDocuments from './pages/student/StudentDocuments';
import StudentProjects from './pages/student/StudentProjects';
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard';
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard';
import CoordinatorUsers from './pages/coordinator/CoordinatorUsers';
import CoordinatorSubmissions from './pages/coordinator/CoordinatorSubmissions';

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
            path="/student/projects"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <StudentProjects />
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
          <Route
            path="/student/timeline"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <StudentTimeline />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/documents"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <StudentDocuments />
              </ProtectedRoute>
            }
          />
          <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />

          {/* Supervisor Routes */}
          <Route
            path="/supervisor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Supervisor']}>
                <SupervisorDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/supervisor" element={<Navigate to="/supervisor/dashboard" replace />} />

          {/* Coordinator Routes */}
          <Route
            path="/coordinator/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Coordinator']}>
                <CoordinatorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordinator/users"
            element={
              <ProtectedRoute allowedRoles={['Coordinator']}>
                <CoordinatorUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordinator/submissions"
            element={
              <ProtectedRoute allowedRoles={['Coordinator']}>
                <CoordinatorSubmissions />
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