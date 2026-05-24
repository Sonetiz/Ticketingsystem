import { Suspense } from 'react';
import TicketsPageContent from '../tickets/tickets-content';

export default function UnassignedTicketsPage() {
  return (
    <Suspense fallback={<p>Loading unassigned tickets...</p>}>
      <TicketsPageContent fixedView="unassigned" title="Unassigned Tickets" />
    </Suspense>
  );
}
