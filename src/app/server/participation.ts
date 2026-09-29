import { createHmac, timingSafeEqual } from 'node:crypto';
import { privateEnv } from '@/env';
import { createServerFn } from '@tanstack/react-start';
import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { and, asc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '~/lib/db';
import { busyBlocksSchema, guestJoinSchema } from '~/lib/event-schema';
import { createId } from '~/lib/ids';
import { busyBlock, event, participant } from '~/lib/schema';
import { getSessionUser, requireUser } from '~/lib/session';
import { mergeIntervals } from '~/lib/time';

type EventRow = typeof event.$inferSelect;
type ParticipantRow = typeof participant.$inferSelect;

const tokenInput = z.object({ token: z.string().min(1) });

function cookieName(eventId: string) {
  return `wntm_p_${eventId}`;
}

function sign(eventId: string, participantId: string) {
  return createHmac('sha256', privateEnv().betterAuthSecret)
    .update(`${eventId}:${participantId}`)
    .digest('base64url');
}

function setParticipantCookie(eventId: string, participantId: string) {
  setCookie(cookieName(eventId), `${participantId}.${sign(eventId, participantId)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: privateEnv().betterAuthUrl.startsWith('https://'),
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

function readParticipantCookie(eventId: string) {
  const value = getCookie(cookieName(eventId));
  if (!value) return null;
  const [participantId, signature] = value.split('.');
  if (!participantId || !signature) return null;
  const expected = Buffer.from(sign(eventId, participantId));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return participantId;
}

async function findEvent(token: string) {
  const row = await db.query.event.findFirst({ where: eq(event.token, token) });
  if (!row) throw new Error('Event not found');
  return row;
}

async function currentParticipant(eventRow: EventRow) {
  const participantId = readParticipantCookie(eventRow.id);
  if (!participantId) return null;
  const row = await db.query.participant.findFirst({
    where: and(eq(participant.id, participantId), eq(participant.eventId, eventRow.id)),
  });
  if (!row) return null;
  if (row.userId) {
    const user = await getSessionUser();
    if (user?.id !== row.userId) return null;
  }
  return row;
}

async function requireParticipant(token: string) {
  const eventRow = await findEvent(token);
  const me = await currentParticipant(eventRow);
  if (!me) throw new Error('Join the event first');
  return { eventRow, me };
}

function toPublicParticipant(p: ParticipantRow) {
  return { id: p.id, name: p.name, isAccount: !!p.userId, hasResponded: !!p.respondedAt };
}

export const getEventByToken = createServerFn({ method: 'GET' })
  .validator(tokenInput)
  .handler(async ({ data }) => {
    const eventRow = await db.query.event.findFirst({ where: eq(event.token, data.token) });
    if (!eventRow) return null;
    const [me, user] = await Promise.all([currentParticipant(eventRow), getSessionUser()]);
    return {
      event: {
        id: eventRow.id,
        title: eventRow.title,
        description: eventRow.description,
        timezone: eventRow.timezone,
        startDate: eventRow.startDate,
        endDate: eventRow.endDate,
        dayStartMinute: eventRow.dayStartMinute,
        dayEndMinute: eventRow.dayEndMinute,
        isOwner: user?.id === eventRow.ownerId,
      },
      me: me ? toPublicParticipant(me) : null,
      account: user ? { name: user.name } : null,
    };
  });

export const joinAsGuest = createServerFn({ method: 'POST' })
  .validator(guestJoinSchema)
  .handler(async ({ data }) => {
    const eventRow = await findEvent(data.token);
    const existing = await db.query.participant.findFirst({
      where: and(
        eq(participant.eventId, eventRow.id),
        isNull(participant.userId),
        sql`lower(${participant.name}) = lower(${data.name})`,
      ),
    });
    if (existing) {
      const valid =
        !!existing.passwordHash &&
        (await verifyPassword({ hash: existing.passwordHash, password: data.password }));
      if (!valid) {
        throw new Error('That name is taken and the password is incorrect');
      }
      setParticipantCookie(eventRow.id, existing.id);
      return { id: existing.id };
    }
    const id = createId();
    await db.insert(participant).values({
      id,
      eventId: eventRow.id,
      name: data.name,
      passwordHash: await hashPassword(data.password),
    });
    setParticipantCookie(eventRow.id, id);
    return { id };
  });

export const joinAsUser = createServerFn({ method: 'POST' })
  .validator(tokenInput)
  .handler(async ({ data }) => {
    const user = await requireUser();
    const eventRow = await findEvent(data.token);
    const existing = await db.query.participant.findFirst({
      where: and(eq(participant.eventId, eventRow.id), eq(participant.userId, user.id)),
    });
    let id = existing?.id;
    if (existing) {
      if (existing.name !== user.name) {
        await db
          .update(participant)
          .set({ name: user.name, updatedAt: new Date() })
          .where(eq(participant.id, existing.id));
      }
    } else {
      id = createId();
      await db
        .insert(participant)
        .values({ id, eventId: eventRow.id, name: user.name, userId: user.id });
    }
    setParticipantCookie(eventRow.id, id as string);
    return { id };
  });

export const leaveEvent = createServerFn({ method: 'POST' })
  .validator(tokenInput)
  .handler(async ({ data }) => {
    const eventRow = await findEvent(data.token);
    deleteCookie(cookieName(eventRow.id), { path: '/' });
  });

export const getMyBusy = createServerFn({ method: 'GET' })
  .validator(tokenInput)
  .handler(async ({ data }) => {
    const { me } = await requireParticipant(data.token);
    const rows = await db.query.busyBlock.findMany({
      where: eq(busyBlock.participantId, me.id),
      orderBy: asc(busyBlock.startsAt),
    });
    return rows.map((b) => ({ start: b.startsAt.getTime(), end: b.endsAt.getTime() }));
  });

export const saveMyBusy = createServerFn({ method: 'POST' })
  .validator(z.object({ token: z.string().min(1), blocks: busyBlocksSchema }))
  .handler(async ({ data }) => {
    const { me } = await requireParticipant(data.token);
    const blocks = mergeIntervals(data.blocks);
    await db.transaction(async (tx) => {
      await tx.delete(busyBlock).where(eq(busyBlock.participantId, me.id));
      if (blocks.length) {
        await tx.insert(busyBlock).values(
          blocks.map((b) => ({
            id: createId(),
            participantId: me.id,
            startsAt: new Date(b.start),
            endsAt: new Date(b.end),
          })),
        );
      }
      await tx
        .update(participant)
        .set({ respondedAt: new Date(), updatedAt: new Date() })
        .where(eq(participant.id, me.id));
    });
    return blocks;
  });

export const getAvailability = createServerFn({ method: 'GET' })
  .validator(tokenInput)
  .handler(async ({ data }) => {
    const { eventRow } = await requireParticipant(data.token);
    const responders = await db.query.participant.findMany({
      where: and(eq(participant.eventId, eventRow.id), isNotNull(participant.respondedAt)),
      orderBy: asc(participant.createdAt),
    });
    const ids = responders.map((p) => p.id);
    const blocks = ids.length
      ? await db.query.busyBlock.findMany({ where: inArray(busyBlock.participantId, ids) })
      : [];
    return {
      participants: responders.map(toPublicParticipant),
      busy: blocks.map((b) => ({
        participantId: b.participantId,
        start: b.startsAt.getTime(),
        end: b.endsAt.getTime(),
      })),
    };
  });
