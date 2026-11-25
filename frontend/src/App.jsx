import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ChatBot from "./components/ChatBot.jsx";
import PwaManager from "./components/PwaManager.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { ChatBotProvider } from "./context/ChatBotContext.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CreateTrip from "./pages/CreateTrip.jsx";
import TripDetails from "./pages/TripDetails.jsx";
import Profile from "./pages/Profile.jsx";
import Emergency from "./pages/Emergency";

export default function App() {
  const { user } = useAuth();

  return (
    <ChatBotProvider>
    <div className="min-h-screen">
      <PwaManager />
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/trips/:id" element={<TripDetails />} />
        <Route path="/emergency" element={<Emergency />} />
        <Route
          path="/trips/new"
          element={
            <ProtectedRoute>
              <CreateTrip />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>
      {/* AI assistant needs a session (the /api/ai/chat route requires login). */}
      {user && <ChatBot key={user._id} />}
    </div>
    </ChatBotProvider>
  );
}
