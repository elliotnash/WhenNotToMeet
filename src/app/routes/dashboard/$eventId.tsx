import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/components/ui/link';
import { ModalBody, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/modal';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  ClockIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { ConfirmModal } from '~/components/confirm-modal';
import { EventForm } from '~/components/event-form';
import { ShareLinkField, sharePath } from '~/components/share-link';
import { describeDates, describeTimeZone, describeWindow } from '~/lib/event-format';
import { type MyEvent, myEventQuery } from '~/queries/events';
import { deleteEvent, regenerateEventToken, removeParticipant, updateEvent } from '~/server/events';

export const Route = createFileRoute('/dashboard/$eventId')({
  loader: ({ context: { queryClient }, params }) =>
    queryClient.ensureQueryData(myEventQuery(params.eventId)),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.title ?? 'Event'} · WhenNotToMeet` }],
  }),
  component: ManageEvent,
});

function ManageEvent() {
  const { eventId } = Route.useParams();
  const { data: event } = useSuspenseQuery(myEventQuery(eventId));

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard"
        className="flex w-fit items-center gap-1 text-muted-fg text-sm hover:text-fg"
      >
        <ArrowLeftIcon className="size-4" />
        All events
      </Link>
      <EventOverview event={event} />
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <ShareCard event={event} />
        <ParticipantsCard event={event} />
      </div>
    </div>
  );
}

function useInvalidateEvent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ['my-events'] });
    await router.invalidate();
  };
}

function EventOverview({ event }: { event: MyEvent }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateEvent();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const update = useMutation({
    mutationFn: updateEvent,
    onSuccess: async () => {
      await invalidate();
      setEditing(false);
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteEvent({ data: { id: event.id } }),
    onSuccess: async () => {
      await navigate({ to: '/dashboard' });
      await queryClient.invalidateQueries({ queryKey: ['my-events'] });
    },
  });

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-bold text-2xl tracking-tight">{event.title}</h1>
        {event.description ? (
          <p className="mt-1 max-w-2xl whitespace-pre-line text-muted-fg">{event.description}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-muted-fg text-sm">
          <span className="flex items-center gap-1.5">
            <CalendarDaysIcon className="size-4" />
            {describeDates(event)}
          </span>
          <span className="flex items-center gap-1.5">
            <ClockIcon className="size-4" />
            {describeWindow(event)}
          </span>
          <span className="flex items-center gap-1.5">
            <GlobeAltIcon className="size-4" />
            {describeTimeZone(event)}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={sharePath(event.token)} className={buttonStyles({ size: 'sm' })}>
          <ArrowTopRightOnSquareIcon />
          Open event
        </Link>
        <Button intent="outline" size="sm" onPress={() => setEditing(true)}>
          <PencilSquareIcon />
          Edit
        </Button>
        <Button intent="outline" size="sm" onPress={() => setConfirmDelete(true)}>
          <TrashIcon />
          Delete
        </Button>
      </div>

      <ModalContent isOpen={editing} onOpenChange={setEditing} size="xl">
        <ModalHeader>
          <ModalTitle>Edit event</ModalTitle>
        </ModalHeader>
        <ModalBody className="pb-(--gutter)">
          <EventForm
            initial={{
              title: event.title,
              description: event.description ?? '',
              timezone: event.timezone,
              startDate: event.startDate,
              endDate: event.endDate,
              dayStartMinute: event.dayStartMinute,
              dayEndMinute: event.dayEndMinute,
            }}
            submitLabel="Save changes"
            pendingLabel="Saving…"
            isPending={update.isPending}
            error={update.error?.message}
            onSubmit={(values) => update.mutate({ data: { id: event.id, event: values } })}
            onCancel={() => setEditing(false)}
          />
        </ModalBody>
      </ModalContent>

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
    </div>
  );
}

function ShareCard({ event }: { event: MyEvent }) {
  const invalidate = useInvalidateEvent();
  const [confirm, setConfirm] = useState(false);
  const regenerate = useMutation({
    mutationFn: () => regenerateEventToken({ data: { id: event.id } }),
    onSuccess: async () => {
      await invalidate();
      setConfirm(false);
    },
  });

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Share link</CardTitle>
        <CardDescription>
          Anyone with this link can join the event and add their schedule.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ShareLinkField token={event.token} />
        <div>
          <Button intent="plain" size="sm" onPress={() => setConfirm(true)}>
            <ArrowPathIcon />
            Regenerate link
          </Button>
        </div>
      </CardContent>
      <ConfirmModal
        isOpen={confirm}
        onOpenChange={setConfirm}
        title="Regenerate link?"
        description="The current link will stop working. Existing responses are kept."
        confirmLabel="Regenerate"
        intent="primary"
        isPending={regenerate.isPending}
        error={regenerate.error?.message}
        onConfirm={() => regenerate.mutate()}
      />
    </Card>
  );
}

type Participant = MyEvent['participants'][number];

function ParticipantsCard({ event }: { event: MyEvent }) {
  const invalidate = useInvalidateEvent();
  const [removing, setRemoving] = useState<Participant | null>(null);
  const remove = useMutation({
    mutationFn: (participantId: string) =>
      removeParticipant({ data: { eventId: event.id, participantId } }),
    onSuccess: async () => {
      await invalidate();
      setRemoving(null);
    },
  });

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Participants</CardTitle>
        <CardDescription>
          {event.participants.length === 0
            ? 'No one has joined yet.'
            : `${event.participants.filter((p) => p.respondedAt).length} of ${event.participants.length} have saved their schedule.`}
        </CardDescription>
      </CardHeader>
      {event.participants.length > 0 ? (
        <CardContent>
          <ul className="-my-2 divide-y">
            {event.participants.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium text-sm">{p.name}</span>
                  {p.isAccount ? <Badge intent="secondary">Account</Badge> : null}
                  {p.respondedAt ? null : <Badge intent="warning">No response</Badge>}
                </div>
                <Button
                  intent="plain"
                  size="sq-xs"
                  aria-label={`Remove ${p.name}`}
                  onPress={() => setRemoving(p)}
                >
                  <XMarkIcon />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}
      <ConfirmModal
        isOpen={!!removing}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title={`Remove ${removing?.name ?? 'participant'}?`}
        description="Their saved schedule will be deleted. They can rejoin with the link."
        confirmLabel="Remove"
        isPending={remove.isPending}
        error={remove.error?.message}
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </Card>
  );
}
