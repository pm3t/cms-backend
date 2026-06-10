import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import fs from 'fs';
import { s3Client, isS3Configured, S3_BUCKET_NAME } from '../../lib/s3';

const s3Acl = process.env.S3_ACL || 'public-read';

// Helper to sanitize files and ensure unique names
const getUniqueFilename = (file: Express.Multer.File) => {
    const ext = path.extname(file.originalname).toLowerCase();
    return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
};

const imageFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPG, PNG, WEBP, GIF) are allowed.'));
    }
};

// ─── Member Photos ─────────────────────────────────────────────────────────────

const photoUploadsDir = path.join(process.cwd(), 'uploads', 'member-photos');

const localPhotoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        if (!fs.existsSync(photoUploadsDir)) {
            fs.mkdirSync(photoUploadsDir, { recursive: true });
        }
        cb(null, photoUploadsDir);
    },
    filename: (_req, file, cb) => {
        cb(null, getUniqueFilename(file));
    }
});

const s3PhotoStorage = isS3Configured && s3Client
    ? multerS3({
          s3: s3Client,
          bucket: S3_BUCKET_NAME,
          acl: s3Acl,
          contentType: multerS3.AUTO_CONTENT_TYPE,
          metadata: (_req, file, cb) => {
              cb(null, { fieldName: file.fieldname });
          },
          key: (_req, file, cb) => {
              cb(null, `member-photos/${getUniqueFilename(file)}`);
          }
      })
    : null;

export const photoUpload = multer({
    storage: s3PhotoStorage || localPhotoStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// ─── Transaction Receipts ────────────────────────────────────────────────────────

const receiptUploadsDir = path.join(process.cwd(), 'uploads', 'receipts');

const localReceiptStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        if (!fs.existsSync(receiptUploadsDir)) {
            fs.mkdirSync(receiptUploadsDir, { recursive: true });
        }
        cb(null, receiptUploadsDir);
    },
    filename: (_req, file, cb) => {
        cb(null, getUniqueFilename(file));
    }
});

const s3ReceiptStorage = isS3Configured && s3Client
    ? multerS3({
          s3: s3Client,
          bucket: S3_BUCKET_NAME,
          acl: s3Acl,
          contentType: multerS3.AUTO_CONTENT_TYPE,
          metadata: (_req, file, cb) => {
              cb(null, { fieldName: file.fieldname });
          },
          key: (_req, file, cb) => {
              cb(null, `receipts/${getUniqueFilename(file)}`);
          }
      })
    : null;

export const receiptUpload = multer({
    storage: s3ReceiptStorage || localReceiptStorage,
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

const localDocumentStorage = multer.diskStorage({
    destination: (req: any, _file, cb) => {
        const tenantId = req.user?.tenantId || 'unknown';
        const dir = path.join(process.cwd(), 'uploads', 'documents', tenantId);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        cb(null, getUniqueFilename(file));
    }
});

const s3DocumentStorage = isS3Configured && s3Client
    ? multerS3({
          s3: s3Client,
          bucket: S3_BUCKET_NAME,
          acl: s3Acl,
          contentType: multerS3.AUTO_CONTENT_TYPE,
          metadata: (_req, file, cb) => {
              cb(null, { fieldName: file.fieldname });
          },
          key: (req: any, file, cb) => {
              const tenantId = req.user?.tenantId || 'unknown';
              cb(null, `documents/${tenantId}/${getUniqueFilename(file)}`);
          }
      })
    : null;

const documentFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (DOCUMENT_ALLOWED_MIME.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('File type not allowed. Supported: PDF, DOCX, PPTX, MP3, MP4, JPG, PNG.'));
    }
};

export const documentUpload = multer({
    storage: s3DocumentStorage || localDocumentStorage,
    fileFilter: documentFileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
});

export function getUploadUrl(file: any, defaultLocalPath: string): string {
    if (!file) return '';
    if (file.location) {
        if (file.location.includes('backblazeb2.com')) {
            const bucket = process.env.S3_BUCKET_NAME || 'eklesia-uploads';
            const endpoint = process.env.S3_ENDPOINT || '';
            const podMatch = endpoint.match(/us-east-(\d+)/) || file.location.match(/us-east-(\d+)/);
            const podNumber = podMatch ? podMatch[1] : '005';
            return `https://f${podNumber}.backblazeb2.com/file/${bucket}/${file.key}`;
        }
        return file.location;
    }
    return defaultLocalPath;
}

