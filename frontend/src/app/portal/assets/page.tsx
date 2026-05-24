'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assets, type AssetItem, type AssetPayload } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { BtnPrimary, BtnSecondary, FieldLabel, Modal, TextArea, TextInput } from '@/components/ui/modal';
import { toast } from '@/lib/toast';

interface AssetFormState {
  name: string;
  assetType: string;
  identifier: string;
  metadata: string;
}

const emptyAssetForm: AssetFormState = {
  name: '',
  assetType: '',
  identifier: '',
  metadata: '',
};

function formatMetadata(metadata: AssetItem['metadata']) {
  return metadata ? JSON.stringify(metadata, null, 2) : '';
}

function toAssetPayload(form: AssetFormState): AssetPayload {
  let metadata: Record<string, unknown> | undefined;
  if (form.metadata.trim()) {
    const parsed = JSON.parse(form.metadata);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error('Metadata must be a JSON object');
    }
    metadata = parsed as Record<string, unknown>;
  }

  return {
    name: form.name,
    assetType: form.assetType,
    identifier: form.identifier || null,
    metadata,
  };
}

export default function AssetsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);
  const [form, setForm] = useState<AssetFormState>(emptyAssetForm);

  const { data, isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: assets.list,
  });

  const createMutation = useMutation({
    mutationFn: () => assets.create(toAssetPayload(form)),
    onSuccess: () => {
      toast.success('Asset created');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowCreate(false);
      setForm(emptyAssetForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingAsset) throw new Error('No asset selected');
      return assets.update(editingAsset.id, toAssetPayload(form));
    },
    onSuccess: () => {
      toast.success('Asset updated');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setEditingAsset(null);
      setForm(emptyAssetForm);
    },
  });

  const openCreate = () => {
    setForm(emptyAssetForm);
    setShowCreate(true);
  };

  const openEdit = (asset: AssetItem) => {
    setForm({
      name: asset.name,
      assetType: asset.assetType,
      identifier: asset.identifier ?? '',
      metadata: formatMetadata(asset.metadata),
    });
    setEditingAsset(asset);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Assets</h1>
        <BtnPrimary onClick={openCreate}>New asset</BtnPrimary>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Identifier</th>
                  <th className="text-left p-3 font-medium">Updated</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((asset) => (
                  <tr key={asset.id} className="border-t border-border">
                    <td className="p-3">{asset.name}</td>
                    <td className="p-3 capitalize">{asset.assetType}</td>
                    <td className="p-3 font-mono text-xs">{asset.identifier || '—'}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(asset.updatedAt)}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(asset)}
                        className="text-xs text-primary hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data?.length && (
            <p className="p-8 text-center text-muted-foreground">No assets found</p>
          )}
        </div>
      )}

      <AssetFormModal
        open={showCreate}
        title="Create asset"
        form={form}
        pending={createMutation.isPending}
        submitLabel="Create"
        onClose={() => setShowCreate(false)}
        onChange={setForm}
        onSubmit={() => createMutation.mutate()}
      />

      <AssetFormModal
        open={!!editingAsset}
        title="Edit asset"
        form={form}
        pending={updateMutation.isPending}
        submitLabel="Save"
        onClose={() => setEditingAsset(null)}
        onChange={setForm}
        onSubmit={() => updateMutation.mutate()}
      />
    </div>
  );
}

function AssetFormModal({
  open,
  title,
  form,
  pending,
  submitLabel,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  form: AssetFormState;
  pending: boolean;
  submitLabel: string;
  onClose: () => void;
  onChange: (form: AssetFormState) => void;
  onSubmit: () => void;
}) {
  const [metadataError, setMetadataError] = useState<string | null>(null);

  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            toAssetPayload(form);
            setMetadataError(null);
            onSubmit();
          } catch (error) {
            setMetadataError(error instanceof Error ? error.message : 'Invalid metadata JSON');
          }
        }}
        className="space-y-4"
      >
        <div>
          <FieldLabel>Name</FieldLabel>
          <TextInput
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            placeholder="Conference room projector"
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Type</FieldLabel>
            <TextInput
              value={form.assetType}
              onChange={(event) => onChange({ ...form, assetType: event.target.value })}
              placeholder="hardware"
              required
            />
          </div>
          <div>
            <FieldLabel>Identifier</FieldLabel>
            <TextInput
              value={form.identifier}
              onChange={(event) => onChange({ ...form, identifier: event.target.value })}
              placeholder="ASSET-001"
            />
          </div>
        </div>
        <div>
          <FieldLabel>Metadata JSON</FieldLabel>
          <TextArea
            value={form.metadata}
            onChange={(event) => {
              setMetadataError(null);
              onChange({ ...form, metadata: event.target.value });
            }}
            placeholder={'{\n  "serialNumber": "ABC123",\n  "location": "HQ"\n}'}
            className="min-h-36 font-mono"
          />
          {metadataError && <p className="mt-1 text-xs text-red-600">{metadataError}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <BtnSecondary type="button" onClick={onClose}>
            Cancel
          </BtnSecondary>
          <BtnPrimary type="submit" disabled={pending}>
            {submitLabel}
          </BtnPrimary>
        </div>
      </form>
    </Modal>
  );
}
