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
import { FlagsService } from './flags.service';
import { CreateFlagDto, QueryFlagDto, ResolveFlagDto } from './dto';
import { FlagStatus, UserRole } from '@generated/prisma/enums';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles } from '@modules/core/auth/decorators/roles.decorator';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';
import type { AuthUser } from '@core/auth/types/auth.types';

@ApiTags('flags')
@Controller('flags')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FlagsController {
    constructor(private readonly flagsService: FlagsService) {}

    @Post()
    @ApiOperation({ summary: 'Report a user, property or message' })
    async create(
        @CurrentUser() user: AuthUser,
        @Body() createDto: CreateFlagDto,
    ) {
        return this.flagsService.create(user.id, createDto);
    }

    @Get()
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Moderation queue of reported items' })
    async findAll(@Query() query: QueryFlagDto) {
        return this.flagsService.findAll(query);
    }

    @Get('counts')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Moderation backlog counts' })
    async counts() {
        return this.flagsService.counts();
    }

    @Get(':id')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Get a reported item with its target' })
    async findOne(@Param('id') id: string) {
        return this.flagsService.findOne(id);
    }

    @Patch(':id/resolve')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Resolve a report after acting on it' })
    async resolve(@Param('id') id: string, @Body() resolveDto: ResolveFlagDto) {
        return this.flagsService.settle(id, FlagStatus.RESOLVED, resolveDto);
    }

    @Patch(':id/dismiss')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Dismiss a report with no action taken' })
    async dismiss(@Param('id') id: string, @Body() resolveDto: ResolveFlagDto) {
        return this.flagsService.settle(id, FlagStatus.DISMISSED, resolveDto);
    }
}
