const { Server } = require("socket.io");
const Dish = require("./models/dish");

const rooms = {};

function setupSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    // --- Create Room ---
    socket.on("createRoom", ({ roomId, name, totalRounds }, callback) => {
      if (rooms[roomId]) return callback({ ok: false, message: "Room already exists" });

      rooms[roomId] = {
        roomId,
        totalRounds,
        currentRound: 0,
        players: [{ id: socket.id, name, score: 0 }],
        hostId: socket.id,
        usedDishes: [],
      };

      socket.join(roomId);
      io.to(roomId).emit("roomUpdated", rooms[roomId]);
      console.log(`✅ Room created: ${roomId} by ${name}`);
      callback({ ok: true, room: rooms[roomId] });
    });

    // --- Join Room ---
    socket.on("joinRoom", ({ roomId, name }, callback) => {
      const room = rooms[roomId];
      if (!room) return callback({ ok: false, message: "Room not found" });

      if (!room.players.some((p) => p.id === socket.id)) {
        room.players.push({ id: socket.id, name, score: 0 });
        socket.join(roomId);
        io.to(roomId).emit("roomUpdated", room);
      }
      console.log(`👤 ${name} joined room ${roomId}`);
      callback({ ok: true, room });
    });

    // --- Start Game / Next Round ---
    socket.on("startGame", async ({ roomId }) => {
      const room = rooms[roomId];
      if (!room || socket.id !== room.hostId) return;

      // End game if all rounds played
      if (room.currentRound >= room.totalRounds) {
        io.to(roomId).emit("gameOver", { players: room.players });
        return;
      }

      // Increment round
      room.currentRound += 1;

      // Fetch all dishes
      const dishes = await Dish.find({});
      let availableDishes = dishes.filter((d) => !room.usedDishes.includes(d._id.toString()));

      if (availableDishes.length === 0) {
        room.usedDishes = [];
        availableDishes = dishes;
      }

      const dish = availableDishes[Math.floor(Math.random() * availableDishes.length)];
      room.usedDishes.push(dish._id.toString());

      // Reset foundIngredients for the round
      room.foundIngredients = [];

      io.to(roomId).emit("gameStarted", {
        dish: {
          name: dish.name,
          imageUrl: dish.imageUrl,
          ingredients: dish.ingredients,
        },
        round: room.currentRound,
        totalRounds: room.totalRounds,
      });

      console.log(`🎮 Round ${room.currentRound} started in ${roomId}: ${dish.name}`);
    });

    // --- Submit Ingredient ---
    socket.on("submitIngredient", ({ roomId, playerId, ingredient, timeTaken }) => {
      const room = rooms[roomId];
      if (!room) return;

      const player = room.players.find((p) => p.id === playerId);
      if (!player) return;

      // Avoid duplicates
      if (room.foundIngredients.includes(ingredient.toLowerCase())) return;

      room.foundIngredients.push(ingredient.toLowerCase());

      // Points calculation based on time
      let points = 10;
      if (timeTaken <= 3) points = 30;
      else if (timeTaken <= 6) points = 20;
      else points = 10;

      // Add points if ingredient is correct
      const currentDish = room.usedDishes[room.usedDishes.length - 1];
      Dish.findById(currentDish).then((dish) => {
        if (!dish) return;

        if (dish.ingredients.map((i) => i.toLowerCase()).includes(ingredient.toLowerCase())) {
          player.score += points;
          io.to(roomId).emit("ingredientResult", {
            ingredient,
            playerId,
            correct: true,
            points,
            players: room.players,
          });
        } else {
          io.to(roomId).emit("ingredientResult", {
            ingredient,
            playerId,
            correct: false,
            points: 0,
            players: room.players,
          });
        }
      });
    });

    // --- Disconnect ---
    socket.on("disconnect", () => {
      console.log("🔴 Disconnected:", socket.id);
      for (const roomId in rooms) {
        const room = rooms[roomId];
        room.players = room.players.filter((p) => p.id !== socket.id);

        if (room.players.length === 0) delete rooms[roomId];
        else io.to(roomId).emit("roomUpdated", room);
      }
    });
  });
}

module.exports = setupSocket;
