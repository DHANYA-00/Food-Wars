require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const connectDB = require("./config/db");
const dishRoutes = require("./routes/dishRoutes");
const setupSocket = require("./socket"); // ✅ correct import

const app = express();
app.use(cors());
app.use(express.json());

// DB connect
connectDB();

// REST routes
app.use("/dishes", dishRoutes);

// Create HTTP server
const server = http.createServer(app);

// ✅ Setup Socket.IO properly
setupSocket(server);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
