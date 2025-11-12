import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import "../styles/game.css";

export default function Game() {
  const location = useLocation();
  const navigate = useNavigate();

  const { roomId, name, totalRounds, round: initialRound, dish: initialDish, isHost } =
    location.state || {};

  const [dish, setDish] = useState(initialDish);
  const [round, setRound] = useState(initialRound || 1);
  const [message, setMessage] = useState(""); // chat input
  const [chat, setChat] = useState([]);
  const [feedback, setFeedback] = useState(null); // { text, type: "correct"|"wrong" }
  const [players, setPlayers] = useState([]);
  const chatEndRef = useRef();

  // Scroll chat to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [chat]);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    // Ingredient feedback from server
    socket.on("ingredientResult", (data) => {
      const { ingredient, playerId, correct, points, players: updatedPlayers } = data;

      const playerName = updatedPlayers.find((p) => p.id === playerId)?.name || "Unknown";

      setChat((prev) => [
        ...prev,
        { text: `${playerName}: ${ingredient}`, correct },
      ]);

      setFeedback({
        text: correct ? `✅ Correct! +${points} points` : "❌ Wrong!",
        type: correct ? "correct" : "wrong",
      });

      setPlayers(updatedPlayers);

      // Clear feedback after 2s
      setTimeout(() => setFeedback(null), 2000);
    });

    // New round/dish
    socket.on("gameStarted", ({ dish: newDish, round: newRound, totalRounds: maxRounds }) => {
      setDish(newDish);
      setRound(newRound);
      setChat([]);
      setFeedback(null);
    });

    // Game over
    socket.on("gameOver", ({ players: finalPlayers }) => {
      navigate("/scoreboard", { state: { players: finalPlayers } });
    });

    return () => {
      socket.off("ingredientResult");
      socket.off("gameStarted");
      socket.off("gameOver");
    };
  }, [navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const timeTaken = Math.floor(Math.random() * 10) + 1; // Replace with real timer logic
    socket.emit("submitIngredient", { roomId, playerId: socket.id, ingredient: message, timeTaken });

    setMessage("");
  };

  const nextRound = () => {
    if (!isHost) return;
    socket.emit("startGame", { roomId });
  };

  return (
    <div className="game-container">
      <div className="dish-section">
        <h2>Round {round} / {totalRounds}</h2>
        {dish && (
          <>
            <h3>{dish.name}</h3>
            <img src={dish.imageUrl} alt={dish.name} className="dish-image" />
          </>
        )}
      </div>

      <div className="chat-section">
        {feedback && (
          <div className={`feedback ${feedback.type}`}>
            {feedback.text}
          </div>
        )}
        <div className="chat-box">
          {chat.map((c, i) => (
            <div key={i} className={`chat-message ${c.correct ? "correct" : "wrong"}`}>
              {c.text}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="chat-form">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type an ingredient..."
          />
          <button type="submit">Submit</button>
        </form>

        {isHost && round < totalRounds && (
          <button className="next-round-btn" onClick={nextRound}>
            Next Round ⏭️
          </button>
        )}
      </div>
    </div>
  );
}
