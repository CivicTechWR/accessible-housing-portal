import {
  AlarmSmokeIcon,
  Bathtub01Icon,
  Building03Icon,
  Bus01Icon,
  DoorOpenIcon,
  Home01Icon,
  KitchenUtensilsIcon,
  ParkingAreaSquareIcon,
  Stairs01Icon,
  UniversalAccessIcon,
  WalkingIcon,
  WashingMachineIcon,
} from "@hugeicons/core-free-icons";

type Icon = typeof UniversalAccessIcon;

/**
 * Keyword rules, checked in order, so a more specific word wins: "Lowered bathroom counters" is a
 * bath feature, not a kitchen one, and "Unit entrance is barrier-free" is a door, not the unit.
 */
const RULES: Array<[pattern: RegExp, icon: Icon]> = [
  [/bath|shower|toilet|grab bar/, Bathtub01Icon],
  [/kitchen|counter|cabinet|stove|cooktop|dishwasher|freezer|appliance/, KitchenUtensilsIcon],
  [/parking/, ParkingAreaSquareIcon],
  [/bus|transit/, Bus01Icon],
  [/pedestrian|walk/, WalkingIcon],
  [/entrance|entry|door/, DoorOpenIcon],
  [/stair/, Stairs01Icon],
  [/laundry/, WashingMachineIcon],
  [/smoke|sprinkler|safety|sensory/, AlarmSmokeIcon],
  [/elevator|building|amenit|mailbox|intercom/, Building03Icon],
  [/unit|interior/, Home01Icon],
];

/**
 * An icon for an accessibility feature or category name, matched on known words in the name.
 * Names that match nothing, including admin-defined custom features, get the accessibility icon.
 */
export function featureIcon(name: string): Icon {
  const text = name.toLowerCase();
  return RULES.find(([pattern]) => pattern.test(text))?.[1] ?? UniversalAccessIcon;
}
