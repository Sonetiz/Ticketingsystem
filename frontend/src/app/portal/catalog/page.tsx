'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
}

export default function CatalogPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['catalog'],
    queryFn: async () => {
      try {
        return await api<CatalogItem[]>('/itsm/catalog');
      } catch {
        return null;
      }
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Service Catalog</h1>
      <p className="text-sm text-muted-foreground">Browse available services and request items.</p>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : data === null ? (
        <p className="p-8 text-center text-muted-foreground bg-card rounded-xl border border-border">
          Service catalog is not available yet.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data?.map((item) => (
            <article key={item.id} className="bg-card rounded-xl border border-border p-4">
              <h2 className="font-semibold">{item.name}</h2>
              {item.category && (
                <span className="text-xs text-muted-foreground">{item.category}</span>
              )}
              <p className="text-sm text-muted-foreground mt-2">{item.description || 'No description'}</p>
            </article>
          ))}
          {!data?.length && (
            <p className="col-span-full p-8 text-center text-muted-foreground bg-card rounded-xl border border-border">
              No catalog items
            </p>
          )}
        </div>
      )}
    </div>
  );
}
