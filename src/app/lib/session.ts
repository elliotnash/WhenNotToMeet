import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '~/lib/auth';

export function requestHeaders(): Headers {
  return new Headers(Object.fromEntries(getRequestHeaders()));
}

export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: requestHeaders() });
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('You must be logged in to do that');
  }
  return user;
}
