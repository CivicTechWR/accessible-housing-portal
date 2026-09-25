CREATE TYPE "public"."resend_webhook_processing_status" AS ENUM('pending', 'processed', 'ignored', 'unmatched', 'failed');--> statement-breakpoint
CREATE TABLE "resend_webhook_events" (
	"svix_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"provider_email_id" text NOT NULL,
	"event_created_at" timestamp with time zone NOT NULL,
	"webhook_received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivery_attempt_id" uuid,
	"email_type_tag" text,
	"delivery_id_tag" text,
	"attempt_id_tag" text,
	"bounce_type" text,
	"bounce_subtype" text,
	"outcome_detail" text,
	"processing_status" "resend_webhook_processing_status" DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "resend_webhook_events" ADD CONSTRAINT "resend_webhook_events_delivery_attempt_id_email_delivery_attempts_id_fk" FOREIGN KEY ("delivery_attempt_id") REFERENCES "public"."email_delivery_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resend_webhook_events_provider_email_id_idx" ON "resend_webhook_events" USING btree ("provider_email_id");--> statement-breakpoint
CREATE INDEX "resend_webhook_events_processing_status_idx" ON "resend_webhook_events" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "resend_webhook_events_event_created_at_idx" ON "resend_webhook_events" USING btree ("event_created_at");