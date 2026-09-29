import { queryOptions } from '@tanstack/react-query';
import { getMyEvent, listMyEvents } from '~/server/events';

export const myEventsQuery = () =>
  queryOptions({
    queryKey: ['my-events'],
    queryFn: () => listMyEvents(),
  });

export const myEventQuery = (id: string) =>
  queryOptions({
    queryKey: ['my-events', id],
    queryFn: () => getMyEvent({ data: { id } }),
  });

export type MyEvent = Awaited<ReturnType<typeof getMyEvent>>;
export type MyEventSummary = Awaited<ReturnType<typeof listMyEvents>>[number];
