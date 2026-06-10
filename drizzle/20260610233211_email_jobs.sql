CREATE TYPE "public"."email_job_status" AS ENUM('pending', 'processing', 'sent', 'failed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."email_job_type" AS ENUM('account_invite');--> statement-breakpoint
CREATE TABLE "email_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "email_job_type" NOT NULL,
	"status" "email_job_status" DEFAULT 'pending' NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"secret_context" "bytea",
	"recipient_email" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer NOT NULL,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"provider_message_id" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "email_jobs_idempotency_key_unique" ON "email_jobs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "email_jobs_status_run_after_idx" ON "email_jobs" USING btree ("status","run_after");