import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { SendLeadEmailDto } from './dto';
import { JwtAuthGuard } from '@modules/core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';
import type { AuthUser } from '@core/auth/types/auth.types';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
    constructor(private readonly contactService: ContactService) {}

    @Get(':connectionId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List every contact touch on a connection' })
    async history(
        @Param('connectionId') connectionId: string,
        @CurrentUser() user: AuthUser,
    ) {
        return this.contactService.history(connectionId, user.id);
    }

    @Post(':connectionId/email')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Email the other party without leaving the app' })
    async sendEmail(
        @Param('connectionId') connectionId: string,
        @CurrentUser() user: AuthUser,
        @Body() dto: SendLeadEmailDto,
    ) {
        return this.contactService.sendEmail(user.id, connectionId, dto);
    }

    @Post(':connectionId/call')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Ring the caller, then bridge them to the other party',
    })
    async startCall(
        @Param('connectionId') connectionId: string,
        @CurrentUser() user: AuthUser,
    ) {
        return this.contactService.startCall(user.id, connectionId);
    }
}
