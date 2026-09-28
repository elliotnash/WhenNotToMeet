import { getRequestHeaders, setResponseHeader } from '@tanstack/react-start/server';
import { createAuthClient } from 'better-auth/react';
import { serverOnly$ } from 'vite-env-only/macros';

export const authClient = createAuthClient({
  fetchOptions: {
    customFetchImpl: serverOnly$(async (input, init) => {
      const res = await fetch(input, {
        ...init,
        headers: {
          ...init?.headers,
          ...Object.fromEntries(getRequestHeaders()),
        },
      });
      // Forward only auth cookies (e.g. a refreshed session) to the SSR response.
      const cookies = res.headers.getSetCookie?.() ?? [];
      if (cookies.length) {
        setResponseHeader('set-cookie', cookies);
      }
      return res;
    }),
  },
});
