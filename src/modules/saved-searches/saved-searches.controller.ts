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
import type { AuthUser } from '@core/auth/types/auth.types';
import { JwtAuthGuard } from '@modules/core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';
import { SavedSearchesService } from './saved-searches.service';
import { CreateSavedSearchDto, UpdateSavedSearchDto } from './dto';

@ApiTags('saved-searches')
@Controller('saved-searches')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SavedSearchesController {
    constructor(private readonly savedSearchesService: SavedSearchesService) {}

    @Get()
    @ApiOperation({ summary: 'List the current buyer saved searches' })
    async findAll(@CurrentUser() user: AuthUser) {
        return this.savedSearchesService.findAll(user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Read a single saved search' })
    async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        return this.savedSearchesService.findOne(user.id, id);
    }

    @Get(':id/matches')
    @ApiOperation({ summary: 'Score available properties against a search' })
    async matches(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        return this.savedSearchesService.matches(user.id, id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a saved search' })
    async create(
        @CurrentUser() user: AuthUser,
        @Body() dto: CreateSavedSearchDto,
    ) {
        return this.savedSearchesService.create(user.id, dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a saved search' })
    async update(
        @CurrentUser() user: AuthUser,
        @Param('id') id: string,
        @Body() dto: UpdateSavedSearchDto,
    ) {
        return this.savedSearchesService.update(user.id, id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete a saved search' })
    async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        return this.savedSearchesService.remove(user.id, id);
    }
}
