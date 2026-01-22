import { Link, NavLink } from "react-router-dom";

const Navbar = () => {
  return (
    <header className="border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold text-lg">
          Apex Arena
        </Link>
        <nav className="flex items-center gap-4">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `hover:underline ${isActive ? "text-blue-600" : ""}`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/signup"
            className={({ isActive }) =>
              `hover:underline ${isActive ? "text-blue-600" : ""}`
            }
          >
            Sign Up
          </NavLink>
          {/* Placeholder for future routes */}
          {/* <NavLink to="/about" className={({ isActive }) => `hover:underline ${isActive ? 'text-blue-600' : ''}`}>About</NavLink> */}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
