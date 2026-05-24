'use client';

import { cn, statusColors, priorityColors } from '@/lib/utils';
import type { TicketDetail } from '@/lib/api';

export function HeaderBar({ ticket }: { ticket: TicketDetail }) {
  return (
    <div>
      <span className="text-sm text-muted-foreground">#{ticket.number}</span>
      <h1 className="text-2xl font-bold">{ticket.title}</h1>
      <div className="flex gap-2 flex-wrap mt-2">
        <span className={cn('px-2 py-1 rounded text-xs', statusColors[ticket.status])}>
          {ticket.status.replace(/_/g, ' ')}
        </span>
        <span className={cn('px-2 py-1 rounded text-xs', priorityColors[ticket.priority])}>
          {ticket.priority}
        </span>
        {ticket.isOnHold && (
          <span className="px-2 py-1 rounded text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            ON HOLD
          </span>
        )}
      </div>
    </div>
  );
}
