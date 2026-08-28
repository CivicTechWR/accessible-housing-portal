CREATE TYPE "public"."email_delivery_outcome" AS ENUM('queued', 'sent', 'delivered', 'delivery_delayed', 'bounced', 'complained', 'failed', 'suppressed');--> statement-breakpoint
CREATE TYPE "public"."email_delivery_type" AS ENUM('account_invite');--> statement-breakpoint
CREATE TABLE "email_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_type" "email_delivery_type" NOT NULL,
	"source_entity_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_delivery_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"queue_job_id" uuid,
	"provider_email_id" text,
	"submitted_at" timestamp with time zone,
	"outcome" "email_delivery_outcome" DEFAULT 'queued' NOT NULL,
	"outcome_at" timestamp with time zone,
	"outcome_detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_delivery_attempts" ADD CONSTRAINT "email_delivery_attempts_delivery_id_email_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."email_deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_deliveries_email_type_source_entity_id_unique" ON "email_deliveries" USING btree ("email_type","source_entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_delivery_attempts_delivery_id_attempt_number_unique" ON "email_delivery_attempts" USING btree ("delivery_id","attempt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "email_delivery_attempts_idempotency_key_unique" ON "email_delivery_attempts" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "email_delivery_attempts_provider_email_id_unique" ON "email_delivery_attempts" USING btree ("provider_email_id");