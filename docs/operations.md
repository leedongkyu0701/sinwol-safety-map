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
```

이 값에는 `NEXT_PUBLIC_` 접두사를 사용하지 않습니다. Browser Bundle이나 Published JSON에 포함해서는 안 됩니다.

## 데이터 갱신

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

Fire Water XLSX와 Fire Organization Snapshot은 수동 갱신 대상입니다.

## 변경 원칙

- Raw 원본과 API Key는 Commit하지 않습니다.
- Published JSON에 Source가 제공하지 않은 상태나 의미를 추가하지 않습니다.
- 동일 좌표 시설을 자동으로 Deduplicate하지 않습니다.
- `manager`, `managerTel` 같은 비공개 대상 필드는 Published하지 않습니다.
- Data Policy를 바꾸는 변경은 ETL 코드와 문서를 같은 변경으로 검토합니다.
