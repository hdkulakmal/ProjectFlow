const express = require("express");
const cors = require("cors");
const path = require("path");

const errorHandler = require("./config/errorHandler");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const channelRoutes = require("./routes/channelRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const supervisorRoutes = require("./routes/supervisorRoutes");
const supervisorRequestRoutes = require("./routes/supervisorRequestRoutes");
const groupRoutes = require("./routes/groupRoutes");
const projectRoutes = require("./routes/projectRoutes");
const ganttRoutes = require("./routes/ganttRoutes");
const ideaRoutes = require("./routes/ideaRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const weeklyEvaluationRoutes = require("./routes/weeklyEvaluationRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const meetingRoutes = require("./routes/meetingRoutes");

const createApp = ({ clientUrl = process.env.CLIENT_URL || "*" } = {}) => {
  const app = express();

  app.use(cors({ origin: clientUrl }));
  app.use(express.json());

  app.use((req, res, next) => {
    if (req.body === undefined) req.body = {};
    next();
  });

  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  app.get("/", (req, res) => {
    res.send("ProjectFlow Backend is running!");
  });

  app.get("/api/health", (req, res) => {
    res.status(200).json({
      status: "OK",
      message: "ProjectFlow backend is running",
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/channels", channelRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/supervisors", supervisorRoutes);
  app.use("/api/supervisor-requests", supervisorRequestRoutes);
  app.use("/api/groups", groupRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/gantt", ganttRoutes);
  app.use("/api/ideas", ideaRoutes);
  app.use("/api/announcements", announcementRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/weekly-evaluations", weeklyEvaluationRoutes);
  app.use("/api/submissions", submissionRoutes);
  app.use("/api/meetings", meetingRoutes);

  app.use("/api", (req, res) => {
    res.status(404).json({
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  app.use(errorHandler);

  return app;
};

module.exports = createApp;