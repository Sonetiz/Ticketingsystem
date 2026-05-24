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
  new: 'bg-indigo-100 text-indigo-800',
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  waiting_for_user: 'bg-amber-100 text-amber-800',
  waiting_for_vendor: 'bg-orange-100 text-orange-800',
  on_hold: 'bg-slate-100 text-slate-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

export const priorityColors: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-700',
  elevated: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};
