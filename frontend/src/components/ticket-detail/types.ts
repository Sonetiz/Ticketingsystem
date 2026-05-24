export type { TicketDetail } from '@/lib/api';

export interface TicketMessage {
  id: string;
  kind: string;
  body: string;
  isPublic: boolean;
  createdAt: string;
  author: { id: string; name: string; email?: string } | null;
}

export interface TicketAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface TicketLink {
  id: string;
  linkType: string;
  toTicket?: { id: string; number: number; title: string };
  fromTicket?: { id: string; number: number; title: string };
}
