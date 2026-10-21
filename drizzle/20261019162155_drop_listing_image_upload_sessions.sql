DROP INDEX "listing_images_upload_session_id_idx";--> statement-breakpoint
ALTER TABLE "listing_images" ALTER COLUMN "listing_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_images" DROP COLUMN "upload_session_id";