const express = require("express");
const {
  listUsers,
  getUser,
  createUser,
  updateUser,
  setUserStatus,
  resetUserPassword,
} = require("../controller/userController");
const { protect } = require("../middleware/chatAuth");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// User management is Coordinator-only.
router.use(protect, authorize("Coordinator"));

router.get("/", listUsers);
router.post("/", createUser);
router.get("/:id", getUser);
router.patch("/:id", updateUser);
router.patch("/:id/status", setUserStatus);
router.post("/:id/reset-password", resetUserPassword);

module.exports = router;
