const express = require("express");
const router = express.Router();
const { getInvoices, createInvoice } = require("../controllers/billing.controller");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);
router.get("/", getInvoices);
router.post("/", createInvoice);

module.exports = router;
