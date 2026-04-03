const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, default: "General" },
  quantity: { type: Number, required: true, default: 0 },
  unit: { type: String, default: "pcs" },
  price: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  purchasePrice: { type: Number, default: 0 },
  gstRate: { type: Number, default: 0 },
  hsnCode: { type: String, default: "" },
  isPacked: { type: Boolean, default: true },
  brandName: { type: String, default: "" },
  packSize: { type: String, default: "" },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
  supplierName: { type: String, default: "" },
  supplierContact: { type: String, default: "" },
  supplierEmail: { type: String, default: "" },
  supplierAddress: { type: String, default: "" },
  lowStockThreshold: { type: Number, default: 5 },
  aliases: [{ type: String }],
}, { timestamps: true });

inventorySchema.virtual("isLowStock").get(function () {
  return this.quantity <= this.lowStockThreshold;
});

module.exports = mongoose.model("Inventory", inventorySchema);
