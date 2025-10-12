const router = require('express').Router();
const path = require('path');
const dayjs = require('dayjs');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const Report = require(path.join(__dirname, '..', 'models', 'Report'));
const ResourceUsage = require('../models/ResourceUsage');
const { auth } = require('../auth');

// --- Report endpoints (mobile) ---
// Create a new report (staff)
router.post('/', auth(), async (req, res) => {
  try {
    const user = req.user;
    const { field, date, issueType, description, photoUrl, voiceUrl } = req.body || {};
    if (!field || !date || !issueType) return res.status(400).json({ error: 'field, date and issueType required' });

    const r = await Report.create({
      userId: user._id,
      userName: user.name,
      field,
      date: new Date(date),
      issueType,
      description,
      photoUrl,
      voiceUrl,
    });

    res.json({ id: r._id });
  } catch (e) {
    console.error('create report failed', e);
    res.status(400).json({ error: 'create report failed' });
  }
});

// List reports (manager only)
router.get('/', auth(['manager']), async (req, res) => {
  try {
    const reports = await Report.find().sort('-createdAt').lean();
    res.json(reports);
  } catch (e) {
    console.error('list reports failed', e);
    res.status(500).json({ error: 'failed to list reports' });
  }
});

// Get single report (manager or owner)
router.get('/:id', auth(), async (req, res) => {
  try {
    const r = await Report.findById(req.params.id).lean();
    if (!r) return res.status(404).json({ error: 'not found' });

    // allow manager or owner
    if (req.user.role !== 'manager' && String(r.userId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    res.json(r);
  } catch (e) {
    console.error('get report failed', e);
    res.status(400).json({ error: 'get report failed' });
  }
});

// --- Resource usage / exports (existing logic) ---
// --- Helpers ---
function parseRange(q) {
  // ?month=YYYY-MM OR ?from=YYYY-MM-DD&to=YYYY-MM-DD
  if (q.month) {
    const start = dayjs(q.month + '-01').startOf('day');
    const end = start.add(1, 'month');
    return { start: start.toDate(), end: end.toDate(), label: start.format('YYYY MMM') };
  }
  const start = q.from ? dayjs(q.from) : dayjs().startOf('month');
  const end = q.to ? dayjs(q.to).add(1, 'day') : dayjs().endOf('month').add(1, 'day');
  return { start: start.toDate(), end: end.toDate(), label: `${start.format('YYYY-MM-DD')} → ${dayjs(end).subtract(1,'day').format('YYYY-MM-DD')}` };
}

// Build a readable label per row based on your schema
// - fertilizer -> fertilizerName
// - pesticide  -> first pesticideNames[] or 'Pesticide'
// - seeds      -> cropSupported (or 'Seeds')
function pipeline({ start, end, type = 'ALL' }) {
  const match = { date: { $gte: start, $lt: end } };
  if (type && type !== 'ALL') match.type = type; // 'fertilizer'|'seeds'|'pesticide'

  return [
    { $match: match },
    {
      $addFields: {
        label: {
          $switch: {
            branches: [
              { case: { $eq: ['$type', 'fertilizer'] }, then: { $ifNull: ['$fertilizerName', 'Fertilizer'] } },
              { case: { $eq: ['$type', 'pesticide'] },  then: { $ifNull: [ { $arrayElemAt: ['$pesticideNames', 0] }, 'Pesticide' ] } },
              { case: { $eq: ['$type', 'seeds'] },       then: { $ifNull: ['$cropSupported', 'Seeds'] } },
            ],
            default: 'Resource'
          }
        },
        unit: { $ifNull: ['$quantity.unit', ''] },
        qty:  { $ifNull: ['$quantity.value', 0] },
        y:    { $year: '$date' },
        m:    { $month: '$date' },
      }
    },
    {
      $group: {
        _id: { y: '$y', m: '$m', type: '$type', label: '$label', unit: '$unit' },
        totalQty: { $sum: '$qty' }
      }
    },
    {
      $project: {
        _id: 0,
        month: { $dateFromParts: { year: '$_id.y', month: '$_id.m', day: 1 } },
        type: '$_id.type',
        label: '$_id.label',
        unit: '$_id.unit',
        totalQty: 1
      }
    },
    { $sort: { month: 1, type: 1, label: 1 } }
  ];
}

// --- JSON summary for UI ---
router.get('/resources/summary', async (req, res) => {
  try {
    const { start, end, label } = parseRange(req.query);
    const type = (req.query.type || 'ALL').toLowerCase(); // fertilizer|seeds|pesticide|ALL

    const rows = await ResourceUsage.aggregate(pipeline({ start, end, type: type === 'all' ? 'ALL' : type }));
    const totals = rows.reduce((s, r) => s + (r.totalQty || 0), 0);

    res.json({
      ok: true,
      period: { start, end, label },
      type: type.toUpperCase(),
      rows,
      totals: { totalQty: totals }
    });
  } catch (e) {
    console.error('GET /reports/resources/summary error:', e);
    res.status(500).json({ error: 'Failed to build summary' });
  }
});

// --- CSV export ---
router.get('/resources.csv', async (req, res) => {
  try {
    const { start, end } = parseRange(req.query);
    const type = (req.query.type || 'ALL').toLowerCase();
    const rows = await ResourceUsage.aggregate(pipeline({ start, end, type: type === 'all' ? 'ALL' : type }));
    const view = rows.map(r => ({
      month: dayjs(r.month).format('YYYY-MM'),
      type: r.type,
      resource: r.label,
      totalQty: r.totalQty,
      unit: r.unit
    }));
    const csv = new Parser({ fields: ['month', 'type', 'resource', 'totalQty', 'unit'] }).parse(view);
    const fname = `resource-usage-${dayjs(start).format('YYYYMM')}.csv`;
    res.header('Content-Type', 'text/csv');
    res.attachment(fname);
    res.send(csv);
  } catch (e) {
    console.error('GET /reports/resources.csv error:', e);
    res.status(500).json({ error: 'Failed to build CSV' });
  }
});

// --- PDF export ---
router.get('/resources.pdf', async (req, res) => {
  try {
    const { start } = parseRange(req.query);
    const type = (req.query.type || 'ALL').toLowerCase();
    const rows = await ResourceUsage.aggregate(pipeline({ start, end: dayjs(start).add(1,'month').toDate(), type: type === 'all' ? 'ALL' : type }));

    const fname = `resource-usage-${dayjs(start).format('YYYYMM')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    doc.pipe(res);

    doc.fontSize(18).text('Resource Usage Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Month: ${dayjs(start).format('YYYY MMM')}`);
    doc.text(`Type: ${type.toUpperCase()}`);
    doc.moveDown(0.5);

    const colX = [36, 180, 380, 460]; // month | resource | qty | unit
    let y = doc.y + 8;

    doc.fontSize(11).text('Month', colX[0], y);
    doc.text('Resource', colX[1], y);
    doc.text('Total Qty', colX[2], y, { width: 70, align: 'right' });
    doc.text('Unit', colX[3], y);
    y += 18;
    doc.moveTo(36, y).lineTo(559, y).stroke();
    y += 6;

    doc.fontSize(10);
    rows.forEach((r) => {
      const monthStr = dayjs(r.month).format('YYYY-MM');
      doc.text(monthStr, colX[0], y);
      doc.text(r.label, colX[1], y, { width: 180 });
      doc.text(String(r.totalQty), colX[2], y, { width: 70, align: 'right' });
      doc.text(r.unit || '', colX[3], y);
      y += 16;
      if (y > 770) { doc.addPage(); y = 60; }
    });

    const totalQty = rows.reduce((s, r) => s + (r.totalQty || 0), 0);
    y += 8;
    doc.moveTo(36, y).lineTo(559, y).stroke();
    y += 10;
    doc.fontSize(11).text(`Total Quantity: ${totalQty}`, 36, y);

    doc.end();
  } catch (e) {
    console.error('GET /reports/resources.pdf error:', e);
    res.status(500).json({ error: 'Failed to build PDF' });
  }
});

module.exports = router;
