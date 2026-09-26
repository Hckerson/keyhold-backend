import { UsersService } from './users.service';
import { UserRole } from 'generated/prisma/enums';
import {
    CreateUserDto,
    UpdateUserDto,
    UpdateProfileDto,
    SetUserTierDto,
    UserDto,
} from './dto';
import { ApiEnvelope } from '@common/decorators/api-envelope.decorator';
import { RolesGuard } from '@core/auth/guards/roles.guard';
import { Roles } from '@core/auth/decorators/roles.decorator';
import { CurrentUser } from '@core/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@core/auth/guards/jwt-auth.guard';
import type { AuthUser } from '@core/auth/types/auth.types';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IMAGE_MIME_TYPES, uploadOptions } from '@common/config/upload.config';

const AVATAR_FIELD = 'file';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    @Roles(UserRole.ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Create a new user (Admin only)' })
    @ApiEnvelope(UserDto, { status: 201 })
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.createFromAdmin(createUserDto);
    }

    @Get()
    @Roles(UserRole.ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Get all users (Admin only)' })
    @ApiEnvelope(UserDto, { isArray: true })
    findAll() {
        return this.usersService.findAll();
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiEnvelope(UserDto)
    getMe(@CurrentUser() user: AuthUser) {
        return this.usersService.findOne(user.id);
    }

    @Patch('me')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Update current user profile' })
    updateMe(
        @CurrentUser() user: AuthUser,
        @Body() updateProfileDto: UpdateProfileDto,
    ) {
        return this.usersService.updateProfile(user.id, updateProfileDto);
    }

    @Post('me/avatar')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileInterceptor(AVATAR_FIELD, uploadOptions(1, IMAGE_MIME_TYPES)),
    )
    @ApiOperation({ summary: 'Upload the current user profile photo' })
    uploadAvatar(
        @CurrentUser() user: AuthUser,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.usersService.uploadAvatar(user.id, file);
    }

    @Get('tiers/distribution')
    @Roles(UserRole.ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Membership tier distribution (Admin only)' })
    tierDistribution() {
        return this.usersService.tierDistribution();
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get user by ID' })
    findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        return this.usersService.findVisible(id, user.id, user.role);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Update user (Admin only)' })
    @ApiEnvelope(UserDto)
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.updateFromAdmin(id, updateUserDto);
    }

    @Patch(':id/tier')
    @Roles(UserRole.ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Set a user membership tier (Admin only)' })
    setTier(@Param('id') id: string, @Body() dto: SetUserTierDto) {
        return this.usersService.setTier(id, dto.tier);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Delete user (Admin only)' })
    @ApiEnvelope(UserDto)
    remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }
}
