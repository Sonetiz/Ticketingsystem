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
import { ApiTags } from '@nestjs/swagger';
import { ProblemsService } from './problems.service';
import { CreateProblemDto, UpdateProblemDto } from './dto/problem.dto';
import { CombinedAuthGuard, CsrfGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';

@ApiTags('problems')
@Controller('problems')
@UseGuards(CombinedAuthGuard, PermissionsGuard)
export class ProblemsController {
  constructor(private readonly problems: ProblemsService) {}

  @Get('known-errors')
  @RequirePermission('ticket.read')
  knownErrors(@Query('q') q?: string) {
    return this.problems.findKnownErrors(q);
  }

  @Get()
  @RequirePermission('ticket.read')
  findAll(@Query('status') status?: string) {
    return this.problems.findAll(status);
  }

  @Get(':id')
  @RequirePermission('ticket.read')
  findOne(@Param('id') id: string) {
    return this.problems.findOne(id);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  create(@Body() dto: CreateProblemDto) {
    return this.problems.create(dto);
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  update(@Param('id') id: string, @Body() dto: UpdateProblemDto) {
    return this.problems.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('ticket.update')
  remove(@Param('id') id: string) {
    return this.problems.remove(id);
  }
}
