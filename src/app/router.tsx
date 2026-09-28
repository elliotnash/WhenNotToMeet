import { QueryClient } from '@tanstack/react-query';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routerWithQueryClient } from '@tanstack/react-router-with-query';
import { NotFoundPage } from '~/components/not-found';
import { routeTree } from './route-tree.gen';

export interface RouterContext {
  queryClient: QueryClient;
}

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, set a non-zero staleTime to avoid refetching immediately on the client.
        staleTime: 60 * 1000,
      },
    },
  });

  const routerContext: RouterContext = {
    queryClient,
  };

  const router = createTanStackRouter({
    routeTree,
    context: routerContext,
    defaultPreload: 'intent',
    defaultNotFoundComponent: NotFoundPage,
    scrollRestoration: true,
  });

  // Expose router and query client to window for use outside React (e.g. Better Auth).
  if (typeof window !== 'undefined') {
    window.getRouter = () => router;
    window.getQueryClient = () => queryClient;
  }

  return routerWithQueryClient(router, queryClient);
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

declare global {
  interface Window {
    getRouter: () => ReturnType<typeof getRouter>;
    getQueryClient: () => QueryClient;
  }
}
