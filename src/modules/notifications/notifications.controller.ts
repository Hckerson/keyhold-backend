import {
    Controller,
    Get,
    Patch,
    Put,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { QueryNotificationDto, UpdatePreferencesDto } from './dto';
import { JwtAuthGuard } from '@modules/core/auth/guards';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';
import type { AuthUser } from '@core/auth/types/auth.types';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get()
    @ApiOperation({ summary: 'Notifications for the current user' })
    async findAll(
        @CurrentUser() user: AuthUser,
        @Query() query: QueryNotificationDto,
    ) {
        return this.notificationsService.findAll(user.id, query);
    }

    @Get('unread/count')
    @ApiOperation({ summary: 'Unread notification count' })
    async unreadCount(@CurrentUser() user: AuthUser) {
        const count = await this.notificationsService.unreadCount(user.id);
        return { count };
    }

    @Get('preferences')
    @ApiOperation({ summary: 'Notification preferences for every type' })
    async findPreferences(@CurrentUser() user: AuthUser) {
        return this.notificationsService.findPreferences(user.id);
    }

    @Put('preferences')
    @ApiOperation({ summary: 'Replace notification preferences' })
    async updatePreferences(
        @CurrentUser() user: AuthUser,
        @Body() updateDto: UpdatePreferencesDto,
    ) {
        return this.notificationsService.updatePreferences(user.id, updateDto);
    }

    @Patch('read-all')
    @ApiOperation({ summary: 'Mark every notification as read' })
    async markAllRead(@CurrentUser() user: AuthUser) {
        return this.notificationsService.markAllRead(user.id);
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Mark one notification as read' })
    async markRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        return this.notificationsService.markRead(id, user.id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remove a notification' })
    async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        return this.notificationsService.remove(id, user.id);
    }
}
