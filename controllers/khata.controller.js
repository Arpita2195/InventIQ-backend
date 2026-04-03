const Customer = require("../models/Customer");
const KhataTransaction = require("../models/KhataTransaction");

const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, user: req.user._id });
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addCustomer = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const existing = await Customer.findOne({ user: req.user._id, phone });
    if (existing) {
      return res.status(400).json({ message: "Customer with this phone already exists." });
    }
    const customer = await Customer.create({
      user: req.user._id,
      name,
      phone
    });
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addTransaction = async (req, res) => {
  try {
    const { customerId, amount, type, note } = req.body;
    const customer = await Customer.findOne({ _id: customerId, user: req.user._id });
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    if (amount <= 0) return res.status(400).json({ message: "Amount must be greater than 0" });

    const transaction = await KhataTransaction.create({
      user: req.user._id,
      customer: customer._id,
      amount,
      type,
      note
    });

    if (type === "CREDIT") {
      customer.totalCredit += amount;
      customer.balance += amount;
    } else if (type === "PAYMENT") {
      customer.totalPaid += amount;
      customer.balance -= amount;
    }

    await customer.save();

    res.status(201).json({ transaction, customer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const transactions = await KhataTransaction.find({ 
      customer: req.params.customerId, 
      user: req.user._id 
    }).sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getCustomers,
  getCustomer,
  addCustomer,
  addTransaction,
  getTransactions
};
