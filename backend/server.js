const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

dotenv.config();

const connectDB = require("./config/db");
const errorHandler = require("./config/errorHandler");

const setupSocket = require("./socket/socket");
const messageRoutes = require("./routes/messageRoutes");
const channelRoutes = require("./routes/channelRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "*";

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
  },
});

// controllers use this to push live messages
app.set("io", io);

const PORT = process.env.PORT || 5000;

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
// uploaded chat files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

connectDB();

app.get("/", (req, res) => {
  res.send("ProjectFlow Backend is running!");
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "ProjectFlow backend is running",
  });
});

app.use("/api/channels", channelRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload", uploadRoutes);

setupSocket(io);

app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
