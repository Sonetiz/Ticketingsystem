import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SessionUser } from '@ticketsystem/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavedViewDto, UpdateSavedViewDto } from './dto/saved-view.dto';

@Injectable()
export class SavedViewsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user: SessionUser) {
    return this.prisma.savedView.findMany({
      where: {
        OR: [
          { userId: user.id },
          { scope: 'org' },
          ...(user.teamIds.length ? [{ scope: 'team' }] : []),
        ],
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, user: SessionUser) {
    const view = await this.prisma.savedView.findUnique({ where: { id } });
    if (!view) throw new NotFoundException('Saved view not found');
    if (view.userId !== user.id && view.scope === 'user') {
      throw new ForbiddenException();
    }
    return view;
  }

  async create(dto: CreateSavedViewDto, user: SessionUser) {
    if (dto.isDefault) {
      await this.prisma.savedView.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.savedView.create({
      data: {
        userId: user.id,
        name: dto.name,
        filters: dto.filters as Prisma.InputJsonValue,
        scope: dto.scope ?? 'user',
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateSavedViewDto, user: SessionUser) {
    const view = await this.findOne(id, user);
    if (view.userId !== user.id) throw new ForbiddenException();

    if (dto.isDefault) {
      await this.prisma.savedView.updateMany({
        where: { userId: user.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.savedView.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.filters !== undefined && { filters: dto.filters as Prisma.InputJsonValue }),
        ...(dto.scope !== undefined && { scope: dto.scope }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });
  }

  async remove(id: string, user: SessionUser) {
    const view = await this.findOne(id, user);
    if (view.userId !== user.id) throw new ForbiddenException();
    return this.prisma.savedView.delete({ where: { id } });
  }
}
