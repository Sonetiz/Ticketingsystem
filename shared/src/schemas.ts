import { z } from 'zod';
import {
  DEFAULT_PRIORITIES,
  DEFAULT_STATUSES,
  HOLD_REASONS,
  MESSAGE_KINDS,
  TICKET_SOURCES,
} from './constants';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createTicketSchema = z.object({
  title: z.string().min(3).max(500),
  description: z.string().min(1).max(50000),
  requesterId: z.string().uuid().optional(),
  affectedUserId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  assignedTeamId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  priority: z.enum(DEFAULT_PRIORITIES as unknown as [string, ...string[]]).optional(),
  impact: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  dueAt: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  source: z.enum(TICKET_SOURCES as unknown as [string, ...string[]]).optional(),
});

export const updateTicketSchema = createTicketSchema.partial().extend({
  status: z.enum(DEFAULT_STATUSES as unknown as [string, ...string[]]).optional(),
});

export const createMessageSchema = z.object({
  body: z.string().min(1).max(50000),
  kind: z.enum(['internal_note', 'public_reply'] as const),
  mentionUserIds: z.array(z.string().uuid()).optional(),
});

export const holdTicketSchema = z.object({
  holdUntil: z.string().datetime().optional(),
  holdReason: z.enum(HOLD_REASONS as unknown as [string, ...string[]]),
  holdNote: z.string().max(5000).optional(),
});

export const assignTicketSchema = z.object({
  assigneeId: z.string().uuid().optional().nullable(),
  assignedTeamId: z.string().uuid().optional().nullable(),
});

export const publicReplySchema = z.object({
  body: z.string().min(1).max(10000),
});

export const createProjectSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(10000).optional(),
  dueAt: z.string().datetime().optional(),
  ownerId: z.string().uuid().optional(),
});

export const createRecurringTaskSchema = z.object({
  name: z.string().min(2).max(200),
  titleTemplate: z.string().min(3).max(500),
  descriptionTemplate: z.string().max(50000).optional(),
  rrule: z.string().min(1),
  assigneeId: z.string().uuid().optional(),
  assignedTeamId: z.string().uuid().optional(),
  priority: z.enum(DEFAULT_PRIORITIES as unknown as [string, ...string[]]).optional(),
  categoryId: z.string().uuid().optional(),
  dueDateOffsetHours: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const ticketFilterSchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  assignedTeamId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  onHold: z.coerce.boolean().optional(),
  overdue: z.coerce.boolean().optional(),
  slaBreached: z.coerce.boolean().optional(),
  view: z.enum(['active', 'mine', 'team', 'on-hold', 'overdue', 'recent', 'all']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type HoldTicketInput = z.infer<typeof holdTicketSchema>;
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
export type PublicReplyInput = z.infer<typeof publicReplySchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateRecurringTaskInput = z.infer<typeof createRecurringTaskSchema>;
export type TicketFilterInput = z.infer<typeof ticketFilterSchema>;
