import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    HttpCode,
    HttpStatus,
    UseGuards,
    UseInterceptors,
    UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import {
    CreatePropertyDto,
    UpdatePropertyDto,
    QueryPropertyDto,
    FacetsPropertyDto,
    ModeratePropertyDto,
} from './dto';
import {
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RolesGuard,
} from '@modules/core/auth/guards';
import { Roles } from '@modules/core/auth/decorators/roles.decorator';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';
import type { AuthUser } from '@core/auth/types/auth.types';
import { UserRole } from '@generated/prisma/enums';

@ApiTags('properties')
@Controller('properties')
export class PropertiesController {
    constructor(private readonly propertiesService: PropertiesService) {}

    @Get()
    @ApiOperation({ summary: 'Get a paginated, filtered page of properties' })
    async getAll(@Query() query: QueryPropertyDto) {
        return this.propertiesService.findAll(query);
    }

    @Get('search')
    @ApiOperation({
        summary: 'Search properties by title, description, or address',
    })
    async search(@Query('q') query: string, @Query('limit') limit?: string) {
        return this.propertiesService.search(
            query,
            limit ? parseInt(limit) : undefined,
        );
    }

    @Post('facets')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Count matching properties per filter option' })
    async facets(@Body() dto: FacetsPropertyDto) {
        return this.propertiesService.facets(dto);
    }

    @Get('seller/:sellerId')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'Get all properties by a seller' })
    async getBySeller(
        @Param('sellerId') sellerId: string,
        @Query() query: QueryPropertyDto,
        @CurrentUser() user?: AuthUser,
    ) {
        const privileged =
            user?.id === sellerId || user?.role === UserRole.ADMIN;
        return this.propertiesService.findBySeller(sellerId, query, privileged);
    }

    @Get(':id')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'Get property by ID' })
    async getOne(@Param('id') id: string, @CurrentUser() user?: AuthUser) {
        return this.propertiesService.findOne(id, user);
    }

    @Post(':id/view')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Record a property detail view' })
    async recordView(@Param('id') id: string) {
        return this.propertiesService.recordView(id);
    }

    @Post()
    @Roles(UserRole.SELLER, UserRole.ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new property listing' })
    async create(
        @CurrentUser() user: AuthUser,
        @Body() createDto: CreatePropertyDto,
    ) {
        return this.propertiesService.create(user.id, createDto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update property details' })
    async update(
        @Param('id') id: string,
        @CurrentUser() user: AuthUser,
        @Body() updateDto: UpdatePropertyDto,
    ) {
        return this.propertiesService.update(id, user.id, updateDto);
    }

    @Patch(':id/moderate')
    @Roles(UserRole.ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Approve, return or reject a listing' })
    async moderate(
        @Param('id') id: string,
        @CurrentUser() user: AuthUser,
        @Body() moderateDto: ModeratePropertyDto,
    ) {
        return this.propertiesService.moderate(id, user.id, moderateDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a property listing' })
    async delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        return this.propertiesService.delete(id, user.id);
    }

    @Post(':id/images')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @UseInterceptors(FilesInterceptor('files', 10))
    @ApiOperation({ summary: 'Upload property images' })
    async uploadImages(
        @Param('id') propertyId: string,
        @CurrentUser() user: AuthUser,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        return this.propertiesService.uploadImages(propertyId, user.id, files);
    }

    @Patch(':id/mark-sold')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Mark property as sold' })
    async markAsSold(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        return this.propertiesService.markAsSold(id, user.id);
    }
}
