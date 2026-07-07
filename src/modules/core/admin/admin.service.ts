import { Injectable, BadRequestException } from '@nestjs/common';
import { UserRepo } from '@common/repos/user.repo';
import { PropertyRepo } from '@common/repos/property.repo';
import { ConnectionRepo } from '@common/repos/connection.repo';
import { OfferRepo } from '@common/repos/offer.repo';
import { TransactionRepo } from '@common/repos/transaction.repo';
import { ReviewRepo } from '@common/repos/review.repo';
import { ViewingRepo } from '@common/repos/viewing.repo';
import { MessageRepo } from '@common/repos/message.repo';

type RepoType =
    | 'users'
    | 'properties'
    | 'connections'
    | 'offers'
    | 'transactions'
    | 'reviews'
    | 'viewings'
    | 'messages';

@Injectable()
export class AdminService {
    private repos: Record<RepoType, any>;

    constructor(
        private userRepo: UserRepo,
        private propertyRepo: PropertyRepo,
        private connectionRepo: ConnectionRepo,
        private offerRepo: OfferRepo,
        private transactionRepo: TransactionRepo,
        private reviewRepo: ReviewRepo,
        private viewingRepo: ViewingRepo,
        private messageRepo: MessageRepo,
    ) {
        this.repos = {
            users: userRepo,
            properties: propertyRepo,
            connections: connectionRepo,
            offers: offerRepo,
            transactions: transactionRepo,
            reviews: reviewRepo,
            viewings: viewingRepo,
            messages: messageRepo,
        };
    }

    private getRepo(resource: RepoType) {
        if (!this.repos[resource]) {
            throw new BadRequestException(`Unknown resource: ${resource}`);
        }
        return this.repos[resource];
    }

    // Generic method to get all resources of a type
    async getAll(resource: RepoType, filters?: Record<string, any>) {
        const repo = this.getRepo(resource);
        if (typeof repo.findMany !== 'function') {
            throw new BadRequestException(
                `Resource ${resource} does not support list operation`,
            );
        }
        return repo.findMany({ where: filters || {} });
    }

    // Generic method to get a single resource detail
    async getDetail(resource: RepoType, id: string) {
        const repo = this.getRepo(resource);
        if (typeof repo.findUnique !== 'function') {
            throw new BadRequestException(
                `Resource ${resource} does not support get operation`,
            );
        }
        return repo.findUnique({ where: { id } });
    }
}
