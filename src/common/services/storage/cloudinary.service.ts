import { randomBytes } from 'crypto';
import {
    Injectable,
    BadRequestException,
    Logger,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    v2 as cloudinary,
    UploadApiErrorResponse,
    UploadApiResponse,
} from 'cloudinary';

const PROPERTY_FOLDER = 'properties';
const DOCUMENT_FOLDER = 'documents';
const PUBLIC_ID_SUFFIX_BYTES = 8;
const PUBLIC_ID_STEM_LENGTH = 64;
const FALLBACK_STEM = 'file';

export interface UploadResponse {
    url: string;
    publicId: string;
}

const publicIdFor = (filename: string): string => {
    const stem =
        filename
            .replace(/\.[^./\\]+$/, '')
            .replace(/[^a-zA-Z0-9_-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, PUBLIC_ID_STEM_LENGTH) || FALLBACK_STEM;

    return `${stem}-${randomBytes(PUBLIC_ID_SUFFIX_BYTES).toString('hex')}`;
};

@Injectable()
export class CloudinaryService {
    private readonly logger = new Logger(CloudinaryService.name);
    private readonly enabled: boolean;

    constructor(private configService: ConfigService) {
        const cloudName = this.configService.get<string>(
            'externalServices.cloudinary.cloudName',
        );
        const apiKey = this.configService.get<string>(
            'externalServices.cloudinary.apiKey',
        );
        const apiSecret = this.configService.get<string>(
            'externalServices.cloudinary.apiSecret',
        );

        this.enabled = Boolean(cloudName && apiKey && apiSecret);

        if (this.enabled) {
            cloudinary.config({
                cloud_name: cloudName,
                api_key: apiKey,
                api_secret: apiSecret,
            });
        } else {
            this.logger.warn(
                'Cloudinary credentials not configured — media upload is disabled',
            );
        }
    }

    private upload(
        fileBuffer: Buffer,
        filename: string,
        folder: string,
    ): Promise<UploadResponse> {
        if (!this.enabled) {
            throw new ServiceUnavailableException(
                'Media storage is not configured on this environment',
            );
        }

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: 'auto',
                    public_id: publicIdFor(filename),
                    overwrite: false,
                },
                (
                    error: UploadApiErrorResponse | undefined,
                    result: UploadApiResponse | undefined,
                ) => {
                    if (error) {
                        reject(
                            new BadRequestException(
                                `Upload failed: ${error.message}`,
                            ),
                        );
                        return;
                    }
                    if (!result) {
                        reject(
                            new BadRequestException(
                                'Upload failed: no result returned',
                            ),
                        );
                        return;
                    }
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                    });
                },
            );

            uploadStream.end(fileBuffer);
        });
    }

    async uploadPropertyImage(
        fileBuffer: Buffer,
        filename: string,
    ): Promise<UploadResponse> {
        return this.upload(fileBuffer, filename, PROPERTY_FOLDER);
    }

    async uploadDocument(
        fileBuffer: Buffer,
        filename: string,
    ): Promise<UploadResponse> {
        return this.upload(fileBuffer, filename, DOCUMENT_FOLDER);
    }

    async deleteImage(publicId: string): Promise<void> {
        if (!this.enabled) return;
        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (error: unknown) {
            this.logger.error(
                `Failed to delete ${publicId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }
}
