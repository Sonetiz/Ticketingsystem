import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  emitTicketUpdated(ticketId: string, payload: Record<string, unknown> = {}) {
    this.gateway.emitToRoom(`ticket:${ticketId}`, 'ticket.updated', { ticketId, ...payload });
  }

  emitTicketMessage(ticketId: string, message: Record<string, unknown>) {
    this.gateway.emitToRoom(`ticket:${ticketId}`, 'message.created', { ticketId, message });
  }

  emitAttachmentAdded(ticketId: string, attachment: Record<string, unknown>) {
    this.gateway.emitToRoom(`ticket:${ticketId}`, 'attachment.added', { ticketId, attachment });
  }

  emitNotification(userId: string, notification: Record<string, unknown>) {
    this.gateway.emitToRoom(`user:${userId}`, 'notification.created', notification);
  }
}
