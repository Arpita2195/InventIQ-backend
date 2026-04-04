require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

connectDB();

const app = express();

// CORS configuration for production
const corsOptions = {
  origin: process.env.CLIENT_URL || "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.use(express.json());

// Root route - redirect to health check
app.get("/", (req, res) => {
  res.redirect("/api/health");
});

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/inventory", require("./routes/inventory.routes"));
app.use("/api/chat", require("./routes/chat.routes"));
app.use("/api/billing", require("./routes/billing.routes"));
app.use("/api/suppliers", require("./routes/supplier.routes"));
app.use("/api/notifications", require("./routes/notification.routes"));
app.use("/api/khata", require("./routes/khata.routes"));

app.get("/api/health", (req, res) =>
  res.json({
    status: "InventIQ server running",
    timestamp: new Date().toISOString(),
  }),
);

app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`InventIQ server running on port ${PORT}`));
// RESTART
