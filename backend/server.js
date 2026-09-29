const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const errorHandler = require("./config/errorHandler");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
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

app.use(errorHandler);
// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});