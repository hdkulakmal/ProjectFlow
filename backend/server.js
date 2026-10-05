const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const errorHandler = require("./config/errorHandler");
const authRoutes = require("./routes/authRoutes");

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

app.use(errorHandler);
// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});