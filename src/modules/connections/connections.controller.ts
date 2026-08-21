import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    UseGuards,
    ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConnectionsService } from './connections.service';
import { CreateConnectionDto } from './dto';
import { JwtAuthGuard } from '@modules/core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';
import type { AuthUser } from '@core/auth/types/auth.types';

@ApiTags('connections')
@Controller('connections')
export class ConnectionsController {
    constructor(private readonly connectionsService: ConnectionsService) {}

    @Get('my-interests')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get all properties user has expressed interest in',
    })
    async getMyInterests(@CurrentUser() user: AuthUser) {
        return this.connectionsService.getByBuyer(user.id);
    }

    @Get('incoming')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all incoming interest from buyers' })
    async getIncoming(@CurrentUser() user: AuthUser) {
        return this.connectionsService.getBySeller(user.id);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get connection details' })
    async getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        const connection = await this.connectionsService.getOne(id);
        // Verify user has access
        if (connection.buyerId !== user.id && connection.sellerId !== user.id) {
            throw new ForbiddenException(
                'You do not have access to this connection',
            );
        }
        return connection;
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Express interest in a property' })
    async expressInterest(
        @CurrentUser() user: AuthUser,
        @Body() createDto: CreateConnectionDto,
    ) {
        return this.connectionsService.expressInterest(user.id, createDto);
    }

    @Patch(':id/accept')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Accept buyer interest' })
    async acceptConnection(
        @Param('id') id: string,
        @CurrentUser() user: AuthUser,
    ) {
        return this.connectionsService.acceptConnection(id, user.id);
    }

    @Patch(':id/reject')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Reject buyer interest' })
    async rejectConnection(
        @Param('id') id: string,
        @CurrentUser() user: AuthUser,
    ) {
        return this.connectionsService.rejectConnection(id, user.id);
    }
}
