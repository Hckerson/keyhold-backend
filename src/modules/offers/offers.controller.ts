import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OffersService } from './offers.service';
import { CreateOfferDto, RespondOfferDto, UpdateMilestoneDto } from './dto';
import { MilestoneKind } from '@generated/prisma/enums';
import {
    DOCUMENT_MIME_TYPES,
    uploadOptions,
} from '@common/config/upload.config';
import { JwtAuthGuard } from '@modules/core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';
import type { AuthUser } from '@core/auth/types/auth.types';

@ApiTags('offers')
@Controller('offers')
export class OffersController {
    constructor(private readonly offersService: OffersService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Make a purchase offer' })
    async makeOffer(
        @CurrentUser() user: AuthUser,
        @Body() createDto: CreateOfferDto,
    ) {
        return this.offersService.makeOffer(user.id, createDto);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get offer details' })
    async getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
        return this.offersService.getOne(id, user.id, user.role);
    }

    @Get('connection/:connectionId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all offers for a connection' })
    async getByConnection(
        @Param('connectionId') connectionId: string,
        @CurrentUser() user: AuthUser,
    ) {
        return this.offersService.getByConnection(connectionId, user.id);
    }

    @Patch(':id/accept-counter')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Buyer accepts the seller counter' })
    async acceptCounter(
        @Param('id') id: string,
        @CurrentUser() user: AuthUser,
    ) {
        return this.offersService.acceptCounter(id, user.id);
    }

    @Patch(':id/respond')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Accept, reject, or counter offer' })
    async respondToOffer(
        @Param('id') id: string,
        @CurrentUser() user: AuthUser,
        @Body() respondDto: RespondOfferDto,
    ) {
        return this.offersService.respondToOffer(id, user.id, respondDto);
    }

    @Get(':id/milestones')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Post-acceptance milestones for an offer' })
    async getMilestones(
        @Param('id') id: string,
        @CurrentUser() user: AuthUser,
    ) {
        return this.offersService.getMilestones(id, user.id);
    }

    @Patch(':id/milestones/:kind')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Set a milestone date, status or value' })
    async updateMilestone(
        @Param('id') id: string,
        @Param('kind') kind: MilestoneKind,
        @CurrentUser() user: AuthUser,
        @Body() updateDto: UpdateMilestoneDto,
    ) {
        return this.offersService.updateMilestone(id, kind, user.id, updateDto);
    }

    @Post(':id/milestones/:kind/document')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @UseInterceptors(
        FileInterceptor('file', uploadOptions(1, DOCUMENT_MIME_TYPES)),
    )
    @ApiOperation({ summary: 'Attach a report or document to a milestone' })
    async attachMilestoneDocument(
        @Param('id') id: string,
        @Param('kind') kind: MilestoneKind,
        @CurrentUser() user: AuthUser,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.offersService.attachMilestoneDocument(
            id,
            kind,
            user.id,
            file,
        );
    }
}
