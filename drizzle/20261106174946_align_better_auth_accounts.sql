DROP INDEX "accounts_provider_identity_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_identity_unique" ON "accounts" USING btree ("provider_id","account_id");--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "issuer";