require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const Notification = require("./models/Notification");
const User = require("./models/User");

const seedAll = async () => {
    await connectDB();
    const users = await User.find();
    
    for (const user of users) {
        await Notification.deleteMany({ user: user._id });
        
        const notifs = [
            {
                user: user._id,
                title: "Smart Alert: Low Stock",
                message: "Brush is currently strictly low (1 pcs left).",
                type: "low_stock",
                read: false,
                createdAt: new Date(Date.now() - 1000 * 60 * 5)
            },
            {
                user: user._id,
                title: "Smart Alert: Low Stock",
                message: "Rice and Toothpaste are strictly low on stock.",
                type: "low_stock",
                read: false,
                createdAt: new Date(Date.now() - 1000 * 60 * 10)
            },
            {
                user: user._id,
                title: "Performance: Units Sold Tracked",
                message: "Update: Total units successfully mapped to active ledger items.",
                type: "system",
                read: false,
                createdAt: new Date(Date.now() - 1000 * 60 * 30)
            },
            {
                user: user._id,
                title: "Billing Workflow Completed",
                message: "A bill was sent to the walk-in customer via WhatsApp format.",
                type: "system",
                read: false,
                createdAt: new Date(Date.now() - 1000 * 60 * 60)
            },
            {
                user: user._id,
                title: "Report Generated: Daily Profit & Revenue",
                message: "Your Daily Profit and Weekly Revenue report (in INR) has been synchronized.",
                type: "report",
                read: false,
                createdAt: new Date(Date.now() - 1000 * 60 * 120)
            }
        ];
        
        await Notification.insertMany(notifs);
        console.log("Seeded for user:", user.name);
    }
    
    console.log("Done");
    process.exit();
};

seedAll();
