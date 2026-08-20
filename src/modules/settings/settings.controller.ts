import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto';
import { UserRole } from '@generated/prisma/enums';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles } from '@modules/core/auth/decorators/roles.decorator';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';
import type { AuthUser } from '@core/auth/types/auth.types';

@ApiTags('settings')
@Controller('settings')
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get()
    @ApiOperation({ summary: 'Every platform setting with its current value' })
    async findAll() {
        return this.settingsService.findAll();
    }

    @Put()
    @ApiOperation({ summary: 'Update platform settings' })
    async update(
        @CurrentUser() user: AuthUser,
        @Body() updateDto: UpdateSettingsDto,
    ) {
        return this.settingsService.update(user.id, updateDto);
    }
}
