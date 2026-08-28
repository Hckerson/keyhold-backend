import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DisputesService } from './disputes.service';
import {
    AddEvidenceDto,
    CreateDisputeDto,
    QueryDisputeDto,
    ResolveDisputeDto,
} from './dto';
import { DisputeStatus, UserRole } from '@generated/prisma/enums';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles } from '@modules/core/auth/decorators/roles.decorator';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';
import type { AuthUser } from '@core/auth/types/auth.types';

@ApiTags('disputes')
@Controller('disputes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DisputesController {
    constructor(private readonly disputesService: DisputesService) {}

    @Post()
    @ApiOperation({ summary: 'Raise a dispute, optionally on a transaction' })
    async create(
        @CurrentUser() user: AuthUser,
        @Body() createDto: CreateDisputeDto,
    ) {
        return this.disputesService.create(user.id, createDto);
    }

    @Get()
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Dispute queue' })
    async findAll(@Query() query: QueryDisputeDto) {
        return this.disputesService.findAll(query);
    }

    @Get('mine')
    @ApiOperation({ summary: 'Disputes raised by the current user' })
    async findMine(@CurrentUser() user: AuthUser) {
        return this.disputesService.findMine(user.id);
    }

    @Get('counts')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Dispute counts by status' })
    async counts() {
        return this.disputesService.counts();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a dispute with evidence' })
    async findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        return this.disputesService.findOne(id, user.id, user.role);
    }

    @Post(':id/evidence')
    @ApiOperation({ summary: 'Attach evidence to a dispute' })
    async addEvidence(
        @Param('id') id: string,
        @CurrentUser() user: AuthUser,
        @Body() evidenceDto: AddEvidenceDto,
    ) {
        return this.disputesService.addEvidence(id, user.id, evidenceDto);
    }

    @Patch(':id/resolve')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Resolve a dispute in favour of an outcome' })
    async resolve(
        @Param('id') id: string,
        @CurrentUser() user: AuthUser,
        @Body() resolveDto: ResolveDisputeDto,
    ) {
        return this.disputesService.settle(
            id,
            DisputeStatus.RESOLVED,
            resolveDto,
            user.id,
        );
    }

    @Patch(':id/dismiss')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Dismiss a dispute with no action' })
    async dismiss(
        @Param('id') id: string,
        @CurrentUser() user: AuthUser,
        @Body() resolveDto: ResolveDisputeDto,
    ) {
        return this.disputesService.settle(
            id,
            DisputeStatus.DISMISSED,
            resolveDto,
            user.id,
        );
    }
}
