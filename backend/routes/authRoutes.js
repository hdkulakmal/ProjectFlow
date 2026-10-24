const express = require("express");

const router = express.Router();

const {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
} = require("../controller/authController");
const { protect } = require("../middleware/chatAuth");

router.post("/register", registerUser);
router.post("/login", loginUser);

router.get("/profile", protect, getProfile);
router.patch("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);

module.exports = router;
