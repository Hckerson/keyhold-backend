import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '@common/database/prisma.service';
import { RepoError } from '@common/errors/repo.error';

@Injectable()
export class MessageAttachmentRepo {
    constructor(private prisma: PrismaService) {}

    async findMany<T extends Prisma.MessageAttachmentFindManyArgs>(
        params: T,
    ): Promise<Prisma.MessageAttachmentGetPayload<T>[]> {
        try {
            return (await this.prisma.messageAttachment.findMany(
                params,
            )) as Prisma.MessageAttachmentGetPayload<T>[];
        } catch (error) {
            throw new RepoError('Failed to find message attachments', error);
        }
    }

    async createMany(params: Prisma.MessageAttachmentCreateManyArgs) {
        try {
            return await this.prisma.messageAttachment.createMany(params);
        } catch (error) {
            throw new RepoError('Failed to create message attachments', error);
        }
    }

    async deleteMany(params: Prisma.MessageAttachmentDeleteManyArgs) {
        try {
            return await this.prisma.messageAttachment.deleteMany(params);
        } catch (error) {
            throw new RepoError('Failed to delete message attachments', error);
        }
    }
}
