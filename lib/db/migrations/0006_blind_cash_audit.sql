ALTER TABLE "pos_sessions" ADD COLUMN "expected_cash" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD COLUMN "counted_cash" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD COLUMN "cash_variance" numeric(10, 2);--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
