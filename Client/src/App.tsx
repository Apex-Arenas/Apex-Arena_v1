import { Routes, Route, Outlet, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import PageTransition from "./components/PageTransition";
import DashboardLayout from "./components/DashboardLayout";
import Landing from "./pages/public/landing";
import NotFound from "./pages/public/not-found";
import ForgotPassword from "./pages/public/forgot";
import Register from "./pages/public/register";
import Login from "./pages/public/login";
import Dashboard from "./pages/auth/Dashboard";
import VerifyOtp from "./pages/public/verify-otp";
import PaymentCallback from "./pages/public/payment-callback.tsx";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";

// Auth pages
import PlayerProfile from "./pages/auth/player/profile";
import OrganizerProfile from "./pages/auth/organizer/profile";
import JoinTournament from "./pages/auth/player/join-tournament";
import CreateTournament from "./pages/auth/organizer/create-tournament";
import MyTournaments from "./pages/auth/organizer/my-tournaments";
import TournamentManage from "./pages/auth/organizer/tournament-manage";
import BecomeOrganizer from "./pages/auth/player/become-organizer";
import TournamentDetail from "./pages/auth/player/tournament-detail";

// Admin

/** Public layout — Navbar + Footer */
const PublicLayout = () => {
  const location = useLocation();

  return (
    <div className="min-h-dvh flex flex-col bg-transparent text-slate-100">
      <Navbar />
      <main className="flex-1">
        <PageTransition key={location.pathname}>
          <Outlet />
        </PageTransition>
      </main>
      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <Routes>
      {/* Public pages with Navbar + Footer */}
      <Route element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route path="signup" element={<Register />} />
        <Route path="login" element={<Login />} />
        <Route path="forgot" element={<ForgotPassword />} />
        <Route path="verify-otp" element={<VerifyOtp />} />
        <Route path="payment/callback" element={<PaymentCallback />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Authenticated pages with Sidebar layout */}
      <Route path="auth" element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />

          {/* Player-only routes */}
          <Route element={<RoleRoute role="player" />}>
            <Route path="player/profile" element={<PlayerProfile />} />
            <Route path="player/join-tournament" element={<JoinTournament />} />
            <Route path="tournaments" element={<JoinTournament />} />
            <Route path="tournaments/:tournamentId" element={<TournamentDetail />} />
            <Route path="become-organizer" element={<BecomeOrganizer />} />
          </Route>

          {/* Organizer-only routes */}
          <Route element={<RoleRoute role="organizer" />}>
            <Route path="organizer/profile" element={<OrganizerProfile />} />
            <Route
              path="organizer/create-tournament"
              element={<CreateTournament />}
            />
            <Route
              path="organizer/tournaments/:tournamentId/edit"
              element={<CreateTournament />}
            />
            <Route path="organizer/tournaments" element={<MyTournaments />} />
            <Route
              path="organizer/tournaments/:tournamentId"
              element={<TournamentManage />}
            />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
};

export default App;
