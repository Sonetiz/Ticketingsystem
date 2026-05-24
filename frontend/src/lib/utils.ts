import { useEffect, useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export const statusColors: Record<string, string> = {
  new: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
  waiting_for_user: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  waiting_for_vendor: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  waiting_for_internal_team: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  on_hold: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
};

export const priorityColors: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  elevated: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
  urgent: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-200',
  critical: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200',
};

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
