require("dotenv").config();
const mongoose = require("mongoose");
const Inventory = require("./models/Inventory");

const GST_MAP = {
  "Grocery staples (packaged)": 5,
  "Snacks & processed food": 5,
  "Dairy": 5,
  "Personal care": 5,
  "Cleaning / detergents": 18,
  "Beverages": 18,
  "General": 0
};

const mapName = (name) => {
  if (!name) return null;
  const check = name.toLowerCase();
  if (check.includes("maggi") || check.includes("maggie") || check.includes("मग्गी") || check.includes("मगी") || check.includes("chips") || check.includes("biscuit") || check.includes("बिस्किट")) return "Snacks & processed food";
  if (check.includes("milk") || check.includes("dahi") || check.includes("paneer")) return "Dairy";
  if (check.includes("soap") || check.includes("shampoo") || check.includes("toothpaste")) return "Personal care";
  if (check.includes("surf") || check.includes("tide") || check.includes("cleaner") || check.includes("detergent")) return "Cleaning / detergents";
  if (check.includes("cola") || check.includes("pepsi") || check.includes("sprite") || check.includes("drink")) return "Beverages";
  if (check.includes("rice") || check.includes("dal") || check.includes("wheat") || check.includes("flour")) return "Grocery staples (packaged)";
  return null;
};

async function fixDB() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB...");
  const items = await Inventory.find({});
  let updated = 0;
  for (const item of items) {
    const suggestedCategory = mapName(item.name);
    if (suggestedCategory) {
      try {
        item.category = suggestedCategory;
        item.gstRate = GST_MAP[suggestedCategory];
        item.isPacked = true;
        await item.save();
        updated++;
        console.log(`Updated ${item.name} -> ${suggestedCategory} @ ${item.gstRate}%`);
      } catch (e) { console.log(`Failed to update ${item.name}:`, e.message); }
    } else if (item.category === 'General') {
      // Just keep it 0
    }
  }
  console.log(`Finished updating ${updated} items.`);
  process.exit();
}
fixDB();
