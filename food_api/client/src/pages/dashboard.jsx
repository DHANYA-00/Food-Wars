import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";

export default function Dashboard() {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [rounds, setRounds] = useState(3);
  const navigate = useNavigate();

  const ensureConnected = () => {
    if (!socket.connected) socket.connect();
  };

  const createRoom = () => {
    if (!name || !roomId) return alert("Enter name & room ID");
    ensureConnected();
    socket.emit(
      "createRoom",
      { roomId: roomId.trim(), name: name.trim(), totalRounds: rounds },
      (res) => {
        if (res.ok) navigate(`/lobby/${roomId}`, { state: { name, isHost: true } });
        else alert(res.message);
      }
    );
  };

  const joinRoom = () => {
    if (!name || !roomId) return alert("Enter name & room ID");
    ensureConnected();
    socket.emit("joinRoom", { roomId: roomId.trim(), name: name.trim() }, (res) => {
      if (res.ok) navigate(`/lobby/${roomId}`, { state: { name, isHost: false } });
      else alert(res.message);
    });
  };

  return (
    <div>
      <h1>Food War</h1>
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input placeholder="Room ID" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
      <input type="number" min={1} max={5} value={rounds} onChange={(e) => setRounds(e.target.value)} />
      <button onClick={createRoom}>Create Room</button>
      <button onClick={joinRoom}>Join Room</button>
    </div>
  );
}
