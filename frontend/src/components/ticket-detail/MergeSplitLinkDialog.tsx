'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { Modal, FieldLabel, TextInput, BtnPrimary, BtnSecondary } from '@/components/ui/modal';

type DialogMode = 'merge' | 'split' | 'link' | null;

export function MergeSplitLinkDialog({ ticketId }: { ticketId: string }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<DialogMode>(null);
  const [targetTicketId, setTargetTicketId] = useState('');
  const [linkType, setLinkType] = useState('related');
  const [splitTitles, setSplitTitles] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });

  const mergeMutation = useMutation({
    mutationFn: () =>
      api(`/tickets/${ticketId}/merge`, {
        method: 'POST',
        body: JSON.stringify({ targetTicketId }),
      }),
    onSuccess: () => {
      toast.success('Tickets merged');
      setMode(null);
      invalidate();
    },
  });

  const splitMutation = useMutation({
    mutationFn: () =>
      api(`/tickets/${ticketId}/split`, {
        method: 'POST',
        body: JSON.stringify({
          titles: splitTitles.split('\n').map((t) => t.trim()).filter(Boolean),
        }),
      }),
    onSuccess: () => {
      toast.success('Ticket split');
      setMode(null);
      invalidate();
    },
  });

  const linkMutation = useMutation({
    mutationFn: () =>
      api(`/tickets/${ticketId}/link`, {
        method: 'POST',
        body: JSON.stringify({ toTicketId: targetTicketId, linkType }),
      }),
    onSuccess: () => {
      toast.success('Tickets linked');
      setMode(null);
      invalidate();
    },
  });

  const titles: Record<NonNullable<DialogMode>, string> = {
    merge: 'Merge into ticket',
    split: 'Split ticket',
    link: 'Link ticket',
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode('merge')} className="text-xs px-2 py-1 border border-border rounded hover:bg-muted">
          Merge
        </button>
        <button type="button" onClick={() => setMode('split')} className="text-xs px-2 py-1 border border-border rounded hover:bg-muted">
          Split
        </button>
        <button type="button" onClick={() => setMode('link')} className="text-xs px-2 py-1 border border-border rounded hover:bg-muted">
          Link
        </button>
      </div>

      {mode && (
        <Modal open={!!mode} onClose={() => setMode(null)} title={titles[mode]}>
          {mode === 'merge' && (
            <div className="space-y-3">
              <div>
                <FieldLabel>Target ticket ID</FieldLabel>
                <TextInput value={targetTicketId} onChange={(e) => setTargetTicketId(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <BtnSecondary onClick={() => setMode(null)}>Cancel</BtnSecondary>
                <BtnPrimary
                  disabled={!targetTicketId || mergeMutation.isPending}
                  onClick={() => mergeMutation.mutate()}
                >
                  Merge
                </BtnPrimary>
              </div>
            </div>
          )}
          {mode === 'split' && (
            <div className="space-y-3">
              <div>
                <FieldLabel>New ticket titles (one per line)</FieldLabel>
                <textarea
                  value={splitTitles}
                  onChange={(e) => setSplitTitles(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm min-h-[100px]"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <BtnSecondary onClick={() => setMode(null)}>Cancel</BtnSecondary>
                <BtnPrimary
                  disabled={!splitTitles.trim() || splitMutation.isPending}
                  onClick={() => splitMutation.mutate()}
                >
                  Split
                </BtnPrimary>
              </div>
            </div>
          )}
          {mode === 'link' && (
            <div className="space-y-3">
              <div>
                <FieldLabel>Related ticket ID</FieldLabel>
                <TextInput value={targetTicketId} onChange={(e) => setTargetTicketId(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Link type</FieldLabel>
                <select
                  value={linkType}
                  onChange={(e) => setLinkType(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                >
                  <option value="related">Related</option>
                  <option value="duplicate">Duplicate</option>
                  <option value="blocks">Blocks</option>
                  <option value="blocked_by">Blocked by</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <BtnSecondary onClick={() => setMode(null)}>Cancel</BtnSecondary>
                <BtnPrimary
                  disabled={!targetTicketId || linkMutation.isPending}
                  onClick={() => linkMutation.mutate()}
                >
                  Link
                </BtnPrimary>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
