import { useEffect, useState } from "react";

import { loadFacilities } from "@/features/facilities/data/load-facilities";
import type { Facility } from "@/shared/types/facility";

export type FacilityDataStatus = "loading" | "ready" | "error";

interface FacilityDataState {
  facilities: Facility[];
  status: FacilityDataStatus;
  error: Error | null;
}

const INITIAL_STATE: FacilityDataState = {
  facilities: [],
  status: "loading",
  error: null,
};

export function useFacilities(): FacilityDataState {
  const [state, setState] = useState<FacilityDataState>(INITIAL_STATE);

  useEffect(() => {
    const controller = new AbortController();

    void loadFacilities(controller.signal)
      .then((facilities) => {
        if (!controller.signal.aborted) {
          setState({ facilities, status: "ready", error: null });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        const facilityError =
          error instanceof Error
            ? error
            : new Error("Unknown facility data error.");

        console.error(
          "[Facilities] Runtime dataset validation failed.",
          facilityError,
        );
        setState({ facilities: [], status: "error", error: facilityError });
      });

    return () => {
      controller.abort();
    };
  }, []);

  return state;
}
