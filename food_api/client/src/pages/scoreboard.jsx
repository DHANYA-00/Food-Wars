import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/scoreboard.css"; // create this file

export default function Scoreboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const players = (location.state && location.state.players) || [];

  // Sort players by score descending
  const sorted = players.slice().sort((a, b) => b.score - a.score);

  return (
    <div className="scoreboard-container">
      <h1>🏆 Final Scores</h1>

      <div className="score-list">
        {sorted.map((p, i) => (
          <div
            key={p.socketId || i}
            className={`score-card ${i === 0 ? "first-place" : ""}`}
          >
            <div className="rank">#{i + 1}</div>
            <div className="name">{p.name}</div>
            <div className="score">{p.score}</div>
          </div>
        ))}
      </div>

      <button className="back-btn" onClick={() => navigate("/")}>
        Back to Dashboard
      </button>
    </div>
  );
}
