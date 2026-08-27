import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { IdentityDocumentRepo } from '@common/repos/kyc-document.repo';
import { UserRepo } from '@common/repos/user.repo';
import {
    CloudinaryService,
    UploadResponse,
} from '@common/services/storage/cloudinary.service';
import { VerificationStatus } from '@generated/prisma/enums';
import { QueryKycDto, RejectKycDto, SubmitKycDto } from './dto';

const DEFAULT_LIMIT = 20;
const DOCUMENT_FIELD = 'document';
const FACE_FIELD = 'face';

const APPLICANT_INCLUDE = {
    user: {
        select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            avatar: true,
            role: true,
            status: true,
            agencyName: true,
            licenseNumber: true,
            kycVerified: true,
            kycRejected: true,
            createdAt: true,
        },
    },
} satisfies Prisma.IdentityDocumentInclude;

@Injectable()
export class KycService {
    constructor(
        private identityDocumentRepo: IdentityDocumentRepo,
        private userRepo: UserRepo,
        private cloudinaryService: CloudinaryService,
    ) {}

    async submit(
        userId: string,
        submitDto: SubmitKycDto,
        files: Express.Multer.File[],
    ) {
        const document = files.find(
            (file) => file.fieldname === DOCUMENT_FIELD,
        );
        if (!document) {
            throw new BadRequestException(
                'A document image is required under the "document" field',
            );
        }

        const pending = await this.identityDocumentRepo.findFirst({
            where: { userId, status: VerificationStatus.PENDING },
            select: { id: true },
        });
        if (pending) {
            throw new BadRequestException(
                'You already have a document awaiting review',
            );
        }

        const face = files.find((file) => file.fieldname === FACE_FIELD);

        const documentUpload = await this.cloudinaryService.uploadDocument(
            document.buffer,
            `kyc-${userId}-document`,
        );
        let faceUpload: UploadResponse | null = null;

        try {
            if (face) {
                faceUpload = await this.cloudinaryService.uploadDocument(
                    face.buffer,
                    `kyc-${userId}-face`,
                );
            }

            return await this.identityDocumentRepo.create({
                data: {
                    userId,
                    documentType: submitDto.documentType,
                    documentNumber: submitDto.documentNumber,
                    issuerCountry: submitDto.issuerCountry,
                    documentImageUrl: documentUpload.url,
                    faceImageUrl: faceUpload?.url,
                    status: VerificationStatus.PENDING,
                },
            });
        } catch (error: unknown) {
            await this.cloudinaryService.deleteImage(documentUpload.publicId);
            if (faceUpload) {
                await this.cloudinaryService.deleteImage(faceUpload.publicId);
            }
            throw error;
        }
    }

    async findMine(userId: string) {
        return this.identityDocumentRepo.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findAll(query: QueryKycDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? DEFAULT_LIMIT;
        const where: Prisma.IdentityDocumentWhereInput = {
            status: query.status,
        };

        const [items, total] = await Promise.all([
            this.identityDocumentRepo.findMany({
                where,
                include: APPLICANT_INCLUDE,
                orderBy: { createdAt: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.identityDocumentRepo.count({ where }),
        ]);

        return {
            items,
            total,
            page,
            limit,
            pageCount: Math.max(1, Math.ceil(total / limit)),
        };
    }

    async counts() {
        const [pending, verified, rejected] = await Promise.all([
            this.identityDocumentRepo.count({
                where: { status: VerificationStatus.PENDING },
            }),
            this.identityDocumentRepo.count({
                where: { status: VerificationStatus.VERIFIED },
            }),
            this.identityDocumentRepo.count({
                where: { status: VerificationStatus.REJECTED },
            }),
        ]);

        const oldest = await this.identityDocumentRepo.findFirst({
            where: { status: VerificationStatus.PENDING },
            orderBy: { createdAt: 'asc' },
            select: { createdAt: true },
        });

        return {
            pending,
            verified,
            rejected,
            total: pending + verified + rejected,
            oldestPendingAt: oldest?.createdAt ?? null,
        };
    }

    async findOne(id: string) {
        const document = await this.identityDocumentRepo.findUnique({
            where: { id },
            include: APPLICANT_INCLUDE,
        });
        if (!document) throw new NotFoundException('Document not found');
        return document;
    }

    async approve(id: string) {
        const document = await this.requirePending(id);

        const [updated] = await Promise.all([
            this.identityDocumentRepo.update({
                where: { id },
                data: {
                    status: VerificationStatus.VERIFIED,
                    verifiedAt: new Date(),
                    rejectionReason: null,
                },
                include: APPLICANT_INCLUDE,
            }),
            this.userRepo.update({
                where: { id: document.userId },
                data: { kycVerified: true, kycRejected: false },
            }),
        ]);

        return updated;
    }

    async reject(id: string, rejectDto: RejectKycDto) {
        const document = await this.requirePending(id);

        const [updated] = await Promise.all([
            this.identityDocumentRepo.update({
                where: { id },
                data: {
                    status: VerificationStatus.REJECTED,
                    rejectionReason: rejectDto.rejectionReason,
                },
                include: APPLICANT_INCLUDE,
            }),
            this.userRepo.update({
                where: { id: document.userId },
                data: { kycVerified: false, kycRejected: true },
            }),
        ]);

        return updated;
    }

    private async requirePending(id: string) {
        const document = await this.identityDocumentRepo.findUnique({
            where: { id },
        });
        if (!document) throw new NotFoundException('Document not found');

        if (document.status !== VerificationStatus.PENDING) {
            throw new BadRequestException(
                'This document has already been reviewed',
            );
        }

        return document;
    }
}
