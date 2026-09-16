import {
    Controller,
    Delete,
    Get,
    Query,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { UserRole } from '@generated/prisma/enums';
import { DEFAULT_FRONTEND_URL } from '@common/enums';
import {
    clearOAuthStateCookie,
    oauthStateFrom,
    setOAuthStateCookie,
} from '@common/config/session-cookie';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles } from '@modules/core/auth/decorators/roles.decorator';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';
import type { AuthUser } from '@core/auth/types/auth.types';
import { CalendarConnectError, CalendarService } from './calendar.service';

const RETURN_PATH = '/agent/calendar';
const OUTCOME_PARAM = 'calendar';

@ApiTags('calendar')
@Controller('calendar/google')
export class CalendarController {
    private readonly frontendUrl: string;

    constructor(
        private readonly calendarService: CalendarService,
        configService: ConfigService,
    ) {
        this.frontendUrl =
            configService.get<string>('FRONTEND_URL') ?? DEFAULT_FRONTEND_URL;
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Whether Google Calendar sync is connected' })
    status(@CurrentUser() user: AuthUser) {
        return this.calendarService.status(user.id);
    }

    @Get('connect')
    @Roles(UserRole.SELLER)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Start connecting a Google Calendar' })
    connect(@CurrentUser() user: AuthUser, @Res() response: Response) {
        try {
            const { url, sealed } = this.calendarService.beginConnect(user.id);
            setOAuthStateCookie(response, sealed);
            response.redirect(url);
        } catch {
            response.redirect(this.returnUrl('failed'));
        }
    }

    @Get('callback')
    @ApiOperation({ summary: 'Finish connecting a Google Calendar' })
    async callback(
        @Query('code') code: string | undefined,
        @Query('state') state: string | undefined,
        @Query('error') error: string | undefined,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const sealed = oauthStateFrom(request);
        clearOAuthStateCookie(response);

        try {
            await this.calendarService.completeConnect({
                code,
                state,
                error,
                sealed,
            });
            response.redirect(this.returnUrl('connected'));
        } catch (failure) {
            response.redirect(
                this.returnUrl(
                    failure instanceof CalendarConnectError
                        ? failure.code
                        : 'failed',
                ),
            );
        }
    }

    @Delete()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Disconnect Google Calendar sync' })
    async disconnect(@CurrentUser() user: AuthUser) {
        await this.calendarService.disconnect(user.id);
        return this.calendarService.status(user.id);
    }

    private returnUrl(outcome: string): string {
        return `${this.frontendUrl}${RETURN_PATH}?${OUTCOME_PARAM}=${outcome}`;
    }
}
