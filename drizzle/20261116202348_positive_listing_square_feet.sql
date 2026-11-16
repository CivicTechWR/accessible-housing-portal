UPDATE "listings" SET "square_feet" = NULL WHERE "square_feet" <= 0;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_square_feet_positive" CHECK ("listings"."square_feet" > 0);