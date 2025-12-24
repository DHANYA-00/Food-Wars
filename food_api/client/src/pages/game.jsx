    // network lifecycle
    const onConnect = () => setIsDisconnected(false);
    const onDisconnect = () => setIsDisconnected(true);
    const onConnectError = () => setIsDisconnected(true);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    try { socket.io.on?.('reconnect_attempt', () => setIsDisconnected(true)); } catch {}

// Hidden audio element for background music (expects /bg-music.mp3 in public)
// Note: render inside component tree so ref works
// This will be mounted in the top-level return above via a portal-like approach is not needed; include just below card.

import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { socket } from "../socket.js";
import "../styles/theme.css";
import "../styles/game.css";
import { getAvatarUrl, createFallbackAvatar } from "../utils/avatar.js";

export default function Game() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const playerId = localStorage.getItem("playerId");
  const name = location.state?.name || sessionStorage.getItem("playerName") || "Player";
  const [players, setPlayers] = useState([]);
  const [currentDish, setCurrentDish] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [remainingIngredients, setRemainingIngredients] = useState([]);
  const [foundByMe, setFoundByMe] = useState([]);
  const [foundByOthers, setFoundByOthers] = useState([]); // [{ ingredient, name }]
  const [round, setRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(3);
  const [timer, setTimer] = useState(0);
  const [timePerRound, setTimePerRound] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);

  const [guess, setGuess] = useState("");
  const [popups, setPopups] = useState([]);
  const [confetti, setConfetti] = useState([]);
  const [balloons, setBalloons] = useState([]);
  const lastPopupRef = useRef({ msg: '', ts: 0 });
  const lastMilestoneRef = useRef({ round: 0, count: 0 });
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const chatRef = useRef(null);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [hostPlayerId, setHostPlayerId] = useState(null);

  // ---- Score persistence helpers (per-room) ----
  const SCORE_KEY = `fw_scores_${roomId}`;
  const loadScoreCache = () => {
    try { return JSON.parse(localStorage.getItem(SCORE_KEY) || '{}') || {}; } catch { return {}; }
  };

  // Safe popup helper to avoid duplicates within a short window
  const pushPopup = (message, type = "success", duration = 2400, dedupeKey, options = {}) => {
    const now = Date.now();
    const last = lastPopupRef.current || {};
    const key = dedupeKey || `${type}::${message}`;
    if (!options.force && last.msg === key && now - (last.ts || 0) < 400) return; // shorter debounce to avoid hiding valid odd popups
    const id = now + Math.random();
    setPopups(p => [...p, { id, message, type }]);
    setTimeout(() => setPopups(p => p.filter(x => x.id !== id)), duration);
    lastPopupRef.current = { msg: key, ts: now };
  };

  // celebratory balloon rain for milestone guesses
  const spawnBalloons = () => {
    const colors = ["#60a5fa", "#f472b6", "#f59e0b", "#a78bfa", "#34d399", "#f87171"]; // blue, pink, orange, purple, green, red
    const items = new Array(16).fill(0).map(() => {
      const left = Math.random() * 100;
      const bg = colors[Math.floor(Math.random() * colors.length)];
      const dur = 2200 + Math.floor(Math.random() * 1400); // original slower rise
      const delay = Math.floor(Math.random() * 300); // original start delay
      const size = 10 + Math.floor(Math.random() * 10);
      return { id: Math.random().toString(36).slice(2), left, bg, dur, delay, size };
    });
    setBalloons(items);
    setTimeout(() => setBalloons([]), 3000);
  };

  // ---- Found-by-me persistence (per-room, per-round) ----
  const FOUND_KEY = `fw_found_${roomId}`;
  const loadFoundCache = () => {
    try { return JSON.parse(localStorage.getItem(FOUND_KEY) || '{}') || {}; } catch { return {}; }
  };
  const getFoundForRound = (r) => {
    const cache = loadFoundCache();
    const arr = Array.isArray(cache?.[r]) ? cache[r] : [];
    return Array.from(new Set(arr.map(x => String(x))));
  };
  const saveFoundForRound = (r, list = []) => {
    const cache = loadFoundCache();
    cache[r] = Array.from(new Set((list || []).map(x => String(x))));
    try { localStorage.setItem(FOUND_KEY, JSON.stringify(cache)); } catch {}
  };
  const saveScoreCache = (playersList = []) => {
    const cache = loadScoreCache();
    (playersList || []).forEach(p => {
      if (!p || !p.playerId) return;
      cache[p.playerId] = typeof p.score === 'number' ? p.score : (cache[p.playerId] || 0);
    });
    try { localStorage.setItem(SCORE_KEY, JSON.stringify(cache)); } catch {}
  };
  const mergeScoresFromCache = (playersList = []) => {
    const cache = loadScoreCache();
    return (playersList || []).map(p => {
      if (!p || !p.playerId) return p;
      const cached = cache[p.playerId];
      if (typeof cached === 'number' && cached > (p.score ?? 0)) {
        return { ...p, score: cached };
      }
      return p;
    });
  };

  // create confetti pieces for a short celebration animation
  const spawnConfetti = () => {
    const colors = ["#ff6b6b", "#ffd166", "#6bffb3", "#6bc1ff", "#c36bff"];
    const pieces = new Array(28).fill(0).map(() => {
      const left = Math.random() * 100;
      const bg = colors[Math.floor(Math.random() * colors.length)];
      const rot = Math.floor(Math.random() * 360);
      const dur = 1600 + Math.floor(Math.random() * 1200);
      const delay = Math.floor(Math.random() * 200);
      return { id: Math.random().toString(36).slice(2), left, bg, rot, dur, delay };
    });
    setConfetti(pieces);
    // clear after animation
    setTimeout(() => setConfetti([]), 2200);
  };

  

  // If navigated from Lobby with initial game payload, apply it immediately
  useEffect(() => {
    const init = location.state?.initialDish;
    if (init) {
      // `initialDish` from lobby: { dish, ingredients, round }
      const dishPayload = init.dish || init;
      setCurrentDish(dishPayload || null);
      setIngredients(init.ingredients || []);
      setRound(init.round || 1);
      setTotalRounds((prev) => (location.state?.totalRounds ?? prev));
      // apply timePerRound if navigation provided it so timer starts correctly
      if (typeof location.state?.timePerRound !== 'undefined') {
        setTimePerRound(Number(location.state.timePerRound) || 0);
        setTimer(Number(location.state.timePerRound) || 0);
      }
      setShowIngredients(false);
    }
    // only run on first mount or when location.state changes
  }, [location.state]);

  // ===== CONNECT + LISTEN =====
  useEffect(() => {
    // prevent the whole page from scrolling while Game is mounted
    try { document.body.classList.add('game-page'); } catch {}

    if (!socket.connected) socket.connect();

    // join the room (server expects { roomId, name, playerId })
    socket.emit("joinRoom", { roomId, name, playerId });

    // ask server for current room state (helps when joining mid-round)
    socket.emit("requestRoomState", { roomId }, (res) => {
      if (!res?.ok) console.debug("requestRoomState ack:", res);
    });

    // MAIN GAME STATE UPDATE (some events come from server under different names)
    socket.on("gameState", (data) => {
      const merged = mergeScoresFromCache(data.players || []);
      setPlayers(merged);
      setCurrentDish(data.dish || null);
      setIngredients(data.ingredients || []);
      setRemainingIngredients(data.ingredients || []);
      // reset per-round found lists
      const r = data.round || 1;
      setFoundByMe(getFoundForRound(r));
      setFoundByOthers([]);
      setShowIngredients(data.showIngredients || false);
      setRound(r);
      setTotalRounds(data.totalRounds || 3);
      // apply timePerRound and timer if provided
      setTimePerRound(data.timePerRound ?? 0);
      setTimer((data.timer ?? data.timePerRound) ?? 0);
    });

    // server emits when a round starts
    socket.on("gameStarted", (data) => {
      console.log("[game] gameStarted payload:", data);
      const merged = mergeScoresFromCache(data.players || []);
      setPlayers(merged);
      setCurrentDish(data.dish || null);
      setIngredients(data.ingredients || []);
      setRemainingIngredients(data.ingredients || []);
      // reset found lists at start
      const r = data.round || 1;
      setFoundByMe(getFoundForRound(r));
      setFoundByOthers([]);
      setRound(r);
      setTotalRounds(data.totalRounds || 3);
      setTimePerRound(data.timePerRound ?? data.timePerRound ?? 0);
      // ensure timer resets if provided (fallback to timePerRound)
      setTimer((data.timer ?? data.timePerRound) ?? 0);
      setShowIngredients(false);
    });

    // room/player updates
    socket.on("roomUpdate", ({ players: pList, hostPlayerId: hid }) => {
      const merged = mergeScoresFromCache(pList || []);
      setPlayers(merged);
      if (hid) setHostPlayerId(hid);
    });

    // timer ticking from server
    socket.on("timerUpdate", ({ timer: t }) => {
      setTimer(Number(t) || 0);
    });

    // when server reveals ingredients / round ends
    socket.on("roundOver", ({ round: r, players: pList, remaining }) => {
      if (Array.isArray(pList)) saveScoreCache(pList);
      setPlayers(mergeScoresFromCache(pList || []));
      setShowIngredients(true);
      setRemainingIngredients(Array.isArray(remaining) ? remaining : []);
      if (r) setRound(r);
      setTimer(0);
    });

    socket.on("showIngredients", ({ ingredients: rem = [] } = {}) => {
      setShowIngredients(true);
      if (Array.isArray(rem)) setRemainingIngredients(rem);
      setTimer(0);
    });


    // chat messages from server — avoid duplicates (optimistic + broadcast)
    socket.on("chatMessage", (msg) => {
      setMessages((prev) => {
        if (!msg) return prev;
        const exists = prev.some(x => x.ts === msg.ts && x.playerId === msg.playerId);
        if (exists) return prev;
        return [...prev, msg];
      });
    });

    // keep listener cleanup in same effect

    socket.on("ingredientResult", (res) => {
      // payload: { ingredient, playerId: pid, correct, points, players }
      const { ingredient, playerId: pid, correct, points, players: updated } = res || {};
      // persist latest scores from server
      if (Array.isArray(updated)) saveScoreCache(updated);
      const mergedPlayers = mergeScoresFromCache(updated || []);
      setPlayers(mergedPlayers);

      if (!correct) return;

      const clean = String(ingredient || "").trim().toLowerCase();

      // remove from remaining
      setRemainingIngredients(prev => prev.filter(i => i !== clean));

      const player = (updated || []).find(p => p.playerId === pid) || {};

      if (pid === playerId) {
        // This client guessed correctly — show either a milestone praise OR the standard message (not both)
        let shouldConfetti = false;
        setFoundByMe(prev => {
          const next = Array.from(new Set([...(prev || []), clean]));
          saveFoundForRound(round || 1, next);
          const count = next.length;
          const isMilestone = count >= 2 && count % 2 === 0;
          
          // avoid duplicate popups (e.g., double event/StrictMode)
          const rNow = round || 1;
          const dedupeKey = `${pid}:${clean}:${rNow}:${count}`;
          
          if (isMilestone) {
            // avoid duplicate milestone popups
            if (lastMilestoneRef.current.round === rNow && lastMilestoneRef.current.count === count) {
              return next; // already handled this exact milestone
            }
            lastMilestoneRef.current = { round: rNow, count };
            const praises = ["Nice!", "Excellent!", "Amazing!", "Outstanding!", "Superb!", "Fantastic!"];
            const msg = praises[Math.floor(Math.random() * praises.length)];
            pushPopup(msg, "success", 2200, `milestone:${dedupeKey}`);
            spawnBalloons(); // milestone: only balloons + praise (no paper popup, no confetti)
          } else {
            pushPopup(`You found "${ingredient}" +${points}`, "success", 2500, `found:${dedupeKey}`, { force: true });
            shouldConfetti = true; // non-milestone: keep confetti with the standard popup
          }
          return next;
        });
        if (shouldConfetti) {
          spawnConfetti();
        }
        // celebration: no sound (was removed)
      } else {
        // Another player found it — show a short notice to others and mark it
        setFoundByOthers(prev => Array.from(new Set([...prev, JSON.stringify({ ingredient: clean, name: player.name || 'Someone' })])));
        
        // avoid duplicate "found by others" popups
        const dedupeKey = `${playerId}:${clean}:${round || 1}`;
        pushPopup(`${player.name || 'Someone'} found "${ingredient}" +${points}`, "notice", 1400, `other:${dedupeKey}`);
        // notice: no sound (was removed)
      }
    });



    socket.on("gameOver", ({ players }) => {
      navigate("/scoreboard", { state: { players } });
    });

    return () => {
      socket.off("gameState");
      socket.off("ingredientResult");
      socket.off("timerUpdate");
      socket.off("roundOver");
      socket.off("gameOver");
      socket.off("gameStarted");
      socket.off("roomUpdate");
      socket.off("chatMessage");
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      try { document.body.classList.remove('game-page'); } catch {}
    };
  }, [roomId, navigate, playerId, name]);


  // ===== SUBMIT =====
  const submit = () => {
    if (!guess.trim() || timer === 0) return;
    socket.emit("submitIngredient", { roomId, playerId, ingredient: guess.trim() });
    setGuess("");
  };

  const isHost = hostPlayerId ? (hostPlayerId === playerId) : (players.length > 0 && players[0].playerId === playerId);

  const nextRound = () => {
    // server uses `startGame` to advance/start rounds
    socket.emit("startGame", { roomId, playerId }, (res) => {
      if (!res?.ok) console.warn("startGame ack fail", res);
    });
    setShowIngredients(false);
  };

  const waitingForHost = round === 0 || !currentDish;

  // Reorder players: show me first, then others (stable)
  const displayPlayers = React.useMemo(() => {
    const arr = Array.isArray(players) ? [...players] : [];
    const me = arr.filter(p => p && p.playerId === playerId);
    const others = arr.filter(p => p && p.playerId !== playerId);
    return [...me, ...others];
  }, [players, playerId]);

  // Distinct colors for other players' chat bubbles (your messages remain green)
  const senderPalette = React.useRef([
    // Blue
    { bg: '#e0f2fe', text: '#075985', border: '#93c5fd' },
    // Pink
    { bg: '#fce7f3', text: '#831843', border: '#f9a8d4' },
    // Orange
    { bg: '#fff7ed', text: '#7c2d12', border: '#fed7aa' },
    // Grey
    { bg: '#f1f5f9', text: '#0f172a', border: '#e2e8f0' },
    // Yellow
    { bg: '#fef9c3', text: '#713f12', border: '#fde68a' },
    // Purple
    { bg: '#ede9fe', text: '#4c1d95', border: '#c4b5fd' },
  ]);
  const colorForSender = (pid) => {
    if (!pid || pid === playerId) return null;
    let h = 0;
    for (let i = 0; i < pid.length; i++) h = (h * 31 + pid.charCodeAt(i)) >>> 0;
    const idx = h % senderPalette.current.length;
    return senderPalette.current[idx];
  };

  const sendChat = () => {
    const text = String(chatInput || "").trim();
    if (!text) return;
    const msg = { roomId, playerId, name, text, ts: Date.now() };
    // optimistic add
    setMessages(m => [...m, msg]);
    setChatInput("");
    try { socket.emit("sendMessage", msg); } catch (e) { /* ignore */ }
  };

  // auto-scroll chat to bottom when messages change
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    // allow the DOM to update then scroll
    requestAnimationFrame(() => {
      try { el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); } catch { el.scrollTop = el.scrollHeight; }
    });
  }, [messages]);

  return (
    <div className="page game">
      {isDisconnected && (
        <div className="net-overlay" role="status" aria-live="polite">
          <div className="net-loader" />
          <div className="net-text">Reconnecting…</div>
          <div className="net-actions">
            <button className="btn primary" onClick={() => { try { socket.connect(); } catch {} }}>Try Reconnect</button>
            <button className="btn secondary" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      )}
      <div className="popups-root">
        {popups.map(p => (
          <div key={p.id} className={`message-popup ${p.type || ''}`}>
            {p.message}
          </div>
        ))}
      </div>
      <div className="confetti-root" aria-hidden>
        {confetti.map(c => (
          <div
            key={c.id}
            className="confetti-piece"
            style={{ left: `${c.left}%`, background: c.bg, transform: `rotate(${c.rot}deg)`, animationDuration: `${c.dur}ms`, animationDelay: `${c.delay}ms` }}
          />
        ))}
      </div>
        
        <div className="card">
        {/* balloons overlay within game card space */}
        <div className="balloons-root" aria-hidden>
          {balloons.map(b => (
            <div
              key={b.id}
              className="balloon"
              style={{ left: `${b.left}%`, background: b.bg, width: b.size + 8, height: b.size + 12, animationDuration: `${b.dur}ms`, animationDelay: `${b.delay}ms` }}
            />
          ))}
        </div>
        
        {/* HEADER */}
        <div className="game-head">
          <div className="dish-title" style={{ fontWeight: 'bold', fontSize: '20px' }}>
            {waitingForHost ? "Waiting for host to start..." : currentDish?.name}
          </div>

          <div className="right-head">
            <div className="meta">
              <span className="rounds">Round {round > 0 ? round : 0}/{totalRounds}</span>
              <span className="timer"> • ⏱ {timer ?? 0}s{timePerRound ? ` / ${timePerRound}s` : ''}</span>
            </div>
          </div>
        </div>

        <div className="game-flex">
          {/* LEFT SIDE */}
          <div className="dish-area">
            {!currentDish ? (
              <div className="dish-placeholder">Loading image...</div>
            ) : (
              <>
                <img
                  src={currentDish.imageUrl || '/placeholder-dish.svg'}
                  alt={currentDish.name || 'Dish image'}
                  className="dish-img"
                />
              </>
            )}

            {showIngredients && (
              <div className="ingredients-box">
                {(foundByMe.length > 0 || foundByOthers.length > 0 || remainingIngredients.length > 0) ? (
                  <>
                    {foundByMe.length > 0 && (
                      <div className="ingredient-group">
                        <div className="group-title">You found</div>
                        {foundByMe.map((ing, i) => (
                          <span key={`me-${i}`} className="ingredient-chip found-me">{ing}</span>
                        ))}
                      </div>
                    )}

                    {foundByOthers.length > 0 && (
                      <div className="ingredient-group">
                        <div className="group-title">Found by others</div>
                        {foundByOthers.map((s, i) => {
                          let o = { ingredient: s, name: 'Someone' };
                          try { o = JSON.parse(s); } catch { o = { ingredient: s, name: 'Someone' }; }
                          return (
                            <span key={`other-${i}`} className="ingredient-chip found-other">{o.ingredient} <small className="by-who">({o.name})</small></span>
                          );
                        })}
                      </div>
                    )}

                    {remainingIngredients.length > 0 && (
                      <div className="ingredient-group">
                        <div className="group-title">Remaining</div>
                        {remainingIngredients.map((ing, i) => (
                          <span key={`rem-${i}`} className="ingredient-chip remaining">{ing}</span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {ingredients.map((ing, i) => (
                      <span key={i} className="ingredient-chip">{ing}</span>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* RIGHT SIDE */}
          <div className="play-area" style={{ minHeight: 0 }}>
            
            {/* Player List */}
            <div className="players-box" style={{ flex: 'none' }}>
              <h4>Players</h4>
              <ul>
                {displayPlayers.map((p, i) => (
                  <li key={p.playerId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img src={p.avatar || getAvatarUrl(p.playerId || p.name,48)} onError={(e)=>{e.currentTarget.src = createFallbackAvatar(p.name,48);}} alt={p.name} className="avatar" />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%' }}>
                      <span>{p.name} {p.playerId === playerId ? " (You)" : ""} {p.playerId === hostPlayerId ? " ⭐ Host" : ""}</span>
                      <strong style={{ fontSize: 13 }}>{p.score}</strong>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Chat */}
            <div className="chat-box" style={{ display: 'flex', flexDirection: 'column', flex: 'none' }}>
              <h4>Chat</h4>
              <div className="chat-messages" ref={chatRef} style={{ maxHeight: 260, overflow: 'auto' }}>
                {messages.map((m, i) => {
                  if (m.playerId === playerId) {
                    const meStyle = { background: 'linear-gradient(90deg,#d1fae5,#86efac)', color: '#065f46', borderColor: '#a7f3d0' };
                    return (
                      <div key={`${m.playerId || 'p'}-${m.ts}-${i}`} className="chat-message me" style={meStyle}>
                        <div className="chat-meta"><strong>You</strong> <small className="ts">{new Date(m.ts).toLocaleTimeString()}</small></div>
                        <div className="chat-text">{m.text}</div>
                      </div>
                    );
                  }
                  const color = colorForSender(m.playerId);
                  const style = color ? { background: color.bg, color: color.text, borderColor: color.border } : undefined;
                  return (
                    <div key={`${m.playerId || 'p'}-${m.ts}-${i}`} className="chat-message other" style={style}>
                      <div className="chat-meta"><strong>{m.name || 'Someone'}</strong> <small className="ts">{new Date(m.ts).toLocaleTimeString()}</small></div>
                      <div className="chat-text">{m.text}</div>
                    </div>
                  );
                })}
              </div>
              <div className="chat-input-row">
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Say something..." onKeyDown={(e)=>{ if(e.key==='Enter') sendChat(); }} />
                <button className="btn primary" onClick={sendChat} disabled={!chatInput.trim()}>Send</button>
              </div>
            </div>

            {/* Guess */}
            <div className="guess-box" style={{ flex: 'none', paddingTop: 8 }}>
              <input
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Type ingredient..."
                disabled={waitingForHost}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
              <button className="btn primary" onClick={submit} disabled={timer === 0}>
                Submit
              </button>
            </div>

            {/* Host Button */}
            {isHost && (showIngredients || (Number(timer) === 0)) && (
              <button className="btn primary next-round" onClick={nextRound}>
                ➤ Next Round
              </button>
            )}

          </div>
        </div>
      </div>
    </div>
  );

  
}

