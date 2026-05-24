'use client';

import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { attachments } from '@/lib/api';
import { toast } from '@/lib/toast';
import { formatDate } from '@/lib/utils';
import type { TicketAttachment } from './types';

export function AttachmentPanel({
  ticketId,
  attachments: items,
}: {
  ticketId: string;
  attachments: TicketAttachment[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: (file: File) => attachments.upload(ticketId, file),
    onSuccess: () => {
      toast.success('Attachment uploaded');
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      if (fileRef.current) fileRef.current.value = '';
    },
  });

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Attachments</h3>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="text-xs px-2 py-1 border border-border rounded hover:bg-muted disabled:opacity-50"
        >
          Upload
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadMutation.mutate(file);
          }}
        />
      </div>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="flex justify-between text-sm">
              <span>{a.filename}</span>
              <span className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No attachments</p>
      )}
    </div>
  );
}
