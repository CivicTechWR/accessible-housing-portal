INSERT INTO "listing_field_definitions" (
  "key",
  "label",
  "description",
  "field_type",
  "category",
  "applies_to",
  "help_text",
  "placeholder",
  "is_public",
  "is_filterable",
  "is_required",
  "sort_order",
  "options"
)
VALUES (
  'rent_controlled',
  'Rent Controlled',
  'Rent increases for this unit are subject to rent control rules.',
  'boolean',
  'RENTAL DETAILS',
  'unit',
  'Select only if you have confirmed this unit is subject to rent control. Do not infer this from the rent amount.',
  NULL,
  true,
  true,
  false,
  41,
  NULL
)
ON CONFLICT ("key") DO NOTHING;
