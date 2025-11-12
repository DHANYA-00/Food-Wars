import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { socket } from "../socket";

export default function Lobby() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams();
  const { name, isHost } = location.state || {};
  const [room, setRoom] = useState(null);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.on("roomUpdated", setRoom);

    socket.on("gameStarted", ({ dish, round, totalRounds }) => {
      navigate(`/game/${roomId}`, { state: { dish, round, totalRounds, name, roomId } });
    });

    return () => {
      socket.off("roomUpdated");
      socket.off("gameStarted");
    };
  }, [roomId, navigate, name]);

  const handleStart = () => socket.emit("startGame", { roomId });

  if (!room) return <p>Loading room...</p>;

  return (
    <div>
      <h2>Room: {roomId}</h2>
      <ul>{room.players.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
      {isHost ? <button onClick={handleStart}>Start Game</button> : <p>Waiting for host...</p>}
    </div>
  );
}
