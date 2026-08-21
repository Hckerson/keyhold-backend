import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { AuthUser } from '@core/auth/types/auth.types';
import { SavedPropertiesService } from './saved-properties.service';
import { JwtAuthGuard } from '@modules/core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';

@ApiTags('saved-properties')
@Controller('saved-properties')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SavedPropertiesController {
    constructor(
        private readonly savedPropertiesService: SavedPropertiesService,
    ) {}

    @Get()
    @ApiOperation({ summary: 'List the current buyer saved properties' })
    async findAll(@CurrentUser() user: AuthUser) {
        return this.savedPropertiesService.findAll(user.id);
    }

    @Get('ids')
    @ApiOperation({ summary: 'List saved property IDs for quick lookups' })
    async findIds(@CurrentUser() user: AuthUser) {
        return this.savedPropertiesService.findIds(user.id);
    }

    @Post(':propertyId')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Save a property' })
    async save(
        @CurrentUser() user: AuthUser,
        @Param('propertyId') propertyId: string,
    ) {
        return this.savedPropertiesService.save(user.id, propertyId);
    }

    @Delete(':propertyId')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Remove a saved property' })
    async unsave(
        @CurrentUser() user: AuthUser,
        @Param('propertyId') propertyId: string,
    ) {
        return this.savedPropertiesService.unsave(user.id, propertyId);
    }
}
