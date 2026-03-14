// src/socket.js
import { io } from "socket.io-client";

// allow overriding the server URL via an environment variable for local testing
// if no variable is provided and we're running under Vite dev server, fall back
// to the backend default (localhost:5000) so the client doesn't try to connect
// to the frontend dev server itself.
let BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin;
if (!import.meta.env.VITE_BACKEND_URL && import.meta.env.MODE === 'development') {
  // vite dev server default origin is something like http://localhost:5173
  // replace it with the typical backend port when working locally
  BACKEND_URL = 'http://localhost:5000';
}

export const socket = io(BACKEND_URL, {
  autoConnect: false,
  transports: ["websocket"],
});
