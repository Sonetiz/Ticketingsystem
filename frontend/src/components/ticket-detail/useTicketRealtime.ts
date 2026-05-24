'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');

let sharedSocket: Socket | null = null;

function getSocket() {
  if (typeof window === 'undefined') return null;
  if (!sharedSocket) {
    sharedSocket = io(`${WS_BASE}/realtime`, { withCredentials: true, autoConnect: true });
  }
  return sharedSocket;
}

export function useTicketRealtime(ticketId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !ticketId) return;

    socket.emit('join.ticket', { ticketId });

    const onTicketUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    };
    const onMessageCreated = () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    };
    const onAttachmentAdded = () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    };

    socket.on('ticket.updated', onTicketUpdated);
    socket.on('message.created', onMessageCreated);
    socket.on('attachment.added', onAttachmentAdded);

    return () => {
      socket.emit('leave.ticket', { ticketId });
      socket.off('ticket.updated', onTicketUpdated);
      socket.off('message.created', onMessageCreated);
      socket.off('attachment.added', onAttachmentAdded);
    };
  }, [ticketId, queryClient]);
}
