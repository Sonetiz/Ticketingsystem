'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assets, software, type AssetItem } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { BtnPrimary, BtnSecondary, FieldLabel, Modal, SelectInput, TextInput } from '@/components/ui/modal';
import { toast } from '@/lib/toast';

const RELATION_TYPES = ['runs_on', 'depends_on', 'installed_on', 'connected_to', 'part_of'];

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showRelModal, setShowRelModal] = useState(false);
  const [showSwModal, setShowSwModal] = useState(false);
  const [relForm, setRelForm] = useState<{ targetAssetId: string; relationType: string; direction: 'downstream' | 'upstream' }>({ targetAssetId: '', relationType: 'depends_on', direction: 'downstream' });
  const [swForm, setSwForm] = useState({ softwareLicenseId: '', version: '' });

  const { data: asset, isLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assets.get(id),
  });

  const { data: allAssets } = useQuery({
    queryKey: ['assets'],
    queryFn: () => assets.list(),
    enabled: showRelModal,
  });

  const { data: licenses } = useQuery({
    queryKey: ['software'],
    queryFn: () => software.list(),
    enabled: showSwModal,
  });

  const addRelMutation = useMutation({
    mutationFn: () => assets.addRelationship(id, relForm),
    onSuccess: () => {
      toast.success('Relationship added');
      queryClient.invalidateQueries({ queryKey: ['asset', id] });
      setShowRelModal(false);
    },
  });

  const removeRelMutation = useMutation({
    mutationFn: (relId: string) => assets.removeRelationship(id, relId),
    onSuccess: () => {
      toast.success('Relationship removed');
      queryClient.invalidateQueries({ queryKey: ['asset', id] });
    },
  });

  const installSwMutation = useMutation({
    mutationFn: () => assets.installSoftware(id, swForm),
    onSuccess: () => {
      toast.success('Software installed');
      queryClient.invalidateQueries({ queryKey: ['asset', id] });
      setShowSwModal(false);
    },
  });

  const uninstallSwMutation = useMutation({
    mutationFn: (licenseId: string) => assets.uninstallSoftware(id, licenseId),
    onSuccess: () => {
      toast.success('Software removed');
      queryClient.invalidateQueries({ queryKey: ['asset', id] });
    },
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!asset) return <p>Asset not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button type="button" onClick={() => router.push('/portal/assets')} className="text-sm text-primary hover:underline mb-2">← Back to assets</button>
          <h1 className="text-2xl font-bold">{asset.name}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge>{asset.status.replace(/_/g, ' ')}</Badge>
            <Badge variant="muted">{asset.lifecycleStage}</Badge>
            <Badge variant="muted">{asset.assetType}</Badge>
          </div>
        </div>
        <BtnSecondary onClick={() => router.push('/portal/assets')}>Edit in list</BtnSecondary>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Details">
          <DetailGrid asset={asset} />
        </Panel>

        <Panel title="Ownership">
          <dl className="space-y-2 text-sm">
            <Row label="Owner" value={asset.owner ? `${asset.owner.name} (${asset.owner.department ?? '—'})` : '—'} />
            <Row label="Primary user" value={asset.primaryUser ? `${asset.primaryUser.name} (${asset.primaryUser.jobTitle ?? '—'})` : '—'} />
            <Row label="Location" value={asset.location} />
            <Row label="Service" value={asset.service?.name} />
          </dl>
        </Panel>

        <Panel title="Relationships" action={<button type="button" className="text-xs text-primary hover:underline" onClick={() => setShowRelModal(true)}>Add</button>}>
          <RelationshipList
            parents={asset.parentRelationships ?? []}
            children={asset.childRelationships ?? []}
            onRemove={(relId) => removeRelMutation.mutate(relId)}
          />
        </Panel>

        <Panel title="Software" action={<button type="button" className="text-xs text-primary hover:underline" onClick={() => setShowSwModal(true)}>Install</button>}>
          {!asset.software?.length ? (
            <p className="text-sm text-muted-foreground">No software installed</p>
          ) : (
            <ul className="space-y-2">
              {asset.software.map((sw) => (
                <li key={sw.softwareLicenseId} className="flex justify-between text-sm border border-border rounded-lg p-2">
                  <div>
                    <p className="font-medium">{sw.softwareLicense.name}</p>
                    <p className="text-xs text-muted-foreground">{sw.version ?? '—'} · {sw.seatsUsed} seat(s)</p>
                  </div>
                  <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => uninstallSwMutation.mutate(sw.softwareLicenseId)}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Linked tickets">
          {!asset.linkedTickets?.length ? <p className="text-sm text-muted-foreground">None</p> : (
            <ul className="space-y-1 text-sm">
              {asset.linkedTickets.map((l) => (
                <li key={l.ticket.id}>
                  <Link href={`/portal/tickets/${l.ticket.id}`} className="text-primary hover:underline">
                    #{l.ticket.number} {l.ticket.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Linked problems">
          {!asset.linkedProblems?.length ? <p className="text-sm text-muted-foreground">None</p> : (
            <ul className="space-y-1 text-sm">
              {asset.linkedProblems.map((l) => (
                <li key={l.problemRecord.id}>
                  <Link href={`/portal/problems/${l.problemRecord.id}`} className="text-primary hover:underline">
                    {l.problemRecord.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {asset.notes && (
        <Panel title="Notes">
          <p className="text-sm whitespace-pre-wrap">{asset.notes}</p>
        </Panel>
      )}

      <Modal open={showRelModal} onClose={() => setShowRelModal(false)} title="Add relationship">
        <form onSubmit={(e) => { e.preventDefault(); addRelMutation.mutate(); }} className="space-y-4">
          <div><FieldLabel>Target asset</FieldLabel>
            <SelectInput value={relForm.targetAssetId} onChange={(e) => setRelForm({ ...relForm, targetAssetId: e.target.value })} required>
              <option value="">Select asset</option>
              {allAssets?.filter((a) => a.id !== id).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </SelectInput>
          </div>
          <div><FieldLabel>Relation type</FieldLabel>
            <SelectInput value={relForm.relationType} onChange={(e) => setRelForm({ ...relForm, relationType: e.target.value })}>
              {RELATION_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </SelectInput>
          </div>
          <div><FieldLabel>Direction</FieldLabel>
            <SelectInput value={relForm.direction} onChange={(e) => setRelForm({ ...relForm, direction: e.target.value as 'downstream' | 'upstream' })}>
              <option value="downstream">This asset → target</option>
              <option value="upstream">Target → this asset</option>
            </SelectInput>
          </div>
          <div className="flex justify-end gap-2">
            <BtnSecondary type="button" onClick={() => setShowRelModal(false)}>Cancel</BtnSecondary>
            <BtnPrimary type="submit" disabled={addRelMutation.isPending}>Add</BtnPrimary>
          </div>
        </form>
      </Modal>

      <Modal open={showSwModal} onClose={() => setShowSwModal(false)} title="Install software">
        <form onSubmit={(e) => { e.preventDefault(); installSwMutation.mutate(); }} className="space-y-4">
          <div><FieldLabel>License</FieldLabel>
            <SelectInput value={swForm.softwareLicenseId} onChange={(e) => setSwForm({ ...swForm, softwareLicenseId: e.target.value })} required>
              <option value="">Select license</option>
              {licenses?.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.seatsAvailable ?? l.seatsTotal - (l.seatsUsed ?? 0)} available)</option>)}
            </SelectInput>
          </div>
          <div><FieldLabel>Version</FieldLabel><TextInput value={swForm.version} onChange={(e) => setSwForm({ ...swForm, version: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <BtnSecondary type="button" onClick={() => setShowSwModal(false)}>Cancel</BtnSecondary>
            <BtnPrimary type="submit" disabled={installSwMutation.isPending}>Install</BtnPrimary>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Badge({ children, variant }: { children: React.ReactNode; variant?: 'muted' }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs capitalize ${variant === 'muted' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
      {children}
    </span>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  );
}

function DetailGrid({ asset }: { asset: AssetItem }) {
  return (
    <dl className="space-y-2 text-sm">
      <Row label="Identifier" value={asset.identifier} />
      <Row label="Serial" value={asset.serialNumber} />
      <Row label="Vendor / Model" value={[asset.vendor, asset.model].filter(Boolean).join(' / ') || null} />
      <Row label="Purchase date" value={asset.purchaseDate ? formatDate(asset.purchaseDate) : null} />
      <Row label="Warranty ends" value={asset.warrantyEndsAt ? formatDate(asset.warrantyEndsAt) : null} />
      <Row label="Retired" value={asset.retiredAt ? formatDate(asset.retiredAt) : null} />
      <Row label="Updated" value={formatDate(asset.updatedAt)} />
    </dl>
  );
}

function RelationshipList({
  parents,
  children,
  onRemove,
}: {
  parents: NonNullable<AssetItem['parentRelationships']>;
  children: NonNullable<AssetItem['childRelationships']>;
  onRemove: (id: string) => void;
}) {
  if (!parents.length && !children.length) {
    return <p className="text-sm text-muted-foreground">No relationships</p>;
  }
  return (
    <div className="space-y-3 text-sm">
      {parents.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Depends on (parents)</p>
          <ul className="space-y-1">
            {parents.map((r) => (
              <li key={r.id} className="flex justify-between items-center border border-border rounded p-2">
                <span>{r.relationType.replace(/_/g, ' ')} → <Link href={`/portal/assets/${r.parentAsset.id}`} className="text-primary hover:underline">{r.parentAsset.name}</Link></span>
                <button type="button" className="text-xs text-red-600" onClick={() => onRemove(r.id)}>Remove</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {children.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Used by (children)</p>
          <ul className="space-y-1">
            {children.map((r) => (
              <li key={r.id} className="flex justify-between items-center border border-border rounded p-2">
                <span>{r.relationType.replace(/_/g, ' ')} → <Link href={`/portal/assets/${r.childAsset.id}`} className="text-primary hover:underline">{r.childAsset.name}</Link></span>
                <button type="button" className="text-xs text-red-600" onClick={() => onRemove(r.id)}>Remove</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
