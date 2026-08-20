import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { AuthUser } from '@core/auth/types/auth.types';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto';
import { JwtAuthGuard } from '@modules/core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) {}

    @Post('transaction/:transactionId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a review for a completed transaction' })
    async createReview(
        @Param('transactionId') transactionId: string,
        @CurrentUser() user: AuthUser,
        @Body() createDto: CreateReviewDto,
    ) {
        return this.reviewsService.createReview(
            transactionId,
            user.id,
            createDto,
        );
    }

    @Get('user/:userId')
    @ApiOperation({ summary: 'Get all reviews for a user' })
    async getByUser(@Param('userId') userId: string) {
        return this.reviewsService.getByUser(userId);
    }

    @Get('user/:userId/rating')
    @ApiOperation({ summary: 'Get average rating for a user' })
    async getUserRating(@Param('userId') userId: string) {
        return this.reviewsService.getUserRating(userId);
    }

    @Get('transaction/:transactionId')
    @ApiOperation({ summary: 'Get all reviews for a transaction' })
    async getByTransaction(@Param('transactionId') transactionId: string) {
        return this.reviewsService.getByTransaction(transactionId);
    }
}
