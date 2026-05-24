import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  forwardRef,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { renderTemplate } from '../notifications/template-renderer';
import { SubmitCsatDto } from './dto/csat.dto';

@Injectable()
export class CsatService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notifications: NotificationsService,
  ) {}

  async createSurveyForTicket(ticketId: string) {
    const existing = await this.prisma.csatSurvey.findUnique({ where: { ticketId } });
    if (existing) return existing;

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { requester: true },
    });
    if (!ticket || !ticket.requester) return null;

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const survey = await this.prisma.csatSurvey.create({
      data: { ticketId, tokenHash },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const surveyUrl = `${frontendUrl}/csat/${rawToken}`;

    const template = await this.prisma.notificationTemplate.findUnique({
      where: { slug: 'csat_request' },
    });
    const title = template?.subject
      ? renderTemplate(template.subject, { number: ticket.number, title: ticket.title, url: surveyUrl })
      : `How did we do on ticket #${ticket.number}?`;
    const body = template?.body
      ? renderTemplate(template.body, { number: ticket.number, title: ticket.title, url: surveyUrl })
      : `Please rate your support experience: ${surveyUrl}`;

    await this.notifications.notify({
      userId: ticket.requester.id,
      email: ticket.requester.email,
      title,
      body,
      ticketId,
      channels: ['email'],
    });

    return { survey, token: rawToken };
  }

  async getByToken(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const survey = await this.prisma.csatSurvey.findUnique({
      where: { tokenHash },
      include: {
        ticket: {
          select: { id: true, number: true, title: true, resolvedAt: true },
        },
      },
    });
    if (!survey) throw new NotFoundException('Survey not found');
    if (survey.submittedAt) {
      return { ...survey, alreadySubmitted: true };
    }
    return { ...survey, alreadySubmitted: false };
  }

  async submitByToken(token: string, dto: SubmitCsatDto) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const survey = await this.prisma.csatSurvey.findUnique({ where: { tokenHash } });
    if (!survey) throw new NotFoundException('Survey not found');
    if (survey.submittedAt) throw new BadRequestException('Survey already submitted');

    return this.prisma.csatSurvey.update({
      where: { id: survey.id },
      data: {
        rating: dto.rating,
        comment: dto.comment,
        submittedAt: new Date(),
      },
      include: {
        ticket: { select: { id: true, number: true, title: true } },
      },
    });
  }
}
