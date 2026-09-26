import { readJsonFileIfExists } from "../../shared/write-json";
import { CHILD_SAFETY_HOUSE_REFERENCE_PATH } from "./constants";
import {
  childSafetyHouseReferenceSchema,
  type ChildSafetyHouseReference,
} from "./schema";

export function readChildSafetyHouseReference(): ChildSafetyHouseReference {
  const raw = readJsonFileIfExists(CHILD_SAFETY_HOUSE_REFERENCE_PATH);
  if (raw === undefined) {
    throw new Error(
      `Scope review registry not found: ${CHILD_SAFETY_HOUSE_REFERENCE_PATH}. Add a reviewed INCLUDE/EXCLUDE decision for every Yangcheon-gu candidate before publishing.`,
    );
  }
  return childSafetyHouseReferenceSchema.parse(raw);
}
