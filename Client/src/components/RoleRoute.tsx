import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

interface RoleRouteProps {
  role: "player" | "organizer";
}

/**
 * Wraps routes that require a specific role.
 * Redirects to /auth (dashboard) if the user's role doesn't match.
 */
const RoleRoute = ({ role }: RoleRouteProps) => {
  const { user } = useAuth();

  if (user?.role !== role) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
