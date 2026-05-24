import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { SessionAuthGuard, CsrfGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';

@ApiTags('extras')
@Controller('extras')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ExtrasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('knowledge-base')
  @RequirePermission('kb.read')
  listKb() {
    return this.prisma.knowledgeArticle.findMany({ where: { deletedAt: null } });
  }

  @Post('knowledge-base')
  @UseGuards(CsrfGuard)
  @RequirePermission('kb.create')
  createKb(@Body() body: { title: string; slug: string; content: string; isPublic?: boolean }) {
    return this.prisma.knowledgeArticle.create({ data: body });
  }

  @Get('canned-responses')
  @RequirePermission('ticket.read')
  listCanned() {
    return this.prisma.cannedResponse.findMany();
  }

  @Get('ticket-templates')
  @RequirePermission('ticket.read')
  listTicketTemplates() {
    return this.prisma.ticketTemplate.findMany();
  }

  @Get('assets')
  @RequirePermission('asset.read')
  listAssets() {
    return this.prisma.asset.findMany({ where: { deletedAt: null } });
  }

  @Get('custom-fields')
  @RequirePermission('manage.settings')
  listCustomFields() {
    return this.prisma.customFieldDef.findMany({ where: { isActive: true } });
  }

  @Get('business-hours')
  @RequirePermission('manage.settings')
  listBusinessHours() {
    return this.prisma.businessHours.findMany();
  }

  @Get('holidays')
  @RequirePermission('manage.settings')
  listHolidays() {
    return this.prisma.holiday.findMany({ orderBy: { date: 'asc' } });
  }
}
