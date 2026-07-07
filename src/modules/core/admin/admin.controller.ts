import { AdminService } from './admin.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';

// Example: Admin controller pattern
// In production, add @Roles, @UseGuards decorators for authorization
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    // Example: GET stats endpoint
    @Get('stats')
    @ApiOperation({ summary: 'Get admin dashboard statistics' })
    getStats() {
        return this.adminService.getStats();
    }

    // Example: GET all resources with filtering
    @Get('[resource]/all')
    @ApiOperation({
        summary: 'Get all resources (replace [resource] with your domain)',
    })
    getAll(@Param('resource') resource: string) {
        return this.adminService.getAll(resource);
    }

    // Example: GET single resource detail
    @Get('[resource]/:id')
    @ApiOperation({ summary: 'Get resource details by ID' })
    getDetail(@Param('resource') resource: string, @Param('id') id: string) {
        return this.adminService.getDetail(resource, id);
    }

    // Example: PATCH to update resource
    @Patch('[resource]/:id')
    @ApiOperation({ summary: 'Update resource' })
    update(
        @Param('resource') resource: string,
        @Param('id') id: string,
        @Body()
        updateData: Record<
            string,
            string | number | boolean | null | undefined
        >,
    ) {
        return this.adminService.update(resource, id, updateData);
    }

    // Example: POST action on resource
    @Post('[resource]/:id/[action]')
    @ApiOperation({ summary: 'Perform action on resource' })
    performAction(
        @Param('resource') resource: string,
        @Param('id') id: string,
        @Param('action') action: string,
        @Body()
        payload?: Record<string, string | number | boolean | null | undefined>,
    ) {
        return this.adminService.performAction(resource, id, action, payload);
    }
}
