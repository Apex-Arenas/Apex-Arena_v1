import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import { Menu, X, LogIn, User } from "lucide-react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
        
            <span className="font-bold text-xl bg-linear-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              APEX ARENAS
            </span>
          </Link>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`
              }
            >
              <LogIn size={18} />
              <span>Login</span>
            </NavLink>

            <NavLink
              to="/signup"
              className={({ isActive }) =>
                `flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "bg-linear-to-r from-blue-600 to-blue-400 text-white hover:shadow-md hover:shadow-blue-500/20"
                }`
              }
            >
              <User size={18} />
              <span>Sign Up</span>
            </NavLink>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t py-4">
            <div className="flex flex-col space-y-3">
              <NavLink
                to="/login"
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg ${
                    isActive
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`
                }
              >
                <LogIn size={20} />
                <span>Login</span>
              </NavLink>

              <NavLink
                to="/signup"
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg font-medium ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "bg-linear-to-r from-blue-600 to-blue-400 text-white"
                  }`
                }
              >
                <User size={20} />
                <span>Sign Up</span>
              </NavLink>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
