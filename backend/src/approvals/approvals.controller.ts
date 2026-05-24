import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApprovalsService } from './approvals.service';
import { CreateApprovalDto, DecideApprovalDto, DecideByTokenDto } from './dto/approval.dto';
import { CombinedAuthGuard, CsrfGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';
import { CurrentUser } from '../common/decorators';
import { SessionUser } from '@ticketsystem/shared';

@ApiTags('approvals')
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Post('decide-by-token')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  decideByToken(@Body() dto: DecideByTokenDto) {
    return this.approvals.decideByToken(dto);
  }

  @Get()
  @UseGuards(CombinedAuthGuard, PermissionsGuard)
  @RequirePermission('ticket.read')
  findAll(@Query('status') status: string | undefined, @CurrentUser() user: SessionUser) {
    return this.approvals.findAll(user, status);
  }

  @Get(':id')
  @UseGuards(CombinedAuthGuard, PermissionsGuard)
  @RequirePermission('ticket.read')
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.approvals.findOne(id, user);
  }

  @Post()
  @UseGuards(CombinedAuthGuard, CsrfGuard, PermissionsGuard)
  @RequirePermission('ticket.update')
  create(@Body() dto: CreateApprovalDto, @CurrentUser() user: SessionUser) {
    return this.approvals.create(dto, user);
  }

  @Post(':id/decide')
  @UseGuards(CombinedAuthGuard, CsrfGuard, PermissionsGuard)
  @RequirePermission('ticket.read')
  decide(
    @Param('id') id: string,
    @Body() dto: DecideApprovalDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.approvals.decide(id, dto, user);
  }
}
