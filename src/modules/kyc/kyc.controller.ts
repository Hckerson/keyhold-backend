import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFiles,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { QueryKycDto, RejectKycDto, SubmitKycDto } from './dto';
import { UserRole } from '@generated/prisma/enums';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles } from '@modules/core/auth/decorators/roles.decorator';
import { CurrentUser } from '@modules/core/auth/decorators/current-user.decorator';
import type { AuthUser } from '@core/auth/types/auth.types';

const MAX_FILES = 2;

@ApiTags('kyc')
@Controller('kyc')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KycController {
    constructor(private readonly kycService: KycService) {}

    @Post()
    @UseInterceptors(AnyFilesInterceptor({ limits: { files: MAX_FILES } }))
    @ApiOperation({ summary: 'Submit an identity document for review' })
    async submit(
        @CurrentUser() user: AuthUser,
        @Body() submitDto: SubmitKycDto,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        return this.kycService.submit(user.id, submitDto, files ?? []);
    }

    @Get('me')
    @ApiOperation({ summary: 'Documents submitted by the current user' })
    async findMine(@CurrentUser() user: AuthUser) {
        return this.kycService.findMine(user.id);
    }

    @Get()
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Identity verification queue' })
    async findAll(@Query() query: QueryKycDto) {
        return this.kycService.findAll(query);
    }

    @Get('counts')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Verification queue counts' })
    async counts() {
        return this.kycService.counts();
    }

    @Get(':id')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Get one submitted document' })
    async findOne(@Param('id') id: string) {
        return this.kycService.findOne(id);
    }

    @Patch(':id/approve')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Approve a document and verify the applicant' })
    async approve(@Param('id') id: string) {
        return this.kycService.approve(id);
    }

    @Patch(':id/reject')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Reject a document with a reason' })
    async reject(@Param('id') id: string, @Body() rejectDto: RejectKycDto) {
        return this.kycService.reject(id, rejectDto);
    }
}
