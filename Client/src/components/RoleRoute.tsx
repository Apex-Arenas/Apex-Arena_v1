import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

interface RoleRouteProps {
  role: "player" | "organizer" | ("player" | "organizer")[];
}

/**
 * Wraps routes that require a specific role (or one of several roles).
 * Redirects to /auth (dashboard) if the user's role doesn't match.
 */
const RoleRoute = ({ role }: RoleRouteProps) => {
  const { user } = useAuth();
  const allowed = Array.isArray(role) ? role : [role];

  if (!user?.role || !(allowed as string[]).includes(user.role)) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
