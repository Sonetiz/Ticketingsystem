import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { KnowledgeBaseService } from './knowledge-base.service';
import { CreateKnowledgeArticleDto, UpdateKnowledgeArticleDto } from './dto/knowledge-base.dto';
import { CombinedAuthGuard, CsrfGuard } from '../auth/auth.guards';
import { PermissionsGuard, RequirePermission } from '../rbac/permissions.guard';

@ApiTags('knowledge-base')
@Controller('knowledge-base')
@UseGuards(CombinedAuthGuard, PermissionsGuard)
export class KnowledgeBaseController {
  constructor(private readonly kb: KnowledgeBaseService) {}

  @Get()
  @RequirePermission('kb.read')
  findAll() {
    return this.kb.findAll();
  }

  @Get(':id')
  @RequirePermission('kb.read')
  findOne(@Param('id') id: string) {
    return this.kb.findOne(id);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission('kb.create')
  create(@Body() dto: CreateKnowledgeArticleDto) {
    return this.kb.create(dto);
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('kb.create')
  update(@Param('id') id: string, @Body() dto: UpdateKnowledgeArticleDto) {
    return this.kb.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('kb.create')
  remove(@Param('id') id: string) {
    return this.kb.remove(id);
  }
}
