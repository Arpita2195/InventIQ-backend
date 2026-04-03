const mongoose = require("mongoose");

const khataTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["CREDIT", "PAYMENT"], required: true },
  note: { type: String, default: "" },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("KhataTransaction", khataTransactionSchema);
