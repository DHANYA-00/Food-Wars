const rooms = {};

module.exports = (io, socket) => {
  console.log("🎮 Socket connected:", socket.id);

  // CREATE ROOM
  socket.on("createRoom", ({ roomId, name, totalRounds }, callback) => {
    try {
      console.log("🟢 createRoom:", { roomId, name, totalRounds });

      if (!roomId || !name)
        return callback({ ok: false, message: "Room ID or name missing!" });

      if (rooms[roomId])
        return callback({ ok: false, message: "Room already exists!" });

      rooms[roomId] = {
        hostId: socket.id,
        totalRounds,
        players: [{ id: socket.id, name, score: 0 }],
      };

      socket.join(roomId);
      socket.roomId = roomId;
      socket.playerName = name;

      io.to(roomId).emit("roomUpdate", {
        players: rooms[roomId].players,
        hostId: rooms[roomId].hostId,
      });

      callback({ ok: true, message: "Room created successfully" });
    } catch (err) {
      console.error("❌ Error in createRoom:", err);
      callback({ ok: false, message: "Server error creating room" });
    }
  });

  // JOIN ROOM
  socket.on("joinRoom", ({ roomId, name }, callback) => {
    try {
      console.log("🟡 joinRoom:", { roomId, name });

      if (!roomId || !name)
        return callback({ ok: false, message: "Room ID or name missing!" });

      const room = rooms[roomId];
      if (!room) return callback({ ok: false, message: "Room not found!" });

      room.players.push({ id: socket.id, name, score: 0 });
      socket.join(roomId);
      socket.roomId = roomId;
      socket.playerName = name;

      io.to(roomId).emit("roomUpdate", {
        players: room.players,
        hostId: room.hostId,
      });

      callback({ ok: true, message: "Joined successfully" });
    } catch (err) {
      console.error("❌ joinRoom error:", err);
      callback({ ok: false, message: "Server error joining room" });
    }
  });

  // START ROUND (optional logic)
  socket.on("startRound", ({ dishName, ingredients }) => {
    console.log("🏁 startRound triggered:", dishName, ingredients);
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      io.to(roomId).emit("roundStarted", { dishName, ingredients });
    }
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;

    rooms[roomId].players = rooms[roomId].players.filter(
      (p) => p.id !== socket.id
    );

    io.to(roomId).emit("roomUpdate", {
      players: rooms[roomId].players,
      hostId: rooms[roomId].hostId,
    });

    if (rooms[roomId].players.length === 0) {
      delete rooms[roomId];
      console.log("🗑️ Room deleted:", roomId);
    }
  });
};
