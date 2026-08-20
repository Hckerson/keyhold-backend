import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OffersService } from './offers.service';
import { CreateOfferDto, RespondOfferDto } from './dto';
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
    async getOne(@Param('id') id: string) {
        return this.offersService.getOne(id);
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
}
