export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  SYSTEM_ADMIN: 'system_admin',
  SUPPORT_ADMIN: 'support_admin',
  TEAM_LEAD: 'team_lead',
  AGENT: 'agent',
  AUDITOR: 'auditor',
  REQUESTER: 'requester',
} as const;

export const DEFAULT_STATUSES = [
  'new',
  'open',
  'in_progress',
  'waiting_for_user',
  'waiting_for_vendor',
  'waiting_for_internal_team',
  'on_hold',
  'resolved',
  'closed',
  'cancelled',
] as const;

export const DEFAULT_PRIORITIES = [
  'normal',
  'elevated',
  'high',
  'urgent',
  'critical',
] as const;

export const MESSAGE_KINDS = [
  'internal_note',
  'public_reply',
  'inbound_email',
  'outbound_email',
  'system',
] as const;

export const TICKET_SOURCES = ['web', 'email', 'teams', 'api', 'recurring', 'admin'] as const;

export const AUDIT_SOURCES = ['web', 'email', 'teams', 'system_job', 'api'] as const;

export const NOTIFICATION_CHANNELS = ['email', 'teams', 'in_app'] as const;

export const HOLD_REASONS = [
  'waiting_for_user_reply',
  'waiting_for_vendor',
  'waiting_for_maintenance_window',
  'waiting_for_approval',
  'waiting_for_delivery',
  'other',
] as const;

export const SLA_ESCALATION_THRESHOLDS = {
  NORMAL_DAYS: 5,
  ELEVATED_DAYS: 2,
  HIGH_HOURS: 48,
  URGENT_HOURS: 24,
} as const;
