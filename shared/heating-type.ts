export const HEATING_TYPE_VALUES = [
  "natural_gas",
  "electric_resistance",
  "heat_pump",
  "propane",
  "heating_oil",
  "other",
  "unknown",
] as const;

export type HeatingType = (typeof HEATING_TYPE_VALUES)[number];

export const HEATING_TYPE_LABELS = {
  natural_gas: "Natural gas",
  electric_resistance: "Electric resistance, such as baseboards or an electric furnace",
  heat_pump: "Electric heat pump",
  propane: "Propane",
  heating_oil: "Heating oil",
  other: "Other",
  unknown: "Not sure",
} satisfies Record<HeatingType, string>;
