import {
  AUDIT_SOURCES,
  DEFAULT_PRIORITIES,
  DEFAULT_STATUSES,
  MESSAGE_KINDS,
  NOTIFICATION_CHANNELS,
  ROLES,
  TICKET_SOURCES,
} from './constants';

export type RoleSlug = (typeof ROLES)[keyof typeof ROLES];
export type TicketStatus = (typeof DEFAULT_STATUSES)[number];
export type TicketPriority = (typeof DEFAULT_PRIORITIES)[number];
export type MessageKind = (typeof MESSAGE_KINDS)[number];
export type TicketSource = (typeof TICKET_SOURCES)[number];
export type AuditSource = (typeof AUDIT_SOURCES)[number];
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  roles: RoleSlug[];
  permissions: string[];
  teamIds: string[];
}

export interface TicketSummary {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  dueAt: string | null;
  isOnHold: boolean;
  assignee: { id: string; name: string } | null;
  assignedTeam: { id: string; name: string } | null;
  requester: { id: string; name: string; email: string } | null;
  updatedAt: string;
  createdAt: string;
}

export interface TicketTimelineEvent {
  id: string;
  type: string;
  actor: { id: string; name: string } | null;
  body?: string;
  oldValue?: unknown;
  newValue?: unknown;
  source: AuditSource;
  createdAt: string;
  isPublic: boolean;
}

export interface DashboardStats {
  openTickets: number;
  myAssigned: number;
  teamQueue: number;
  onHold: number;
  overdue: number;
  slaBreached: number;
  resolvedToday: number;
}

export interface ProjectProgress {
  id: string;
  name: string;
  totalTickets: number;
  completedTickets: number;
  percentComplete: number;
  dueAt: string | null;
}

export interface ReportOpenByTeam {
  teamId: string;
  teamName: string;
  count: number;
}

export interface ReportPeriodStats {
  created: number;
  resolved: number;
  avgResponseMinutes: number;
  avgResolutionMinutes: number;
}
