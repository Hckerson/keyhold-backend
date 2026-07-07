import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto';
import { JwtAuthGuard } from '@modules/core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';
import type { AuthUser } from '@core/auth/types/auth-user';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Initiate transaction and create Stripe payment intent',
    })
    async initiateTransaction(
        @CurrentUser() user: AuthUser,
        @Body() createDto: CreateTransactionDto,
    ) {
        return this.transactionsService.initiateTransaction(
            user.sub,
            createDto,
        );
    }

    @Post(':id/confirm-payment')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Confirm payment and complete transaction' })
    async confirmPayment(
        @Param('id') id: string,
        @CurrentUser() user: AuthUser,
        @Body() body: { paymentIntentId: string },
    ) {
        return this.transactionsService.confirmPayment(
            id,
            user.sub,
            body.paymentIntentId,
        );
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get transaction details' })
    async getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        return this.transactionsService.getOne(id, user.sub);
    }

    @Get('my/purchases')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all buyer transactions' })
    async getMyPurchases(@CurrentUser() user: AuthUser) {
        return this.transactionsService.getByBuyer(user.sub);
    }

    @Get('my/sales')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all seller transactions' })
    async getMySales(@CurrentUser() user: AuthUser) {
        return this.transactionsService.getBySeller(user.sub);
    }
}
