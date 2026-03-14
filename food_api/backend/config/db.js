// config/db.js
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Error:", err.message);
    // do not kill the whole process – the web socket functionality does not strictly
    // require MongoDB, and during development a missing URI should not block room
    // creation/joining.
    // process.exit(1);
  }
};

module.exports = connectDB;
