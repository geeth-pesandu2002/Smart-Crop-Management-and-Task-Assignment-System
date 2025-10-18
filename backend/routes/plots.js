// backend/routes/plots.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const Plot = require('../models/Plot.js');

// If you already have an auth middleware, use it here.
// Dummy safe auth (replace with your real one if present):
const requireAuth = (req, res, next) => {
  try {
    // If you attach user in your real auth, keep that:
    // req.user = { _id: '...' , role: 'manager' }
    // For now, tolerate missing user (won't crash on null)
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

const router = express.Router();

/**
 * GET /api/plots
 * Optional query: search, limit, page
 * Responds with { items, total }
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search = '', limit = 100, page = 1 } = req.query;
    const q = {};
    if (search) {
      q.$or = [
        { fieldName: { $regex: search, $options: 'i' } },
        { cropType:  { $regex: search, $options: 'i' } },
      ];
    }
    const [items, total] = await Promise.all([
      Plot.find(q).sort({ createdAt: -1 }).limit(Number(limit)).skip((Number(page)-1) * Number(limit)),
      Plot.countDocuments(q),
    ]);
    res.json({ items, total });
  } catch (e) {
    console.error('GET /plots error:', e);
    res.status(500).json({ error: 'Failed to load plots' });
  }
});

/**
 * GET /api/plots/:id
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const plot = await Plot.findById(req.params.id);
    if (!plot) return res.status(404).json({ error: 'Plot not found' });
    res.json(plot);
  } catch (e) {
    console.error('GET /plots/:id error:', e);
    res.status(500).json({ error: 'Failed to load plot' });
  }
});

/**
 * POST /api/plots
 */
router.post(
  '/',
  requireAuth,
  [
    body('fieldName').isString().trim().notEmpty().withMessage('fieldName is required'),
    body('cropType').isString().trim().notEmpty().withMessage('cropType is required'),
    body('area').isFloat({ gt: 0 }).withMessage('area must be > 0'),
    body('areaUnit').isIn(['ac','ha','m2']).withMessage('areaUnit must be ac|ha|m2'),
    body('plantingDate').isISO8601().withMessage('plantingDate must be ISO date'),
    body('geometry').custom((g) => {
      if (!g || g.type !== 'Polygon' || !Array.isArray(g.coordinates)) {
        throw new Error('geometry must be a GeoJSON Polygon');
      }
      const ring = g.coordinates[0];
      if (!Array.isArray(ring) || ring.length < 4) {
        throw new Error('polygon ring must have at least 4 points (closed)');
      }
      return true;
    }),
  ],
  async (req, res) => {
    try {
      const errs = validationResult(req);
      if (!errs.isEmpty()) {
        return res.status(400).json({ error: errs.array()[0].msg, details: errs.array() });
      }

      const { fieldName, cropType, area, areaUnit, plantingDate } = req.body;
      let { geometry } = req.body;

      // Ensure polygon ring is closed [ [lng,lat], ..., [lng,lat] ]
      try {
        const ring = geometry.coordinates[0];
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (!last || last[0] !== first[0] || last[1] !== first[1]) {
          ring.push(first);
        }
        geometry.coordinates[0] = ring;
      } catch (e) {
        return res.status(400).json({ error: 'Invalid geometry coordinates' });
      }

      const doc = await Plot.create({
        fieldName,
        cropType,
        area,
        areaUnit,
        plantingDate,
        geometry,
        manager: req.user?._id || null, // keep null if your auth doesn't attach user
      });

      res.status(201).json(doc);
    } catch (e) {
      console.error('POST /plots error:', e);
      res.status(500).json({ error: 'Failed to create plot' });
    }
  }
);

/**
 * PATCH /api/plots/:id
 */
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.geometry?.coordinates?.[0]) {
      const ring = update.geometry.coordinates[0];
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (!last || last[0] !== first[0] || last[1] !== first[1]) ring.push(first);
    }
    const doc = await Plot.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!doc) return res.status(404).json({ error: 'Plot not found' });
    res.json(doc);
  } catch (e) {
    console.error('PATCH /plots/:id error:', e);
    res.status(500).json({ error: 'Failed to update plot' });
  }
});

/**
 * DELETE /api/plots/:id
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await Plot.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Plot not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /plots/:id error:', e);
    res.status(500).json({ error: 'Failed to delete plot' });
  }
});

/**
 * HARVESTS
 */
router.post('/:id/harvests', requireAuth, async (req, res) => {
  try {
    const { harvestDate, harvestedQty = 0, discardedQty = 0, earnings = 0, note = '' } = req.body;
    const plot = await Plot.findById(req.params.id);
    if (!plot) return res.status(404).json({ error: 'Plot not found' });

    plot.harvests.push({
      harvestDate: new Date(harvestDate),
      harvestedQty: Number(harvestedQty) || 0,
      discardedQty: Number(discardedQty) || 0,
      earnings: Number(earnings) || 0,
      note,
    });
    await plot.save();
    res.status(201).json(plot);
  } catch (e) {
    console.error('POST /plots/:id/harvests error:', e);
    res.status(500).json({ error: 'Failed to add harvest' });
  }
});

router.patch('/:id/harvests/:hid', requireAuth, async (req, res) => {
  try {
    const plot = await Plot.findById(req.params.id);
    if (!plot) return res.status(404).json({ error: 'Plot not found' });
    const h = plot.harvests.id(req.params.hid);
    if (!h) return res.status(404).json({ error: 'Harvest not found' });
    Object.assign(h, req.body);
    await plot.save();
    res.json(plot);
  } catch (e) {
    console.error('PATCH /plots/:id/harvests/:hid error:', e);
    res.status(500).json({ error: 'Failed to update harvest' });
  }
});

router.delete('/:id/harvests/:hid', requireAuth, async (req, res) => {
  try {
    const { id, hid } = req.params;
    console.log(`[DELETE HARVEST] plotId=${id}, harvestId=${hid}`);
    const plot = await Plot.findById(id);
    if (!plot) {
      console.error(`[DELETE HARVEST] Plot not found: ${id}`);
      return res.status(404).json({ error: 'Plot not found', plotId: id });
    }
    const h = plot.harvests.id(hid);
    if (!h) {
      console.error(`[DELETE HARVEST] Harvest not found: plotId=${id}, harvestId=${hid}`);
      return res.status(404).json({ error: 'Harvest not found', plotId: id, harvestId: hid });
    }
    h.remove();
    try {
      await plot.save();
    } catch (saveErr) {
      console.error(`[DELETE HARVEST] Error saving plot after removing harvest:`, saveErr);
      return res.status(500).json({ error: 'Failed to save plot after deleting harvest', details: saveErr?.message });
    }
    res.json(plot);
  } catch (e) {
    console.error('DELETE /plots/:id/harvests/:hid error:', e);
    res.status(500).json({ error: 'Failed to delete harvest', details: e?.message });
  }
});

module.exports = router;
