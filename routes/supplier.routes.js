const express = require("express");
const router = express.Router();
const supplierController = require("../controllers/supplier.controller");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", supplierController.getAll);
router.post("/", supplierController.add);
router.put("/:id", supplierController.update);
router.delete("/:id", supplierController.remove);
router.post("/map-categories", supplierController.mapSupplierToItems);

module.exports = router;
