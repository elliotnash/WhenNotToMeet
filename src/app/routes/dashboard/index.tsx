import { buttonStyles } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from '@/components/ui/link';
import { Menu, MenuContent, MenuItem, MenuSeparator } from '@/components/ui/menu';
import {
  CalendarDaysIcon,
  ClockIcon,
  EllipsisHorizontalIcon,
  PlusIcon,
  UsersIcon,
} from '@heroicons/react/20/solid';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { ConfirmModal } from '~/components/confirm-modal';
import { m, riseItem, staggerParent } from '~/components/motion';
import { CopyLinkButton, sharePath } from '~/components/share-link';
import { describeDates, describeWindow } from '~/lib/event-format';
import { type MyEventSummary, myEventsQuery } from '~/queries/events';
import { deleteEvent } from '~/server/events';

export const Route = createFileRoute('/dashboard/')({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(myEventsQuery()),
  head: () => ({ meta: [{ title: 'Dashboard · WhenNotToMeet' }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: events } = useSuspenseQuery(myEventsQuery());

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Your events</h1>
          <p className="mt-1 text-muted-fg text-sm">
            Share an event's link and everyone marks when they can't make it.
          </p>
        </div>
        <Link href="/dashboard/new" className={buttonStyles()}>
          <PlusIcon />
          New event
        </Link>
      </div>

      {events.length === 0 ? (
        <EmptyState />
      ) : (
        <m.ul
          variants={staggerParent}
          initial="hidden"
          animate="show"
          className="mt-8 grid gap-4 sm:grid-cols-2"
        >
          {events.map((event) => (
            <m.li key={event.id} variants={riseItem}>
              <EventCard event={event} />
            </m.li>
          ))}
        </m.ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center">
      <CalendarDaysIcon className="size-10 text-muted-fg" />
      <h2 className="mt-4 font-semibold">No events yet</h2>
      <p className="mt-1 max-w-sm text-muted-fg text-sm">
        Create an event, pick the days and hours it could happen, and send the link around.
      </p>
      <Link href="/dashboard/new" className={buttonStyles({ className: 'mt-6' })}>
        <PlusIcon />
        Create event
      </Link>
    </div>
  );
}

function EventCard({ event }: { event: MyEventSummary }) {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const remove = useMutation({
    mutationFn: () => deleteEvent({ data: { id: event.id } }),
    onSuccess: async () => {
      setConfirmDelete(false);
      await queryClient.invalidateQueries({ queryKey: ['my-events'] });
    },
  });

  return (
    <Card className="h-full gap-4 [--gutter:--spacing(5)]">
      <div className="flex items-start justify-between gap-2 px-(--gutter)">
        <Link
          href={`/dashboard/${event.id}`}
          className="min-w-0 font-semibold text-lg leading-snug hover:text-primary"
        >
          <span className="line-clamp-2">{event.title}</span>
        </Link>
        <Menu>
          <Button intent="plain" size="sq-xs" aria-label="Event actions">
            <EllipsisHorizontalIcon />
          </Button>
          <MenuContent placement="bottom end">
            <MenuItem href={`/dashboard/${event.id}`}>Manage</MenuItem>
            <MenuItem href={sharePath(event.token)}>Open event page</MenuItem>
            <MenuSeparator />
            <MenuItem intent="danger" onAction={() => setConfirmDelete(true)}>
              Delete
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
      <dl className="flex flex-col gap-1.5 px-(--gutter) text-muted-fg text-sm">
        <div className="flex items-center gap-2">
          <CalendarDaysIcon className="size-4 shrink-0" />
          <dt className="sr-only">Dates</dt>
          <dd>{describeDates(event)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <ClockIcon className="size-4 shrink-0" />
          <dt className="sr-only">Hours</dt>
          <dd>{describeWindow(event)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <UsersIcon className="size-4 shrink-0" />
          <dt className="sr-only">Responses</dt>
          <dd>
            {event.respondedCount} {event.respondedCount === 1 ? 'response' : 'responses'}
          </dd>
        </div>
      </dl>
      <div className="mt-auto flex flex-wrap gap-2 px-(--gutter)">
        <CopyLinkButton token={event.token} />
        <Link
          href={sharePath(event.token)}
          className={buttonStyles({ intent: 'secondary', size: 'sm' })}
        >
          Open
        </Link>
      </div>
      <ConfirmModal
        isOpen={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete event?"
        description={`"${event.title}" and everyone's responses will be permanently deleted.`}
        confirmLabel="Delete event"
        isPending={remove.isPending}
        error={remove.error?.message}
        onConfirm={() => remove.mutate()}
      />
    </Card>
  );
}
