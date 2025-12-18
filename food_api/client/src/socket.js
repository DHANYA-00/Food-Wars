// src/socket.js
import { io } from "socket.io-client";

export const socket = io("https://food-wars-7.onrender.com", {
  autoConnect: false,
  transports: ["websocket"],
});
