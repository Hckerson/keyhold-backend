import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ViewingsService } from './viewings.service';
import {
    CreateViewingDto,
    ConfirmViewingDto,
    RescheduleViewingDto,
} from './dto';
import { ViewingStatus } from '@generated/prisma/enums';
import { JwtAuthGuard } from '@modules/core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';
import type { AuthUser } from '@core/auth/types/auth.types';

@ApiTags('viewings')
@Controller('viewings')
export class ViewingsController {
    constructor(private readonly viewingsService: ViewingsService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Request or propose viewing times' })
    async requestViewing(
        @CurrentUser() user: AuthUser,
        @Body() createDto: CreateViewingDto,
    ) {
        return this.viewingsService.requestViewing(user.id, createDto);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get viewing details' })
    async getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        return this.viewingsService.getOne(id, user.id);
    }

    @Get('connection/:connectionId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all viewings for a connection' })
    async getByConnection(
        @Param('connectionId') connectionId: string,
        @CurrentUser() user: AuthUser,
    ) {
        return this.viewingsService.getByConnection(connectionId, user.id);
    }

    @Patch(':id/confirm')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Confirm a proposed viewing time' })
    async confirmViewing(
        @Param('id') id: string,
        @CurrentUser() user: AuthUser,
        @Body() body: ConfirmViewingDto,
    ) {
        return this.viewingsService.confirmViewing(
            id,
            user.id,
            body.confirmedTime,
        );
    }

    @Patch(':id/reschedule')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Propose new times and reopen the viewing' })
    async reschedule(
        @Param('id') id: string,
        @CurrentUser() user: AuthUser,
        @Body() body: RescheduleViewingDto,
    ) {
        return this.viewingsService.reschedule(id, user.id, body.proposedTimes);
    }

    @Patch(':id/cancel')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cancel a viewing' })
    async cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        return this.viewingsService.updateStatus(
            id,
            user.id,
            ViewingStatus.CANCELLED,
        );
    }
}
