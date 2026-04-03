const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  customerName: { type: String, default: "Walk-in Customer" },
  customerContact: { type: String, default: "" },
  items: [
    {
      item: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory" },
      itemName: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }, // Base price without GST
      gstRate: { type: Number, default: 0 },
      gstAmount: { type: Number, default: 0 },
      total: { type: Number, required: true }  // price * quantity + gstAmount
    }
  ],
  subtotal: { type: Number, required: true },
  totalGst: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["Cash", "UPI", "Online", "Udhaar"], default: "Cash" },
  status: { type: String, enum: ["Paid", "Unpaid"], default: "Paid" },
}, { timestamps: true });

module.exports = mongoose.model("Invoice", invoiceSchema);
