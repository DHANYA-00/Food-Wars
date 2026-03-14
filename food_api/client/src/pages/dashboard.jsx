// src/pages/dashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket.js";
import "../styles/theme.css";
import { getAvatarUrl, createFallbackAvatar } from "../utils/avatar.js";

function getOrCreatePlayerId() {
  let pid = localStorage.getItem("playerId");
  if (!pid) {
    pid = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    localStorage.setItem("playerId", pid);
  }
  return pid;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [totalRounds, setTotalRounds] = useState(3);
  const [timePerRound, setTimePerRound] = useState(20);

  const playerId = getOrCreatePlayerId();
  // generate a random avatar that changes every time (use random seed)
  const [randomSeed] = useState(() => Math.random().toString(36).substring(2, 15));
  const generatedAvatar = getAvatarUrl(randomSeed, 64);

  // Ensure socket is connected as soon as Dashboard mounts
  useEffect(() => {
    try { if (!socket.connected) socket.connect(); } catch {}
  }, []);

  // Helper: ensure socket connected before emitting
  const emitWhenConnected = (fn) => {
    if (socket.connected) return fn();
    try { socket.connect(); } catch {}
    const handler = () => { socket.off('connect', handler); fn(); };
    socket.on('connect', handler);
  };

  const handleCreateRoom = () => {
    if (!name) return alert("Enter your name");
    const generatedRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    sessionStorage.setItem("playerName", name);
    sessionStorage.setItem("roomMeta", JSON.stringify({ isHost: true, roomId: generatedRoomId, rounds: totalRounds, timePerRound }));
    sessionStorage.setItem("playerAvatar", generatedAvatar);

    emitWhenConnected(() => {
      console.log("🔗 emitting createRoom for", generatedRoomId);
      socket.emit("createRoom", { roomId: generatedRoomId, name, totalRounds, playerId, timePerRound, avatar: generatedAvatar }, (res) => {
        if (res.ok) {
          navigate(`/lobby/${generatedRoomId}`, { state: { name, roomId: generatedRoomId, rounds: totalRounds, timePerRound, isHost: true, avatar: generatedAvatar } });
        } else {
          alert(res.message || "Failed to create");
        }
      });
    });
  };

  const handleJoinRoom = () => {
    if (!name || !roomId) return alert("Enter name and room id");
    // normalize the id to match server casing
    const normalizedRoom = roomId.trim().toUpperCase();
    sessionStorage.setItem("playerName", name);
    sessionStorage.setItem("roomMeta", JSON.stringify({ isHost: false, roomId: normalizedRoom, rounds: totalRounds, timePerRound }));
    sessionStorage.setItem("playerAvatar", generatedAvatar);

    emitWhenConnected(() => {
      console.log("🔗 emitting joinRoom for", normalizedRoom);
      socket.emit("joinRoom", { roomId: normalizedRoom, name, playerId, avatar: generatedAvatar }, (res) => {
        if (res.ok) {
          navigate(`/lobby/${normalizedRoom}`, { state: { name, roomId: normalizedRoom, rounds: totalRounds, timePerRound, isHost: false, avatar: generatedAvatar } });
        } else {
          alert(res.message || "Failed to join");
        }
      });
    });
  };

  return (
    <div className="page dashboard">
      <div className={`card ${mode ? 'dashboard-form' : ''}`}>
        <h1 className="title" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
          <span className="brand-name">🍜 Food War</span>
          {/* <span aria-hidden></span> */}
        </h1>

        {!mode ? (
          <div className="choices">
            <button className="btn primary" onClick={() => setMode("create")}>Create Room</button>
            <button className="btn primary" onClick={() => setMode("join")}>Join Room</button>
          </div>
        ) : mode === "create" ? (
          <div className="form">
            <h2>Create</h2>
            <div className="avatar-wrap">
              <img
                src={generatedAvatar}
                onError={(e)=>{e.currentTarget.src = createFallbackAvatar(name||playerId,64)}}
                alt="avatar"
                className="avatar"
                style={{ width:64, height:64 }}
              />
            </div>
            <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            <input type="number" min={1} value={totalRounds} onChange={e => setTotalRounds(Number(e.target.value))} placeholder="Total rounds" />
            <input type="number" min={5} value={timePerRound} onChange={e => setTimePerRound(Number(e.target.value))} placeholder="Time per round (s)" />
            <div className="actions edge">
              <button className="btn primary" onClick={handleCreateRoom}>Create</button>
              <button className="btn secondary" onClick={() => setMode(null)}>Leave</button>
            </div>
          </div>
        ) : (
          <div className="form">
            <h2>Join</h2>
            <div className="avatar-wrap">
              <img
                src={generatedAvatar}
                onError={(e)=>{e.currentTarget.src = createFallbackAvatar(name||playerId,64)}}
                alt="avatar"
                className="avatar"
                style={{ width:64, height:64 }}
              />
            </div>
            <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            <input placeholder="Room ID" value={roomId} onChange={e => setRoomId(e.target.value)} />
            <div className="actions edge">
              <button className="btn primary" onClick={handleJoinRoom}>Join</button>
              <button className="btn secondary" onClick={() => setMode(null)}>Leave</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
