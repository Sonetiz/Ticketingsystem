import { Controller, Post, Body, Get, UseGuards, Query, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EmailDispatchService } from './email/email-dispatch.service';
import { TeamsDispatchService } from './teams/teams.connectors';
import { InboundEmail } from './email/email-connector.interface';
import { MockEmailConnector } from './email/email.connectors';
import { SessionAuthGuard, ManagePortalGuard, CsrfGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';
import { PrismaService } from '../prisma/prisma.service';
import type { Response } from 'express';

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
  async teamsWebhook(
    @Body() body: unknown,
    @Query('validationToken') validationToken?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    if (validationToken) {
      // Microsoft Graph subscription validation handshake
      res?.type('text/plain');
      return validationToken;
    }

    // Validate clientState if present (Graph change notification)
    const setting = await this.prisma.integrationSetting.findUnique({ where: { connector: 'teams' } });
    const cfg = (setting?.config as any) || {};
    const expected = typeof cfg.webhookSecret === 'string' ? cfg.webhookSecret : undefined;
    const clientState = (body as any)?.value?.[0]?.clientState as string | undefined;
    if (expected && clientState && clientState !== expected) {
      throw new UnauthorizedException('Invalid Teams webhook clientState');
    }

    return this.teamsDispatch.handleWebhook(body);
  }

  @Get('settings')
  @UseGuards(SessionAuthGuard, ManagePortalGuard, PermissionsGuard)
  @RequirePermission('manage.integrations')
  async getSettings() {
    return this.prisma.integrationSetting.findMany();
  }
}
