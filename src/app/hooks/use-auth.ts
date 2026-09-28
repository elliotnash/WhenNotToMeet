import { queryOptions, useQuery } from '@tanstack/react-query';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { serverOnly$ } from 'vite-env-only/macros';
import { authClient } from '~/lib/auth-client';

export function useAuthOptions() {
  return queryOptions({
    queryKey: ['auth'],
    queryFn: async () => {
      const session = await authClient.getSession({
        fetchOptions: serverOnly$({
          headers: Object.fromEntries(getRequestHeaders()) as Record<string, string>,
        }),
      });
      return {
        isAuthenticated: !!session.data,
        ...session,
      };
    },
  });
}

export function useAuth() {
  const { data, error } = useQuery(useAuthOptions());
  return {
    isAuthenticated: data?.isAuthenticated ?? false,
    user: data?.data?.user ?? null,
    session: data?.data?.session ?? null,
    error,
  };
}
