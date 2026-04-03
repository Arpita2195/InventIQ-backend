const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", notificationController.getAll);
router.post("/read", notificationController.markAsRead);

module.exports = router;
