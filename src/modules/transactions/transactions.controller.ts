import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, QueryTransactionDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles } from '@modules/core/auth/decorators/roles.decorator';
import { UserRole } from '@generated/prisma/enums';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';
import type { AuthUser } from '@core/auth/types/auth.types';

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
        return this.transactionsService.initiateTransaction(user.id, createDto);
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
            user.id,
            body.paymentIntentId,
        );
    }

    @Get()
    @Roles(UserRole.ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Every transaction on the platform' })
    async findAll(@Query() query: QueryTransactionDto) {
        return this.transactionsService.findAll(query);
    }

    @Get('stages')
    @Roles(UserRole.ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Transaction count and volume by status' })
    async stages() {
        return this.transactionsService.stages();
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get transaction details' })
    async getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        return this.transactionsService.getOne(id, user.id);
    }

    @Get('my/purchases')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all buyer transactions' })
    async getMyPurchases(@CurrentUser() user: AuthUser) {
        return this.transactionsService.getByBuyer(user.id);
    }

    @Get('my/sales')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all seller transactions' })
    async getMySales(@CurrentUser() user: AuthUser) {
        return this.transactionsService.getBySeller(user.id);
    }
}
