import { Routes, Route, Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Register from "./pages/public/register";
import AdminDashboard from "./pages/auth/admin/dashboard";
import AdminUsers from "./pages/auth/admin/users";
import OrganizerProfile from "./pages/auth/organizer/profile";
import CreateTournament from "./pages/auth/organizer/create-tournament";
import PlayerProfile from "./pages/auth/player/profile";
import JoinTournament from "./pages/auth/player/join-tournament";
import Landing from "./pages/public/landing";
import Login from "./pages/public/Login";

const Layout = () => (
  <div className="min-h-dvh flex flex-col bg-white text-gray-800">
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
        <Route path="register" element={<Register />} />
        <Route path="login" element={<Login />} />

        <Route path="auth">
          <Route path="admin">
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>

          <Route path="organizer">
            <Route path="profile" element={<OrganizerProfile />} />
            <Route path="create-tournament" element={<CreateTournament />} />
          </Route>

          <Route path="player">
            <Route path="profile" element={<PlayerProfile />} />
            <Route path="join-tournament" element={<JoinTournament />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
};

export default App;
