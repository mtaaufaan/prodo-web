import { QueryCache, QueryClient } from '@tanstack/react-query'

// Global error handler: log every query failure to the console for now.
// Replace with a toast/notification surface once one exists (S1+).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      console.error(`Query failed [${query.queryKey.join(', ')}]:`, error)
    },
  }),
})
