import { readJsonFileIfExists } from "../../shared/write-json";
import {
  FIRE_ORG_ADDRESS_SOURCE_NAME,
  FIRE_ORG_REFERENCE_PATH,
} from "./constants";
import {
  fireOrgReferenceSchema,
  type FireOrgReference,
} from "./schema";

export function readFireOrgReference(): FireOrgReference {
  const raw = readJsonFileIfExists(FIRE_ORG_REFERENCE_PATH);

  if (raw === undefined) {
    throw new Error(
      `Fire organization reference registry not found: ${FIRE_ORG_REFERENCE_PATH}`,
    );
  }

  const reference = fireOrgReferenceSchema.parse(raw);

  if (reference.addressSource !== FIRE_ORG_ADDRESS_SOURCE_NAME) {
    throw new Error(
      `Unexpected fire organization address source: ${reference.addressSource}`,
    );
  }

  return reference;
}
