const { processMessage } = require("../services/claudeService");
const {
  updateStockFromChat,
  updatePriceFromChat,
} = require("./inventory.controller");
const Inventory = require("../models/Inventory");
const ChatLog = require("../models/ChatLog");
const Sale = require("../models/Sale");

const chat = async (req, res) => {
  try {
    const { message } = req.body;
    const user = req.user;

    const inventory = await Inventory.find({ user: user._id }).lean();
    const inventoryContext = inventory.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      gstRate: i.gstRate || 0,
      lowStock: i.quantity <= i.lowStockThreshold,
      lowStockThreshold: i.lowStockThreshold,
      category: i.category,
    }));

    // Calculate sales summary for AI
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [todaySalesData, weeklySalesData, allSalesData] = await Promise.all([
      Sale.find({
        user: user._id,
        type: "sale",
        createdAt: { $gte: today },
      }).lean(),
      Sale.find({
        user: user._id,
        type: "sale",
        createdAt: { $gte: lastWeek },
      }).lean(),
      Sale.find({ user: user._id, type: "sale" }).lean(),
    ]);

    const salesSummaryContext = {
      todaySales: todaySalesData.reduce(
        (sum, s) => sum + (Number(s.total) || 0),
        0,
      ),
      todayProfit: todaySalesData.reduce(
        (sum, s) => sum + (Number(s.profit) || 0),
        0,
      ),
      todayUnits: todaySalesData.reduce(
        (sum, s) => sum + (Number(s.quantity) || 0),
        0,
      ),
      todayCount: todaySalesData.length,
      todayItems: todaySalesData.map((s) => ({
        name: s.itemName,
        qty: s.quantity,
        total: s.total,
      })),
      weeklySales: weeklySalesData.reduce(
        (sum, s) => sum + (Number(s.total) || 0),
        0,
      ),
      weeklyProfit: weeklySalesData.reduce(
        (sum, s) => sum + (Number(s.profit) || 0),
        0,
      ),
      weeklyUnits: weeklySalesData.reduce(
        (sum, s) => sum + (Number(s.quantity) || 0),
        0,
      ),
      totalSales: allSalesData.reduce(
        (sum, s) => sum + (Number(s.total) || 0),
        0,
      ),
      totalProfit: allSalesData.reduce(
        (sum, s) => sum + (Number(s.profit) || 0),
        0,
      ),
      totalUnits: allSalesData.reduce(
        (sum, s) => sum + (Number(s.quantity) || 0),
        0,
      ),
      totalGstCollected: allSalesData.reduce(
        (sum, s) => sum + (Number(s.total) || 0) * 0.05,
        0,
      ),
      unpaidTotal: allSalesData
        .filter((s) => s.paymentMethod === "Udhaar" || s.status === "Unpaid")
        .reduce((sum, s) => sum + (Number(s.total) || 0), 0),
    };

    const aiResponse = await processMessage(
      message,
      inventoryContext,
      salesSummaryContext,
      user.shopName,
      user.language,
    );

    await ChatLog.create({ user: user._id, role: "user", content: message });

    // Execute AI actions
    let actionResult = null;
    if (
      aiResponse.action === "UPDATE_INVENTORY" &&
      aiResponse.data?.items?.length
    ) {
      const updates = [];
      for (const item of aiResponse.data.items) {
        const updated = await updateStockFromChat(
          user._id,
          item.name,
          item.change,
          item.type,
        );
        updates.push({ name: updated.name, quantity: updated.quantity });
      }
      actionResult = { updated: updates };
    }

    if (
      aiResponse.action === "UPDATE_PRICE" &&
      aiResponse.data?.prices?.length
    ) {
      const updates = [];
      for (const priceUpdate of aiResponse.data.prices) {
        const updated = await updatePriceFromChat(
          user._id,
          priceUpdate.name,
          priceUpdate.price,
        );
        updates.push({ name: updated.name, price: updated.price });
      }
      actionResult = { priceUpdates: updates };
    }

    if (aiResponse.action === "ADD_ITEM") {
      if (aiResponse.data?.newItem) {
        const ni = aiResponse.data.newItem;
        const exists = await Inventory.findOne({
          user: user._id,
          name: new RegExp(`^${ni.name}$`, "i"),
        });
        if (!exists) {
          const newItem = await Inventory.create({ user: user._id, ...ni });
          // Trigger notification check for low stock on new items
          const {
            checkLowStockAndNotify,
          } = require("./notification.controller");
          await checkLowStockAndNotify(user._id, newItem._id);
        }
      }

      if (aiResponse.data?.newItems?.length) {
        for (const ni of aiResponse.data.newItems) {
          const exists = await Inventory.findOne({
            user: user._id,
            name: new RegExp(`^${ni.name}$`, "i"),
          });
          if (!exists) {
            const newItem = await Inventory.create({ user: user._id, ...ni });
            // Trigger notification check for low stock on new items
            const {
              checkLowStockAndNotify,
            } = require("./notification.controller");
            await checkLowStockAndNotify(user._id, newItem._id);
          }
        }
      }
    }

    await ChatLog.create({
      user: user._id,
      role: "assistant",
      content: aiResponse.reply,
      action: aiResponse.action,
      actionData: aiResponse.data,
    });

    res.json({
      reply: aiResponse.reply,
      action: aiResponse.action,
      data: aiResponse.data,
      actionResult,
    });
  } catch (err) {
    console.error(
      `[ChatController] Error processing message "${message}":`,
      err.message,
    );
    res.status(500).json({ message: "AI service error: " + err.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const logs = await ChatLog.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(logs.reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getSalesReport = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const sales = await Sale.find({
      user: req.user._id,
      createdAt: { $gte: since },
    });

    const grouped = {};
    sales.forEach((s) => {
      const d = s.createdAt.toISOString().split("T")[0];
      if (!grouped[d])
        grouped[d] = { date: d, sales: 0, purchases: 0, revenue: 0, profit: 0 };
      if (s.type === "sale") {
        grouped[d].sales += s.quantity;
        grouped[d].revenue += s.total;
        grouped[d].profit += s.profit || 0;
      }
      if (s.type === "purchase") grouped[d].purchases += s.quantity;
    });

    const topItems = {};
    sales
      .filter((s) => s.type === "sale")
      .forEach((s) => {
        if (!topItems[s.itemName])
          topItems[s.itemName] = {
            name: s.itemName,
            qty: 0,
            revenue: 0,
            profit: 0,
          };
        topItems[s.itemName].qty += s.quantity;
        topItems[s.itemName].revenue += s.total;
        topItems[s.itemName].profit += s.profit || 0;
      });

    res.json({
      daily: Object.values(grouped).sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
      topItems: Object.values(topItems)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5),
      totalRevenue: sales
        .filter((s) => s.type === "sale")
        .reduce((a, s) => a + s.total, 0),
      totalProfit: sales
        .filter((s) => s.type === "sale")
        .reduce((a, s) => a + (s.profit || 0), 0),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { chat, getHistory, getSalesReport };
