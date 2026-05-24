import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { SessionUser } from '@ticketsystem/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RbacService } from '../rbac/rbac.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateApprovalDto, DecideApprovalDto, DecideByTokenDto } from './dto/approval.dto';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateApprovalDto, requester: SessionUser) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: dto.ticketId, deletedAt: null },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const canAccess = await this.rbac.canAccessTicket(requester, ticket);
    if (!canAccess) throw new ForbiddenException();

    const request = await this.prisma.approvalRequest.create({
      data: {
        ticketId: dto.ticketId,
        title: dto.title,
        description: dto.description,
        approvalType: dto.approvalType ?? 'any',
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        requesterId: requester.id,
        approvers: {
          create: dto.approverUserIds.map((userId, index) => ({
            userId,
            sortOrder: index,
          })),
        },
      },
      include: {
        approvers: { include: { user: { select: { id: true, name: true, email: true } } } },
        ticket: { select: { id: true, number: true, title: true } },
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    for (const approver of request.approvers) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      await this.prisma.approvalDecisionToken.create({
        data: {
          approverId: approver.id,
          tokenHash,
          expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
        },
      });

      const approveUrl = `${frontendUrl}/approvals/decide?token=${rawToken}&decision=approved`;
      const rejectUrl = `${frontendUrl}/approvals/decide?token=${rawToken}&decision=rejected`;

      await this.notifications.notify({
        userId: approver.userId,
        email: approver.user.email,
        title: `Approval required: ${dto.title}`,
        body: `Ticket #${request.ticket.number}: ${request.ticket.title}\n\nApprove: ${approveUrl}\nReject: ${rejectUrl}`,
        ticketId: dto.ticketId,
        channels: ['in_app', 'email'],
      });
    }

    return request;
  }

  async findAll(user: SessionUser, status?: string) {
    const where = status ? { status } : {};
    const requests = await this.prisma.approvalRequest.findMany({
      where,
      include: {
        ticket: { select: { id: true, number: true, title: true, status: true } },
        approvers: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (this.rbac.hasPermission(user, 'ticket.read.all')) {
      return requests;
    }

    return requests.filter(
      (r) =>
        r.requesterId === user.id ||
        r.approvers.some((a) => a.userId === user.id),
    );
  }

  async findOne(id: string, user: SessionUser) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        ticket: { select: { id: true, number: true, title: true, status: true } },
        approvers: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!request) throw new NotFoundException('Approval request not found');

    const canView =
      this.rbac.hasPermission(user, 'ticket.read.all') ||
      request.requesterId === user.id ||
      request.approvers.some((a) => a.userId === user.id);
    if (!canView) throw new ForbiddenException();

    return request;
  }

  async decide(id: string, dto: DecideApprovalDto, user: SessionUser) {
    const request = await this.findOne(id, user);
    if (request.status !== 'pending') {
      throw new BadRequestException('Approval request is no longer pending');
    }

    const approver = request.approvers.find((a) => a.userId === user.id);
    if (!approver) throw new ForbiddenException('You are not an approver on this request');
    if (approver.decision) throw new BadRequestException('You have already decided');

    await this.prisma.approvalRequestApprover.update({
      where: { id: approver.id },
      data: {
        decision: dto.decision,
        comment: dto.comment,
        decidedAt: new Date(),
      },
    });

    return this.finalizeIfComplete(id);
  }

  async decideByToken(dto: DecideByTokenDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const tokenRecord = await this.prisma.approvalDecisionToken.findUnique({
      where: { tokenHash },
    });
    if (!tokenRecord) throw new NotFoundException('Invalid approval token');
    if (tokenRecord.usedAt) throw new BadRequestException('Token already used');
    if (tokenRecord.expiresAt < new Date()) throw new BadRequestException('Token expired');

    const approver = await this.prisma.approvalRequestApprover.findUnique({
      where: { id: tokenRecord.approverId },
      include: { request: true },
    });
    if (!approver) throw new NotFoundException('Approver not found');
    if (approver.request.status !== 'pending') {
      throw new BadRequestException('Approval request is no longer pending');
    }
    if (approver.decision) throw new BadRequestException('Already decided');

    await this.prisma.$transaction([
      this.prisma.approvalRequestApprover.update({
        where: { id: approver.id },
        data: {
          decision: dto.decision,
          comment: dto.comment,
          decidedAt: new Date(),
        },
      }),
      this.prisma.approvalDecisionToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return this.finalizeIfComplete(approver.requestId);
  }

  private async finalizeIfComplete(requestId: string) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: { approvers: true },
    });
    if (!request) throw new NotFoundException();

    const { approvalType, approvers } = request;
    let newStatus: string | null = null;

    if (approvalType === 'any') {
      const approved = approvers.find((a) => a.decision === 'approved');
      const rejected = approvers.find((a) => a.decision === 'rejected');
      if (approved) newStatus = 'approved';
      else if (rejected) newStatus = 'rejected';
    } else if (approvalType === 'parallel') {
      const allDecided = approvers.every((a) => a.decision);
      if (allDecided) {
        newStatus = approvers.every((a) => a.decision === 'approved') ? 'approved' : 'rejected';
      }
    } else {
      const sorted = [...approvers].sort((a, b) => a.sortOrder - b.sortOrder);
      const rejected = sorted.find((a) => a.decision === 'rejected');
      if (rejected) {
        newStatus = 'rejected';
      } else {
        const nextPending = sorted.find((a) => !a.decision);
        if (!nextPending) newStatus = 'approved';
      }
    }

    if (newStatus) {
      await this.prisma.approvalRequest.update({
        where: { id: requestId },
        data: { status: newStatus, decidedAt: new Date() },
      });
    }

    return this.prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: {
        ticket: { select: { id: true, number: true, title: true } },
        approvers: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
  }
}
