import { FACILITY_CATEGORY_CONFIG } from "@/shared/constants/facility-category";
import { formatAedTimeRange } from "@/shared/lib/operating-hours";
import {
  DAYS_OF_WEEK,
  FIRE_WATER_SUBTYPE_LABELS,
  HEAT_SHELTER_DAYS,
  type DayOfWeek,
  type Facility,
  type FireOrganizationSubtype,
} from "@/shared/types/facility";

export interface FacilityDetailRow {
  label: string;
  value: string;
}

export interface FacilityOperatingHourRow {
  day: string;
  hours: string;
}

export interface FacilityDetailViewModel {
  title: string;
  categoryLabel: string;
  iconPath: string;
  subtypeLabel?: string;
  address: string;
  rows: FacilityDetailRow[];
  operatingHours: FacilityOperatingHourRow[];
}

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "월요일",
  tuesday: "화요일",
  wednesday: "수요일",
  thursday: "목요일",
  friday: "금요일",
  saturday: "토요일",
  sunday: "일요일",
  holiday: "공휴일",
};

const HEAT_SHELTER_DAY_LABELS: Record<(typeof HEAT_SHELTER_DAYS)[number], string> = {
  monday: "월",
  tuesday: "화",
  wednesday: "수",
  thursday: "목",
  friday: "금",
  saturday: "토",
  sunday: "일",
};

const FIRE_ORGANIZATION_SUBTYPE_LABELS: Record<
  FireOrganizationSubtype,
  string
> = {
  FIRE_STATION: "소방서",
  FIRE_SAFETY_CENTER: "119안전센터",
  FIRE_RESCUE_UNIT: "구조대",
};

function addOptionalRow(
  rows: FacilityDetailRow[],
  label: string,
  value: string | number | undefined,
): void {
  if (value !== undefined) {
    rows.push({ label, value: String(value) });
  }
}

export function createFacilityDetailViewModel(
  facility: Facility,
): FacilityDetailViewModel {
  const rows: FacilityDetailRow[] = [];
  let subtypeLabel: string | undefined;
  let operatingHours: FacilityOperatingHourRow[] = [];

  switch (facility.category) {
    case "FIRE_WATER":
      subtypeLabel = FIRE_WATER_SUBTYPE_LABELS[facility.subtype];

      if (subtypeLabel === facility.name) {
        subtypeLabel = undefined;
      }

      addOptionalRow(rows, "상세 위치", facility.detailLocation);
      addOptionalRow(rows, "설치연도", facility.details.installedYear);
      addOptionalRow(rows, "출수압력", facility.details.pressure);
      addOptionalRow(rows, "관할 안전센터", facility.details.safetyCenter);
      addOptionalRow(rows, "소방서", facility.details.fireStation);
      addOptionalRow(
        rows,
        "소방서 전화",
        facility.details.fireStationPhone,
      );
      break;

    case "SHELTER":
      subtypeLabel = "민방위 대피시설";
      addOptionalRow(rows, "상세 위치", facility.detailLocation);
      rows.push({ label: "상태", value: facility.details.status });
      break;

    case "AED":
      subtypeLabel = "자동심장충격기 (AED)";
      addOptionalRow(rows, "설치 위치", facility.detailLocation);
      addOptionalRow(rows, "전화번호", facility.details.phone);
      addOptionalRow(rows, "제조사", facility.details.manufacturer);
      addOptionalRow(rows, "모델", facility.details.model);

      if (facility.details.operatingHours !== undefined) {
        operatingHours = DAYS_OF_WEEK.flatMap((day) => {
          const hours = facility.details.operatingHours?.[day];

          return hours === undefined
            ? []
            : [
                {
                  day: DAY_LABELS[day],
                  hours: formatAedTimeRange(hours.start, hours.end),
                },
              ];
        });
      }
      break;

    case "OTHER":
      if (facility.subtype === "HEAT_SHELTER") {
        subtypeLabel = "무더위쉼터";
        addOptionalRow(rows, "시설 구분", facility.details.facilityType1);
        addOptionalRow(rows, "이용 구분", facility.details.facilityType2);
        addOptionalRow(rows, "비고", facility.details.remarks);

        const periods = [
          ["기본 운영", facility.details.regularHours],
          ["연장 운영", facility.details.extendedHours],
          ["추가 운영", facility.details.additionalHours],
        ] as const;

        operatingHours = periods.flatMap(([label, period]) =>
          period === undefined
            ? []
            : [
                {
                  day: `${label} · ${period.days.map((day) => HEAT_SHELTER_DAY_LABELS[day]).join("·")}`,
                  hours: `${period.start}–${period.end}`,
                },
              ],
        );
      } else {
        subtypeLabel = FIRE_ORGANIZATION_SUBTYPE_LABELS[facility.subtype];
      }
      break;
  }

  return {
    title: facility.name,
    categoryLabel: FACILITY_CATEGORY_CONFIG[facility.category].label,
    iconPath: FACILITY_CATEGORY_CONFIG[facility.category].iconPath,
    subtypeLabel,
    address: facility.address,
    rows,
    operatingHours,
  };
}
