// Shared upload rules for ad media (video, banner, poster).
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { UPLOAD_ROOT } = require('./adPolicy');

const ALLOWED_AD_MEDIA = {
  'video/mp4': 'video',
  'video/webm': 'video',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
};
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const adUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
      cb(null, UPLOAD_ROOT);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `ad_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, !!ALLOWED_AD_MEDIA[file.mimetype]),
});

module.exports = { adUpload, ALLOWED_AD_MEDIA, MAX_IMAGE_BYTES };
