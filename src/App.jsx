import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AdminPage } from './pages/AdminPage';
import { UserManagement } from './pages/UserManagement';
import { EditorPage } from './pages/EditorPage';
import { ViewerPage } from './pages/ViewerPage';
import { Unauthorized } from './pages/Unauthorized';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PurchasingModule } from './modules/Purchasing/PurchasingModule';

function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Role-based routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <UserManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/editor"
        element={
          <ProtectedRoute allowedRoles={['editor', 'admin']}>
            <EditorPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/viewer"
        element={
          <ProtectedRoute allowedRoles={['viewer', 'editor', 'admin']}>
            <ViewerPage />
          </ProtectedRoute>
        }
      />

      {/* Purchasing Module */}
      <Route
        path="/purchasing/*"
        element={
          <ProtectedRoute 
            allowedRoles={['admin', 'PurchasingManager']}
            module="purchasing"
            requiredPermission="view"
          >
            <PurchasingModule />
          </ProtectedRoute>
        }
      />

      {/* Unauthorized page */}
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
