# Data Policy

## Categories

상위 Category는 `FIRE_WATER`, `SHELTER`, `AED`, `OTHER` 네 개로 고정한다. UI에서는 전체, 소방용수, 대피시설, AED, 기타로 표시한다. 상위 Category와 세부 시설 종류인 `subtype`을 분리한다.

## FIRE_WATER

현재 검증된 신월동 데이터는 936건이다.

- 지하식 소화전: 779
- 지상식 소화전: 139
- 저수조: 2
- 비상소화장치: 16

전체 936건을 `FIRE_WATER`로 분류한다. 비상소화장치를 `OTHER`로 보내지 않으며 실제 시설 종류는 `subtype`으로 보존한다.

현재 Source of Truth는 서울시 최신 소방용수시설 현행화 XLSX Snapshot이다. 원천에 없는 사용 가능 상태를 출수압력 등의 값으로 추론하지 않는다.

## SHELTER

현재 신월동 Raw 데이터는 57건이며, 사용중 44건만 Published 대상이다. 사용중지 13건은 Raw 단계에서 보존한다. Identity는 `MNG_NO`이고 동일 좌표를 이유로 중복 제거하지 않는다.

## AED

현재 양천구 데이터는 416건, 신월동 Raw Candidate는 112건이다. `serialSeq`를 Source Identity로 사용하며 기관명, 주소 또는 좌표가 같다는 이유로 중복 제거하지 않는다.

향후 사람의 검토가 가능한 절차로 `FIXED`와 `MOBILE`을 분류한다.

- FIXED: Published JSON, 기본 지도 표시, Nearby 계산 대상
- MOBILE: Raw/Normalized 데이터에 보존하고 기본 Published JSON과 Nearby 계산에서 제외

`manager`, `managerTel`은 Published JSON에 포함하지 않는다. 기관의 공개 대표전화인 `clerkTel`만 필요한 경우 사용할 수 있다.

## OTHER

현재 Published Data는 0건이지만 Category와 UI Contract는 유지한다. 향후 119안전센터나 기타 공공 안전시설을 Source 정책 검토 후 추가할 수 있다.

## Identity and Deduplication

Published ID에는 Source Namespace를 붙이고 원본 ID는 `sourceId`에 보존한다. 좌표가 같다는 이유로 시설을 삭제하지 않는다.

## Raw and Published Data

```text
Raw
→ Normalize
→ Validate
→ Domain Rules and Audit
→ Publish
```

Raw 데이터에는 Published에 불필요한 개인정보성 필드가 포함될 수 있으므로 `data/raw`는 Git에 커밋하지 않는다. 브라우저에는 `public/data`의 최소 필요 필드만 제공한다.

공공데이터에 없는 상태나 의미를 임의로 생성하지 않는다. 빈 문자열, `null`, `undefined`, `nan`, `N/A`는 Source 규칙에 따라 missing value로 정규화한다. 검증 실패 또는 비정상적인 Count 급변이 발생하면 신규 Snapshot을 Publish하지 않는다.
