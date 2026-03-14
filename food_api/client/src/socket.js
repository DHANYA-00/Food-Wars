// src/socket.js
import { io } from "socket.io-client";

// allow overriding the server URL via an environment variable.
// For local dev, default to localhost:5000; for production, you should set VITE_BACKEND_URL
// to your deployed backend URL (e.g. https://<your-backend>.onrender.com).
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
  || (import.meta.env.MODE === 'development' ? 'http://localhost:5000' : window.location.origin);

if (!import.meta.env.VITE_BACKEND_URL && import.meta.env.MODE !== 'development') {
  console.warn(
    '[socket] WARNING: VITE_BACKEND_URL is not configured. Using window.location.origin. ' +
    'If deployed frontend cannot reach backend, set VITE_BACKEND_URL to your backend URL.'
  );
}

export const socket = io(BACKEND_URL, {
  autoConnect: false,
  transports: ["websocket"],
});

socket.on('connect_error', (err) => {
  console.error('[socket] connect_error:', err.message || err);
});
socket.on('connect', () => {
  console.info('[socket] connected to', BACKEND_URL);
});
socket.on('disconnect', (reason) => {
  console.info('[socket] disconnected:', reason);
});
