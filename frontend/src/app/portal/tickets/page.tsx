import { Suspense } from 'react';
import TicketsPageContent from './tickets-content';

export default function TicketsPage() {
  return (
    <Suspense fallback={<p>Loading tickets...</p>}>
      <TicketsPageContent />
    </Suspense>
  );
}
