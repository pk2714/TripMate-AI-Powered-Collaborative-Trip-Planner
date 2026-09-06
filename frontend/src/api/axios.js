import axios from "axios";

// In dev, Vite proxies "/api" to the backend (see vite.config.js), so a
// relative baseURL works and cookies are sent same-origin automatically.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true, // required so the session cookie is sent with every request
});

export default api;
