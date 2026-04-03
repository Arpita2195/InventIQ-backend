const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  item: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory" },
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  type: { type: String, enum: ["sale", "purchase", "adjustment"], default: "sale" },
  paymentMethod: { type: String, enum: ["Cash", "UPI", "Online", "Udhaar"], default: "Cash" },
  note: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Sale", saleSchema);
