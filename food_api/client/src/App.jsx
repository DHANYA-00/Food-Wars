// src/App.jsx
import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/dashboard.jsx";
import Lobby from "./pages/lobby.jsx";
import Game from "./pages/game.jsx";
import Scoreboard from "./pages/scoreboard.jsx";

export default function App() {
  useEffect(() => {
    try {
      // cleanup any legacy theme classes
      document.body.classList.remove("theme-gothic");
      document.body.classList.add("theme-minimal");
    } catch {}
  }, []);
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/lobby/:roomId" element={<Lobby />} />
      <Route path="/game/:roomId" element={<Game />} />
      <Route path="/scoreboard" element={<Scoreboard />} />
    </Routes>
  );
}
