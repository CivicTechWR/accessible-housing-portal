CREATE TYPE "public"."listing_building_type" AS ENUM('apartment', 'house', 'townhouse', 'condo');--> statement-breakpoint
CREATE TYPE "public"."utility_included" AS ENUM('heat', 'water', 'electricity', 'gas', 'internet');--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "building_type" "listing_building_type";--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "lease_term_months" integer;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "utilities_included" "utility_included"[] DEFAULT '{}'::utility_included[] NOT NULL;
