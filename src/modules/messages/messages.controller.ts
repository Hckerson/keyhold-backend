import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto';
import { JwtAuthGuard } from '@modules/core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';
import type { AuthUser } from '@core/auth/types/auth-user';

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
    constructor(private readonly messagesService: MessagesService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Send a message to buyer/seller' })
    async sendMessage(
        @CurrentUser() user: AuthUser,
        @Body() createDto: CreateMessageDto,
    ) {
        return this.messagesService.sendMessage(user.sub, createDto);
    }

    @Get('connection/:connectionId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all messages in a connection' })
    async getMessages(
        @Param('connectionId') connectionId: string,
        @CurrentUser() user: AuthUser,
    ) {
        return this.messagesService.getMessages(connectionId, user.sub);
    }

    @Get('unread/count')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get unread message count' })
    async getUnreadCount(@CurrentUser() user: AuthUser) {
        const count = await this.messagesService.getUnreadCount(user.sub);
        return { unreadCount: count };
    }
}
