const Invoice = require("../models/Invoice");
const Sale = require("../models/Sale");
const Inventory = require("../models/Inventory");

const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createInvoice = async (req, res) => {
  try {
    const { customerName, customerContact, items, discount = 0, paymentMethod } = req.body;
    let subtotal = 0;
    let totalGst = 0;
    
    // Validate items and calculate totals
    const processedItems = items.map(pItem => {
      const gAmount = (pItem.price * pItem.quantity * pItem.gstRate) / 100;
      const t = (pItem.price * pItem.quantity) + gAmount;
      subtotal += (pItem.price * pItem.quantity);
      totalGst += gAmount;
      return {
        item: pItem._id,
        itemName: pItem.name,
        quantity: pItem.quantity,
        price: pItem.price,
        gstRate: pItem.gstRate,
        gstAmount: gAmount,
        total: t
      };
    });

    const grandTotal = Math.max(0, subtotal + totalGst - discount);

    const invoice = await Invoice.create({
      user: req.user._id,
      customerName,
      customerContact,
      items: processedItems,
      subtotal,
      totalGst,
      discount,
      grandTotal,
      paymentMethod,
      status: paymentMethod === 'Udhaar' ? 'Unpaid' : 'Paid'
    });

    // Update Inventory and Create Sales Records
    const { createOrderAlert } = require("./notification.controller");
    const Supplier = require("../models/Supplier");

    for (const pItem of processedItems) {
      if (pItem.item) {
        const invItem = await Inventory.findByIdAndUpdate(pItem.item, {
          $inc: { quantity: -pItem.quantity }
        }, { new: true });

        const profitVal = pItem.total - ((invItem.purchasePrice || 0) * pItem.quantity);

        await Sale.create({
          user: req.user._id,
          item: pItem.item,
          itemName: pItem.itemName,
          quantity: pItem.quantity,
          price: pItem.price,
          total: pItem.total, // Including GST
          profit: profitVal > 0 ? profitVal : 0, 
          type: "sale",
          note: `Invoice #${invoice._id}`
        });

        // Trigger Notification Check
        const { checkLowStockAndNotify } = require("./notification.controller");
        await checkLowStockAndNotify(req.user._id, invItem._id);
      }
    }

    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getInvoices,
  createInvoice
};
