import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { CombinedAuthGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';
import { CurrentUser } from '../common/decorators';
import { SessionUser } from '@ticketsystem/shared';

@ApiTags('search')
@Controller('search')
@UseGuards(CombinedAuthGuard, PermissionsGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @RequirePermission('ticket.read')
  @ApiOperation({ summary: 'Global search across tickets, KB, assets, and users' })
  search(@Query('q') q: string, @CurrentUser() user: SessionUser, @Query('limit') limit?: string) {
    return this.searchService.search(q ?? '', user, limit ? parseInt(limit, 10) : 10);
  }
}
