import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SessionUser } from '@ticketsystem/shared';
import { CreateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateProjectDto, actor: SessionUser) {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        ownerId: dto.ownerId ?? actor.id,
      },
      include: { owner: { select: { id: true, name: true } }, members: true },
    });
    await this.audit.log({
      actorId: actor.id,
      entityType: 'project',
      entityId: project.id,
      action: 'created',
      newValue: { name: project.name },
    });
    return project;
  }

  async findAll() {
    const projects = await this.prisma.project.findMany({
      where: { deletedAt: null },
      include: {
        owner: { select: { id: true, name: true } },
        _count: { select: { tickets: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return Promise.all(projects.map((p) => this.withProgress(p.id, p)));
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        owner: { select: { id: true, name: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        tickets: {
          where: { deletedAt: null },
          select: { id: true, number: true, title: true, status: true, priority: true },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return { ...project, progress: await this.getProgress(id) };
  }

  async getProgress(projectId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: { projectId, deletedAt: null },
      select: { status: true },
    });
    const total = tickets.length;
    const completed = tickets.filter((t) =>
      ['resolved', 'closed'].includes(t.status),
    ).length;
    return {
      totalTickets: total,
      completedTickets: completed,
      percentComplete: total ? Math.round((completed / total) * 100) : 0,
    };
  }

  private async withProgress(id: string, project: object) {
    const progress = await this.getProgress(id);
    return { ...project, progress };
  }

  async bulkCreateTickets(projectId: string, templateId: string, actor: SessionUser) {
    const template = await this.prisma.projectTemplate.findUnique({
      where: { id: templateId },
      include: { tickets: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!template) throw new NotFoundException('Template not found');

    const created = [];
    for (const t of template.tickets) {
      const ticket = await this.prisma.ticket.create({
        data: {
          title: t.title,
          description: t.description || '',
          priority: t.priority,
          projectId,
          status: 'new',
        },
      });
      created.push(ticket);
    }

    await this.audit.log({
      actorId: actor.id,
      entityType: 'project',
      entityId: projectId,
      action: 'bulk_tickets_created',
      newValue: { count: created.length, templateId },
    });

    return created;
  }
}
