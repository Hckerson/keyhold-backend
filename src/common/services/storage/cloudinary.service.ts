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

type CloudinaryUploadResult = UploadApiResponse;

interface UploadResponse {
    url: string;
    publicId: string;
}

interface UploadSignatureResponse {
    timestamp: number;
    signature: string;
    cloudName: string;
    apiKey: string;
}

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

    private assertEnabled() {
        if (!this.enabled) {
            throw new ServiceUnavailableException(
                'Media storage is not configured on this environment',
            );
        }
    }

    async uploadPropertyImage(
        fileBuffer: Buffer,
        filename: string,
    ): Promise<UploadResponse> {
        this.assertEnabled();
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'properties',
                    resource_type: 'auto',
                    public_id: filename.split('.')[0],
                },
                (
                    error: UploadApiErrorResponse | undefined,
                    result: CloudinaryUploadResult | undefined,
                ) => {
                    if (error) {
                        const message =
                            'message' in error
                                ? error.message
                                : 'Upload failed';
                        reject(
                            new BadRequestException(
                                `Upload failed: ${message}`,
                            ),
                        );
                    } else if (result) {
                        resolve({
                            url: result.secure_url,
                            publicId: result.public_id,
                        });
                    }
                },
            );

            uploadStream.end(fileBuffer);
        });
    }

    async deleteImage(publicId: string): Promise<void> {
        this.assertEnabled();
        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (error: unknown) {
            throw new BadRequestException(
                `Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    async uploadDocument(
        fileBuffer: Buffer,
        filename: string,
    ): Promise<UploadResponse> {
        this.assertEnabled();
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'documents',
                    resource_type: 'auto',
                    public_id: filename.split('.')[0],
                },
                (
                    error: UploadApiErrorResponse | undefined,
                    result: CloudinaryUploadResult | undefined,
                ) => {
                    if (error) {
                        const message =
                            'message' in error
                                ? error.message
                                : 'Upload failed';
                        reject(
                            new BadRequestException(
                                `Upload failed: ${message}`,
                            ),
                        );
                    } else if (result) {
                        resolve({
                            url: result.secure_url,
                            publicId: result.public_id,
                        });
                    }
                },
            );

            uploadStream.end(fileBuffer);
        });
    }

    getUploadSignature(): UploadSignatureResponse {
        this.assertEnabled();
        const timestamp = Math.floor(Date.now() / 1000);
        const apiSecret = this.configService.get<string>(
            'externalServices.cloudinary.apiSecret',
        );
        const cloudName = this.configService.get<string>(
            'externalServices.cloudinary.cloudName',
        );
        const apiKey = this.configService.get<string>(
            'externalServices.cloudinary.apiKey',
        );

        const signature = cloudinary.utils.api_sign_request(
            {
                timestamp,
                folder: 'properties',
            },
            apiSecret || '',
        );

        return {
            timestamp,
            signature,
            cloudName: cloudName || '',
            apiKey: apiKey || '',
        };
    }
}
