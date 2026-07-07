import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { ReviewRepo } from '@common/repos/review.repo';
import { TransactionRepo } from '@common/repos/transaction.repo';
import { PrismaService } from '@common/database/prisma.service';
import { CreateReviewDto } from './dto';

@Injectable()
export class ReviewsService {
    constructor(
        private reviewRepo: ReviewRepo,
        private transactionRepo: TransactionRepo,
        private prisma: PrismaService,
    ) {}

    async createReview(
        transactionId: string,
        userId: string,
        createDto: CreateReviewDto,
    ) {
        const transaction = await this.transactionRepo.findUnique({
            where: { id: transactionId },
        });
        if (!transaction) throw new NotFoundException('Transaction not found');

        if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
            throw new ForbiddenException(
                'You are not part of this transaction',
            );
        }

        const revieweeId =
            transaction.buyerId === userId
                ? transaction.sellerId
                : transaction.buyerId;

        const existing = await this.reviewRepo.findUnique({
            where: {
                transactionId_reviewerId: {
                    transactionId,
                    reviewerId: userId,
                },
            },
        });

        if (existing) {
            throw new BadRequestException(
                'You have already reviewed this transaction',
            );
        }

        return this.reviewRepo.create({
            data: {
                transactionId,
                reviewerId: userId,
                revieweeId,
                rating: createDto.rating,
                comment: createDto.comment,
            },
            include: {
                reviewer: { select: { id: true, fullName: true } },
                reviewee: { select: { id: true, fullName: true } },
            },
        });
    }

    async getByUser(userId: string) {
        return this.reviewRepo.findMany({
            where: { revieweeId: userId },
            include: {
                reviewer: { select: { id: true, fullName: true } },
                transaction: {
                    select: {
                        property: { select: { id: true, title: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getUserRating(userId: string) {
        const result = await this.prisma.review.aggregate({
            where: { revieweeId: userId },
            _avg: { rating: true },
            _count: true,
        });
        return {
            averageRating: result._avg.rating || 0,
            reviewCount: result._count,
        };
    }

    async getByTransaction(transactionId: string) {
        return this.reviewRepo.findMany({
            where: { transactionId },
            include: {
                reviewer: { select: { id: true, fullName: true } },
                reviewee: { select: { id: true, fullName: true } },
            },
        });
    }
}
