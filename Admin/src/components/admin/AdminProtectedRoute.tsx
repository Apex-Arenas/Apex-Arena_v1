import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../../lib/admin-auth-context';

const AdminProtectedRoute = () => {
  const { isAuthenticated, isInitializing } = useAdminAuth();

  if (isInitializing) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <span>Verifying admin session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
};

export default AdminProtectedRoute;
