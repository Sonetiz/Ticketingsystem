'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assets, type AssetSummary } from '@/lib/api';
import { toast } from '@/lib/toast';

interface AssetContextPanelProps {
  entityType: 'ticket' | 'change' | 'problem';
  entityId: string;
  linkedAssets?: AssetSummary[];
  queryKey: string[];
  linkAsset: (entityId: string, assetId: string) => Promise<unknown>;
  unlinkAsset: (entityId: string, assetId: string) => Promise<unknown>;
}

export function AssetContextPanel({
  entityType,
  entityId,
  linkedAssets = [],
  queryKey,
  linkAsset,
  unlinkAsset,
}: AssetContextPanelProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const { data: searchResults } = useQuery({
    queryKey: ['assets', 'search', search],
    queryFn: () => assets.list({ q: search }),
    enabled: showPicker && search.length >= 2,
  });

  const linkMutation = useMutation({
    mutationFn: (assetId: string) => linkAsset(entityId, assetId),
    onSuccess: () => {
      toast.success('Asset linked');
      queryClient.invalidateQueries({ queryKey });
      setShowPicker(false);
      setSearch('');
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (assetId: string) => unlinkAsset(entityId, assetId),
    onSuccess: () => {
      toast.success('Asset unlinked');
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const linkedIds = new Set(linkedAssets.map((a) => a.id));

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Assets</h3>
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="text-xs text-primary hover:underline"
        >
          {showPicker ? 'Cancel' : 'Link asset'}
        </button>
      </div>

      {linkedAssets.length === 0 && !showPicker && (
        <p className="text-sm text-muted-foreground">No linked assets</p>
      )}

      <ul className="space-y-2">
        {linkedAssets.map((asset) => (
          <li key={asset.id} className="flex items-center justify-between text-sm border border-border rounded-lg p-2">
            <div>
              <Link href={`/portal/assets/${asset.id}`} className="font-medium text-primary hover:underline">
                {asset.name}
              </Link>
              <p className="text-xs text-muted-foreground capitalize">
                {[asset.assetType, asset.identifier, asset.relation?.replace(/_/g, ' ')].filter(Boolean).join(' · ')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => unlinkMutation.mutate(asset.id)}
              className="text-xs text-red-600 hover:underline"
              disabled={unlinkMutation.isPending}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {showPicker && (
        <div className="space-y-2 pt-2 border-t border-border">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets by name, serial, identifier..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          {search.length >= 2 && (
            <ul className="max-h-40 overflow-y-auto space-y-1">
              {searchResults
                ?.filter((a) => !linkedIds.has(a.id))
                .map((asset) => (
                  <li key={asset.id}>
                    <button
                      type="button"
                      onClick={() => linkMutation.mutate(asset.id)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm"
                      disabled={linkMutation.isPending}
                    >
                      <span className="font-medium">{asset.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs capitalize">{asset.assetType}</span>
                    </button>
                  </li>
                ))}
              {!searchResults?.filter((a) => !linkedIds.has(a.id)).length && (
                <li className="text-xs text-muted-foreground px-2">No matching assets</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
