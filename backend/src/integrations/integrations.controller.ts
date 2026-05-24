import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EmailDispatchService } from './email/email-dispatch.service';
import { TeamsDispatchService } from './teams/teams.connectors';
import { InboundEmail } from './email/email-connector.interface';
import { MockEmailConnector } from './email/email.connectors';
import { SessionAuthGuard, ManagePortalGuard, CsrfGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly emailDispatch: EmailDispatchService,
    private readonly teamsDispatch: TeamsDispatchService,
    private readonly mockEmail: MockEmailConnector,
    private readonly prisma: PrismaService,
  ) {}

  @Post('email/webhook')
  async emailWebhook(@Body() body: InboundEmail) {
    return this.emailDispatch.processInbound(body);
  }

  @Post('email/poll')
  @UseGuards(SessionAuthGuard, ManagePortalGuard, CsrfGuard)
  async pollEmail() {
    return this.emailDispatch.pollInbound();
  }

  @Post('teams/webhook')
  async teamsWebhook(@Body() body: unknown) {
    return this.teamsDispatch.handleWebhook(body);
  }

  @Get('settings')
  @UseGuards(SessionAuthGuard, ManagePortalGuard, PermissionsGuard)
  @RequirePermission('manage.integrations')
  async getSettings() {
    return this.prisma.integrationSetting.findMany();
  }
}
