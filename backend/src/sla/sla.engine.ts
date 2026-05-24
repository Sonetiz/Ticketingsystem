import { SLA_ESCALATION_THRESHOLDS } from '@ticketsystem/shared';

export type EscalationPriority = 'normal' | 'elevated' | 'high' | 'urgent' | 'critical';

export interface EscalationInput {
  dueAt: Date | null;
  currentPriority: string;
}

export interface EscalationResult {
  priority: EscalationPriority;
  level: number;
  isOverdue: boolean;
  hoursRemaining: number | null;
}

export function computeEscalationLevel(
  input: EscalationInput,
  now: Date = new Date(),
): EscalationResult {
  if (!input.dueAt) {
    return {
      priority: (input.currentPriority as EscalationPriority) || 'normal',
      level: 0,
      isOverdue: false,
      hoursRemaining: null,
    };
  }

  const msRemaining = input.dueAt.getTime() - now.getTime();
  const hoursRemaining = msRemaining / (1000 * 60 * 60);
  const daysRemaining = hoursRemaining / 24;
  const isOverdue = msRemaining < 0;

  let priority: EscalationPriority;
  let level: number;

  if (isOverdue) {
    priority = 'critical';
    level = 5;
  } else if (hoursRemaining < SLA_ESCALATION_THRESHOLDS.URGENT_HOURS) {
    priority = 'urgent';
    level = 4;
  } else if (hoursRemaining < SLA_ESCALATION_THRESHOLDS.HIGH_HOURS) {
    priority = 'high';
    level = 3;
  } else if (daysRemaining < SLA_ESCALATION_THRESHOLDS.ELEVATED_DAYS) {
    priority = 'elevated';
    level = 2;
  } else if (daysRemaining <= SLA_ESCALATION_THRESHOLDS.NORMAL_DAYS) {
    priority = 'elevated';
    level = 2;
  } else {
    priority = 'normal';
    level = 1;
  }

  return { priority, level, isOverdue, hoursRemaining };
}

export function isTicketOnHold(
  ticket: {
    holdUntil: Date | null;
    status: string;
  },
  now: Date = new Date(),
): boolean {
  if (ticket.holdUntil && ticket.holdUntil > now) return true;
  const holdStatuses = ['on_hold', 'waiting_for_user', 'waiting_for_vendor', 'waiting_for_internal_team'];
  return holdStatuses.includes(ticket.status);
}

export function isActiveQueueTicket(
  ticket: {
    holdUntil: Date | null;
    status: string;
    deletedAt: Date | null;
  },
  now: Date = new Date(),
): boolean {
  if (ticket.deletedAt) return false;
  if (isTicketOnHold(ticket, now)) return false;
  const closedStatuses = ['resolved', 'closed', 'cancelled'];
  return !closedStatuses.includes(ticket.status);
}

export function shouldReleaseHold(
  ticket: {
    holdUntil: Date | null;
  },
  now: Date = new Date(),
): boolean {
  if (!ticket.holdUntil) return false;
  return ticket.holdUntil <= now;
}
