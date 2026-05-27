const express = require('express');
const router = express.Router();
const { upsertBinData, listBins } = require('../controllers/binsController');

// POST from ESP32 (backup REST method)
// Change this route to match what ESP32 is sending to
router.post('/:deviceId', upsertBinData); // Changed from '/:deviceId/data' to '/:deviceId'

// GET all bins (for testing)
router.get('/', listBins);

// Add GET route for specific bin
router.get('/:deviceId', async (req, res) => {
  try {
    const bin = await require('../models/Bin').findOne({ deviceId: req.params.deviceId });
    if (!bin) {
      return res.status(404).json({ success: false, error: 'Bin not found' });
    }
    res.json({ success: true, bin });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;