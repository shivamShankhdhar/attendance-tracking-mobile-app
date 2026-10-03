import { ApiError } from '../services/api';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, error) => count < 1 && !(error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500),
      refetchOnWindowFocus: true,
      staleTime: 1000 * 30, // 30 seconds
      gcTime: 1000 * 60 * 5,
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
