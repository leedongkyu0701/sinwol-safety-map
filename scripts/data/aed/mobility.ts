import { z } from "zod";

import type { FacilityMobility } from "../../../src/shared/types/facility";
import { normalizeOptionalString } from "../../../src/shared/lib/normalize";
import { readJsonFileIfExists } from "../shared/write-json";
import { AED_REVIEW_PATH } from "./constants";

const mobilityDecisionSchema = z
  .object({
    sourceId: z.string().trim().min(1),
    mobility: z.enum(["FIXED", "MOBILE"]),
    note: z.string().trim().min(1).optional(),
  })
  .strict();

export const aedMobilityRegistrySchema = z
  .object({
    schemaVersion: z.literal(1),
    decisions: z.array(mobilityDecisionSchema),
  })
  .strict()
  .superRefine((registry, context) => {
    const seen = new Set<string>();

    registry.decisions.forEach((decision, index) => {
      if (seen.has(decision.sourceId)) {
        context.addIssue({
          code: "custom",
          path: ["decisions", index, "sourceId"],
          message: `Duplicate AED mobility decision: ${decision.sourceId}`,
        });
      }

      seen.add(decision.sourceId);
    });
  });

export type AedMobilityRegistry = z.infer<typeof aedMobilityRegistrySchema>;
export type AedMobilityDecision = AedMobilityRegistry["decisions"][number];

export interface MobilityCandidateInput {
  sourceId: string;
  org?: string;
  buildPlace?: string;
  buildAddress?: string;
}

export interface MobilityCandidateResult {
  isCandidate: boolean;
  reasons: string[];
}

export interface MobilityResolution extends MobilityCandidateResult {
  mobility?: FacilityMobility;
  reviewed: boolean;
}

const CANDIDATE_KEYWORDS = [
  "구급차",
  "환자이송",
  "이송차량",
  "이송단",
  "순찰차",
  "경찰차",
  "차량번호",
  "이동형",
  "유니버스",
] as const;

const CANDIDATE_FIELDS = ["org", "buildPlace", "buildAddress"] as const;

export function detectMobilityCandidate(
  input: MobilityCandidateInput,
): MobilityCandidateResult {
  const reasons: string[] = [];

  for (const field of CANDIDATE_FIELDS) {
    const value = normalizeOptionalString(input[field]);

    if (value === undefined) {
      continue;
    }

    for (const keyword of CANDIDATE_KEYWORDS) {
      if (value.includes(keyword)) {
        reasons.push(`${field} contains ${keyword}`);
      }
    }
  }

  return {
    isCandidate: reasons.length > 0,
    reasons: [...new Set(reasons)],
  };
}

export function resolveMobilityDecision(
  input: MobilityCandidateInput,
  decision?: AedMobilityDecision,
): MobilityResolution {
  const candidate = detectMobilityCandidate(input);

  if (decision !== undefined) {
    return {
      ...candidate,
      mobility: decision.mobility,
      reviewed: true,
    };
  }

  if (!candidate.isCandidate) {
    return {
      ...candidate,
      mobility: "FIXED",
      reviewed: false,
    };
  }

  return {
    ...candidate,
    reviewed: false,
  };
}

export function readAedMobilityRegistry(
  path = AED_REVIEW_PATH,
): AedMobilityRegistry {
  const raw = readJsonFileIfExists(path);

  if (raw === undefined) {
    throw new Error(`AED mobility review registry not found: ${path}`);
  }

  return aedMobilityRegistrySchema.parse(raw);
}

export function createDecisionMap(
  registry: AedMobilityRegistry,
): ReadonlyMap<string, AedMobilityDecision> {
  return new Map(
    registry.decisions.map((decision) => [decision.sourceId, decision]),
  );
}

export function findStaleReviewDecisions(
  registry: AedMobilityRegistry,
  currentSourceIds: ReadonlySet<string>,
): AedMobilityDecision[] {
  return registry.decisions.filter(
    (decision) => !currentSourceIds.has(decision.sourceId),
  );
}
