CREATE TABLE "busy_block" (
	"id" text PRIMARY KEY NOT NULL,
	"participant_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"token" text NOT NULL,
	"timezone" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"day_start_minute" integer NOT NULL,
	"day_end_minute" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "participant" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"user_id" text,
	"password_hash" text,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "busy_block" ADD CONSTRAINT "busy_block_participant_id_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant" ADD CONSTRAINT "participant_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant" ADD CONSTRAINT "participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "busy_block_participant_idx" ON "busy_block" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "event_owner_idx" ON "event" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participant_event_user_idx" ON "participant" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participant_event_guest_name_idx" ON "participant" USING btree ("event_id",lower("name")) WHERE "participant"."user_id" is null;