import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { AssetsService } from '../assets/assets.service';
import {
  CreateTicketDto,
  UpdateTicketDto,
  AssignTicketDto,
  HoldTicketDto,
  TicketFilterDto,
  MergeTicketDto,
  SplitTicketDto,
  LinkTicketDto,
} from './dto/ticket.dto';
import { LinkTicketAssetDto } from '../assets/dto/asset.dto';
import { SessionAuthGuard, CsrfGuard, CombinedAuthGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';
import { CurrentUser } from '../common/decorators';
import { SessionUser } from '@ticketsystem/shared';

@ApiTags('tickets')
@Controller('tickets')
@UseGuards(CombinedAuthGuard, PermissionsGuard)
export class TicketsController {
  constructor(
    private readonly tickets: TicketsService,
    private readonly assets: AssetsService,
  ) {}

  @Get('dashboard')
  @RequirePermission('ticket.read')
  dashboard(@CurrentUser() user: SessionUser) {
    return this.tickets.getDashboardStats(user);
  }

  @Get()
  @RequirePermission('ticket.read')
  findAll(@Query() filters: TicketFilterDto, @CurrentUser() user: SessionUser) {
    return this.tickets.findMany(filters, user);
  }

  @Post('bulk/assign')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.assign')
  bulkAssign(@Body() body: { ids: string[] } & AssignTicketDto, @CurrentUser() user: SessionUser) {
    const { ids, ...dto } = body;
    return this.tickets.bulkAssign(ids, dto, user);
  }

  @Post('bulk/status')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  bulkStatus(@Body() body: { ids: string[]; status: string }, @CurrentUser() user: SessionUser) {
    return this.tickets.bulkStatus(body.ids, body.status, user);
  }

  @Post('bulk/close')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  bulkClose(@Body() body: { ids: string[] }, @CurrentUser() user: SessionUser) {
    return this.tickets.bulkClose(body.ids, user);
  }

  @Get(':id')
  @RequirePermission('ticket.read')
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.tickets.findOne(id, user);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.create')
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: SessionUser) {
    return this.tickets.create(dto, user);
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto, @CurrentUser() user: SessionUser) {
    return this.tickets.update(id, dto, user);
  }

  @Post(':id/assign')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.assign')
  assign(@Param('id') id: string, @Body() dto: AssignTicketDto, @CurrentUser() user: SessionUser) {
    return this.tickets.assign(id, dto, user);
  }

  @Post(':id/hold')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  hold(@Param('id') id: string, @Body() dto: HoldTicketDto, @CurrentUser() user: SessionUser) {
    return this.tickets.hold(id, dto, user);
  }

  @Post(':id/unhold')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  unhold(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.tickets.unhold(id, user);
  }

  @Post(':id/merge')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  merge(@Param('id') id: string, @Body() dto: MergeTicketDto, @CurrentUser() user: SessionUser) {
    return this.tickets.merge(id, dto.targetTicketId, user);
  }

  @Post(':id/split')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  split(@Param('id') id: string, @Body() dto: SplitTicketDto, @CurrentUser() user: SessionUser) {
    return this.tickets.split(id, dto.titles, user);
  }

  @Post(':id/link')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  link(@Param('id') id: string, @Body() dto: LinkTicketDto, @CurrentUser() user: SessionUser) {
    return this.tickets.link(id, dto.toTicketId, dto.linkType, user);
  }

  @Post(':id/magic-link')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.read')
  magicLink(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.tickets.generateMagicLink(id, user);
  }

  @Post(':id/watchers/:userId')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  addWatcher(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.tickets.addWatcher(id, userId, user);
  }

  @Get(':id/watchers')
  @RequirePermission('ticket.read')
  getWatchers(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.tickets.getWatchers(id, user);
  }

  @Post(':id/watchers/:userId/remove')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  removeWatcher(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.tickets.removeWatcher(id, userId, user);
  }

  @Get(':id/children')
  @RequirePermission('ticket.read')
  getChildren(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.tickets.getChildren(id, user);
  }

  @Get(':id/assets')
  @RequirePermission('ticket.read')
  getAssets(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.tickets.getTicketAssets(id, user);
  }

  @Post(':id/assets')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  linkAsset(
    @Param('id') id: string,
    @Body() dto: LinkTicketAssetDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.tickets.linkTicketAsset(id, dto.assetId, dto.relation, user);
  }

  @Delete(':id/assets/:assetId')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  unlinkAsset(
    @Param('id') id: string,
    @Param('assetId') assetId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.tickets.unlinkTicketAsset(id, assetId, user);
  }
}
