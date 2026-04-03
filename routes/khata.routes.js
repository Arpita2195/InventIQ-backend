const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { 
  getCustomers, 
  getCustomer, 
  addCustomer, 
  addTransaction, 
  getTransactions 
} = require("../controllers/khata.controller");

router.use(protect);

router.get("/customers", getCustomers);
router.post("/customers", addCustomer);
router.get("/customers/:id", getCustomer);

router.post("/transactions", addTransaction);
router.get("/transactions/:customerId", getTransactions);

module.exports = router;
