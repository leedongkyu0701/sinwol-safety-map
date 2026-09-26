# Data Policy

이 문서는 Published Facility Data의 의미와 Source별 Domain Rule을 정의한다. 아래에 적힌 건수와 분포는 문서 작성 시점의 Snapshot Audit 결과이며, 영구적인 수량 기준이 아니다. 최신 수량은 `public/data/metadata.json`과 검증 명령 결과를 기준으로 확인한다.

## Categories

상위 Category는 `FIRE_WATER`, `SHELTER`, `AED`, `OTHER` 네 개로 고정한다. UI에서는 전체, AED, 소방용수, 대피시설, 기타 순서로 표시한다. 상위 Category와 세부 시설 종류인 `subtype`을 분리한다.

## FIRE_WATER

현재 검증된 신월동 데이터는 936건이다.

- 지하식 소화전: 779
- 지상식 소화전: 139
- 저수조: 2
- 비상소화장치: 16

전체 936건을 `FIRE_WATER`로 분류한다. 비상소화장치를 `OTHER`로 보내지 않으며 실제 시설 종류는 `subtype`으로 보존한다.

현재 Source of Truth는 서울시 최신 소방용수시설 현행화 XLSX Snapshot이다. 원천에 없는 사용 가능 상태를 출수압력 등의 값으로 추론하지 않는다.

원본에는 독립적인 시설명 컬럼이 없으므로 Published `name`에는 공식 subtype의 한국어 Label을 사용한다. UI 기본 `address`는 도로명주소를 우선하고, 없을 때 지번주소를 사용한다. 도로명주소와 지번주소는 각각 별도 필드에도 보존한다.

## SHELTER

현재 신월동 Raw 데이터는 57건이며, 사용중 44건만 Published 대상이다. 사용중지 13건은 Raw 단계에서 보존한다. Identity는 `MNG_NO`이고 동일 좌표를 이유로 중복 제거하지 않는다.

Source는 서울 Open Data API `LOCALDATA_114602`다. `OGDP_INST_CD=3140000`으로 양천구를 확인하고 지번주소에 `신월동`이 포함된 Row를 지역 대상으로 삼는다. 현재 실제 응답에서 `XCRD`는 latitude, `YCRD`는 longitude이므로 별도 좌표 변환 없이 사용한다. 신월동 범위에 `사용중`, `사용중지` 외 상태가 나타나면 자동 Publish를 중단한다.

Shelter Dataset도 0건과 기존 정상 Snapshot 대비 20% 초과 감소를 자동 Publish하지 않는다. 57건, 44건, 13건은 현재 Snapshot Audit 기준이며 영구 Business Rule이 아니다.

## AED

현재 양천구 데이터는 416건, 신월동 Raw Candidate는 112건이다. `serialSeq`를 Source Identity로 사용하며 기관명, 주소 또는 좌표가 같다는 이유로 중복 제거하지 않는다.

Keyword Detector는 `org`, `buildPlace`, `buildAddress`의 비민감 텍스트로 이동형 후보를 찾지만 후보를 곧바로 `MOBILE`로 확정하지 않는다. 사람의 결정은 `data/review/aed-mobility.json`에 Source ID 기준으로 기록한다. 결정이 없는 새 후보는 `data/review/aed-mobility-pending.json`에 현재 검토 대기 Snapshot으로 기록하고 해당 시설만 Published에서 제외한다. 새 후보가 있어도 나머지 AED의 Publish는 중단하지 않는다.

- FIXED: Published JSON, 기본 지도 표시, Nearby 계산 대상
- MOBILE: Raw/Normalized 데이터에 보존하고 기본 Published JSON과 Nearby 계산에서 제외
- PENDING: Published Facility 상태가 아닌 ETL 검토 상태이며, Decision이 생길 때까지 Published에서 제외

`manager`, `managerTel`은 Published JSON에 포함하지 않는다. 기관의 공개 대표전화인 `clerkTel`만 필요한 경우 사용할 수 있다.

Published AED의 `subtype`은 `AED`, `mobility`는 `FIXED`로 제한한다. `MOBILE` 결정은 Review Registry에 보존하되 `public/data/aeds.json`에는 포함하지 않는다.

요일별 운영시간은 Date로 변환하지 않고 네 자리 HHMM 문자열로 보존한다. 시작시간은 `0000`~`2359`, 종료시간은 현재 Source에서 검증된 `0000`~`2500`을 허용하며 분은 `00`~`59`여야 한다. `2400`, `2430`, `2500` 같은 익일 종료 표현을 지원한다. `2500`을 초과하는 새 값은 Source 의미를 재검토할 수 있도록 ETL을 실패시킨다. 요일 정보가 없다는 이유로 휴무라고 추론하지 않으며, 요일이 존재할 때는 시작과 종료가 모두 있어야 한다.

## OTHER

현재 Published Data에는 신월119안전센터가 있으며, 서울 열린데이터광장의 무더위쉼터도 `OTHER` Source로 병합한다. 상위 Category는 `OTHER`로 유지한다. 소방 조직 내부 유형은 다음 subtype으로 제한한다.

- `FIRE_STATION`
- `FIRE_SAFETY_CENTER`
- `FIRE_RESCUE_UNIT`

119 조직 Source는 서울 열린데이터광장 `TbGiWardP`의 `서울시 소방서 안전센터 구조대 위치정보`다. Source에 주소나 직접적인 행정동 필드가 없으므로 이름으로 지역을 추론하지 않는다. 실제 신월동 위치와 공식 주소를 사람이 확인한 Source ID만 `data/reference/fire-org.json`에 등록해 포함한다. 관할 구역에 신월동이 들어간다는 이유만으로 신월동 밖의 시설을 추가하지 않는다.

Source의 X/Y는 ITRF2000_MTM 중부원점(EPSG:5186) 좌표이며 ETL에서 WGS84(EPSG:4326)로 변환한다. Published ID는 `fire-org:<sourceId>` 형식이다. 공식 주소는 별도 서울 열린데이터광장 Source인 `서울소방서 119안전센터 현황`으로 검증한다.

`public/data/other.json`은 여러 OTHER Source를 담는 Category 파일이다. 각 Source ETL은 자신의 ID prefix 행만 교체하고 다른 Variant는 보존한다. 119 조직은 MVP에서 수동 API Snapshot으로 갱신하며 Shelter/AED Daily Sync에는 포함하지 않는다. 향후 다른 Source는 typed Variant와 별도 namespace, 독립 ETL 및 Metadata dataset을 추가한다.

무더위쉼터 Source는 서울 열린데이터광장 `서울시 무더위쉼터(TbGtnHwcwP)`다. `AREA_CD`의 신월1~7동 allowlist와 `LOTNO_ADDR`의 `서울특별시 양천구 신월동` 주소 필터를 교차 검증하고, 두 선택 결과가 다르면 자동 Publish를 중단한다. Identity는 행정동 코드, 정규화한 시설명, 지번주소(없으면 도로명 상세주소)로 만들고 SHA-256 `sourceId` 및 `heat-shelter:` namespace를 사용한다. 좌표와 운영시간은 Identity에 넣지 않는다.

무더위쉼터의 시설 구분, 이용 구분, 기본·연장·추가 운영시간과 존재하는 비고를 보존한다. `EXT_OPR_YN` 또는 `ADD_OPR_YN`이 `N`이면 해당 시간 그룹이 비어 있는 것이 정상이며, `Y`인 그룹의 요일·시작·종료 누락이나 알 수 없는 한국어 요일은 검증 실패다. 동일 Identity와 publishable 값이 완전히 같은 반복 행만 collapse한다. 같은 Identity의 publishable 값이 다르면 수동 확인을 위해 Publish를 중단한다. 좌표가 같아도 서로 다른 시설은 유지하고 audit에 기록한다.

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

각 ETL은 기존 Metadata에서 자신의 Source 항목만 갱신하며 다른 Source 항목을 초기화하지 않는다. Source summary는 필요에 따라 `sourceUpdatedAt`, API 수집 시각인 `fetchedAt`, File Source의 `sourceFileSha256`을 포함한다.

Source별 ETL에서 대상 Dataset 0건은 거부한다. 단, OTHER Category 전체의 빈 배열은 아직 Source가 없거나 모두 제거된 상태를 표현할 수 있으므로 Domain상 유효하다. Fire Water는 기존 정상 Snapshot보다 count가 20%를 초과해 감소하면 자동 Publish를 중단하고 사람이 Source와 Filter 결과를 검토한다. 현재 936건과 subtype 분포는 Snapshot Audit 기준이며 영구 Business Rule로 강제하지 않는다.
