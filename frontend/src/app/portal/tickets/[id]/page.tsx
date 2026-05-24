'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { tickets } from '@/lib/api';
import { useSession } from '@/hooks/useSession';
import { Skeleton } from '@/components/ui/skeleton';
import { HeaderBar } from '@/components/ticket-detail/HeaderBar';
import { MetaPanel } from '@/components/ticket-detail/MetaPanel';
import { WatchersPanel } from '@/components/ticket-detail/WatchersPanel';
import { LinkedTickets } from '@/components/ticket-detail/LinkedTickets';
import { AttachmentPanel } from '@/components/ticket-detail/AttachmentPanel';
import { MergeSplitLinkDialog } from '@/components/ticket-detail/MergeSplitLinkDialog';
import { ConversationPanel } from '@/components/ticket-detail/ConversationPanel';
import { HoldPanel } from '@/components/ticket-detail/HoldPanel';
import { useTicketRealtime } from '@/components/ticket-detail/useTicketRealtime';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => tickets.get(id),
  });

  useTicketRealtime(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!ticket) return <p>Ticket not found</p>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <HeaderBar ticket={ticket} />
        <ConversationPanel ticket={ticket} />
      </div>

      <div className="space-y-4">
        <MetaPanel ticket={ticket} currentUserId={session?.id} />
        <WatchersPanel ticketId={ticket.id} />
        <LinkedTickets ticket={ticket} />
        <AttachmentPanel ticketId={ticket.id} attachments={ticket.attachments || []} />
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold mb-2">Ticket actions</h3>
          <MergeSplitLinkDialog ticketId={ticket.id} />
        </div>
        <HoldPanel ticket={ticket} />
      </div>
    </div>
  );
}
