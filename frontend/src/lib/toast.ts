import { toast as sonnerToast } from 'sonner';

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}

export function showErrorToast(error: unknown) {
  sonnerToast.error(getErrorMessage(error));
}

export function showSuccessToast(message: string) {
  sonnerToast.success(message);
}

export const toast = {
  success: showSuccessToast,
  error: showErrorToast,
  promise: sonnerToast.promise,
  info: sonnerToast.info,
  warning: sonnerToast.warning,
};
