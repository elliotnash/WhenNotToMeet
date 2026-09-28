import { publicEnv } from '@/env';
import { createRootRouteWithContext, useRouter } from '@tanstack/react-router';
import { HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import * as React from 'react';
import { RouterProvider } from 'react-aria-components';
import { MotionProvider } from '~/components/motion';
import { ThemeProvider } from '~/components/theme';
import styles from '~/globals.css?url';
import { useAuthOptions } from '~/hooks/use-auth';
import type { RouterContext } from '~/router';

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context: { queryClient } }) => {
    await queryClient.prefetchQuery(useAuthOptions());
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'WhenNotToMeet' },
    ],
    links: [{ rel: 'stylesheet', href: styles }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: React.PropsWithChildren) {
  const router = useRouter();

  const RouterDevtools =
    publicEnv().mode === 'production'
      ? () => null
      : React.lazy(() =>
          import('@tanstack/react-router-devtools').then((mod) => ({
            default: mod.TanStackRouterDevtools,
          })),
        );

  const QueryDevtools =
    publicEnv().mode === 'production'
      ? () => null
      : React.lazy(() =>
          import('@tanstack/react-query-devtools').then((mod) => ({
            default: mod.ReactQueryDevtools,
          })),
        );

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          {/* Let React Aria (Intent UI) links/buttons navigate through TanStack Router. */}
          <RouterProvider
            navigate={(to) => {
              const [pathname, queryString] = to.split('?');
              const search = queryString
                ? Object.fromEntries(new URLSearchParams(queryString))
                : undefined;
              router.navigate({ to: pathname, search } as Parameters<typeof router.navigate>[0]);
            }}
          >
            <MotionProvider>{children}</MotionProvider>
          </RouterProvider>
        </ThemeProvider>
        <React.Suspense>
          <RouterDevtools />
          <QueryDevtools />
        </React.Suspense>
        <Scripts />
      </body>
    </html>
  );
}
