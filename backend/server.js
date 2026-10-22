const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const errorHandler = require("./config/errorHandler");
const authRoutes = require("./routes/authRoutes");
const authMiddleware = require("./middleware/authMiddleware");
const roleMiddleware = require("./middleware/roleMiddleware");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

// Test route
app.get("/", (req, res) => {
    res.send("ProjectFlow Backend is running!");
});

app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "ProjectFlow backend is running"
    });
});

app.use("/api/auth", authRoutes);

app.get("/api/auth/profile", authMiddleware, (req, res) => {
    res.status(200).json({
        message: "Authentication successful",
        user: req.user
    });
});

app.get(
    "/api/test/coordinator",
    authMiddleware,
    roleMiddleware("Coordinator"),
    (req, res) => {
        res.status(200).json({
            message: "Coordinator access granted"
        });
    }
);

app.get(
    "/api/test/student",
    authMiddleware,
    roleMiddleware("Student"),
    (req, res) => {
        res.status(200).json({
            message: "Student access granted"
        });
    }
);

app.use(errorHandler);
// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});