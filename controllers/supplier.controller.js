const Supplier = require("../models/Supplier");
const Inventory = require("../models/Inventory");

const getAll = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ user: req.user._id }).sort({ name: 1 });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const add = async (req, res) => {
  try {
    const supplier = await Supplier.create({ ...req.body, user: req.user._id });
    res.status(201).json(supplier);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );
    res.json(supplier);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    await Supplier.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    // Clear references in inventory
    await Inventory.updateMany(
        { user: req.user._id, supplier: req.params.id },
        { 
            $unset: { supplier: "" },
            $set: { supplierName: "", supplierContact: "", supplierEmail: "", supplierAddress: "" }
        }
    );
    res.json({ message: "Supplier deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Map categories to supplier automatically
const mapSupplierToItems = async (req, res) => {
    try {
        const { supplierId, categories } = req.body;
        const sup = await Supplier.findOne({ _id: supplierId, user: req.user._id });
        if (!sup) return res.status(404).json({ message: "Supplier not found" });

        await Inventory.updateMany(
            { user: req.user._id, category: { $in: categories } },
            { 
                supplier: sup._id,
                supplierName: sup.name,
                supplierContact: sup.contact,
                supplierEmail: sup.email,
                supplierAddress: sup.address
            }
        );

        // Permanently persist the mapping intention into the Supplier's schema
        const updatedCat = new Set([...(sup.categories || []), ...categories]);
        sup.categories = Array.from(updatedCat);
        await sup.save();

        res.json({ message: `Inventory items updated and mapped for supplier ${sup.name}` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

module.exports = { getAll, add, update, remove, mapSupplierToItems };
