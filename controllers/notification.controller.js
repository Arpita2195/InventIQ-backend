const Notification = require("../models/Notification");

const getAll = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, _id: { $in: req.body.ids } }, { read: true });
    res.json({ message: "Notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const checkLowStockAndNotify = async (userId, itemId) => {
    try {
        const Inventory = require("../models/Inventory");
        const Supplier = require("../models/Supplier");
        
        const item = await Inventory.findById(itemId);
        if (!item || item.quantity > item.lowStockThreshold) return;

        // 24h Cooldown: check if a low_stock notification for this item already exists today
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const existing = await Notification.findOne({
            user: userId,
            type: "low_stock",
            "metadata.itemId": itemId,
            createdAt: { $gte: oneDayAgo }
        });

        if (existing) return; // Silent return if already notified in last 24h

        const supplier = item.supplier ? await Supplier.findById(item.supplier) : null;
        const title = `Low Stock Alert: ${item.name}`;
        const message = supplier 
            ? `Stock for ${item.name} is ${item.quantity}. Sent restock email to ${supplier.name}.`
            : `Stock for ${item.name} is strictly low (${item.quantity} left). Please map a supplier to automate restocking.`;

        await Notification.create({
            user: userId,
            title,
            message,
            type: "low_stock",
            metadata: { itemId: item._id, supplierId: supplier?._id }
        });

        if (supplier) {
            console.log(`[SIMULATION] Sending restock email for ${item.name} to ${supplier.email}...`);
        }
    } catch (e) {
        console.error("Centralized Notification trigger failed", e);
    }
}

module.exports = { getAll, markAsRead, checkLowStockAndNotify };
