'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { search } from '@/lib/api';
import { useDebouncedValue, cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';

export function TopBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 250);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => search.global(debouncedQuery),
    enabled: open && debouncedQuery.length >= 2,
  });

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery('');
      router.push(href);
    },
    [router],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full max-w-md px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg bg-muted/50 hover:bg-muted transition"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">Search tickets, KB, assets…</span>
        <kbd className="hidden sm:inline text-xs bg-background border border-border rounded px-1.5 py-0.5">⌘K</kbd>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Global search" wide>
        <Command shouldFilter={false} className="rounded-lg">
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Type to search…"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm outline-none mb-3"
          />
          <Command.List className="max-h-72 overflow-y-auto">
            {debouncedQuery.length < 2 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Type at least 2 characters</p>
            )}
            {isFetching && debouncedQuery.length >= 2 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Searching…</p>
            )}
            {!isFetching && debouncedQuery.length >= 2 && !data?.results?.length && (
              <Command.Empty className="text-sm text-muted-foreground py-4 text-center">No results found</Command.Empty>
            )}
            {data?.results?.map((item) => (
              <Command.Item
                key={`${item.type}-${item.id}`}
                value={item.title}
                onSelect={() => navigate(item.href)}
                className={cn(
                  'flex flex-col gap-0.5 px-3 py-2 rounded-lg cursor-pointer text-sm',
                  'aria-selected:bg-muted',
                )}
              >
                <span className="font-medium">{item.title}</span>
                {item.subtitle && <span className="text-xs text-muted-foreground">{item.subtitle}</span>}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </Modal>
    </>
  );
}
