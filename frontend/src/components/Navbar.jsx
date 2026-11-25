import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useInstallPrompt } from "../pwa/pwa.js";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { canInstall, promptInstall } = useInstallPrompt();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 shadow-sm">
      <Link to="/" className="text-xl font-bold text-brand-600">
        TripMate
      </Link>

      <div className="flex items-center gap-4">
        {canInstall && (
          <button
            onClick={promptInstall}
            className="px-3 py-1.5 rounded-md border border-brand-600 text-brand-600 hover:bg-brand-50 dark:hover:bg-gray-700 text-sm font-medium"
            title="Install TripMate as an app"
          >
            📲 Install App
          </button>
        )}
        {user ? (
          <>
            <Link to="/dashboard" className="hover:text-brand-600">
              Dashboard
            </Link>
            <Link to="/trips/new" className="hover:text-brand-600">
              Plan a Trip
            </Link>
            <Link to="/emergency" className="hover:text-brand-600">
             Emergency
            </Link> 
            <Link to="/profile" className="hover:text-brand-600">
              {user.name}
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:text-brand-600">
              Log in
            </Link>
            <Link
              to="/register"
              className="px-3 py-1.5 rounded-md bg-brand-600 text-white hover:bg-brand-700"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
