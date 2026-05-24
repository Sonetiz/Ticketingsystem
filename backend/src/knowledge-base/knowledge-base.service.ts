import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeHtml } from '../common/sanitize';
import { CreateKnowledgeArticleDto, UpdateKnowledgeArticleDto } from './dto/knowledge-base.dto';

@Injectable()
export class KnowledgeBaseService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeDeleted = false) {
    return this.prisma.knowledgeArticle.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const article = await this.prisma.knowledgeArticle.findFirst({
      where: { id, deletedAt: null },
    });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  async findBySlug(slug: string) {
    const article = await this.prisma.knowledgeArticle.findFirst({
      where: { slug, deletedAt: null },
    });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  create(dto: CreateKnowledgeArticleDto) {
    return this.prisma.knowledgeArticle.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        content: sanitizeHtml(dto.content),
        category: dto.category,
        isPublic: dto.isPublic ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateKnowledgeArticleDto) {
    await this.findOne(id);
    return this.prisma.knowledgeArticle.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.content !== undefined && { content: sanitizeHtml(dto.content) }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.knowledgeArticle.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
