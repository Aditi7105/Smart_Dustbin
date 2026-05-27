const mongoose = require('mongoose');

const capacitySchema = new mongoose.Schema({
  dry: { type: Number, min: 0, max: 100, default: 0 },
  wet: { type: Number, min: 0, max: 100, default: 0 },
//  e_waste: { type: Number, min: 0, max: 100, default: 0 }
}, { _id: false });

const binSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, index: true },
  name: { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
  },
  capacity: { type: capacitySchema, default: () => ({}) },
  lastUpdated: { type: Date, default: Date.now }
});

binSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Bin', binSchema);
