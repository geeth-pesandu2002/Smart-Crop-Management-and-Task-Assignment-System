// backend/routes/resources.js
const express = require("express");
const router = express.Router();
const ResourceUsage = require("../models/ResourceUsage");
const Plot = require("../models/Plot");

// If you already have JWT middleware at backend/auth.js, uncomment:
// const auth = require("../auth");
// router.use(auth);

const asNum = (v, def = 0) => (v === undefined || v === null || v === "" ? def : Number(v));

/** Create a usage (fertilizer | seeds | pesticide) */
router.post("/", async (req, res) => {
  try {
    const {
      type,
      plotId,
      fieldName,
      date,
      quantityValue,
      quantityUnit,
      cost,
      fertilizerName,
      cropSupported,
      plantedAreaAcres,
      pesticideNames, // can be string or array
      notes,
    } = req.body;

    if (!["fertilizer", "seeds", "pesticide"].includes(type)) {
      return res.status(400).json({ error: "Invalid type" });
    }
    if (!plotId) return res.status(400).json({ error: "plotId required" });
    const plot = await Plot.findById(plotId).lean();
    if (!plot) return res.status(404).json({ error: "Plot not found" });

    const usage = await ResourceUsage.create({
      type,
      plot: plotId,
      fieldName,
      date: date ? new Date(date) : undefined,
      quantity: { value: asNum(quantityValue), unit: quantityUnit },
      cost: asNum(cost),
      fertilizerName,
      cropSupported,
      plantedAreaAcres: plantedAreaAcres ? asNum(plantedAreaAcres) : undefined,
      pesticideNames: Array.isArray(pesticideNames)
        ? pesticideNames
        : (pesticideNames || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
      createdBy: req.user?._id, // optional
      notes,
    });

    res.json(usage);
  } catch (e) {
    console.error("Create resource usage failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

/** List usages with filters */
router.get("/", async (req, res) => {
  try {
    const { type, plotId, from, to, limit = 50, skip = 0 } = req.query;
    const q = {};
    if (type) q.type = type;
    if (plotId) q.plot = plotId;
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = new Date(from);
      if (to) q.date.$lte = new Date(to);
    }
    const [items, total] = await Promise.all([
      ResourceUsage.find(q)
        .populate("plot", "name")
        .sort({ date: -1 })
        .skip(Number(skip))
        .limit(Number(limit)),
      ResourceUsage.countDocuments(q),
    ]);
    res.json({ items, total });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/** Delete a usage */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await ResourceUsage.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/** Metrics for dashboard (YTD totals, monthly by type, distribution) */
router.get("/metrics/summary", async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));

    const match = { date: { $gte: start, $lt: end } };

    const byType = await ResourceUsage.aggregate([
      { $match: match },
      { $group: { _id: "$type", cost: { $sum: "$cost" } } },
    ]);

    const monthly = await ResourceUsage.aggregate([
      { $match: match },
      {
        $group: {
          _id: { m: { $month: "$date" }, t: "$type" },
          cost: { $sum: "$cost" },
        },
      },
    ]);

    // shape results
    const sumByType = { fertilizer: 0, seeds: 0, pesticide: 0 };
    byType.forEach((r) => (sumByType[r._id] = r.cost));
    const monthlySeries = Array.from({ length: 12 }, () => ({
      fertilizer: 0,
      seeds: 0,
      pesticide: 0,
    }));
    monthly.forEach((r) => {
      const i = r._id.m - 1;
      monthlySeries[i][r._id.t] = r.cost;
    });
    const totalSpend =
      sumByType.fertilizer + sumByType.seeds + sumByType.pesticide;

    res.json({
      year,
      ytd: {
        totalSpend,
        fertilizerCost: sumByType.fertilizer,
        seedCost: sumByType.seeds,
        pesticideCost: sumByType.pesticide,
      },
      monthly: monthlySeries.map((m, idx) => ({
        month: idx + 1,
        ...m,
        total: m.fertilizer + m.seeds + m.pesticide,
      })),
      distribution: [
        { type: "fertilizer", cost: sumByType.fertilizer },
        { type: "seeds", cost: sumByType.seeds },
        { type: "pesticide", cost: sumByType.pesticide },
      ],
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
