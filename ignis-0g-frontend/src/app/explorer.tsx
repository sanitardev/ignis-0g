import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ApiError } from "@/api/client"
import { App } from "./app"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => {
        const status = error instanceof ApiError ? error.status : 0
        return count < 1 && (status === 0 || status === 408 || status === 429 || status >= 500)
      },
    },
  },
})

export default function Explorer() {
  return <QueryClientProvider client={queryClient}><App /></QueryClientProvider>
}
