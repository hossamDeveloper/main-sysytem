import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { usePermission } from '../hooks/usePermissions';

export function ProtectedRoute({ children, allowedRoles = [], requiredPermission = null, module = null }) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const hasPermission = usePermission(module, requiredPermission);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles is specified, check if user has required role
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    // If role check fails, also check permissions if module and permission are specified
    if (module && requiredPermission && hasPermission) {
      return children;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  // If permission is required, check it
  if (module && requiredPermission && !hasPermission) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

