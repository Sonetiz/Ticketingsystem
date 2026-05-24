'use client';

import Link from 'next/link';
import type { TicketDetail } from '@/lib/api';

export function LinkedTickets({ ticket }: { ticket: TicketDetail }) {
  const links = [
    ...ticket.linksFrom.map((l) => ({
      id: l.id,
      linkType: l.linkType,
      related: l.toTicket,
      direction: 'to' as const,
    })),
    ...ticket.linksTo.map((l) => ({
      id: l.id,
      linkType: l.linkType,
      related: l.fromTicket,
      direction: 'from' as const,
    })),
  ];

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <h3 className="font-semibold">Linked Tickets</h3>
      {links.length ? (
        <ul className="space-y-2">
          {links.map((link) =>
            link.related ? (
              <li key={link.id} className="text-sm">
                <span className="text-muted-foreground capitalize">{link.linkType.replace(/_/g, ' ')}</span>
                {' → '}
                <Link href={`/portal/tickets/${link.related.id}`} className="text-primary font-mono">
                  #{link.related.number}
                </Link>
                {' '}{link.related.title}
              </li>
            ) : null,
          )}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No linked tickets</p>
      )}
    </div>
  );
}
