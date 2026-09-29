import { Button, buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Description, FieldError, Label } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Link } from '@/components/ui/link';
import { Loader } from '@/components/ui/loader';
import { TextField } from '@/components/ui/text-field';
import {
  ArrowRightStartOnRectangleIcon,
  CalendarDaysIcon,
  ClockIcon,
  Cog6ToothIcon,
  UserIcon,
} from '@heroicons/react/20/solid';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, notFound, useLocation } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import { AppHeader } from '~/components/app-header';
import { EventCalendar } from '~/components/event-calendar';
import { m, riseItem, staggerParent } from '~/components/motion';
import { describeDates, describeTimeZone, describeWindow } from '~/lib/event-format';
import { cn } from '~/lib/utils';
import { type EventView, eventByTokenQuery } from '~/queries/participation';
import { joinAsGuest, joinAsUser, leaveEvent } from '~/server/participation';

export const Route = createFileRoute('/event')({
  validateSearch: z.object({ token: z.string().catch('') }),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: async ({ context: { queryClient }, deps }) => {
    if (!deps.token) throw notFound();
    const view = await queryClient.ensureQueryData(eventByTokenQuery(deps.token));
    if (!view) throw notFound();
    return { title: view.event.title };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.title ?? 'Event'} · WhenNotToMeet` }],
  }),
  notFoundComponent: EventNotFound,
  component: EventPage,
});

function EventNotFound() {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="font-bold text-2xl tracking-tight">Event not found</h1>
        <p className="max-w-md text-muted-fg">
          This link is invalid or has been replaced by the organizer. Ask them for a new one.
        </p>
        <Link href="/" className={buttonStyles({ className: 'mt-2' })}>
          Back home
        </Link>
      </main>
    </div>
  );
}

function useEventView() {
  const { token } = Route.useSearch();
  const { data } = useSuspenseQuery(eventByTokenQuery(token));
  if (!data) throw notFound();
  return { token, view: data };
}

function EventPage() {
  const { token, view } = useEventView();

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      {view.me ? (
        <EventWorkspace token={token} view={view} />
      ) : (
        <JoinEvent token={token} view={view} />
      )}
    </div>
  );
}

function EventMeta({ event, className }: { event: EventView['event']; className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-x-5 gap-y-1.5 text-muted-fg text-sm', className)}>
      <span className="flex items-center gap-1.5">
        <CalendarDaysIcon className="size-4" />
        {describeDates(event)}
      </span>
      <span className="flex items-center gap-1.5">
        <ClockIcon className="size-4" />
        {describeWindow(event)} · {describeTimeZone(event)}
      </span>
    </div>
  );
}

function useRefreshEvent(token: string) {
  const queryClient = useQueryClient();
  return () => queryClient.resetQueries({ queryKey: ['event', token] });
}

function JoinEvent({ token, view }: { token: string; view: EventView }) {
  const location = useLocation();
  const refresh = useRefreshEvent(token);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const guest = useMutation({
    mutationFn: joinAsGuest,
    onSuccess: refresh,
  });
  const account = useMutation({
    mutationFn: () => joinAsUser({ data: { token } }),
    onSuccess: refresh,
  });

  const loginHref = `/login?redirect=${encodeURIComponent(location.href)}`;

  return (
    <main className="flex flex-1 justify-center px-4 py-12 sm:px-6">
      <m.div variants={staggerParent} initial="hidden" animate="show" className="w-full max-w-md">
        <m.div variants={riseItem} className="mb-6 text-center">
          <p className="font-medium text-primary text-sm">You're invited to</p>
          <h1 className="mt-1 font-bold text-3xl tracking-tight">{view.event.title}</h1>
          {view.event.description ? (
            <p className="mt-2 whitespace-pre-line text-muted-fg">{view.event.description}</p>
          ) : null}
          <EventMeta event={view.event} className="mt-3 justify-center" />
        </m.div>
        <m.div variants={riseItem}>
          <Card>
            <CardHeader>
              <CardTitle>Join event</CardTitle>
              <CardDescription>
                Add yourself, then mark the times you're not available.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {view.account ? (
                <>
                  <Button
                    className="w-full"
                    isPending={account.isPending}
                    onPress={() => account.mutate()}
                  >
                    {account.isPending ? <Loader /> : <UserIcon />}
                    Continue as {view.account.name}
                  </Button>
                  {account.error ? (
                    <p className="mt-2 text-danger-subtle-fg text-sm">{account.error.message}</p>
                  ) : null}
                  <div className="my-5 flex items-center gap-3 text-muted-fg text-xs">
                    <span className="h-px flex-1 bg-border" />
                    or join as a guest
                    <span className="h-px flex-1 bg-border" />
                  </div>
                </>
              ) : null}
              <form
                className="flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  guest.mutate({ data: { token, name, password } });
                }}
              >
                <TextField
                  isRequired
                  value={name}
                  onChange={setName}
                  maxLength={50}
                  autoComplete="name"
                >
                  <Label>Your name</Label>
                  <Input />
                  <FieldError />
                </TextField>
                <TextField
                  isRequired
                  type="password"
                  value={password}
                  onChange={setPassword}
                  minLength={4}
                  autoComplete="off"
                >
                  <Label>Event password</Label>
                  <Input />
                  <Description>
                    Only for this event. Returning? Use the same name and password.
                  </Description>
                  <FieldError />
                </TextField>
                {guest.error ? (
                  <p className="text-danger-subtle-fg text-sm">{guest.error.message}</p>
                ) : null}
                <Button
                  type="submit"
                  intent={view.account ? 'outline' : 'primary'}
                  isPending={guest.isPending}
                >
                  {guest.isPending ? <Loader /> : null}
                  Join as guest
                </Button>
              </form>
            </CardContent>
          </Card>
        </m.div>
        {view.account ? null : (
          <m.p variants={riseItem} className="mt-6 text-center text-muted-fg text-sm">
            Have an account?{' '}
            <Link href={loginHref} className="text-primary">
              Sign in
            </Link>{' '}
            to join without a password.
          </m.p>
        )}
      </m.div>
    </main>
  );
}

function EventWorkspace({ token, view }: { token: string; view: EventView }) {
  const refresh = useRefreshEvent(token);
  const leave = useMutation({
    mutationFn: () => leaveEvent({ data: { token } }),
    onSuccess: refresh,
  });
  const me = view.me as NonNullable<EventView['me']>;

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-bold text-2xl tracking-tight">{view.event.title}</h1>
          <div className="mt-1.5">
            <EventMeta event={view.event} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-fg text-sm">
            Signed in as <span className="font-medium text-fg">{me.name}</span>
          </span>
          <Button
            intent="outline"
            size="sm"
            isPending={leave.isPending}
            onPress={() => leave.mutate()}
          >
            <ArrowRightStartOnRectangleIcon />
            Switch person
          </Button>
          {view.event.isOwner ? (
            <Link
              href={`/dashboard/${view.event.id}`}
              className={buttonStyles({ intent: 'outline', size: 'sm' })}
            >
              <Cog6ToothIcon />
              Manage
            </Link>
          ) : null}
        </div>
      </div>
      <EventCalendar token={token} event={view.event} />
    </main>
  );
}
