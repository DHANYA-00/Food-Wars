// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/dashboard";
import Lobby from "./pages/lobby";
import Game from "./pages/game"; // ✅ make sure this file exists
import Scoreboard from "./pages/scoreboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/lobby/:roomId" element={<Lobby />} />
      <Route path="/game/:roomId" element={<Game />} /> {/* ✅ new route */}
      <Route path="/scoreboard" element={<Scoreboard />} />

    </Routes>
  );
}

export default App;
