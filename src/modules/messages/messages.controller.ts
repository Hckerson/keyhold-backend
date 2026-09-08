import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto';
import { JwtAuthGuard } from '@modules/core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';
import type { AuthUser } from '@core/auth/types/auth.types';
import {
    DOCUMENT_MIME_TYPES,
    uploadOptions,
} from '@common/config/upload.config';

const ATTACHMENT_FIELD = 'files';
export const MAX_MESSAGE_ATTACHMENTS = 5;

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
        return this.messagesService.sendMessage(user.id, createDto);
    }

    @Get('connection/:connectionId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all messages in a connection' })
    async getMessages(
        @Param('connectionId') connectionId: string,
        @CurrentUser() user: AuthUser,
    ) {
        return this.messagesService.getMessages(connectionId, user.id);
    }

    @Post(':id/attachments')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @UseInterceptors(
        FilesInterceptor(
            ATTACHMENT_FIELD,
            MAX_MESSAGE_ATTACHMENTS,
            uploadOptions(MAX_MESSAGE_ATTACHMENTS, DOCUMENT_MIME_TYPES),
        ),
    )
    @ApiOperation({ summary: 'Attach documents to a sent message' })
    async attachFiles(
        @Param('id') messageId: string,
        @CurrentUser() user: AuthUser,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        return this.messagesService.attachFiles(messageId, user.id, files);
    }

    @Get('unread/count')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get unread message count' })
    async getUnreadCount(@CurrentUser() user: AuthUser) {
        const count = await this.messagesService.getUnreadCount(user.id);
        return { unreadCount: count };
    }
}
