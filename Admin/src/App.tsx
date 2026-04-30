import { Navigate, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminLogin from "./pages/admin/login";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import UserManagement from "./pages/admin/UserManagement";
import GamesManagement from "./pages/admin/GamesManagement";
import OrganizerVerifications from "./pages/admin/OrganizerVerifications";
import AdminProfile from "./pages/admin/AdminProfile";
import PayoutsManagement from "./pages/admin/PayoutsManagement";
import EscrowManagement from "./pages/admin/EscrowManagement";
import SchedulerManagement from "./pages/admin/SchedulerManagement";
import AuditLogs from "./pages/admin/AuditLogs";
import AdminManagement from "./pages/admin/AdminManagement";
import GameRequests from "./pages/admin/GameRequests";
import DisputeManagement from "./pages/admin/DisputeManagement";
import TournamentManagement from "./pages/admin/TournamentManagement";

const App = () => {
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        style={{
          "--toastify-color-dark": "#1e293b",
          "--toastify-color-light": "#94a3b8",
          "--toastify-color-info": "#0ea5e9",
          "--toastify-color-success": "#10b981",
          "--toastify-color-warning": "#f59e0b",
          "--toastify-color-error": "#ef4444",
          "--toastify-text-color-light": "#f1f5f9",
          "--toastify-text-color-dark": "#f1f5f9",
          fontFamily: "'Space Grotesk', sans-serif",
        } as React.CSSProperties}
      />
      <Routes>
        {/* Public admin login */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Authenticated admin area */}
        <Route path="/admin" element={<AdminProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="games" element={<GamesManagement />} />
            <Route path="tournaments" element={<TournamentManagement />} />
            <Route path="verifications" element={<OrganizerVerifications />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="payouts" element={<PayoutsManagement />} />
            <Route path="escrow" element={<EscrowManagement />} />
            <Route path="scheduler" element={<SchedulerManagement />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="admins" element={<AdminManagement />} />
            <Route path="game-requests" element={<GameRequests />} />
            <Route path="disputes" element={<DisputeManagement />} />
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </>
  );
};

export default App;
