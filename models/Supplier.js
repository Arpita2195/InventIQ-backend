const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  contact: { type: String, required: true },
  email: { type: String },
  address: { type: String },
  categories: [{ type: String }], // Categories this supplier handles
}, { timestamps: true });

module.exports = mongoose.model("Supplier", supplierSchema);
