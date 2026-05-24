import { QueryCache, MutationCache, QueryClient } from '@tanstack/react-query';
import { showErrorToast } from './toast';

export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => showErrorToast(error),
    }),
    mutationCache: new MutationCache({
      onError: (error) => showErrorToast(error),
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
