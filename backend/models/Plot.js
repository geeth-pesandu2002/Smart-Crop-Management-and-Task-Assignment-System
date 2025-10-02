// backend/models/Plot.js
const mongoose = require('mongoose');

const HarvestSchema = new mongoose.Schema(
  {
    harvestDate: { type: Date, required: true },
    harvestedQty: { type: Number, default: 0, min: 0 },
    discardedQty: { type: Number, default: 0, min: 0 },
    earnings:     { type: Number, default: 0, min: 0 },
    note:         { type: String, default: '' },
  },
  { _id: true, timestamps: true }
);

// GeoJSON polygon
const GeometrySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Polygon'], default: 'Polygon', required: true },
    // [[[lng,lat], [lng,lat], ...]]
    coordinates: { type: [[[Number]]], required: true },
  },
  { _id: false }
);

const PlotSchema = new mongoose.Schema(
  {
    fieldName:   { type: String, required: true, trim: true },
    cropType:    { type: String, required: true, trim: true },
    area:        { type: Number, required: true, min: 0 },
    areaUnit:    { type: String, enum: ['ac', 'ha', 'm2'], default: 'ac' },
    plantingDate:{ type: Date, required: true },

    status:      { type: String, enum: ['planted', 'fallow', 'harvested'], default: 'planted' },

    geometry:    { type: GeometrySchema, required: true },

    manager:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    harvests:    { type: [HarvestSchema], default: [] },
  },
  { timestamps: true }
);

// --- Virtual aggregates ---
PlotSchema.virtual('totals').get(function () {
  const harvested = (this.harvests || []).reduce((s, h) => s + (h.harvestedQty || 0), 0);
  const discarded = (this.harvests || []).reduce((s, h) => s + (h.discardedQty || 0), 0);
  const earnings  = (this.harvests || []).reduce((s, h) => s + (h.earnings || 0), 0);
  return { harvested, discarded, earnings };
});

// include virtuals when sending JSON to the client
PlotSchema.set('toJSON', { virtuals: true });
PlotSchema.set('toObject', { virtuals: true });

// --- Safety net: ensure polygon ring is closed and valid ---
PlotSchema.pre('validate', function (next) {
  try {
    const g = this.geometry;
    if (!g || g.type !== 'Polygon' || !Array.isArray(g.coordinates)) {
      return next(new Error('Invalid geometry: must be GeoJSON Polygon'));
    }
    const ring = g.coordinates[0];
    if (!Array.isArray(ring) || ring.length < 3) {
      return next(new Error('Invalid geometry: polygon needs at least 3 points'));
    }
    const first = ring[0];
    const last  = ring[ring.length - 1];
    if (!last || last[0] !== first[0] || last[1] !== first[1]) {
      ring.push(first); // close the ring
    }
    g.coordinates[0] = ring;
    this.geometry = g;
    next();
  } catch (e) {
    next(e);
  }
});

module.exports = mongoose.model('Plot', PlotSchema);
