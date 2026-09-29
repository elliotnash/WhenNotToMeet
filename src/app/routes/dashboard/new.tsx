import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { EventForm } from '~/components/event-form';
import { createEvent } from '~/server/events';

export const Route = createFileRoute('/dashboard/new')({
  head: () => ({ meta: [{ title: 'New event · WhenNotToMeet' }] }),
  component: NewEvent,
});

function NewEvent() {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: createEvent,
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: ['my-events'] });
      navigate({ to: '/dashboard/$eventId', params: { eventId: id } });
    },
  });

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>New event</CardTitle>
        <CardDescription>
          Choose when the event could happen. Everyone you invite marks the times they can't make
          it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EventForm
          submitLabel="Create event"
          pendingLabel="Creating…"
          isPending={create.isPending}
          error={create.error?.message}
          onSubmit={(values) => create.mutate({ data: values })}
          onCancel={() => router.history.back()}
        />
      </CardContent>
    </Card>
  );
}
