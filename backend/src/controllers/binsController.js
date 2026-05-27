const Bin = require('../models/Bin');

// Update or create bin data from API (optional backup for WebSocket)
async function upsertBinData(req, res) {
  try {
    const deviceId = req.params.deviceId;
    const { location, capacity, name } = req.body;

    const update = {
      lastUpdated: new Date(),
      capacity: {
        dry: capacity?.dry ?? 0,
        wet: capacity?.wet ?? 0,
       // e_waste: capacity?.e_waste ?? 0
      }
    };

    if (name) update.name = name;
    if (location) update.location = { type: 'Point', coordinates: [location.lng, location.lat] };

    const bin = await Bin.findOneAndUpdate(
      { deviceId },
      { $set: update },
      { new: true, upsert: true }
    );

    if (req.io) req.io.emit('bin:update', bin);

    res.json({ success: true, bin });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function listBins(req, res) {
  try {
    const bins = await Bin.find().sort({ lastUpdated: -1 });
    res.json({ success: true, bins });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { upsertBinData, listBins };
