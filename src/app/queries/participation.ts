import { queryOptions } from '@tanstack/react-query';
import { getAvailability, getEventByToken, getMyBusy } from '~/server/participation';

export const eventByTokenQuery = (token: string) =>
  queryOptions({
    queryKey: ['event', token],
    queryFn: () => getEventByToken({ data: { token } }),
  });

export const myBusyQuery = (token: string) =>
  queryOptions({
    queryKey: ['event', token, 'busy'],
    queryFn: () => getMyBusy({ data: { token } }),
    staleTime: Number.POSITIVE_INFINITY,
  });

export const availabilityQuery = (token: string) =>
  queryOptions({
    queryKey: ['event', token, 'availability'],
    queryFn: () => getAvailability({ data: { token } }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

export type EventView = NonNullable<Awaited<ReturnType<typeof getEventByToken>>>;
export type PublicEvent = EventView['event'];
export type Availability = Awaited<ReturnType<typeof getAvailability>>;
