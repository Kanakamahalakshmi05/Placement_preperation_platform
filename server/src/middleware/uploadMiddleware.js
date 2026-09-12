const multer = require('multer');
const path = require('path');

// Configure in-memory storage for secure and fast processing without leftover temp files
const storage = multer.memoryStorage();

// Allowed file extensions and MIME types
const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
const allowedMimeTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext) || allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file format '${ext}'. Only PDF (.pdf), Word (.docx, .doc), and text documents are supported.`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter,
});

module.exports = upload;
