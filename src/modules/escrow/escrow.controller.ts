import {
    Controller,
    Get,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EscrowService } from './escrow.service';
import { QueryEscrowDto, RefundEscrowDto } from './dto';
import { UserRole } from '@generated/prisma/enums';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles } from '@modules/core/auth/decorators/roles.decorator';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';
import type { AuthUser } from '@core/auth/types/auth.types';

@ApiTags('escrow')
@Controller('escrow')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EscrowController {
    constructor(private readonly escrowService: EscrowService) {}

    @Get()
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Escrow holds across the platform' })
    async findAll(@Query() query: QueryEscrowDto) {
        return this.escrowService.findAll(query);
    }

    @Get('stages')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Value and count held at each escrow stage' })
    async stages() {
        return this.escrowService.stages();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get one escrow hold' })
    async findOne(@Param('id') id: string) {
        return this.escrowService.findOne(id);
    }

    @Patch(':id/release')
    @ApiOperation({ summary: 'Release funds and settle the transaction' })
    async release(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        return this.escrowService.release(id, user.id, user.role);
    }

    @Patch(':id/refund')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Refund a held payment and cancel the sale' })
    async refund(@Param('id') id: string, @Body() refundDto: RefundEscrowDto) {
        return this.escrowService.refund(id, refundDto);
    }
}
