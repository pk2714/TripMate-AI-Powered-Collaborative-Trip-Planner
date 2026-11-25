// Socket.IO server URL. In dev, Vite's proxy only covers HTTP requests, so
// Socket.IO connects straight to the backend origin. In production the
// frontend is served by Express from the same origin.
export const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, "")
  : import.meta.env.DEV
    ? "http://localhost:5000"
    : window.location.origin;
