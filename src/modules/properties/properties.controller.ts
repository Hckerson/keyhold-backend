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
import { CreatePropertyDto, UpdatePropertyDto, QueryPropertyDto } from './dto';
import { JwtAuthGuard } from '@modules/core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';
import type { AuthUser } from '@core/auth/types/auth-user';

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

    @Get('seller/:sellerId')
    @ApiOperation({ summary: 'Get all properties by a seller' })
    async getBySeller(
        @Param('sellerId') sellerId: string,
        @Query() query: QueryPropertyDto,
    ) {
        return this.propertiesService.findBySeller(sellerId, query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get property by ID' })
    async getOne(@Param('id') id: string) {
        return this.propertiesService.findOne(id);
    }

    @Post(':id/view')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Record a property detail view' })
    async recordView(@Param('id') id: string) {
        return this.propertiesService.recordView(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new property listing' })
    async create(
        @CurrentUser() user: AuthUser,
        @Body() createDto: CreatePropertyDto,
    ) {
        return this.propertiesService.create(user.sub, createDto);
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
        return this.propertiesService.update(id, user.sub, updateDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a property listing' })
    async delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        return this.propertiesService.delete(id, user.sub);
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
        return this.propertiesService.uploadImages(propertyId, user.sub, files);
    }

    @Patch(':id/mark-sold')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Mark property as sold' })
    async markAsSold(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        return this.propertiesService.markAsSold(id, user.sub);
    }
}
