'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card shadow-xl',
            wide ? 'max-w-2xl' : 'max-w-lg',
          )}
        >
          <div className="flex items-center justify-between border-b border-border p-4">
            <Dialog.Title id="modal-title" className="text-lg font-semibold">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close dialog"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className="p-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium mb-1">{children}</label>;
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn('w-full px-3 py-2 border border-border rounded-lg bg-background text-sm', props.className)}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn('w-full px-3 py-2 border border-border rounded-lg bg-background text-sm min-h-[80px]', props.className)}
    />
  );
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn('w-full px-3 py-2 border border-border rounded-lg bg-background text-sm', props.className)}
    />
  );
}

export function BtnPrimary({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn('px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50', props.className)}
    >
      {children}
    </button>
  );
}

export function BtnSecondary({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn('px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted disabled:opacity-50', props.className)}
    >
      {children}
    </button>
  );
}
