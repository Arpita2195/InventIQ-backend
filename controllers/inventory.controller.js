const Inventory = require("../models/Inventory");
const Sale = require("../models/Sale");
const Groq = require("groq-sdk");
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const getAll = async (req, res) => {
  try {
    const items = await Inventory.find({ user: req.user._id }).sort({
      name: 1,
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addItem = async (req, res) => {
  try {
    const {
      name,
      category,
      quantity,
      unit,
      price,
      gstRate,
      isPacked,
      supplierName,
      supplierContact,
      supplierEmail,
      lowStockThreshold,
      aliases,
    } = req.body;
    let sName = supplierName || "";
    let sContact = supplierContact || "";
    let sEmail = supplierEmail || "";
    let sAddress = "";
    let sId = null;

    if (!sName && category) {
      const Supplier = require("../models/Supplier");
      const sup = await Supplier.findOne({
        user: req.user._id,
        categories: category,
      });
      if (sup) {
        sId = sup._id;
        sName = sup.name;
        sContact = sup.contact;
        sEmail = sup.email;
        sAddress = sup.address;
      }
    }

    const item = await Inventory.create({
      user: req.user._id,
      name,
      category,
      quantity,
      unit,
      price,
      gstRate: gstRate || 0,
      isPacked: isPacked || false,
      supplierName: sName,
      supplierContact: sContact,
      supplierEmail: sEmail,
      supplierAddress: sAddress,
      supplier: sId,
      lowStockThreshold,
      aliases: aliases || [],
    });

    // Trigger notification check if new item has low stock
    const { checkLowStockAndNotify } = require("./notification.controller");
    await checkLowStockAndNotify(req.user._id, item._id);

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateItem = async (req, res) => {
  try {
    const item = await Inventory.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!item) return res.status(404).json({ message: "Item not found" });

    // Auto-map if category changes and supplier is empty
    if (req.body.category && !req.body.supplierName && !item.supplierName) {
      const Supplier = require("../models/Supplier");
      const sup = await Supplier.findOne({
        user: req.user._id,
        categories: req.body.category,
      });
      if (sup) {
        req.body.supplier = sup._id;
        req.body.supplierName = sup.name;
        req.body.supplierContact = sup.contact;
        req.body.supplierEmail = sup.email;
        req.body.supplierAddress = sup.address;
      }
    }

    Object.assign(item, req.body);
    const updated = await item.save();

    // Trigger Notification Check
    const { checkLowStockAndNotify } = require("./notification.controller");
    await checkLowStockAndNotify(req.user._id, updated._id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteItem = async (req, res) => {
  try {
    await Inventory.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    res.json({ message: "Item deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getLowStock = async (req, res) => {
  try {
    const items = await Inventory.find({ user: req.user._id });
    const low = items.filter((i) => i.quantity <= i.lowStockThreshold);
    res.json(low);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const notifySupplier = async (req, res) => {
  try {
    const item = await Inventory.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!item) return res.status(404).json({ message: "Item not found" });

    const Notification = require("../models/Notification");

    if (!item.supplierEmail && !item.supplierContact && !item.supplier) {
      await Notification.create({
        user: req.user._id,
        title: `Low Stock: ${item.name}`,
        message: `Stock is strictly low (${item.quantity} left). You have no supplier info mapped to auto-notify.`,
        type: "low_stock",
      });
      return res
        .status(200)
        .json({
          message:
            "No supplier info configured. A smart alert has been created for your action.",
        });
    }

    const restockQty = Math.max(item.lowStockThreshold * 3, 20);
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 3);

    const emailData = {
      to: item.supplierEmail || item.supplierContact,
      subject: `RESTOCK REQUEST: ${item.name}`,
      body: `Hello ${item.supplierName || "Supplier"},\n\nWe are running low on ${item.name}. Please process a restock request.\n\nProduct: ${item.name}\nQuantity Needed: ${restockQty} ${item.unit}\nRequired By: ${deadline.toDateString()}\n\nThank you,\nInventiQ Automated System`,
      sentAt: new Date(),
    };

    await Notification.create({
      user: req.user._id,
      title: `Restocked Notified: ${item.name}`,
      message: `An automated restock request was sent to ${item.supplierName || "Supplier"} for ${restockQty} units.`,
      type: "low_stock",
    });

    res.json({
      message: "Restock email triggered and tracked successfully!",
      emailData,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateStockFromChat = async (
  userId,
  itemName,
  change,
  type = "adjust",
) => {
  const items = await Inventory.find({ user: userId });
  const nameLower = itemName.toLowerCase().replace(/s$/, ""); // Basic singularization
  let item = items.find((i) => {
    const itemLower = i.name.toLowerCase();
    const itemSingular = itemLower.replace(/s$/, "");
    return (
      itemLower === nameLower ||
      itemSingular === nameLower ||
      i.name.toLowerCase().includes(nameLower) ||
      nameLower.includes(itemLower) ||
      (i.aliases || []).some((a) => {
        const al = a.toLowerCase();
        return (
          al === nameLower || al.includes(nameLower) || nameLower.includes(al)
        );
      })
    );
  });

  if (!item) {
    item = await Inventory.create({
      user: userId,
      name: itemName,
      quantity: Math.max(0, change),
      unit: "pcs",
    });
  } else {
    if (type === "set") {
      item.quantity = Math.max(0, change);
    } else {
      item.quantity = Math.max(0, item.quantity + change);
    }
    await item.save();

    if (change !== 0) {
      // Trigger Notification Check
      const { checkLowStockAndNotify } = require("./notification.controller");
      await checkLowStockAndNotify(userId, item._id);

      const type = change > 0 ? "purchase" : "sale";
      const qty = Math.abs(change);
      const totalAmount = qty * item.price;
      let profit = 0;

      if (type === "sale") {
        const cost = (item.purchasePrice || 0) * qty;
        profit = totalAmount - cost;
      }

      await Sale.create({
        user: userId,
        item: item._id,
        itemName: item.name,
        quantity: qty,
        price: item.price,
        total: totalAmount,
        profit: profit, // Can be positive, negative, or zero
        type: type,
      });
    }
  }
  return item;
};

const updatePriceFromChat = async (userId, itemName, newPrice) => {
  const items = await Inventory.find({ user: userId });
  const nameLower = itemName.toLowerCase().replace(/s$/, ""); // Basic singularization
  let item = items.find((i) => {
    const itemLower = i.name.toLowerCase();
    const itemSingular = itemLower.replace(/s$/, "");
    return (
      itemLower === nameLower ||
      itemSingular === nameLower ||
      i.name.toLowerCase().includes(nameLower) ||
      nameLower.includes(itemLower) ||
      (i.aliases || []).some((a) => {
        const al = a.toLowerCase();
        return (
          al === nameLower || al.includes(nameLower) || nameLower.includes(al)
        );
      })
    );
  });

  if (!item) {
    // Create new item if it doesn't exist
    item = await Inventory.create({
      user: userId,
      name: itemName,
      quantity: 0,
      unit: "pcs",
      price: Math.max(0, newPrice),
    });
  } else {
    // Update existing item's price
    item.price = Math.max(0, newPrice);
    await item.save();
  }
  return item;
};

const predictGst = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.json({ rate: 0, cat: "General" });

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            'You are an Indian GST AI assistant. Output ONLY a raw JSON object and nothing else. NO bold text, NO markdown formatting, NO backticks. Estimate the Indian GST rate slab (0, 5, 12, 18, 28) and Retail Category for a given item name. Example JSON output: { "rate": 5, "cat": "Grocery / Snacks" }',
        },
        { role: "user", content: `Item: ${name}` },
      ],
      temperature: 0.1,
      max_tokens: 150,
    });

    const text = response.choices[0].message.content.trim();
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    res.json(parsed);
  } catch (err) {
    res.json({ rate: 0, cat: "General", error: true });
  }
};

module.exports = {
  getAll,
  addItem,
  updateItem,
  deleteItem,
  getLowStock,
  notifySupplier,
  updateStockFromChat,
  updatePriceFromChat,
  predictGst,
};
