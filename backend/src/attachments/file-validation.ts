import { BadRequestException } from '@nestjs/common';
import mime from 'mime-types';

// file-type is ESM-only; require works under Nest's commonjs build
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fileTypeFromBuffer } = require('file-type') as {
  fileTypeFromBuffer: (buffer: Uint8Array) => Promise<{ mime: string } | undefined>;
};

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const DEFAULT_ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
];

export interface FileValidationOptions {
  maxBytes?: number;
  allowedMime?: string[];
}

export async function validateUpload(
  file: Express.Multer.File,
  options: FileValidationOptions = {},
): Promise<void> {
  if (!file) throw new BadRequestException('No file uploaded');
  const maxBytes = options.maxBytes ?? Number(process.env.ATTACHMENT_MAX_BYTES || DEFAULT_MAX_BYTES);
  if (file.size > maxBytes) {
    throw new BadRequestException(`File exceeds maximum size of ${Math.round(maxBytes / 1024 / 1024)}MB`);
  }
  const allowedMime = options.allowedMime ?? (
    process.env.ATTACHMENT_ALLOWED_MIME?.split(',').map((s) => s.trim()) || DEFAULT_ALLOWED_MIME
  );
  const detected = await fileTypeFromBuffer(file.buffer);
  const mimeType = detected?.mime || file.mimetype;
  if (!allowedMime.includes(mimeType)) {
    throw new BadRequestException(`File type ${mimeType} is not allowed`);
  }
  const ext = mime.extension(mimeType);
  if (ext && file.originalname && !file.originalname.toLowerCase().endsWith(`.${ext}`)) {
    // Allow mismatch for some office docs but reject obvious spoofing for images
    if (mimeType.startsWith('image/')) {
      throw new BadRequestException('File extension does not match content type');
    }
  }
}

export function multerLimits() {
  return {
    limits: { fileSize: Number(process.env.ATTACHMENT_MAX_BYTES || DEFAULT_MAX_BYTES) },
  };
}
