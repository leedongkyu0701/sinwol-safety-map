import { z } from "zod";

import type { FacilityMobility } from "../../../src/shared/types/facility";
import { normalizeOptionalString } from "../../../src/shared/lib/normalize";
import { readJsonFileIfExists } from "../shared/write-json";
import { AED_PENDING_REVIEW_PATH, AED_REVIEW_PATH } from "./constants";

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

export const aedPendingCandidateSchema = z
  .object({
    sourceId: z.string().trim().min(1),
    org: z.string().trim().min(1),
    buildPlace: z.string().trim().min(1).optional(),
    address: z.string().trim().min(1),
    reasons: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

export const aedPendingReviewSchema = z
  .object({
    schemaVersion: z.literal(1),
    candidates: z.array(aedPendingCandidateSchema),
  })
  .strict()
  .superRefine((pending, context) => {
    const seen = new Set<string>();

    pending.candidates.forEach((candidate, index) => {
      if (seen.has(candidate.sourceId)) {
        context.addIssue({
          code: "custom",
          path: ["candidates", index, "sourceId"],
          message: `Duplicate pending AED sourceId: ${candidate.sourceId}`,
        });
      }

      seen.add(candidate.sourceId);
    });
  });

export type AedPendingCandidate = z.infer<typeof aedPendingCandidateSchema>;
export type AedPendingReview = z.infer<typeof aedPendingReviewSchema>;

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
  status:
    | "AUTO_FIXED"
    | "REVIEWED_FIXED"
    | "REVIEWED_MOBILE"
    | "PENDING";
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
      status:
        decision.mobility === "FIXED"
          ? "REVIEWED_FIXED"
          : "REVIEWED_MOBILE",
    };
  }

  if (!candidate.isCandidate) {
    return {
      ...candidate,
      mobility: "FIXED",
      reviewed: false,
      status: "AUTO_FIXED",
    };
  }

  return {
    ...candidate,
    reviewed: false,
    status: "PENDING",
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

export function createAedPendingReview(
  candidates: readonly AedPendingCandidate[],
): AedPendingReview {
  return aedPendingReviewSchema.parse({
    schemaVersion: 1,
    candidates: [...candidates].sort((left, right) =>
      left.sourceId.localeCompare(right.sourceId, "en"),
    ),
  });
}

export function readAedPendingReview(
  path = AED_PENDING_REVIEW_PATH,
): AedPendingReview {
  const raw = readJsonFileIfExists(path);

  if (raw === undefined) {
    throw new Error(`AED pending review file not found: ${path}`);
  }

  return aedPendingReviewSchema.parse(raw);
}

export function findSourceIdOverlap(
  left: Iterable<string>,
  right: Iterable<string>,
): string[] {
  const rightSet = new Set(right);
  return [...new Set(left)].filter((sourceId) => rightSet.has(sourceId)).sort();
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
