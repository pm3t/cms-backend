import multer from 'multer';
import path from 'path';
import fs from 'fs';

// ─── Member Photos ─────────────────────────────────────────────────────────────

const photoUploadsDir = path.join(process.cwd(), 'uploads', 'member-photos');
if (!fs.existsSync(photoUploadsDir)) {
    fs.mkdirSync(photoUploadsDir, { recursive: true });
}

const photoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, photoUploadsDir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, unique);
    }
});

const imageFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPG, PNG, WEBP, GIF) are allowed.'));
    }
};

export const photoUpload = multer({
    storage: photoStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// ─── Transaction Receipts ────────────────────────────────────────────────────────

const receiptUploadsDir = path.join(process.cwd(), 'uploads', 'receipts');
if (!fs.existsSync(receiptUploadsDir)) {
    fs.mkdirSync(receiptUploadsDir, { recursive: true });
}

const receiptStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, receiptUploadsDir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, unique);
    }
});

export const receiptUpload = multer({
    storage: receiptStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// ─── Document Library Files ────────────────────────────────────────────────────

const DOCUMENT_ALLOWED_MIME = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Audio
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'audio/wav',
    // Video
    'video/mp4',
    'video/webm',
    'video/ogg',
    // Images
    'image/jpeg',
    'image/png',
    'image/webp',
];

const documentStorage = multer.diskStorage({
    destination: (req: any, _file, cb) => {
        // Store per-tenant for isolation
        const tenantId = req.user?.tenantId || 'unknown';
        const dir = path.join(process.cwd(), 'uploads', 'documents', tenantId);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, unique);
    }
});

const documentFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (DOCUMENT_ALLOWED_MIME.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('File type not allowed. Supported: PDF, DOCX, PPTX, MP3, MP4, JPG, PNG.'));
    }
};

export const documentUpload = multer({
    storage: documentStorage,
    fileFilter: documentFileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
});
