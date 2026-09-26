# 운영 가이드

이 문서는 Published Facility Data를 갱신하고 배포 전 검증하는 절차를 설명합니다. Browser Runtime은 이 문서의 ETL을 실행하지 않으며, 검증된 `public/data` Snapshot만 읽습니다.

## 로컬 준비

Node.js 24와 npm을 사용합니다.

```bash
npm ci
```

외부 Source를 갱신할 때만 `.env.local` 또는 실행 환경에 다음 비밀값을 설정합니다.

```bash
SEOUL_OPEN_DATA_KEY=
DATA_GO_KR_SERVICE_KEY=
SAFE182_ESNTL_ID=
SAFE182_AUTH_KEY=
```

이 값에는 `NEXT_PUBLIC_` 접두사를 사용하지 않습니다. Browser Bundle이나 Published JSON에 포함해서는 안 됩니다.

## 데이터 갱신

### 수동 Snapshot 갱신 시작 전

Fire Water, Fire Organization, Child Safety House처럼 사람이 갱신하는 Snapshot은 자동 갱신 Source보다 오래된 로컬 Snapshot이 기준이 되지 않도록 최신 `main`에서 시작합니다.

```bash
git switch main
git pull --ff-only origin main
git status
```

작업 트리가 clean하고 `main`이 최신인 것을 확인한 뒤 수동 ETL을 진행합니다. GitHub Actions가 Shelter, AED, Heat Shelter Snapshot을 자동 갱신하므로, 오래된 로컬 `public/data/other.json`을 기준으로 수동 ETL을 실행하면 그 자동 갱신 결과를 되돌릴 수 있습니다.

### Fire Water

서울 열린데이터광장의 공식 XLSX를 `data/raw/fire-water/source.xlsx`에 내려받은 뒤 실행합니다.

```bash
npm run data:fire-water
```

원본 XLSX는 Git에 커밋하지 않습니다. ETL은 Source 기준일과 파일 SHA-256을 Metadata에 기록하며, 비정상적인 빈 결과나 급격한 감소가 있으면 기존 Snapshot을 덮어쓰지 않습니다.

### Shelter

서울 Open Data API에서 신월동의 `사용중` 시설만 Publish합니다.

```bash
npm run data:shelters
```

### AED

국립중앙의료원 API에서 고정형 AED만 Publish합니다. 이동형 또는 검토 대기 후보는 Published 결과에서 제외하고 Review Registry로 관리합니다.

```bash
npm run data:aeds
```

### Other / Fire Organization

사람이 위치와 주소를 확인해 `data/reference/fire-org.json`에 등록한 Source ID만 갱신합니다.

```bash
npm run data:other:fire-org
```

### Other / Heat Shelter

서울 열린데이터광장 `서울시 무더위쉼터(TbGtnHwcwP)`에서 API 데이터를 가져와 신월1~7동 시설을 `public/data/other.json`에 병합합니다. `.env.local` 또는 process environment에 기존 `SEOUL_OPEN_DATA_KEY`를 설정합니다.

```bash
npm run data:other:heat-shelter
```

ETL은 AREA_CD와 신월동 주소 필터가 일치하는지 검사하고, heat-shelter namespace만 교체합니다. 서로 다른 시설의 동일 좌표는 보존합니다.

### Other / Child Safety House

아동안전지킴이집은 경찰청 안전Dream API(`cl=09`)를 수동으로 조회합니다. `SAFE182_ESNTL_ID`와 `SAFE182_AUTH_KEY`를 `.env.local` 또는 process environment에 설정하고 다음 순서로 갱신합니다.

1. 위의 절차대로 최신 `main`과 clean working tree를 확인합니다.
2. SafeDream 인증값이 설정되어 있는지 확인합니다. 값 자체는 로그나 Published 파일에 남기지 않습니다.
3. ETL을 실행합니다.

```bash
npm run data:other:child-safety-house
```

4. 미검토 양천구 candidate가 출력되면 신월동 Scope를 확인해 `data/reference/child-safety-house.json`에 INCLUDE/EXCLUDE를 기록합니다. 기존 Row의 이름/주소 mismatch도 실제 Source 변경인지 검토합니다.
5. Audit의 `HIGH-CONFIDENCE probable duplicate groups`와 same-location groups를 확인합니다. 새로운 후보가 있을 때만 실제 시설 동일성을 검토하고, 명백한 중복은 대표 `lcSn`만 INCLUDE하며 다른 `lcSn`은 대표 ID를 적어 EXCLUDE합니다. ETL은 자동 deduplicate하지 않습니다.
6. Reference를 수정했다면 ETL을 다시 실행해 Published 결과를 갱신합니다. 새 candidate나 Source 변경이 없으면 Reference 전체를 매번 재검토할 필요는 없습니다.
7. `data:audit`, `data:verify`, `typecheck`, `lint`, `build`를 실행하고 Published count 및 `OTHER` Source별 metadata count를 확인합니다.
8. 변경 파일과 결과를 검토한 뒤 수동 Snapshot을 commit합니다.

Child Safety House의 급감 guard는 기존 Published row 중 Reference에서 대표 `sourceId`를 명시해 중복 EXCLUDE한 건만 이전 count 기준에서 제외합니다. 그 외의 감소는 기존 20% guard로 계속 차단됩니다.

아동안전지킴이집은 데이터 성격상 Daily GitHub Actions Sync 대상이 아닙니다. 필요할 때 사람이 API를 다시 조회하여 Snapshot을 갱신합니다.

## 검증 순서

ETL을 실행하거나 Published Data를 변경한 뒤 다음을 모두 실행합니다.

```bash
npm run data:test-utils
npm run data:audit
npm run data:verify
npm run typecheck
npm run lint
npm run build
```

`data:audit`는 로컬에서 Published Snapshot을 추가 점검하는 명령이다. CI는 `data:test-utils`, `data:verify`, `typecheck`, `lint`, `build`를 실행하며 외부 Source API를 호출하지 않는다.

검증에는 다음 항목이 포함됩니다.

- Published Schema와 필수 필드
- Source Namespace를 포함한 Facility ID와 중복
- Coordinate 범위와 Metadata count
- AED 이동성 Review와 금지 필드
- TypeScript, Lint, 운영 빌드

검증에 실패하면 기존 정상 Snapshot을 유지하고 Commit하지 않습니다.

## 자동 동기화

`.github/workflows/sync-public-data.yml`은 Shelter, AED와 Heat Shelter를 정기적으로 갱신합니다.

1. ETL과 `data:verify`를 실행합니다.
2. 허용된 Published Data와 AED pending 파일만 Stage합니다.
3. 실제 변경이 있을 때만 `main`에 데이터 Commit을 생성합니다.
4. API 또는 검증 실패 시 기존 Repository Snapshot을 유지합니다.

Fire Water XLSX, Fire Organization Snapshot, Child Safety House Snapshot은 수동 갱신 대상입니다.

## 변경 원칙

- Raw 원본과 API Key는 Commit하지 않습니다.
- Published JSON에 Source가 제공하지 않은 상태나 의미를 추가하지 않습니다.
- 동일 좌표 시설을 자동으로 Deduplicate하지 않습니다.
- `manager`, `managerTel` 같은 비공개 대상 필드는 Published하지 않습니다.
- Data Policy를 바꾸는 변경은 ETL 코드와 문서를 같은 변경으로 검토합니다.
