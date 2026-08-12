CREATE TYPE "public"."listing_field_applicability" AS ENUM('building', 'unit');--> statement-breakpoint
ALTER TABLE "listing_field_definitions" ADD COLUMN "applies_to" "listing_field_applicability";--> statement-breakpoint

UPDATE "listing_field_definitions"
SET "applies_to" = 'building'
WHERE "key" IN (
  'main_entrance_is_barrier_free',
  'accessible_tenant_parking_available',
  'on_site_parking',
  'accessible_guest_parking',
  'close_to_bus_transit',
  'good_pedestrian_access',
  'elevator_in_building',
  'cellphone_elevator_control',
  'accessible_shared_laundry',
  'braille_signage',
  'tactile_cues_textures_domes',
  'lowered_mailboxes',
  'accessible_guest_intercom',
  'automated_building_doors',
  'sprinkler_system',
  'service_animals_allowed'
);--> statement-breakpoint

UPDATE "listing_field_definitions"
SET "applies_to" = 'unit'
WHERE "key" IN (
  'unit_entrance_is_barrier_free',
  'ceiling_lift_ready',
  'automated_unit_doors',
  'no_stairs_within_unit',
  'wide_doorways',
  'lever_door_handles',
  'lowered_light_switches',
  'hard_flooring',
  'carpeted_floors',
  'air_conditioning',
  'lowered_kitchen_counters',
  'lowered_cabinets',
  'front_stove_controls',
  'convection_cooktop',
  'front_dishwasher_controls',
  'bottom_door_freezer',
  'non_digital_appliances',
  'barrier_free_bathroom',
  'lowered_bathroom_counters',
  'accessible_height_toilet',
  'roll_in_shower',
  'walk_in_shower',
  'grab_bars_general',
  'smoke_co_detectors_w_strobe'
);--> statement-breakpoint

UPDATE "listing_field_definitions"
SET "applies_to" = CASE
  WHEN trim(
    regexp_replace(
      regexp_replace(lower(trim("category")), '&', ' and ', 'g'),
      '[^a-z0-9]+',
      ' ',
      'g'
    )
  ) IN ('building amenities', 'entry and exterior')
    THEN 'building'::"listing_field_applicability"
  ELSE 'unit'::"listing_field_applicability"
END
WHERE "applies_to" IS NULL;--> statement-breakpoint

ALTER TABLE "listing_field_definitions" ALTER COLUMN "applies_to" SET NOT NULL;
