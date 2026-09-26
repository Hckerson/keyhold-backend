import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { newsletterThrottle } from '@common/config/throttle.config';
import { NewsletterService } from './newsletter.service';
import { NewsletterTokenDto, SubscribeNewsletterDto } from './dto';

@ApiTags('newsletter')
@Controller('newsletter')
export class NewsletterController {
    constructor(private readonly newsletterService: NewsletterService) {}

    @Throttle(newsletterThrottle)
    @Post('subscribe')
    @HttpCode(HttpStatus.ACCEPTED)
    @ApiOperation({ summary: 'Ask for a newsletter confirmation email' })
    @ApiResponse({
        status: 202,
        description: 'The same body whatever the state of the address',
    })
    @ApiResponse({
        status: 503,
        description: 'The confirmation email could not be sent',
    })
    async subscribe(@Body() dto: SubscribeNewsletterDto) {
        return this.newsletterService.subscribe(dto);
    }

    @Throttle(newsletterThrottle)
    @Post('confirm')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Confirm a pending newsletter subscription' })
    @ApiResponse({ status: 404, description: 'Invalid or used link' })
    async confirm(@Body() dto: NewsletterTokenDto) {
        return this.newsletterService.confirm(dto.token);
    }

    @Throttle(newsletterThrottle)
    @Post('unsubscribe')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Leave the newsletter list' })
    @ApiResponse({ status: 404, description: 'Unknown link' })
    async unsubscribe(@Body() dto: NewsletterTokenDto) {
        return this.newsletterService.unsubscribe(dto.token);
    }
}
