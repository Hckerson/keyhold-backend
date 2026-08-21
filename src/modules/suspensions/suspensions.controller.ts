import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SuspensionsService } from './suspensions.service';
import { CreateSuspensionDto, QuerySuspensionDto } from './dto';
import { UserRole } from '@generated/prisma/enums';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles } from '@modules/core/auth/decorators/roles.decorator';

@ApiTags('suspensions')
@Controller('suspensions')
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SuspensionsController {
    constructor(private readonly suspensionsService: SuspensionsService) {}

    @Post()
    @ApiOperation({ summary: 'Suspend an account with a recorded reason' })
    async create(@Body() createDto: CreateSuspensionDto) {
        return this.suspensionsService.create(createDto);
    }

    @Get()
    @ApiOperation({ summary: 'List suspensions' })
    async findAll(@Query() query: QuerySuspensionDto) {
        return this.suspensionsService.findAll(query);
    }

    @Get('user/:userId')
    @ApiOperation({ summary: 'Suspension history for one account' })
    async findByUser(@Param('userId') userId: string) {
        return this.suspensionsService.findByUser(userId);
    }

    @Patch(':id/lift')
    @ApiOperation({ summary: 'Lift a suspension and reactivate the account' })
    async lift(@Param('id') id: string) {
        return this.suspensionsService.lift(id);
    }
}
