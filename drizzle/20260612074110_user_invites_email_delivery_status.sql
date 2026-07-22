ALTER TABLE "user_invites" ADD COLUMN "email_queued_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_invites" ADD COLUMN "email_failed_at" timestamp with time zone;