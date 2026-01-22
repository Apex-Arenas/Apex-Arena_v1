import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-blue-600 to-blue-400 w-8 h-8 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl">APEX ARENAS</span>
          </Link>

          <nav className="flex items-center gap-4 text-sm text-blue-100">
            <Link to="/tournaments" className="hover:text-white">
              Tournaments
            </Link>
            <Link to="/signup" className="hover:text-white">
              Sign Up
            </Link>
            <Link to="/login" className="hover:text-white">
              Login
            </Link>
          </nav>

          <div className="text-gray-400 text-center md:text-right">
            <p>Ghana's trusted esports tournament platform</p>
            <p className="text-xs">© 2025 APEX ARENAS. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
