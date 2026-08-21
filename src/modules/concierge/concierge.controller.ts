import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@generated/prisma/enums';
import type { AuthUser } from '@core/auth/types/auth.types';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles } from '@modules/core/auth/decorators/roles.decorator';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';
import { ConciergeService } from './concierge.service';
import {
    CreateConciergeClientDto,
    UpdateConciergeClientDto,
    CreateConciergeServiceDto,
    CreateConciergePracticeDto,
} from './dto';

@ApiTags('concierge')
@Controller('concierge')
@Roles(UserRole.SELLER, UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ConciergeController {
    constructor(private readonly conciergeService: ConciergeService) {}

    @Get('overview')
    @ApiOperation({ summary: 'Concierge book totals for the current agent' })
    async overview(@CurrentUser() user: AuthUser) {
        return this.conciergeService.overview(user.id);
    }

    @Get('clients')
    @ApiOperation({ summary: 'List the concierge clients for the agent' })
    async findClients(@CurrentUser() user: AuthUser) {
        return this.conciergeService.findClients(user.id);
    }

    @Get('clients/:id')
    @ApiOperation({ summary: 'Read a single concierge client' })
    async findClient(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        return this.conciergeService.findClient(user.id, id);
    }

    @Post('clients')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Add a client to the concierge book' })
    async createClient(
        @CurrentUser() user: AuthUser,
        @Body() dto: CreateConciergeClientDto,
    ) {
        return this.conciergeService.createClient(user.id, dto);
    }

    @Patch('clients/:id')
    @ApiOperation({ summary: 'Update a concierge client' })
    async updateClient(
        @CurrentUser() user: AuthUser,
        @Param('id') id: string,
        @Body() dto: UpdateConciergeClientDto,
    ) {
        return this.conciergeService.updateClient(user.id, id, dto);
    }

    @Delete('clients/:id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Remove a client from the concierge book' })
    async removeClient(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        return this.conciergeService.removeClient(user.id, id);
    }

    @Get('services')
    @ApiOperation({ summary: 'List the service catalogue with open load' })
    async findServices(@CurrentUser() user: AuthUser) {
        return this.conciergeService.findServices(user.id);
    }

    @Post('services')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create or update a catalogue service' })
    async createService(
        @CurrentUser() user: AuthUser,
        @Body() dto: CreateConciergeServiceDto,
    ) {
        return this.conciergeService.createService(user.id, dto);
    }

    @Get('practices')
    @ApiOperation({ summary: 'List standing practices with coverage counts' })
    async findPractices(@CurrentUser() user: AuthUser) {
        return this.conciergeService.findPractices(user.id);
    }

    @Post('practices')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create or update a standing practice' })
    async createPractice(
        @CurrentUser() user: AuthUser,
        @Body() dto: CreateConciergePracticeDto,
    ) {
        return this.conciergeService.createPractice(user.id, dto);
    }

    @Post('practices/:practiceId/clients/:clientId')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Cover a concierge client with a practice' })
    async coverPractice(
        @CurrentUser() user: AuthUser,
        @Param('practiceId') practiceId: string,
        @Param('clientId') clientId: string,
    ) {
        return this.conciergeService.coverPractice(
            user.id,
            practiceId,
            clientId,
        );
    }
}
