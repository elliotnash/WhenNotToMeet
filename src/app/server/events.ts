import { createServerFn } from '@tanstack/react-start';
import { and, asc, count, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '~/lib/db';
import { eventInputSchema } from '~/lib/event-schema';
import { createId, createToken } from '~/lib/ids';
import { event, participant } from '~/lib/schema';
import { requireUser } from '~/lib/session';

async function requireOwnedEvent(eventId: string) {
  const user = await requireUser();
  const row = await db.query.event.findFirst({
    where: and(eq(event.id, eventId), eq(event.ownerId, user.id)),
  });
  if (!row) throw new Error('Event not found');
  return row;
}

export const listMyEvents = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser();
  const events = await db.query.event.findMany({
    where: eq(event.ownerId, user.id),
    orderBy: desc(event.createdAt),
  });
  const counts = await db
    .select({
      eventId: participant.eventId,
      participants: count(),
      responded: count(participant.respondedAt),
    })
    .from(participant)
    .innerJoin(event, eq(event.id, participant.eventId))
    .where(eq(event.ownerId, user.id))
    .groupBy(participant.eventId);
  const byEvent = new Map(counts.map((c) => [c.eventId, c]));
  return events.map((e) => ({
    ...e,
    participantCount: byEvent.get(e.id)?.participants ?? 0,
    respondedCount: byEvent.get(e.id)?.responded ?? 0,
  }));
});

export const getMyEvent = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const row = await requireOwnedEvent(data.id);
    const participants = await db.query.participant.findMany({
      where: eq(participant.eventId, row.id),
      orderBy: asc(participant.createdAt),
      columns: { id: true, name: true, userId: true, respondedAt: true, createdAt: true },
    });
    return {
      ...row,
      participants: participants.map(({ userId, ...p }) => ({ ...p, isAccount: !!userId })),
    };
  });

export const createEvent = createServerFn({ method: 'POST' })
  .validator(eventInputSchema)
  .handler(async ({ data }) => {
    const user = await requireUser();
    const id = createId();
    await db.insert(event).values({
      ...data,
      id,
      description: data.description || null,
      ownerId: user.id,
      token: createToken(),
    });
    return { id };
  });

export const updateEvent = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string(), event: eventInputSchema }))
  .handler(async ({ data }) => {
    await requireOwnedEvent(data.id);
    await db
      .update(event)
      .set({ ...data.event, description: data.event.description || null, updatedAt: new Date() })
      .where(eq(event.id, data.id));
  });

export const deleteEvent = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireOwnedEvent(data.id);
    await db.delete(event).where(eq(event.id, data.id));
  });

export const regenerateEventToken = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireOwnedEvent(data.id);
    const token = createToken();
    await db.update(event).set({ token, updatedAt: new Date() }).where(eq(event.id, data.id));
    return { token };
  });

export const removeParticipant = createServerFn({ method: 'POST' })
  .validator(z.object({ eventId: z.string(), participantId: z.string() }))
  .handler(async ({ data }) => {
    await requireOwnedEvent(data.eventId);
    await db
      .delete(participant)
      .where(and(eq(participant.id, data.participantId), eq(participant.eventId, data.eventId)));
  });
