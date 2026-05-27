// seedBins.js
const mongoose = require("mongoose");
const Bin = require("./src/models/Bin"); // adjust path if needed

// MongoDB connection string
const MONGO_URI = "mongodb://127.0.0.1:27017/waste_monitor"; // change if using different host/port

const sampleBins = [
  {
    deviceId: "BIN001",
    name: "Dustbin A",
    location: { type: "Point", coordinates: [77.5946, 12.9716] },
    capacity: { dry: 40, wet: 60, e_waste: 10 },
    lastUpdated: new Date()
  },
  {
    deviceId: "BIN002",
    name: "Dustbin B",
    location: { type: "Point", coordinates: [77.6046, 12.9656] },
    capacity: { dry: 30, wet: 50, e_waste: 5 },
    lastUpdated: new Date()
  },
  {
    deviceId: "BIN003",
    name: "Dustbin C",
    location: { type: "Point", coordinates: [77.5890, 12.9700] },
    capacity: { dry: 20, wet: 70, e_waste: 15 },
    lastUpdated: new Date()
  },
  {
    deviceId: "BIN004",
    name: "Dustbin D",
    location: { type: "Point", coordinates: [77.5800, 12.9750] },
    capacity: { dry: 50, wet: 40, e_waste: 20 },
    lastUpdated: new Date()
  },
  {
    deviceId: "BIN005",
    name: "Dustbin E",
    location: { type: "Point", coordinates: [77.5950, 12.9800] },
    capacity: { dry: 35, wet: 55, e_waste: 5 },
    lastUpdated: new Date()
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");

    // Clear existing bins
    await Bin.deleteMany({});
    console.log("🗑 Cleared existing bins");

    // Insert sample bins
    await Bin.insertMany(sampleBins);
    console.log("✅ Sample bins inserted");

    mongoose.connection.close();
    console.log("🚀 Done. Connection closed.");
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

seed();
