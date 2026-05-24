import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SessionUser } from '@ticketsystem/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { CreateCatalogItemDto, UpdateCatalogItemDto, RequestCatalogItemDto } from './dto/catalog.dto';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tickets: TicketsService,
  ) {}

  findAll(activeOnly = true) {
    return this.prisma.serviceCatalogItem.findMany({
      where: activeOnly ? { isActive: true } : {},
      include: { service: { select: { id: true, name: true, slug: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.serviceCatalogItem.findUnique({
      where: { id },
      include: { service: { select: { id: true, name: true, slug: true } } },
    });
    if (!item) throw new NotFoundException('Catalog item not found');
    return item;
  }

  create(dto: CreateCatalogItemDto) {
    return this.prisma.serviceCatalogItem.create({
      data: {
        serviceId: dto.serviceId,
        name: dto.name,
        description: dto.description,
        formSchema: (dto.formSchema ?? []) as Prisma.InputJsonValue,
        icon: dto.icon,
        isActive: dto.isActive ?? true,
      },
      include: { service: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, dto: UpdateCatalogItemDto) {
    await this.findOne(id);
    return this.prisma.serviceCatalogItem.update({
      where: { id },
      data: {
        ...(dto.serviceId !== undefined && { serviceId: dto.serviceId }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.formSchema !== undefined && { formSchema: dto.formSchema as Prisma.InputJsonValue }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { service: { select: { id: true, name: true, slug: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.serviceCatalogItem.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async requestService(id: string, dto: RequestCatalogItemDto, user: SessionUser) {
    const item = await this.findOne(id);
    if (!item.isActive) throw new BadRequestException('Catalog item is not active');

    const formLines = dto.formValues
      ? Object.entries(dto.formValues)
          .map(([key, value]) => `- ${key}: ${String(value)}`)
          .join('\n')
      : '';

    const description = [
      dto.description ?? item.description ?? '',
      formLines ? `\n\nForm responses:\n${formLines}` : '',
    ]
      .filter(Boolean)
      .join('');

    return this.tickets.create(
      {
        title: dto.title ?? `Service request: ${item.name}`,
        description: description || `Request for ${item.name}`,
        serviceId: item.serviceId,
        requesterId: user.id,
      },
      user,
      'catalog',
    );
  }
}
