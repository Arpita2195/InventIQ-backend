const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  totalCredit: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
}, { timestamps: true });

// Ensure unique phone number per user
customerSchema.index({ user: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model("Customer", customerSchema);
