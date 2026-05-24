import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../../auth/auth.service';

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly auth: AuthService) {}

  async handleConnection(client: Socket) {
    try {
      const cookieHeader = client.handshake.headers.cookie || '';
      const sessionMatch = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
      const sessionToken = sessionMatch?.[1];
      if (!sessionToken) {
        client.disconnect();
        return;
      }
      const user = await this.auth.getSessionUser(sessionToken);
      if (!user) {
        client.disconnect();
        return;
      }
      client.data.user = user;
      client.join(`user:${user.id}`);
      for (const teamId of user.teamIds) {
        client.join(`team:${teamId}`);
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join.ticket')
  handleJoinTicket(@ConnectedSocket() client: Socket, @MessageBody() data: { ticketId: string }) {
    if (data?.ticketId) {
      client.join(`ticket:${data.ticketId}`);
    }
    return { joined: data?.ticketId };
  }

  @SubscribeMessage('leave.ticket')
  handleLeaveTicket(@ConnectedSocket() client: Socket, @MessageBody() data: { ticketId: string }) {
    if (data?.ticketId) {
      client.leave(`ticket:${data.ticketId}`);
    }
    return { left: data?.ticketId };
  }

  emitToRoom(room: string, event: string, payload: unknown) {
    this.server?.to(room).emit(event, payload);
  }
}
