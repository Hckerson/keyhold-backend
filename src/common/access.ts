import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConnectionStatus } from '@generated/prisma/enums';

export function assertConnectionParty(
    connection: { buyerId: string; sellerId: string },
    userId: string,
) {
    if (connection.buyerId !== userId && connection.sellerId !== userId) {
        throw new ForbiddenException('You are not part of this connection');
    }
}

export function assertConnectionAccepted(connection: {
    status: ConnectionStatus;
}) {
    if (connection.status !== ConnectionStatus.ACCEPTED) {
        throw new BadRequestException('This connection must be accepted first');
    }
}
