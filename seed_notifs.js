require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const Notification = require("./models/Notification");
const User = require("./models/User");

const seedNotifications = async () => {
    await connectDB();
    const user = await User.findOne();

    if (!user) {
        console.log("No user found to seed.");
        process.exit();
        return;
    }

    const notifs = [
        {
            user: user._id,
            title: "Smart Alert: Low Stock",
            message: "Rice is strictly low (1 pcs left). Restock email pending.",
            type: "low_stock",
            read: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 5)
        },
        {
            user: user._id,
            title: "Performance: Units Sold Tracked",
            message: "Update: 24 units sold today successfully tracked in your ledger.",
            type: "system",
            read: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 30)
        },
        {
            user: user._id,
            title: "Billing Workflow",
            message: "Bill for ₹252 sent exclusively to customer via WhatsApp.",
            type: "system",
            read: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 60)
        },
        {
            user: user._id,
            title: "Financial Report Generated",
            message: "Daily Profit: ₹125 IN. Weekly Revenue Report available: ₹1,550 INR.",
            type: "report",
            read: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 120)
        }
    ];

    await Notification.insertMany(notifs);
    console.log("Seeded successfully");
    process.exit();
};

seedNotifications();
