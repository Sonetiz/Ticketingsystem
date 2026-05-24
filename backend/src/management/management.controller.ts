import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ManagementService } from './management.service';
import { ManagePortalGuard, CsrfGuard } from '../auth/auth.guards';
import { CurrentUser } from '../common/decorators';
import { SessionUser } from '@ticketsystem/shared';

@ApiTags('management')
@Controller('manage')
@UseGuards(ManagePortalGuard)
export class ManagementController {
  constructor(private readonly management: ManagementService) {}

  @Get('users')
  listUsers() {
    return this.management.listUsers();
  }

  @Post('users')
  @UseGuards(CsrfGuard)
  createUser(@Body() body: { email: string; name: string; password: string; roleIds?: string[] }) {
    return this.management.createUser(body);
  }

  @Patch('users/:id')
  @UseGuards(CsrfGuard)
  updateUser(
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean; roleIds?: string[] },
    @CurrentUser() user: SessionUser,
  ) {
    return this.management.updateUser(id, body, user);
  }

  @Get('roles')
  listRoles() {
    return this.management.listRoles();
  }

  @Get('permissions')
  listPermissions() {
    return this.management.listPermissions();
  }

  @Get('teams')
  listTeams() {
    return this.management.listTeams();
  }

  @Post('teams')
  @UseGuards(CsrfGuard)
  createTeam(@Body() body: { slug: string; name: string; description?: string }) {
    return this.management.createTeam(body);
  }

  @Post('teams/:teamId/members/:userId')
  @UseGuards(CsrfGuard)
  addTeamMember(@Param('teamId') teamId: string, @Param('userId') userId: string) {
    return this.management.addTeamMember(teamId, userId);
  }

  @Get('statuses')
  listStatuses() {
    return this.management.listStatuses();
  }

  @Post('statuses')
  @UseGuards(CsrfGuard)
  upsertStatus(@Body() body: { slug: string; name: string; sortOrder?: number; isClosed?: boolean; isHold?: boolean; color?: string }) {
    return this.management.upsertStatus(body);
  }

  @Get('priorities')
  listPriorities() {
    return this.management.listPriorities();
  }

  @Get('sla-rules')
  listSlaRules() {
    return this.management.listSlaRules();
  }

  @Post('sla-rules')
  @UseGuards(CsrfGuard)
  createSlaRule(@Body() body: { name: string; priority?: string; responseMinutes?: number; resolutionMinutes?: number }) {
    return this.management.createSlaRule(body);
  }

  @Get('integrations')
  getIntegrations() {
    return this.management.getIntegrationSettings();
  }

  @Post('integrations/:connector')
  @UseGuards(CsrfGuard)
  upsertIntegration(@Param('connector') connector: string, @Body() config: object) {
    return this.management.upsertIntegrationSetting(connector, config);
  }

  @Get('project-templates')
  listProjectTemplates() {
    return this.management.listProjectTemplates();
  }

  @Get('notification-templates')
  listNotificationTemplates() {
    return this.management.listNotificationTemplates();
  }

  @Get('audit-logs')
  auditLogs(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.management.getAuditLogs(parseInt(page || '1', 10), parseInt(limit || '50', 10));
  }

  @Get('api-tokens')
  listApiTokens() {
    return this.management.listApiTokens();
  }

  @Post('api-tokens')
  @UseGuards(CsrfGuard)
  createApiToken(
    @Body() body: { userId: string; name: string; permissions: string[] },
    @CurrentUser() user: SessionUser,
  ) {
    return this.management.createApiToken(body.userId, body.name, body.permissions, user);
  }

  @Get('settings')
  getSettings() {
    return this.management.getSystemSettings();
  }

  @Post('settings/:key')
  @UseGuards(CsrfGuard)
  upsertSetting(@Param('key') key: string, @Body() value: object) {
    return this.management.upsertSystemSetting(key, value);
  }
}
