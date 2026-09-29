import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Core Better Auth tables. Keep JS field names in sync with Better Auth's model
// fields; run `pnpm db:generate` after any change here.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const event = pgTable(
  'event',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    token: text('token').notNull().unique(),
    timezone: text('timezone').notNull(),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }).notNull(),
    dayStartMinute: integer('day_start_minute').notNull(),
    dayEndMinute: integer('day_end_minute').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('event_owner_idx').on(t.ownerId)],
);

export const participant = pgTable(
  'participant',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => event.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    passwordHash: text('password_hash'),
    respondedAt: timestamp('responded_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('participant_event_user_idx').on(t.eventId, t.userId),
    uniqueIndex('participant_event_guest_name_idx')
      .on(t.eventId, sql`lower(${t.name})`)
      .where(sql`${t.userId} is null`),
  ],
);

export const busyBlock = pgTable(
  'busy_block',
  {
    id: text('id').primaryKey(),
    participantId: text('participant_id')
      .notNull()
      .references(() => participant.id, { onDelete: 'cascade' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('busy_block_participant_idx').on(t.participantId)],
);

export const eventRelations = relations(event, ({ many }) => ({
  participants: many(participant),
}));

export const participantRelations = relations(participant, ({ one, many }) => ({
  event: one(event, { fields: [participant.eventId], references: [event.id] }),
  user: one(user, { fields: [participant.userId], references: [user.id] }),
  busyBlocks: many(busyBlock),
}));

export const busyBlockRelations = relations(busyBlock, ({ one }) => ({
  participant: one(participant, {
    fields: [busyBlock.participantId],
    references: [participant.id],
  }),
}));

export const schema = {
  user,
  session,
  account,
  verification,
  event,
  participant,
  busyBlock,
  eventRelations,
  participantRelations,
  busyBlockRelations,
};
