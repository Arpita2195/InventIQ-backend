const express = require("express");
const router = express.Router();
const { chat, getHistory, getSalesReport } = require("../controllers/chat.controller");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);
router.post("/", chat);
router.get("/history", getHistory);
router.get("/reports", getSalesReport);

module.exports = router;
