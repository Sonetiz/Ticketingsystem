'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { problems } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AssetContextPanel } from '@/components/assets/AssetContextPanel';

export default function ProblemDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: problem, isLoading } = useQuery({
    queryKey: ['problem', id],
    queryFn: () => problems.get(id),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!problem) return <p>Problem not found</p>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div>
          <Link href="/portal/problems" className="text-sm text-primary hover:underline">← Back to problems</Link>
          <h1 className="text-2xl font-bold mt-2">{problem.title}</h1>
          <p className="text-sm text-muted-foreground capitalize mt-1">{problem.status}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <h2 className="font-semibold">Related ticket</h2>
          <Link href={`/portal/tickets/${problem.ticket.id}`} className="text-primary hover:underline">
            #{problem.ticket.number} {problem.ticket.title}
          </Link>
        </div>
        {problem.rootCause && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h2 className="font-semibold mb-2">Root cause</h2>
            <p className="text-sm whitespace-pre-wrap">{problem.rootCause}</p>
          </div>
        )}
        {problem.workaround && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h2 className="font-semibold mb-2">Workaround</h2>
            <p className="text-sm whitespace-pre-wrap">{problem.workaround}</p>
          </div>
        )}
      </div>
      <div className="space-y-4">
        <div className="bg-card rounded-xl border border-border p-4 text-sm space-y-2">
          <Row label="Known error" value={problem.isKnownError ? 'Yes' : 'No'} />
          <Row label="Updated" value={formatDate(problem.updatedAt)} />
        </div>
        <AssetContextPanel
          entityType="problem"
          entityId={problem.id}
          linkedAssets={problem.assets ?? []}
          queryKey={['problem', problem.id]}
          linkAsset={(pid, assetId) => problems.linkAsset(pid, assetId)}
          unlinkAsset={(pid, assetId) => problems.unlinkAsset(pid, assetId)}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
