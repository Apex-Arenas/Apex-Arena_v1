import { Routes, Route, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
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
import DepositResult from "./pages/public/deposit-result";
import Support from "./pages/public/support";
import HelpCenter from "./pages/public/help-center";
import Rules from "./pages/public/rules";
import DisputeResolution from "./pages/public/dispute-resolution";
import ContactUs from "./pages/public/contact-us";
import About from "./pages/public/about";
import Careers from "./pages/public/careers";
import PrivacyPolicy from "./pages/public/privacy-policy";
import TermsOfService from "./pages/public/terms-of-service";
import PublicTournaments from "./pages/public/tournaments";
import PublicLeaderboard from "./pages/auth/LeaderboardPage";
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
import TransactionsPage from "./pages/auth/transactions";
import WalletPage from "./pages/auth/WalletPage";
import LeaderboardPage from "./pages/auth/LeaderboardPage";
import NotificationsPage from "./pages/auth/NotificationsPage";
import AnalyticsPage from "./pages/auth/organizer/AnalyticsPage";
import PayoutsPage from "./pages/auth/organizer/PayoutsPage";

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

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  return null;
};

const App = () => {
  return (
    <>
      <ScrollToTop />
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
        {/* Public pages with Navbar + Footer */}
        <Route element={<PublicLayout />}>
          <Route index element={<Landing />} />
          <Route path="support" element={<Support />} />
          <Route path="support/help-center" element={<HelpCenter />} />
          <Route path="support/rules" element={<Rules />} />
          <Route
            path="support/dispute-resolution"
            element={<DisputeResolution />}
          />
          <Route path="support/contact-us" element={<ContactUs />} />
          <Route path="about" element={<About />} />
          <Route path="careers" element={<Careers />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="terms-of-service" element={<TermsOfService />} />
          <Route path="signup" element={<Register />} />
          <Route path="login" element={<Login />} />
          <Route path="forgot" element={<ForgotPassword />} />
          <Route path="verify-otp" element={<VerifyOtp />} />
          <Route path="payment/callback" element={<PaymentCallback />} />
          <Route path="deposit/success" element={<DepositResult />} />
          <Route path="deposit/failed" element={<DepositResult />} />
          <Route path="deposit/pending" element={<DepositResult />} />
          <Route path="tournaments" element={<PublicTournaments />} />
          <Route path="leaderboard" element={<PublicLeaderboard />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Authenticated pages with Sidebar layout */}
        <Route path="auth" element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="notifications" element={<NotificationsPage />} />

            <Route path="contact-us" element={<ContactUs />} />

            {/* Player-only routes */}
            <Route element={<RoleRoute role="player" />}>
              <Route path="player/profile" element={<PlayerProfile />} />
              <Route path="become-organizer" element={<BecomeOrganizer />} />
            </Route>

            {/* Player + Organizer routes */}
            <Route element={<RoleRoute role={["player", "organizer"]} />}>
              <Route
                path="player/join-tournament"
                element={<JoinTournament />}
              />
              <Route path="tournaments" element={<JoinTournament />} />
              <Route
                path="tournaments/:tournamentId"
                element={<TournamentDetail />}
              />
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
              <Route path="organizer/analytics" element={<AnalyticsPage />} />
              <Route path="organizer/payouts" element={<PayoutsPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </>
  );
};

export default App;
