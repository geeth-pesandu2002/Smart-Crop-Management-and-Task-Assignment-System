const router = require('express').Router();
const path = require('path');
const multer = require('multer');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    const base = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, base + ext);
  }
});
const upload = multer({ storage });

// Single file upload under form field 'file'
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  // Build an absolute URL so clients (mobile/web) can use it directly.
  // Prefer the request's Host header and protocol.
  const host = req.get('host');
  const proto = req.protocol || 'http';
  const url = `${proto}://${host}/api/uploads/${req.file.filename}`;
  res.json({ url });
});

module.exports = router;
