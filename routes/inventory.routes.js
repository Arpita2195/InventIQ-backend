const express = require("express");
const router = express.Router();
const { getAll, addItem, updateItem, deleteItem, getLowStock, notifySupplier, predictGst } = require("../controllers/inventory.controller");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);
router.get("/", getAll);
router.get("/low-stock", getLowStock);
router.post("/predict-gst", predictGst);
router.post("/:id/notify-supplier", notifySupplier);
router.post("/", addItem);
router.put("/:id", updateItem);
router.delete("/:id", deleteItem);

module.exports = router;
