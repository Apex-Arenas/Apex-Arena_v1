import { Routes, Route, Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CreateTournament from "./pages/auth/organizer/create-tournament";
import JoinTournament from "./pages/auth/player/join-tournament";
import Landing from "./pages/public/landing";
import Profile from "./pages/public/profile";
import NotFound from "./pages/public/not-found";
import ForgotPassword from "./pages/public/forgot";
import Register from "./pages/public/register";
import Login from "./pages/public/login";
import Dashboard from "./pages/auth/Dashboard";

const Layout = () => (
  <div className="min-h-dvh flex flex-col bg-transparent text-slate-100">
    <Navbar />
    <main className="flex-1">
      <Outlet />
    </main>
    <Footer />
  </div>
);

const App = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="signup" element={<Register />} />
        <Route path="login" element={<Login />} />
        <Route path="forgot" element={<ForgotPassword />} />

        <Route path="auth">
          <Route index element={<Dashboard />} />
          <Route path="organizer">
            <Route path="profile" element={<Profile />} />
            <Route path="create-tournament" element={<CreateTournament />} />
          </Route>

          <Route path="player">
            <Route path="profile" element={<Profile />} />
            <Route path="join-tournament" element={<JoinTournament />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;
