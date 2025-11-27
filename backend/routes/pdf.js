const express = require("express");
const router = express.Router();
const Profit = require("../models/Profit");
const Plot = require("../models/Plot");
const PDFDocument = require("pdfkit");

// GET /api/pdf/profit/:id
router.get("/profit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const rec = await Profit.findById(id).populate("plot");
    if (!rec) return res.status(404).json({ error: "Profit record not found" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=profit_${id}.pdf`);
    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(22).fillColor('#22223b').text("Profit Record", { align: "center" });
    doc.moveDown(1.5);

    doc.fontSize(14).fillColor('#222').text(`Plot Name: `, { continued: true }).font('Helvetica-Bold').text(`${rec.plot?.fieldName || ''} (${rec.plot?.cropType || ''})`);
    doc.font('Helvetica').moveDown(0.5);
    doc.text(`Date: `, { continued: true }).font('Helvetica-Bold').text(`${rec.date?.toISOString().slice(0,10)}`);
    doc.font('Helvetica').moveDown(0.5);
    doc.text(`Quantity Harvested: `, { continued: true }).font('Helvetica-Bold').text(`${rec.harvestedQty}`);
    doc.font('Helvetica').moveDown(0.5);
    doc.text(`Quantity Discarded: `, { continued: true }).font('Helvetica-Bold').text(`${rec.discardedQty}`);
    doc.font('Helvetica').moveDown(0.5);
    doc.text(`Total Earnings: `, { continued: true }).font('Helvetica-Bold').text(`LKR ${rec.earnings?.toLocaleString()}`);
    doc.font('Helvetica').moveDown(0.5);
    doc.text(`Total Cost: `, { continued: true }).font('Helvetica-Bold').text(`LKR ${rec.cost?.toLocaleString()}`);
    doc.font('Helvetica').moveDown(0.5);
    doc.text(`Profit: `, { continued: true }).font('Helvetica-Bold').text(`LKR ${rec.profit?.toLocaleString()}`);
    doc.font('Helvetica').moveDown(0.5);
    doc.text(`Notes: `, { continued: true }).font('Helvetica-Bold').text(`${rec.notes || ''}`);

    doc.end();
  } catch (e) {
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

module.exports = router;
