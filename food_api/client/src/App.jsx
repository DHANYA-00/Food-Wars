// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/dashboard.jsx";
import Lobby from "./pages/lobby.jsx";
import Game from "./pages/game.jsx";
import Scoreboard from "./pages/scoreboard.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/lobby/:roomId" element={<Lobby />} />
      <Route path="/game/:roomId" element={<Game />} />
      <Route path="/scoreboard" element={<Scoreboard />} />
    </Routes>
  );
}
