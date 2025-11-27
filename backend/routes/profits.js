const express = require("express");
const router = express.Router();
const Profit = require("../models/Profit");

// Create or update a profit record (upsert by plot+date)
router.post("/", async (req, res) => {
	try {
		const { plot, date, harvestedQty, discardedQty, earnings, cost, profit, notes, createdBy } = req.body;
		if (!plot || !date) return res.status(400).json({ error: "plot and date required" });
		const doc = await Profit.findOneAndUpdate(
			{ plot, date },
			{ $set: { harvestedQty, discardedQty, earnings, cost, profit, notes, createdBy } },
			{ upsert: true, new: true }
		);
		res.json(doc);
	} catch (e) {
		res.status(500).json({ error: "Failed to save profit record" });
	}
});

// List profit records (optionally filter by plot, date)
router.get("/", async (req, res) => {
	try {
		const { plot, from, to, limit = 100, skip = 0 } = req.query;
		const q = {};
		if (plot) q.plot = plot;
		if (from || to) {
			q.date = {};
			if (from) q.date.$gte = new Date(from);
			if (to) q.date.$lte = new Date(to);
		}
		const [items, total] = await Promise.all([
			Profit.find(q).sort({ date: -1 }).skip(Number(skip)).limit(Number(limit)).populate('plot', 'fieldName cropType'),
			Profit.countDocuments(q)
		]);
		res.json({ items, total });
	} catch (e) {
		res.status(500).json({ error: "Failed to list profit records" });
	}
});

// Delete a profit record by id
router.delete("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const doc = await Profit.findByIdAndDelete(id);
		if (!doc) return res.status(404).json({ error: "Not found" });
		res.json({ ok: true });
	} catch (e) {
		res.status(500).json({ error: "Failed to delete profit record" });
	}
});

// Edit a profit record by id
router.patch("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const update = req.body;
		const doc = await Profit.findByIdAndUpdate(id, update, { new: true });
		if (!doc) return res.status(404).json({ error: "Not found" });
		res.json(doc);
	} catch (e) {
		res.status(500).json({ error: "Failed to update profit record" });
	}
});

module.exports = router;
