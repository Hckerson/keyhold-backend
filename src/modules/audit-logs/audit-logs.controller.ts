import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogDto } from './dto';
import { UserRole } from '@generated/prisma/enums';
import { JwtAuthGuard, RolesGuard } from '@modules/core/auth/guards';
import { Roles } from '@modules/core/auth/decorators/roles.decorator';

@ApiTags('audit-logs')
@Controller('audit-logs')
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditLogsController {
    constructor(private readonly auditLogsService: AuditLogsService) {}

    @Get()
    @ApiOperation({ summary: 'Audit trail of state-changing actions' })
    async findAll(@Query() query: QueryAuditLogDto) {
        return this.auditLogsService.findAll(query);
    }
}
