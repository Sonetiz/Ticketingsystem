'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TextArea } from './modal';

export function JsonTextarea({
  value,
  onChange,
  className,
  rows = 8,
}: {
  value: string;
  onChange: (value: string, parsed: object | null) => void;
  className?: string;
  rows?: number;
}) {
  const [invalid, setInvalid] = useState(false);

  const handleBlur = () => {
    try {
      const parsed = JSON.parse(value) as object;
      setInvalid(false);
      onChange(value, parsed);
    } catch {
      setInvalid(true);
      onChange(value, null);
    }
  };

  return (
    <TextArea
      value={value}
      onChange={(e) => {
        setInvalid(false);
        onChange(e.target.value, null);
      }}
      onBlur={handleBlur}
      rows={rows}
      className={cn('font-mono text-xs', invalid && 'border-red-500 ring-1 ring-red-500', className)}
      spellCheck={false}
    />
  );
}
