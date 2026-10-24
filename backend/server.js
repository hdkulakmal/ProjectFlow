
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const connectDB = require("./config/db");
const errorHandler = require("./config/errorHandler");
const setupSocket = require("./socket/socket");
const { setIo } = require("./utils/notify");

// Load User model
require("./model/User");

// Routes
const authRoutes = require("./routes/authRoutes");
const authMiddleware = require("./middleware/authMiddleware");

const messageRoutes = require("./routes/messageRoutes");
const channelRoutes = require("./routes/channelRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const supervisorRoutes = require("./routes/supervisorRoutes");
const supervisorRequestRoutes = require("./routes/supervisorRequestRoutes");
const groupRoutes = require("./routes/groupRoutes");
const projectRoutes = require("./routes/projectRoutes");
const ganttRoutes = require("./routes/ganttRoutes");
const ideaRoutes = require("./routes/ideaRoutes");
const userRoutes = require("./routes/userRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const weeklyEvaluationRoutes = require("./routes/weeklyEvaluationRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const meetingRoutes = require("./routes/meetingRoutes");


const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "*";
const PORT = process.env.PORT || 8000;

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
  },
});

app.set("io", io);
setIo(io);

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/announcements", announcementRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/weekly-evaluations", weeklyEvaluationRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/meetings", meetingRoutes);

// Health checks
app.get("/", (req, res) => {
  res.send("ProjectFlow Backend is running!");
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "ProjectFlow backend is running",
  });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// User management routes
app.use("/api/users", userRoutes);

app.get("/api/auth/profile", authMiddleware, (req, res) => {
  res.status(200).json({
    message: "Authentication successful",
    user: req.user,
  });
});

// Existing project routes
app.use("/api/channels", channelRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/supervisors", supervisorRoutes);
app.use("/api/supervisor-requests", supervisorRequestRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/gantt", ganttRoutes);
app.use("/api/ideas", ideaRoutes);

setupSocket(io);

app.use(errorHandler);

connectDB();

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
