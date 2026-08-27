import { BadRequestException } from '@nestjs/common';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
];

export const DOCUMENT_MIME_TYPES = [...IMAGE_MIME_TYPES, 'application/pdf'];

type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

export const uploadOptions = (maxFiles: number, mimeTypes: string[]) => ({
    limits: { files: maxFiles, fileSize: MAX_UPLOAD_BYTES },
    fileFilter: (
        _request: unknown,
        file: Express.Multer.File,
        callback: FileFilterCallback,
    ) => {
        if (mimeTypes.includes(file.mimetype)) {
            callback(null, true);
            return;
        }
        callback(
            new BadRequestException(
                `Unsupported file type ${file.mimetype}. Allowed: ${mimeTypes.join(', ')}`,
            ),
            false,
        );
    },
});
