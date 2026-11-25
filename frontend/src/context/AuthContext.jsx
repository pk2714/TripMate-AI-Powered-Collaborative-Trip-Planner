import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";
import { clearUserCaches } from "../pwa/pwa.js";
import { clearOfflineData } from "../utils/db";
import { cachedGet, isNetworkError } from "../utils/offline.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, check if a session cookie already logs us in. When
  // offline, fall back to the user saved on this device (up to 24h old) so
  // saved trips stay accessible instead of bouncing to the login page.
  useEffect(() => {
    cachedGet("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password });
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      if (!isNetworkError(err)) throw err; // offline: still clear local data below
    }
    // Don't leave this user's trips, chat or queued actions on a shared device.
    window.dispatchEvent(new Event("tripmate:logout"));
    await Promise.all([clearUserCaches(), clearOfflineData().catch(() => {})]);
    localStorage.removeItem("tripmate-last-sync");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
