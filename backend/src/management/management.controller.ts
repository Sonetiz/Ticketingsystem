import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
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
  createUser(@Body() body: {
    email: string;
    name: string;
    password?: string;
    roleIds?: string[];
    authProvider?: string;
    passwordLoginDisabled?: boolean;
  }) {
    return this.management.createUser(body);
  }

  @Patch('users/:id')
  @UseGuards(CsrfGuard)
  updateUser(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      isActive?: boolean;
      roleIds?: string[];
      authProvider?: string;
      passwordLoginDisabled?: boolean;
    },
    @CurrentUser() user: SessionUser,
  ) {
    return this.management.updateUser(id, body, user);
  }

  @Get('roles')
  listRoles() {
    return this.management.listRoles();
  }

  @Post('roles')
  @UseGuards(CsrfGuard)
  createRole(@Body() body: { slug: string; name: string; description?: string }) {
    return this.management.createRole(body);
  }

  @Patch('roles/:id')
  @UseGuards(CsrfGuard)
  updateRole(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string },
    @CurrentUser() user: SessionUser,
  ) {
    return this.management.updateRole(id, body, user);
  }

  @Delete('roles/:id')
  @UseGuards(CsrfGuard)
  deleteRole(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.management.deleteRole(id, user);
  }

  @Put('roles/:id/permissions')
  @UseGuards(CsrfGuard)
  setRolePermissions(
    @Param('id') id: string,
    @Body() body: { permissionIds: string[] },
    @CurrentUser() user: SessionUser,
  ) {
    return this.management.setRolePermissions(id, body.permissionIds, user);
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
  addTeamMember(
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
    @Body() body: { isLead?: boolean },
  ) {
    return this.management.addTeamMember(teamId, userId, body.isLead ?? false);
  }

  @Delete('teams/:teamId/members/:userId')
  @UseGuards(CsrfGuard)
  removeTeamMember(
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.management.removeTeamMember(teamId, userId, user);
  }

  @Patch('teams/:id')
  @UseGuards(CsrfGuard)
  updateTeam(
    @Param('id') id: string,
    @Body() body: { slug?: string; name?: string; description?: string; isDefault?: boolean },
    @CurrentUser() user: SessionUser,
  ) {
    return this.management.updateTeam(id, body, user);
  }

  @Get('statuses')
  listStatuses() {
    return this.management.listStatuses();
  }

  @Post('statuses')
  @UseGuards(CsrfGuard)
  upsertStatus(@Body() body: {
    slug: string;
    name: string;
    sortOrder?: number;
    isClosed?: boolean;
    isHold?: boolean;
    isActive?: boolean;
    color?: string;
  }) {
    return this.management.upsertStatus(body);
  }

  @Delete('statuses/:slug')
  @UseGuards(CsrfGuard)
  deleteStatus(@Param('slug') slug: string) {
    return this.management.deleteStatus(slug);
  }

  @Get('priorities')
  listPriorities() {
    return this.management.listPriorities();
  }

  @Post('priorities')
  @UseGuards(CsrfGuard)
  upsertPriority(@Body() body: { slug: string; name: string; sortOrder?: number; color?: string }) {
    return this.management.upsertPriority(body);
  }

  @Delete('priorities/:slug')
  @UseGuards(CsrfGuard)
  deletePriority(@Param('slug') slug: string) {
    return this.management.deletePriority(slug);
  }

  @Get('sla-rules')
  listSlaRules() {
    return this.management.listSlaRules();
  }

  @Post('sla-rules')
  @UseGuards(CsrfGuard)
  createSlaRule(@Body() body: {
    name: string;
    priority?: string;
    responseMinutes?: number;
    resolutionMinutes?: number;
    isActive?: boolean;
  }) {
    return this.management.createSlaRule(body);
  }

  @Patch('sla-rules/:id')
  @UseGuards(CsrfGuard)
  updateSlaRule(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      priority?: string;
      responseMinutes?: number;
      resolutionMinutes?: number;
      isActive?: boolean;
    },
    @CurrentUser() user: SessionUser,
  ) {
    return this.management.updateSlaRule(id, body, user);
  }

  @Delete('sla-rules/:id')
  @UseGuards(CsrfGuard)
  deleteSlaRule(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.management.deleteSlaRule(id, user);
  }

  @Get('integrations')
  getIntegrations() {
    return this.management.getIntegrationSettings();
  }

  @Post('integrations/:connector')
  @UseGuards(CsrfGuard)
  upsertIntegration(@Param('connector') connector: string, @Body() body: { config?: object; isActive?: boolean }) {
    return this.management.upsertIntegrationSetting(connector, body);
  }

  @Get('project-templates')
  listProjectTemplates() {
    return this.management.listProjectTemplates();
  }

  @Post('project-templates')
  @UseGuards(CsrfGuard)
  createProjectTemplate(@Body() body: {
    name: string;
    description?: string;
    tickets?: Array<{ title: string; description?: string; priority?: string; sortOrder?: number }>;
  }) {
    return this.management.createProjectTemplate(body);
  }

  @Patch('project-templates/:id')
  @UseGuards(CsrfGuard)
  updateProjectTemplate(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      tickets?: Array<{ title: string; description?: string; priority?: string; sortOrder?: number }>;
    },
  ) {
    return this.management.updateProjectTemplate(id, body);
  }

  @Delete('project-templates/:id')
  @UseGuards(CsrfGuard)
  deleteProjectTemplate(@Param('id') id: string) {
    return this.management.deleteProjectTemplate(id);
  }

  @Get('notification-templates')
  listNotificationTemplates() {
    return this.management.listNotificationTemplates();
  }

  @Post('notification-templates')
  @UseGuards(CsrfGuard)
  createNotificationTemplate(@Body() body: {
    slug: string;
    name: string;
    subject?: string;
    body: string;
    channel: string;
  }) {
    return this.management.createNotificationTemplate(body);
  }

  @Patch('notification-templates/:id')
  @UseGuards(CsrfGuard)
  updateNotificationTemplate(
    @Param('id') id: string,
    @Body() body: { slug?: string; name?: string; subject?: string; body?: string; channel?: string },
  ) {
    return this.management.updateNotificationTemplate(id, body);
  }

  @Delete('notification-templates/:id')
  @UseGuards(CsrfGuard)
  deleteNotificationTemplate(@Param('id') id: string) {
    return this.management.deleteNotificationTemplate(id);
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

  @Delete('api-tokens/:id')
  @UseGuards(CsrfGuard)
  revokeApiToken(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.management.revokeApiToken(id, user);
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

  @Delete('settings/:key')
  @UseGuards(CsrfGuard)
  deleteSetting(@Param('key') key: string, @CurrentUser() user: SessionUser) {
    return this.management.deleteSystemSetting(key, user);
  }
}
